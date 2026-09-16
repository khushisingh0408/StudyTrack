const express = require("express");
const router = express.Router();
const subTopicController = require("../controllers/subTopicController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", subTopicController.getSubTopics);
router.post("/", subTopicController.createSubTopic);
router.put("/:id", subTopicController.updateSubTopic);
router.patch("/:id/status", subTopicController.updateSubTopicStatus);
router.delete("/:id", subTopicController.deleteSubTopic);

module.exports = router;
