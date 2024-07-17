const asyncHandler = require("express-async-handler");
const requestIP = require("request-ip");
const jwt = require("jsonwebtoken");
const UC = require("../utils/common");
const C = require("../constants");
const User = require("../models/userModel");

const authenticate = asyncHandler(async (req, res, next) => {
  const cliendIP = requestIP.getClientIp(req);
  let logData = `${cliendIP} ${req.headers["user-agent"]} ${req.originalUrl}`;

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    UC.writeLog("op_logs", logData);

    res.status(401);
    throw new Error("Not authorized, no token");
  }

  let decode;
  try {
    decode = jwt.verify(token, process.env.SECRET);
  } catch (err) {
    console.log(err);
    res.status(401);
    throw new Error("Not Authorized!");
  }

  req.user = await User.findOne({
    _id: decode._id,
    password: decode.password,
  })
    .select("-password")
    .populate("role", "title")
    .lean();

  if (!req.user) {
    res.status(404);
    throw new Error("Invalid Token!");
  }

  logData += ` ${req.user.email}`;

  UC.writeLog("op_logs", logData);
  next();
});

const authorise = asyncHandler((req, res, next) => {
  const role = req.user?.role?.title;

  if (!role) throw new Error("Role not found");

  if (role !== C.SUPERADMIN) {
    res.status(402);
    throw new Error(C.ACCESS_DENIED);
  }

  next();
});

module.exports = { authenticate, authorise };
