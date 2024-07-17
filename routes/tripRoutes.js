const express = require("express");
const TC = require("../controllers/tripController");

const router = express.Router();

router.route("/").get(TC.getTrips).post(TC.addTrip);
router.route("/:id").get(TC.getTrip).patch(TC.updateTrip).delete(TC.deleteTrip);
router.post("/report/excel", TC.getTripReportExcel);

module.exports = router;
