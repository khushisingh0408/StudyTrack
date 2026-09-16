const mongoose = require("mongoose");
const Topic = require("../models/Topic");
const SubTopic = require("../models/SubTopic");
const Subject = require("../models/Subject");
const { readDB, writeDB, generateId } = require("../config/localStore");

// @route   GET /api/topics
exports.getTopics = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { subjectId } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = { user: req.user._id };
      if (subjectId) filter.subject = subjectId;

      const topics = await Topic.find(filter).sort({ order: 1, createdAt: 1 }).populate("subject", "name color icon").lean();
      const topicsWithCounts = await Promise.all(
        topics.map(async (topic) => {
          const [subTopicCount, completedSubTopics] = await Promise.all([
            SubTopic.countDocuments({ topic: topic._id }),
            SubTopic.countDocuments({ topic: topic._id, status: "completed" }),
          ]);
          return {
            ...topic,
            subTopicCount,
            completedSubTopics,
            progress: subTopicCount > 0 ? Math.round((completedSubTopics / subTopicCount) * 100) : topic.status === "completed" ? 100 : 0,
          };
        })
      );
      return res.json({ success: true, count: topicsWithCounts.length, topics: topicsWithCounts });
    }

    // Local Store Mode
    const db = readDB();
    let topics = db.topics.filter((t) => (t.user || "").toString() === userId);
    if (subjectId) {
      topics = topics.filter((t) => (t.subject || "").toString() === subjectId.toString());
    }

    const topicsWithCounts = topics.map((topic) => {
      const tId = topic._id || topic.id;
      const subTopics = db.subtopics.filter((st) => (st.topic || "").toString() === tId.toString());
      const completedSubTopics = subTopics.filter((st) => st.status === "completed").length;
      const progress = subTopics.length > 0 ? Math.round((completedSubTopics / subTopics.length) * 100) : topic.status === "completed" ? 100 : 0;
      const subject = db.subjects.find((s) => (s._id || s.id).toString() === (topic.subject || "").toString());

      return {
        ...topic,
        subject: subject ? { name: subject.name, color: subject.color, icon: subject.icon } : null,
        subTopicCount: subTopics.length,
        completedSubTopics,
        progress,
      };
    });

    res.json({ success: true, count: topicsWithCounts.length, topics: topicsWithCounts });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching topics", error: error.message });
  }
};

// @route   POST /api/topics
exports.createTopic = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { subjectId, title, description, order } = req.body;

    if (!subjectId || !title) {
      return res.status(400).json({ message: "Subject ID and Topic title are required" });
    }

    if (mongoose.connection.readyState === 1) {
      const subject = await Subject.findOne({ _id: subjectId, user: req.user._id });
      if (!subject) return res.status(404).json({ message: "Subject not found" });

      const topic = await Topic.create({
        user: req.user._id,
        subject: subjectId,
        title,
        description: description || "",
        order: order || 0,
        status: "not_started",
      });

      return res.status(201).json({
        success: true,
        message: "Topic created successfully",
        topic: {
          ...topic.toObject(),
          subTopics: [],
          subTopicCount: 0,
          completedSubTopics: 0,
          progress: 0,
        },
      });
    }

    // Local Store Mode
    const db = readDB();
    const newId = generateId();
    const newTopic = {
      _id: newId,
      id: newId,
      user: userId,
      subject: subjectId,
      title,
      description: description || "",
      order: order || 0,
      status: "not_started",
      createdAt: new Date().toISOString(),
    };

    db.topics.push(newTopic);
    writeDB(db);

    res.status(201).json({
      success: true,
      message: "Topic created successfully",
      topic: {
        ...newTopic,
        subTopics: [],
        subTopicCount: 0,
        completedSubTopics: 0,
        progress: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error creating topic", error: error.message });
  }
};

// @route   PUT /api/topics/:id
exports.updateTopic = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { title, description, status, order } = req.body;

    if (mongoose.connection.readyState === 1) {
      let topic = await Topic.findOne({ _id: req.params.id, user: req.user._id });
      if (!topic) return res.status(404).json({ message: "Topic not found" });

      if (title !== undefined) topic.title = title;
      if (description !== undefined) topic.description = description;
      if (status !== undefined) topic.status = status;
      if (order !== undefined) topic.order = Number(order);

      await topic.save();
      return res.json({ success: true, message: "Topic updated successfully", topic });
    }

    // Local Store Mode
    const db = readDB();
    const tIdx = db.topics.findIndex((t) => (t._id === req.params.id || t.id === req.params.id) && t.user.toString() === userId);
    if (tIdx === -1) return res.status(404).json({ message: "Topic not found" });

    if (title !== undefined) db.topics[tIdx].title = title;
    if (description !== undefined) db.topics[tIdx].description = description;
    if (status !== undefined) db.topics[tIdx].status = status;
    if (order !== undefined) db.topics[tIdx].order = Number(order);

    writeDB(db);
    res.json({ success: true, message: "Topic updated successfully", topic: db.topics[tIdx] });
  } catch (error) {
    res.status(500).json({ message: "Server error updating topic", error: error.message });
  }
};

// @route   PATCH /api/topics/:id/status
exports.updateTopicStatus = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { status } = req.body;

    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (mongoose.connection.readyState === 1) {
      const topic = await Topic.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { status },
        { new: true }
      );
      if (!topic) return res.status(404).json({ message: "Topic not found" });

      if (status === "completed") {
        await SubTopic.updateMany({ topic: topic._id, user: req.user._id }, { status: "completed" });
      }
      return res.json({ success: true, message: "Topic status updated", topic });
    }

    // Local Store Mode
    const db = readDB();
    const tIdx = db.topics.findIndex((t) => (t._id === req.params.id || t.id === req.params.id) && t.user.toString() === userId);
    if (tIdx === -1) return res.status(404).json({ message: "Topic not found" });

    db.topics[tIdx].status = status;
    const tId = db.topics[tIdx]._id || db.topics[tIdx].id;

    if (status === "completed") {
      db.subtopics.forEach((st) => {
        if ((st.topic || "").toString() === tId.toString()) {
          st.status = "completed";
        }
      });
    }

    writeDB(db);
    res.json({ success: true, message: "Topic status updated", topic: db.topics[tIdx] });
  } catch (error) {
    res.status(500).json({ message: "Server error updating topic status", error: error.message });
  }
};

// @route   DELETE /api/topics/:id
exports.deleteTopic = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const topicId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
      if (!topic) return res.status(404).json({ message: "Topic not found" });

      await Promise.all([
        Topic.deleteOne({ _id: topic._id }),
        SubTopic.deleteMany({ topic: topic._id }),
      ]);
      return res.json({ success: true, message: "Topic and nested sub-topics deleted successfully" });
    }

    // Local Store Mode
    const db = readDB();
    db.topics = db.topics.filter((t) => (t._id !== topicId && t.id !== topicId));
    db.subtopics = db.subtopics.filter((st) => (st.topic || "").toString() !== topicId);
    writeDB(db);

    res.json({ success: true, message: "Topic and nested sub-topics deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting topic", error: error.message });
  }
};
