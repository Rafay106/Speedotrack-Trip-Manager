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
    loading_dt: req.body.loading_dt,
    loading_point: req.body.loading_point,
    cargo: req.body.cargo,
    weight: req.body.weight,
    unloading_point: req.body.unloading_point,
    unloading_dt: req.body.unloading_dt,
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
    loading_date_and_time: req.body.loading_date_and_time,
    loading_point: req.body.loading_point,
    cargo: req.body.cargo,
    weight: req.body.weight,
    unloading_point: req.body.unloading_point,
    unloading_date_and_time: req.body.unloading_date_and_time,
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

  const speed_limit = req.body.speed_limit;

  if (!speed_limit) {
    res.status(400);
    throw new Error(C.getFieldIsReq("speed_limit"));
  }

  const stop_duration = req.body.stop_duration;

  if (!stop_duration) {
    res.status(400);
    throw new Error(C.getFieldIsReq("stop_duration"));
  }

  const data_items =
    "route_start,route_end,route_length,move_duration,stop_duration,stop_count,top_speed,avg_speed,overspeed_count,fuel_consumption,avg_fuel_consumption,fuel_cost,engine_work,engine_idle,odometer,engine_hours,driver,trailer";

  const trips = await Trip.find({ _id: ids }).lean();

  const result = [];

  for (const trip of trips) {
    const generalInfo = await REPORT.getGeneralReport(
      key,
      trip.device_imei,
      trip.loading_dt,
      trip.unloading_dt,
      speed_limit,
      stop_duration,
      data_items
    );

    const zoneIds = `${trip.loading_point.sql_id},${trip.unloading_point.sql_id}`;

    const zoneInOut = await REPORT.getZoneInOutReport(
      key,
      trip.device_imei,
      trip.loading_dt,
      trip.unloading_dt,
      zoneIds
    );

    const sourceInOut = zoneInOut.report.find(
      (ele) => ele["ZONE_ID"] === trip.loading_point.sql_id
    );
    const destinationInOut = zoneInOut.report.find(
      (ele) => ele["ZONE_ID"] === trip.unloading_point.sql_id
    );

    const loadingTimeMS = UC.getDiffBetweenDates(
      sourceInOut.ZONE_IN,
      sourceInOut.ZONE_OUT
    );

    const loadingTime = UC.getTimeDetails(loadingTimeMS);

    const unloadingTimeMS = UC.getDiffBetweenDates(
      destinationInOut.ZONE_IN,
      destinationInOut.ZONE_OUT
    );

    const unloadingTime = UC.getTimeDetails(unloadingTimeMS);

    const totalTimeMS = UC.getDiffBetweenDates(
      generalInfo.ROUTE_START,
      generalInfo.ROUTE_END
    );

    const totalTime = UC.getTimeDetails(totalTimeMS);

    const distFromDest = await REPORT.getDistanceFromZone(
      key,
      trip.device_imei,
      trip.unloading_point.sql_id
    );

    const row = {
      Date: UC.convAndFormatDT(trip.loading_dt).slice(10),
      "Vehile Number": trip.vehicle_no,
      imei: trip.device_imei,
      source: trip.loading_point.name,
      destination: trip.unloading_point.name,
      "source in": sourceInOut.ZONE_IN,
      "source out": sourceInOut.ZONE_OUT,
      "Loading Time": loadingTime,
      "Destination In": destinationInOut.ZONE_IN,
      "Destination Out": destinationInOut.ZONE_OUT,
      "Unloading Time": unloadingTime,
      "Runn KM": generalInfo.ROUTE_LENGTH,
      "Original KM": trip.distance,
      Differ: generalInfo.ROUTE_LENGTH - trip.distance,
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
