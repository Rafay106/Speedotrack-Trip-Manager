const mongoose = require("mongoose");
const C = require("../constants");
const { any } = require("../plugins/schemaPlugins");

const ObjectId = mongoose.SchemaTypes.ObjectId;
const required = [true, C.FIELD_IS_REQ];

const zoneSchema = new mongoose.Schema(
  {
    sql_id: { type: String, required },
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
    buyer: { type: String, required },
    seller: { type: String, required },
    transport_name_and_no: { type: String, required },
    vehicle_no: { type: String, required },
    driver_name: { type: String, required },
    driver_mobile_no: { type: String, required },
    licence_no: { type: String, required },
    lr_no: { type: String, required },
    do_no: { type: String, required },
    loading_dt: { type: Date, required },
    loading_point: zoneSchema,
    cargo: { type: String, required },
    weight: { type: Number, required },
    unloading_point: zoneSchema,
    unloading_dt: { type: Date, required },
    distance: { type: Number, required },
    estimated_time: { type: Number, required },
    user: { type: ObjectId, required, ref: "users" },
  },
  { timestamps: true, versionKey: false }
);

schema.plugin(any);

const Trip = mongoose.model("trips", schema);

module.exports = Trip;
