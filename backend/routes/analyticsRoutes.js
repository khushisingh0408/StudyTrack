const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/overview", analyticsController.getOverview);
router.get("/timeseries", analyticsController.getTimeseries);
router.get("/subject-breakdown", analyticsController.getSubjectBreakdown);

module.exports = router;
