const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const { default: axios } = require("axios");
const { API_USER } = process.env;

// @desc    Get user zones from speedotrack
// @route   GET /api/util/user-zones
// @access  Private
const getUserZones = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const sord = req.query.sort_order || "asc";
  const search = req.query.search;

  const key = req.user.speedotrack_api_key;

  if (!key) throw new Error(C.getResourse404("speedotrack_api_key"));

  const url = `${API_USER}&key=${key}&cmd=USER_GET_ZONES`;

  const { data } = await axios.get(url);

  const resultRaw = Object.keys(data).map((key) => ({sql_id:key, ...data[key]}));

  const sortFn = (a, b) => {
    if (sord === "desc") {
      if (a[sort] > b[sort]) return -1;
      if (a[sort] < b[sort]) return 1;
      return 0;
    }

    if (a[sort] > b[sort]) return 1;
    if (a[sort] < b[sort]) return -1;
    return 0;
  };

  const results = UC.paginatedArrayQuery(resultRaw, page, limit, sortFn);

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get user devices from speedotrack
// @route   GET /api/util/user-devices
// @access  Private
const getUserDevices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const sord = req.query.sort_order || "asc";
  const search = req.query.search;

  const key = req.user.speedotrack_api_key;

  if (!key) throw new Error(C.getResourse404("speedotrack_api_key"));

  const url = `${API_USER}&key=${key}&cmd=USER_GET_OBJECTS`;

  const { data } = await axios.get(url);

  const sortFn = (a, b) => {
    if (sord === "desc") {
      if (a[sort] > b[sort]) return -1;
      if (a[sort] < b[sort]) return 1;
      return 0;
    }

    if (a[sort] > b[sort]) return 1;
    if (a[sort] < b[sort]) return -1;
    return 0;
  };

  const selectFn = (item) => {
    return {
      imei: item.imei,
      dt_tracker: item.dt_tracker,
      lat: item.lat,
      lng: item.lng,
      altitude: item.altitude,
      angle: item.angle,
      speed: item.speed,
      name: item.name,
      odometer: item.odometer,
    };
  };

  const results = UC.paginatedArrayQuery(
    data,
    page,
    limit,
    sortFn,
    false,
    selectFn
  );

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

module.exports = {
  getUserZones,
  getUserDevices,
};
