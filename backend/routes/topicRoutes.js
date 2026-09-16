const express = require("express");
const router = express.Router();
const topicController = require("../controllers/topicController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", topicController.getTopics);
router.post("/", topicController.createTopic);
router.put("/:id", topicController.updateTopic);
router.patch("/:id/status", topicController.updateTopicStatus);
router.delete("/:id", topicController.deleteTopic);

module.exports = router;
