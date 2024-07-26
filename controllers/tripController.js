const fs = require("node:fs");
const path = require("node:path");
const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const Trip = require("../models/tripModel");
const REPORT = require("../utils/reports");
const TripReport = require("../models/tripGeneratedReportModel");

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
  const invoices = req.body.invoices;

  const unloading_points = [];

  for (let i = 0; i < unloadingPoints.length; i++) {
    const zoneId = unloadingPoints[i];
    const invoice = invoices[i];
    const unloadingZone = await UC.getUserZone(key, zoneId);

    if (!unloadingZone) {
      res.status(400);
      throw new Error(C.getResourse404Id("zone_id", zoneId));
    }

    unloading_points.push({
      unloading_point: unloadingZone,
      invoice_no: invoice,
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

// @desc    Get trip report
// @route   POST /api/trip/report
// @access  Private
const getTripReport = asyncHandler(async (req, res) => {
  const key = req.user.speedotrack_api_key;

  if (!key) throw new Error(C.getResourse404("speedotrack_api_key"));

  const ids = req.body.ids;

  if (!ids) {
    res.status(400);
    throw new Error(C.getFieldIsReq("ids"));
  }

  const report = await REPORT.getTripReport(key, ids);

  res.status(200).json(report);
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

  const report = await REPORT.getTripReport(key, ids);

  const fileName = `${new Date().getTime()}.xlsx`;

  const folderPath = path.join("static", "reports");
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

  const filePath = path.join(folderPath, fileName);

  UC.jsonToExcel(filePath, report);

  const fileUrl = `${process.env.DOMAIN}/reports/${fileName}`;

  await TripReport.create({ user: req.user._id, file: fileName });

  res.status(200).json({ file: fileUrl });
});

// @desc    Get Generated reports of Trip
// @route   GET /api/trip/generated-report
// @access  Private
const getTripGeneratedReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const search = req.query.search;

  const query = { user: req.user._id };

  if (search) {
    const fields = ["name"];
    const searchQuery = UC.createSearchQuery(fields, search);
    query["$or"] = searchQuery;
  }

  const results = await UC.paginatedQuery(
    TripReport,
    query,
    "",
    page,
    limit,
    sort
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  for (const data of results.result) {
    data.file = `${process.env.DOMAIN}/reports/${data.file}`;
  }

  res.status(200).json(results);
});

// @desc    Delete a Trip Reports
// @route   DELETE /api/trip/generated-report/:id
// @access  Private
const deleteTripGeneratedReport = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, user: req.user._id };

  const tripReport = await TripReport.findOne(query).select("file").lean();

  if (!tripReport) {
    res.status(404);
    throw new Error(C.getResourse404Id("TripReport", req.params.id));
  }

  const filePath = path.join("static", "reports", tripReport.file);

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const result = await TripReport.deleteOne({ _id: tripReport._id });

  res.status(200).json(result);
});

module.exports = {
  getTrips,
  getTrip,
  addTrip,
  updateTrip,
  deleteTrip,
  getTripReport,
  getTripReportExcel,

  getTripGeneratedReports,
  deleteTripGeneratedReport,
};
