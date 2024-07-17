const express = require("express");
const UC = require("../controllers/authController");

const router = express.Router();

router.post("/init", UC.init);
router.post("/login", UC.login);

module.exports = router;
