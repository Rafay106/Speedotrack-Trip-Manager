const mongoose = require("mongoose");
const C = require("../constants");
const { any } = require("../plugins/schemaPlugins");

const ObjectId = mongoose.SchemaTypes.ObjectId;
const required = [true, C.FIELD_IS_REQ];

const zoneSchema = new mongoose.Schema(
  {
    id: { type: String, required },
    name: { type: String, required },
    color: { type: String, required },
    visible: { type: Boolean, required },
    name_visible: { type: Boolean, required },
    area: { type: Number, required },
    vertices: { type: String, required },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    device_imei: { type: String, required },
    trip_started: { type: Boolean, default: false },
    start_odometer: { type: Number, default: 0 },
    start_engine_hr: { type: Number, default: 0 },
    trip_ended: { type: Boolean, default: false },
    end_odometer: { type: Number, default: 0 },
    end_engine_hr: { type: Number, default: 0 },
    buyer: { type: String, required },
    seller: { type: String, required },
    transport_name_and_no: { type: String, required },
    vehicle_no: { type: String, required },
    driver_name: { type: String, required },
    driver_mobile_no: { type: String, required },
    licence_no: { type: String, required },
    lr_no: { type: String, required },
    do_no: { type: String, required },
    loading_point: zoneSchema,
    loading_dt_in: { type: Date, default: 0 },
    loading_dt_out: { type: Date, default: 0 },
    cargo: { type: String, required },
    weight: { type: Number, required },
    unloading_points: [
      {
        unloading_point: zoneSchema,
        unloading_dt_in: { type: Date, default: 0 },
        unloading_dt_out: { type: Date, default: 0 },
        invoice_no: { type: String, required },
        odometer: { type: Number, default: 0 },
        engine_hr: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
      },
    ],
    distance: { type: Number, required },
    estimated_time: { type: Number, required },
    user: { type: ObjectId, required, ref: "users" },
  },
  { timestamps: true, versionKey: false }
);

schema.plugin(any);

const Trip = mongoose.model("trips", schema);

module.exports = Trip;
