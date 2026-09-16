const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", subjectController.getSubjects);
router.post("/", subjectController.createSubject);
router.get("/:id", subjectController.getSubjectById);
router.put("/:id", subjectController.updateSubject);
router.delete("/:id", subjectController.deleteSubject);

module.exports = router;
