const mongoose = require("mongoose");
const crypto = require("node:crypto");
const C = require("../constants");
const { isEmailValid } = require("../utils/validators");
const { any } = require("../plugins/schemaPlugins");

const ObjectId = mongoose.SchemaTypes.ObjectId;
const required = [true, C.FIELD_IS_REQ];

const schema = new mongoose.Schema(
  {
    role: { type: ObjectId, required, ref: "system_roles" },
    name: { type: String, required },
    email: {
      type: String,
      required,
      validate: { validator: isEmailValid, message: C.FIELD_IS_INVALID },
      lowercase: true,
      trim: true,
    },
    email_verified: { type: Boolean, default: false },
    salt: { type: String, default: "" },
    password: { type: String, required },
    speedotrack_api_key: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

schema.index({ email: 1 }, { unique: true });

schema.pre("save", function (next) {
  if (!this.isModified("password")) return next();

  this.salt = crypto.randomBytes(16).toString("hex");

  crypto.pbkdf2(
    this.password,
    this.salt,
    10000,
    64,
    "sha512",
    (err, derivedKey) => {
      if (err) return next(err);

      this.password = derivedKey.toString("hex");

      next();
    }
  );
});

schema.methods.comparePassword = function (candidatePassword) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      candidatePassword,
      this.salt,
      10000,
      64,
      "sha512",
      (err, derivedKey) => {
        if (err) return reject(err);

        resolve(this.password === derivedKey.toString("hex"));
      }
    );
  });
};

schema.plugin(any);

const User = mongoose.model("users", schema);
module.exports = User;
