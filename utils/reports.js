const axios = require("axios");
const FormData = require("form-data");
const { API_MOBILE } = process.env;

const getGeneralReport = async (
  key,
  imei,
  dtf,
  dtt,
  speed_limit,
  stop_duration,
  data_items
) => {
  const data = new FormData();
  data.append("imei", imei);
  data.append("dtf", formatDateToSQL(dtf));
  data.append("dtt", formatDateToSQL(dtt));
  data.append("speed_limit", speed_limit);
  data.append("stop_duration", stop_duration);
  data.append("data_items", data_items);

  const response = await axios.post(
    `${API_MOBILE}&key=${key}&cmd=REPORT_GENERAL`,
    data
  );

  return response.data;
};

const getZoneInOutReport = async (key, imei, dtf, dtt, zone_ids) => {
  const data = new FormData();
  data.append("imei", imei);
  data.append("dtf", formatDateToSQL(dtf));
  data.append("dtt", formatDateToSQL(dtt));
  data.append("show_coordinates", "false");
  data.append("show_addresses", "false");
  data.append("zones_addresses", "false");
  data.append("zone_ids", zone_ids);

  const response = await axios.post(
    `${API_MOBILE}&key=${key}&cmd=REPORT_ZONE_IN_OUT`,
    data
  );

  return response.data;
};

const getDistanceFromZone = async (key, imei, zone_id) => {
  const data = new FormData();
  data.append("imei", imei);
  data.append("zone_id", zone_id);

  const response = await axios.post(
    `${API_MOBILE}&key=${key}&cmd=DISTANCE_FROM_ZONE`,
    data
  );

  return response.data;
};

const formatDateToSQL = (date) => {
  date = new Date(date);

  if (isNaN(date)) throw new Error("Invalid Date");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

module.exports = { getGeneralReport, getZoneInOutReport, getDistanceFromZone };
