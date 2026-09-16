const mongoose = require("mongoose");
const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const SubTopic = require("../models/SubTopic");
const StudySession = require("../models/StudySession");
const Task = require("../models/Task");
const { readDB, writeDB, generateId } = require("../config/localStore");

// @route   GET /api/subjects
exports.getSubjects = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();

    if (mongoose.connection.readyState === 1) {
      const subjects = await Subject.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
      const subjectStats = await Promise.all(
        subjects.map(async (subject) => {
          const [topicCount, subTopicCount, completedSubTopics, sessionStats] = await Promise.all([
            Topic.countDocuments({ subject: subject._id }),
            SubTopic.countDocuments({ subject: subject._id }),
            SubTopic.countDocuments({ subject: subject._id, status: "completed" }),
            StudySession.aggregate([
              { $match: { subject: subject._id } },
              { $group: { _id: null, totalMinutes: { $sum: "$durationMinutes" }, sessionCount: { $sum: 1 } } },
            ]),
          ]);

          const totalMinutes = sessionStats.length > 0 ? sessionStats[0].totalMinutes : 0;
          const sessionCount = sessionStats.length > 0 ? sessionStats[0].sessionCount : 0;
          const progressPercentage = subTopicCount > 0 ? Math.round((completedSubTopics / subTopicCount) * 100) : 0;

          return {
            ...subject,
            topicCount,
            subTopicCount,
            completedSubTopics,
            totalMinutes,
            sessionCount,
            progressPercentage,
          };
        })
      );
      return res.json({ success: true, count: subjectStats.length, subjects: subjectStats });
    }

    // Local Store Mode
    const db = readDB();
    const userSubjects = db.subjects.filter((s) => (s.user || "").toString() === userId);

    const subjectStats = userSubjects.map((s) => {
      const sId = s._id || s.id;
      const topics = db.topics.filter((t) => (t.subject || "").toString() === sId.toString());
      const subTopics = db.subtopics.filter((st) => (st.subject || "").toString() === sId.toString());
      const completedSubTopics = subTopics.filter((st) => st.status === "completed").length;
      const sessions = db.sessions.filter((sess) => (sess.subject || "").toString() === sId.toString());
      const totalMinutes = sessions.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);
      const progressPercentage = subTopics.length > 0 ? Math.round((completedSubTopics / subTopics.length) * 100) : 0;

      return {
        ...s,
        topicCount: topics.length,
        subTopicCount: subTopics.length,
        completedSubTopics,
        totalMinutes,
        sessionCount: sessions.length,
        progressPercentage,
      };
    });

    res.json({ success: true, count: subjectStats.length, subjects: subjectStats });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching subjects", error: error.message });
  }
};

// @route   GET /api/subjects/:id
exports.getSubjectById = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const subjId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const subject = await Subject.findOne({ _id: subjId, user: req.user._id }).lean();
      if (!subject) return res.status(404).json({ message: "Subject not found" });

      const topics = await Topic.find({ subject: subject._id, user: req.user._id }).sort({ order: 1, createdAt: 1 }).lean();
      const subTopics = await SubTopic.find({ subject: subject._id, user: req.user._id }).sort({ order: 1, createdAt: 1 }).lean();

      const topicsWithSubTopics = topics.map((topic) => {
        const topicSubTopics = subTopics.filter((st) => st.topic.toString() === topic._id.toString());
        const completedCount = topicSubTopics.filter((st) => st.status === "completed").length;
        const progress = topicSubTopics.length > 0 ? Math.round((completedCount / topicSubTopics.length) * 100) : topic.status === "completed" ? 100 : 0;
        return { ...topic, subTopics: topicSubTopics, progress };
      });

      const sessionStats = await StudySession.aggregate([
        { $match: { subject: subject._id } },
        { $group: { _id: null, totalMinutes: { $sum: "$durationMinutes" }, sessionCount: { $sum: 1 } } },
      ]);
      const totalMinutes = sessionStats.length > 0 ? sessionStats[0].totalMinutes : 0;

      return res.json({
        success: true,
        subject: { ...subject, topics: topicsWithSubTopics, totalMinutes },
      });
    }

    // Local Store Mode
    const db = readDB();
    const subject = db.subjects.find((s) => (s._id === subjId || s.id === subjId) && s.user.toString() === userId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const topics = db.topics.filter((t) => (t.subject || "").toString() === subjId.toString());
    const subTopics = db.subtopics.filter((st) => (st.subject || "").toString() === subjId.toString());

    const topicsWithSubTopics = topics.map((topic) => {
      const tId = topic._id || topic.id;
      const topicSubTopics = subTopics.filter((st) => (st.topic || "").toString() === tId.toString());
      const completedCount = topicSubTopics.filter((st) => st.status === "completed").length;
      const progress = topicSubTopics.length > 0 ? Math.round((completedCount / topicSubTopics.length) * 100) : topic.status === "completed" ? 100 : 0;
      return { ...topic, subTopics: topicSubTopics, progress };
    });

    const sessions = db.sessions.filter((sess) => (sess.subject || "").toString() === subjId.toString());
    const totalMinutes = sessions.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);

    res.json({
      success: true,
      subject: { ...subject, topics: topicsWithSubTopics, totalMinutes },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching subject details", error: error.message });
  }
};

