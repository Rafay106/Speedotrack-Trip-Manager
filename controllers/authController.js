const fs = require("node:fs");
const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const User = require("../models/userModel");
const Role = require("../models/roleModel");
const { generateToken } = require("../utils/fn_jwt");

// @desc    Init System
// @route   POST /api/init
// @access  Private
const init = asyncHandler(async (req, res) => {
  const key = req.body.key;

  let superadminRole = await UC.getRoleId(C.SUPERADMIN);

  if (superadminRole) {
    if (await User.any({ type: superadminRole })) {
      res.status(400);
      throw new Error("Superadmin already exists");
    }
  }

  if (key !== process.env.SECRET) {
    res.status(400);
    throw new Error("Invalid Key");
  }

  if (!fs.existsSync("./init/system_roles.json")) {
    throw new Error("File not found: /init/system_roles.json");
  }

  const roleData = JSON.parse(
    fs.readFileSync("./init/system_roles.json", "utf8")
  );

  for (const role of roleData) {
    if (!(await Role.any({ title: role.title }))) {
      await Role.create({ title: role.title, access: role.access });
    }
  }

  superadminRole = await UC.getRoleId(C.SUPERADMIN);

  if (!superadminRole) {
    res.status(404);
    throw new Error(C.getResourse404Id("Role", C.SUPERADMIN));
  }

  const superadmin = await User.create({
    role: superadminRole,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });

  res.status(201).json({ msg: superadmin._id });
});

// @desc    Login user
// @route   POST /api/login
// @access  Private
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate("role", "title");

  if (!user) {
    res.status(400);
    throw new Error(C.INVALID_CREDENTIALS);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    res.status(400);
    throw new Error(C.INVALID_CREDENTIALS);
  }

  const token = generateToken(user._id, user.password);

  const result = { _id: user._id, role: user.role.title, token: token.token };

  res.status(200).json(result);
});

module.exports = { init, login };
