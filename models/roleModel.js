const mongoose = require("mongoose");
const C = require("../constants");
const { any } = require("../plugins/schemaPlugins");

const required = [true, C.FIELD_IS_REQ];

const schema = new mongoose.Schema(
  {
    title: { type: String, required },
    access: { type: String, enum: { values: ["system", "user"] } },
  },
  { timestamps: true, versionKey: false }
);

schema.plugin(any);

const Role = mongoose.model("system_roles", schema);
module.exports = Role;
