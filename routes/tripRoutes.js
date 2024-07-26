const express = require("express");
const TC = require("../controllers/tripController");

const router = express.Router();

router.route("/").get(TC.getTrips).post(TC.addTrip);
router.post("/report", TC.getTripReport);
router.post("/report/excel", TC.getTripReportExcel);
router.get("/generated-report", TC.getTripGeneratedReports);
router.delete("/generated-report/:id", TC.deleteTripGeneratedReport);
router.route("/:id").get(TC.getTrip).patch(TC.updateTrip).delete(TC.deleteTrip);

module.exports = router;
