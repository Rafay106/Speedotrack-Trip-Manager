const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const Trip = require("../models/tripModel");
const C = require("../constants");

const tripZoneIn = asyncHandler(async (req, res) => {
  const data = {
    username: req.query.username,
    name: req.query.name,
    imei: req.query.imei,
    type: req.query.type,
    desc: req.query.desc,
    zone_name: req.query.zone_name,
    lat: req.query.lat,
    lng: req.query.lng,
    speed: req.query.speed,
    altitude: req.query.altitude,
    angle: req.query.angle,
    dt_server: req.query.dt_server,
    dt_tracker: req.query.dt_tracker,
    tr_model: req.query.tr_model,
    vin: req.query.vin,
    plate_number: req.query.plate_number,
    sim_number: req.query.sim_number,
    driver_name: req.query.driver_name,
    trailer_name: req.query.trailer_name,
    odometer: req.query.odometer,
    eng_hours: req.query.eng_hours,
  };

  if (!data.imei) {
    res.status(400);
    throw new Error("Error: IMEI is required!");
  }

  if (!data.type || data.type !== "zone_in") {
    res.status(400);
    throw new Error(C.getFieldIsInvalid("zone_in"));
  }

  const trips = await Trip.find({ device_imei: data.imei }).lean();

  for (const trip of trips) {
    if (trip.loading_point.name === data.zone_name) {
      const updatedata = {
        trip_started: true,
        start_odometer: data.odometer,
        start_engine_hr: data.eng_hours,
        loading_dt_in: data.dt_tracker,
      };

      await Trip.updateOne({ _id: trip._id }, { $set: updatedata });
    }

    const lastUnloadingIdx = trip.unloading_points.length - 1;
    let i = 0;
    for (const up of trip.unloading_points) {
      if (up.unloading_point.name === data.zone_name) {
        const updatedata = {};
        if (i === lastUnloadingIdx) {
          updatedata.trip_ended = true;
          updatedata.end_odometer = data.odometer;
          updatedata.end_engine_hr = data.eng_hours;
        }

        updatedata["unloading_points.$"] = {
          ...up,
          unloading_dt_in: data.dt_tracker,
          odometer: data.odometer,
          engine_hr: data.eng_hours,
        };

        await Trip.updateOne(
          {
            _id: trip._id,
            "unloading_points.unloading_point.name": data.zone_name,
          },
          { $set: updatedata }
        );
      }

      i++;
    }
  }

  // UC.writeLog("webhook_zonein", JSON.stringify(data));
  res.send("OK");
});

const tripZoneOut = asyncHandler(async (req, res) => {
  const data = {
    username: req.query.username,
    name: req.query.name,
    imei: req.query.imei,
    type: req.query.type,
    desc: req.query.desc,
    zone_name: req.query.zone_name,
    lat: req.query.lat,
    lng: req.query.lng,
    speed: req.query.speed,
    altitude: req.query.altitude,
    angle: req.query.angle,
    dt_server: req.query.dt_server,
    dt_tracker: req.query.dt_tracker,
    tr_model: req.query.tr_model,
    vin: req.query.vin,
    plate_number: req.query.plate_number,
    sim_number: req.query.sim_number,
    driver_name: req.query.driver_name,
    trailer_name: req.query.trailer_name,
    odometer: req.query.odometer,
    eng_hours: req.query.eng_hours,
  };

  if (!data.imei) {
    res.status(400);
    throw new Error("Error: IMEI is required!");
  }

  if (!data.type || data.type !== "zone_out") {
    res.status(400);
    throw new Error(C.getFieldIsInvalid("zone_out"));
  }

  const trips = await Trip.find({ device_imei: data.imei }).lean();

  for (const trip of trips) {
    if (trip.loading_point.name === data.zone_name) {
      const updatedata = {
        trip_started: true,
        start_odometer: data.odometer,
        start_engine_hr: data.eng_hours,
        loading_dt_out: data.dt_tracker,
      };

      await Trip.updateOne({ _id: trip._id }, { $set: updatedata });
    }

    const lastUnloadingIdx = trip.unloading_points.length - 1;
    let i = 0;
    for (const up of trip.unloading_points) {
      if (up.unloading_point.name === data.zone_name) {
        const updatedata = {};
        if (i === lastUnloadingIdx) {
          updatedata.trip_ended = true;
          updatedata.end_odometer = data.odometer;
          updatedata.end_engine_hr = data.eng_hours;
        }

        updatedata["unloading_points.$"] = {
          ...up,
          unloading_dt_out: data.dt_tracker,
          odometer: data.odometer,
          engine_hr: data.eng_hours,
          completed: true,
        };

        await Trip.updateOne(
          {
            _id: trip._id,
            "unloading_points.unloading_point.name": data.zone_name,
          },
          { $set: updatedata }
        );
      }

      i++;
    }
  }

  // UC.writeLog("webhook_zonein", JSON.stringify(data));
  res.send("OK");
});

router.get("/zone-in", tripZoneIn);
router.get("/zone-out", tripZoneOut);

module.exports = router;
