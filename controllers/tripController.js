const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const Trip = require("../models/tripModel");
const REPORT = require("../utils/reports");

// @desc    Get Trips
// @route   GET /api/trip
// @access  Private
const getTrips = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const search = req.query.search;

  const query = {};

  if (search) {
    const fields = ["name"];
    const searchQuery = UC.createSearchQuery(fields, search);
    query["$or"] = searchQuery;
  }

  const results = await UC.paginatedQuery(Trip, query, "", page, limit, sort);

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a Trip
// @route   GET /api/trip/:id
// @access  Private
const getTrip = asyncHandler(async (req, res) => {
  const type = await Trip.findOne({
    _id: req.params.id,
  }).lean();

  if (!type) {
    res.status(404);
    throw new Error(C.getResourse404Id("Trip", req.params.id));
  }

  res.status(200).json(type);
});

// @desc    Register new trip
// @route   POST /api/trip
// @access  Private
const addTrip = asyncHandler(async (req, res) => {
  const key = req.user.speedotrack_api_key;
  if (!key) {
    res.status(403);
    throw new Error(C.getSpeedotrackAPI404(req.user.name));
  }

  const lpZoneId = req.body.loading_point;

  const loadingZone = await UC.getUserZone(key, lpZoneId);
  if (!loadingZone) {
    res.status(400);
    throw new Error(C.getResourse404Id("loading_point", lpZoneId));
  }

  const unloadingPoints = req.body.unloading_points;

  const unloading_points = [];
  for (const up of unloadingPoints) {
    const unloadingZone = await UC.getUserZone(key, up.unloading_point);

    if (!unloadingZone) {
      res.status(400);
      throw new Error(C.getResourse404Id("zone_id", up.unloading_point));
    }

    unloading_points.push({
      unloading_point: unloadingZone,
      invoice_no: up.invoice_no,
    });
  }

  const trip = await Trip.create({
    device_imei: req.body.device_imei,
    buyer: req.body.buyer,
    seller: req.body.seller,
    transport_name_and_no: req.body.transport_name_and_no,
    vehicle_no: req.body.vehicle_no,
    driver_name: req.body.driver_name,
    driver_mobile_no: req.body.driver_mobile_no,
    licence_no: req.body.licence_no,
    lr_no: req.body.lr_no,
    do_no: req.body.do_no,
    loading_point: loadingZone,
    cargo: req.body.cargo,
    weight: req.body.weight,
    unloading_points,
    distance: req.body.distance,
    estimated_time: req.body.estimated_time,
    user: req.user._id,
  });

  res.status(200).json({ msg: trip._id });
});

// @desc    Update a Trip
// @route   PATCH /api/trip/:id
// @access  Private
const updateTrip = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  const trip = await Trip.findOne(query);

  if (!trip) {
    res.status(404);
    throw new Error(C.getResourse404Id("Trip", req.params.id));
  }

  const setData = {
    buyer: req.body.buyer,
    seller: req.body.seller,
    transport_name_and_no: req.body.transport_name_and_no,
    truck_no: req.body.truck_no,
    driver_name: req.body.driver_name,
    driver_mobile_no: req.body.driver_mobile_no,
    licence_no: req.body.licence_no,
    lr_no: req.body.lr_no,
    do_no: req.body.do_no,
    loading_point: req.body.loading_point,
    cargo: req.body.cargo,
    weight: req.body.weight,
    unloading_points: req.body.unloading_points,
    distance: req.body.distance,
    estimated_time: req.body.estimated_time,
  };

  const result = await Trip.updateOne(query, { $set: setData });

  res.status(200).json(result);
});

// @desc    Delete a Trip
// @route   DELETE /api/trip/:id
// @access  Private
const deleteTrip = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  const trip = await Trip.findOne(query).select("_id").lean();

  if (!trip) {
    res.status(404);
    throw new Error(C.getResourse404Id("Trip", req.params.id));
  }

  const result = await Trip.deleteOne({ _id: trip._id });

  res.status(200).json(result);
});

// @desc    Get trip report in excel
// @route   POST /api/trip/report/excel
// @access  Private
const getTripReportExcel = asyncHandler(async (req, res) => {
  const key = req.user.speedotrack_api_key;

  if (!key) throw new Error(C.getResourse404("speedotrack_api_key"));

  const ids = req.body.ids;

  if (!ids) {
    res.status(400);
    throw new Error(C.getFieldIsReq("ids"));
  }

  const trips = await Trip.find({ _id: ids }).lean();

  const result = [];

  for (const trip of trips) {
    const runnKM = trip.end_odometer - trip.start_odometer;

    const loadingTimeMS = UC.getDiffBetweenDates(
      trip.loading_dt_in,
      trip.loading_dt_out
    );

    const loadingTime = UC.getTimeDetails(loadingTimeMS);

    const lastUnloadingIdx = trip.unloading_points.length - 1;
    const lastUnloadingPoint = trip.unloading_points[lastUnloadingIdx];

    const totalTimeMS = UC.getDiffBetweenDates(
      trip.loading_dt_in,
      lastUnloadingPoint.unloading_dt_out
    );

    const totalTime = UC.getTimeDetails(totalTimeMS);

    const distFromDest = await REPORT.getDistanceFromZone(
      key,
      trip.device_imei,
      lastUnloadingPoint.unloading_point.id
    );

    const destinations = {};
    let i = 1;
    for (const up of trip.unloading_points) {
      const unloadingTimeMS = UC.getDiffBetweenDates(
        up.unloading_dt_in,
        up.unloading_dt_out
      );

      const unloadingTime = UC.getTimeDetails(unloadingTimeMS);

      destinations[`Destination_${i}`] = up.unloading_point.name;
      destinations[`Destination_${i} In`] = UC.convAndFormatDT(
        up.unloading_dt_in
      );
      destinations[`Destination_${i} Out`] = UC.convAndFormatDT(
        up.unloading_dt_out
      );
      destinations[`Destination_${i} Unloading Time`] = unloadingTime;
    }

    const row = {
      Date: UC.convAndFormatDT(new Date()).slice(10),
      "Vehile Number": trip.vehicle_no,
      IMEI: trip.device_imei,
      Source: trip.loading_point.name,
      "Source In": UC.convAndFormatDT(trip.loading_dt_in),
      "Source Out": UC.convAndFormatDT(trip.loading_dt_out),
      "Loading Time": loadingTime,
      ...destinations,
      "Runn KM": runnKM,
      "Original KM": trip.distance,
      Differ: runnKM - trip.distance,
      "Total Time": totalTime,
      "Expected Time": UC.getTimeDetails(trip.estimated_time),
      "Differ Time": UC.getTimeDetails(
        Math.abs(totalTimeMS - trip.estimated_time)
      ),
      Trail: "Trail",
      "Distance From Destination": distFromDest,
    };

    result.push(row);
  }

  res.status(200).json(result);
});

module.exports = {
  getTrips,
  getTrip,
  addTrip,
  updateTrip,
  deleteTrip,
  getTripReportExcel,
};
