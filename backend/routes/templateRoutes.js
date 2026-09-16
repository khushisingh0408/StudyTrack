const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const authMiddleware = require("../middleware/auth");

// Public template listing
router.get("/", templateController.getTemplates);

// Protected actions
router.post("/apply", authMiddleware, templateController.applyTemplate);
router.post("/load-demo-data", authMiddleware, templateController.loadDemoData);

module.exports = router;
