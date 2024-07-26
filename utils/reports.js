const axios = require("axios");
const FormData = require("form-data");
const UC = require("./common");
const Trip = require("../models/tripModel");
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

const getTripReport = async (key, ids) => {
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

    const distFromDest = await getDistanceFromZone(
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
      destinations[`Destination_${i} Invoice`] = up.invoice_no;

      i++;
    }

    // UC.writeLog("report", JSON.stringify(trip.unloading_points));
    // UC.writeLog("report", JSON.stringify(destinations));

    const row = {
      Date: UC.convAndFormatDT(new Date()),
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
      "Distance From Destination": distFromDest.distance,
    };

    result.push(row);
  }

  return result;
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

module.exports = {
  getGeneralReport,
  getZoneInOutReport,
  getDistanceFromZone,
  getTripReport,
};
