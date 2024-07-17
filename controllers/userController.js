const asyncHandler = require("express-async-handler");
const C = require("../constants");
const UC = require("../utils/common");
const User = require("../models/userModel");

// @desc    Get Users
// @route   GET /api/user
// @access  Private
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.rows) || 10;
  const sort = req.query.sort || "name";
  const search = req.query.search;

  const query = {};

  if (search) {
    const fields = ["name"];
    const searchQuery = UC.createSearchQuery(fields, search);
    query["$or"] = searchQuery;
  }

  const results = await UC.paginatedQuery(User, query, "-salt -password", page, limit, sort, ["role", "title"]);

  if (!results) return res.status(200).json({ msg: C.PAGE_LIMIT_REACHED });

  res.status(200).json(results);
});

// @desc    Get a User
// @route   GET /api/user/:id
// @access  Private
const getUser = asyncHandler(async (req, res) => {
  const type = await User.findOne({
    _id: req.params.id,
  }).lean();

  if (!type) {
    res.status(404);
    throw new Error(C.getResourse404Id("User", req.params.id));
  }

  res.status(200).json(type);
});

// @desc    Register new user
// @route   POST /api/user
// @access  Private
const addUser = asyncHandler(async (req, res) => {
  if (req.user.role.title !== C.SUPERADMIN && req.user.role.title !== C.ADMIN) {
    res.status(404);
    throw new Error(C.URL_404);
  }

  const roleId = await UC.getRoleId(req.body.role);

  if (!roleId) {
    res.status(400);
    throw new Error(C.getResourse404Id("role", req.body.role));
  }

  const user = await User.create({
    role: roleId,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    speedotrack_api_key: req.body.speedotrack_api_key,
  });

  res.status(200).json({ msg: user._id });
});

// @desc    Update a User
// @route   PATCH /api/user/:id
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  const user = await User.findOne(query);

  if (!user) {
    res.status(404);
    throw new Error(C.getResourse404Id("User", req.params.id));
  }

  const setData = {
    name: req.body.name,
    email: req.body.email,
  };

  if (req.body.old_pass && req.body.new_pass) {
    const isMatch = user.comparePassword(req.body.old_pass);

    if (!isMatch) {
      res.status(400);
      throw new Error(C.getFieldIsInvalid("old_pass"));
    }

    setData.password - req.body.new_pass;
  }

  const result = await User.updateOne(query, { $set: setData });

  res.status(200).json(result);
});

// @desc    Delete a User
// @route   DELETE /api/user/:id
// @access  Private
const deleteUser = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  const user = await User.findOne(query).select("_id").lean();

  if (!user) {
    res.status(404);
    throw new Error(C.getResourse404Id("User", req.params.id));
  }

  const result = await User.deleteOne({ _id: user._id });

  res.status(200).json(result);
});

module.exports = { getUsers, getUser, addUser, updateUser, deleteUser };
