const express = require("express");
const UC = require("../controllers/utilController");

const router = express.Router();

router.get("/user-zones", UC.getUserZones);
router.get("/user-devices", UC.getUserDevices);

module.exports = router;
