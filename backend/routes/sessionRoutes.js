const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.post("/", sessionController.createSession);
router.get("/", sessionController.getSessions);
router.delete("/:id", sessionController.deleteSession);

module.exports = router;
