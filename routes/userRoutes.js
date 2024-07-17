const express = require("express");
const UC = require("../controllers/userController");

const router = express.Router();

router.route("/").get(UC.getUsers).post(UC.addUser);
router.route("/:id").get(UC.getUser).patch(UC.updateUser).delete(UC.deleteUser);

module.exports = router;
