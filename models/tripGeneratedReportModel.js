const mongoose = require("mongoose");
const C = require("../constants");
const { any } = require("../plugins/schemaPlugins");

const ObjectId = mongoose.SchemaTypes.ObjectId;
const required = [true, C.FIELD_IS_REQ];

const schema = new mongoose.Schema(
  {
    user: { type: ObjectId, required, ref: "users" },
    file: { type: String, required },
  },
  { timestamps: true, versionKey: false }
);

schema.plugin(any);

const TripReport = mongoose.model("trip_generated_reports", schema);

module.exports = TripReport;