// @route   POST /api/subjects
exports.createSubject = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { name, description, color, icon, targetHours } = req.body;

    if (!name) return res.status(400).json({ message: "Subject name is required" });

    if (mongoose.connection.readyState === 1) {
      const subject = await Subject.create({
        user: req.user._id,
        name,
        description: description || "",
        color: color || "#6366f1",
        icon: icon || "BookOpen",
        targetHours: targetHours ? Number(targetHours) : 20,
      });

      return res.status(201).json({
        success: true,
        message: "Subject created successfully",
        subject: {
          ...subject.toObject(),
          topicCount: 0,
          subTopicCount: 0,
          completedSubTopics: 0,
          totalMinutes: 0,
          sessionCount: 0,
          progressPercentage: 0,
        },
      });
    }

    // Local Store Mode
    const db = readDB();
    const newId = generateId();
    const newSubject = {
      _id: newId,
      id: newId,
      user: userId,
      name,
      description: description || "",
      color: color || "#6366f1",
      icon: icon || "BookOpen",
      targetHours: targetHours ? Number(targetHours) : 20,
      createdAt: new Date().toISOString(),
    };

    db.subjects.push(newSubject);
    writeDB(db);

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject: {
        ...newSubject,
        topicCount: 0,
        subTopicCount: 0,
        completedSubTopics: 0,
        totalMinutes: 0,
        sessionCount: 0,
        progressPercentage: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error creating subject", error: error.message });
  }
};

// @route   PUT /api/subjects/:id
exports.updateSubject = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { name, description, color, icon, targetHours } = req.body;

    if (mongoose.connection.readyState === 1) {
      let subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
      if (!subject) return res.status(404).json({ message: "Subject not found" });

      if (name !== undefined) subject.name = name;
      if (description !== undefined) subject.description = description;
      if (color !== undefined) subject.color = color;
      if (icon !== undefined) subject.icon = icon;
      if (targetHours !== undefined) subject.targetHours = Number(targetHours);

      await subject.save();
      return res.json({ success: true, message: "Subject updated successfully", subject });
    }

    // Local Store Mode
    const db = readDB();
    const sIdx = db.subjects.findIndex((s) => (s._id === req.params.id || s.id === req.params.id) && s.user.toString() === userId);
    if (sIdx === -1) return res.status(404).json({ message: "Subject not found" });

    if (name !== undefined) db.subjects[sIdx].name = name;
    if (description !== undefined) db.subjects[sIdx].description = description;
    if (color !== undefined) db.subjects[sIdx].color = color;
    if (icon !== undefined) db.subjects[sIdx].icon = icon;
    if (targetHours !== undefined) db.subjects[sIdx].targetHours = Number(targetHours);

    writeDB(db);
    res.json({ success: true, message: "Subject updated successfully", subject: db.subjects[sIdx] });
  } catch (error) {
    res.status(500).json({ message: "Server error updating subject", error: error.message });
  }
};

// @route   DELETE /api/subjects/:id
exports.deleteSubject = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const subjId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const subject = await Subject.findOne({ _id: subjId, user: req.user._id });
      if (!subject) return res.status(404).json({ message: "Subject not found" });

      await Promise.all([
        Subject.deleteOne({ _id: subject._id }),
        Topic.deleteMany({ subject: subject._id }),
        SubTopic.deleteMany({ subject: subject._id }),
        StudySession.deleteMany({ subject: subject._id }),
        Task.deleteMany({ subject: subject._id }),
      ]);
      return res.json({ success: true, message: "Subject and related resources deleted successfully" });
    }

    // Local Store Mode
    const db = readDB();
    db.subjects = db.subjects.filter((s) => (s._id !== subjId && s.id !== subjId));
    db.topics = db.topics.filter((t) => (t.subject || "").toString() !== subjId);
    db.subtopics = db.subtopics.filter((st) => (st.subject || "").toString() !== subjId);
    db.sessions = db.sessions.filter((sess) => (sess.subject || "").toString() !== subjId);
    db.tasks = db.tasks.filter((t) => (t.subject || "").toString() !== subjId);
    writeDB(db);

    res.json({ success: true, message: "Subject and related resources deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting subject", error: error.message });
  }
};
