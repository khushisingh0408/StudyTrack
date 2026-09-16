const mongoose = require("mongoose");
const SubTopic = require("../models/SubTopic");
const Topic = require("../models/Topic");
const { readDB, writeDB, generateId } = require("../config/localStore");

// @route   GET /api/subtopics
exports.getSubTopics = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { topicId, subjectId } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = { user: req.user._id };
      if (topicId) filter.topic = topicId;
      if (subjectId) filter.subject = subjectId;

      const subTopics = await SubTopic.find(filter)
        .sort({ order: 1, createdAt: 1 })
        .populate("topic", "title status")
        .populate("subject", "name color icon")
        .lean();
      return res.json({ success: true, count: subTopics.length, subTopics });
    }

    // Local Store Mode
    const db = readDB();
    let subTopics = db.subtopics.filter((st) => (st.user || "").toString() === userId);
    if (topicId) subTopics = subTopics.filter((st) => (st.topic || "").toString() === topicId.toString());
    if (subjectId) subTopics = subTopics.filter((st) => (st.subject || "").toString() === subjectId.toString());

    const populated = subTopics.map((st) => {
      const topic = db.topics.find((t) => (t._id || t.id).toString() === (st.topic || "").toString());
      const subject = db.subjects.find((s) => (s._id || s.id).toString() === (st.subject || "").toString());
      return {
        ...st,
        topic: topic ? { title: topic.title, status: topic.status } : null,
        subject: subject ? { name: subject.name, color: subject.color, icon: subject.icon } : null,
      };
    });

    res.json({ success: true, count: populated.length, subTopics: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching subtopics", error: error.message });
  }
};

// @route   POST /api/subtopics
exports.createSubTopic = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { topicId, title, description, estimatedMinutes, notes, order } = req.body;

    if (!topicId || !title) {
      return res.status(400).json({ message: "Topic ID and Sub-Topic title are required" });
    }

    if (mongoose.connection.readyState === 1) {
      const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
      if (!topic) return res.status(404).json({ message: "Parent topic not found" });

      const subTopic = await SubTopic.create({
        user: req.user._id,
        subject: topic.subject,
        topic: topic._id,
        title,
        description: description || "",
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : 30,
        notes: notes || "",
        order: order || 0,
        status: "not_started",
      });

      return res.status(201).json({ success: true, message: "Sub-topic created successfully", subTopic });
    }

    // Local Store Mode
    const db = readDB();
    const topic = db.topics.find((t) => (t._id === topicId || t.id === topicId) && t.user.toString() === userId);
    if (!topic) return res.status(404).json({ message: "Parent topic not found" });

    const newId = generateId();
    const newSubTopic = {
      _id: newId,
      id: newId,
      user: userId,
      subject: topic.subject,
      topic: topic._id || topic.id,
      title,
      description: description || "",
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : 30,
      notes: notes || "",
      order: order || 0,
      status: "not_started",
      createdAt: new Date().toISOString(),
    };

    db.subtopics.push(newSubTopic);
    writeDB(db);

    res.status(201).json({ success: true, message: "Sub-topic created successfully", subTopic: newSubTopic });
  } catch (error) {
    res.status(500).json({ message: "Server error creating sub-topic", error: error.message });
  }
};

// @route   PUT /api/subtopics/:id
exports.updateSubTopic = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { title, description, estimatedMinutes, notes, status, order } = req.body;

    if (mongoose.connection.readyState === 1) {
      let subTopic = await SubTopic.findOne({ _id: req.params.id, user: req.user._id });
      if (!subTopic) return res.status(404).json({ message: "Sub-topic not found" });

      if (title !== undefined) subTopic.title = title;
      if (description !== undefined) subTopic.description = description;
      if (estimatedMinutes !== undefined) subTopic.estimatedMinutes = Number(estimatedMinutes);
      if (notes !== undefined) subTopic.notes = notes;
      if (status !== undefined) subTopic.status = status;
      if (order !== undefined) subTopic.order = Number(order);

      await subTopic.save();
      return res.json({ success: true, message: "Sub-topic updated successfully", subTopic });
    }

    // Local Store Mode
    const db = readDB();
    const stIdx = db.subtopics.findIndex((st) => (st._id === req.params.id || st.id === req.params.id) && st.user.toString() === userId);
    if (stIdx === -1) return res.status(404).json({ message: "Sub-topic not found" });

    if (title !== undefined) db.subtopics[stIdx].title = title;
    if (description !== undefined) db.subtopics[stIdx].description = description;
    if (estimatedMinutes !== undefined) db.subtopics[stIdx].estimatedMinutes = Number(estimatedMinutes);
    if (notes !== undefined) db.subtopics[stIdx].notes = notes;
    if (status !== undefined) db.subtopics[stIdx].status = status;
    if (order !== undefined) db.subtopics[stIdx].order = Number(order);

    writeDB(db);
    res.json({ success: true, message: "Sub-topic updated successfully", subTopic: db.subtopics[stIdx] });
  } catch (error) {
    res.status(500).json({ message: "Server error updating sub-topic", error: error.message });
  }
};

// @route   PATCH /api/subtopics/:id/status
exports.updateSubTopicStatus = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { status } = req.body;

    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (mongoose.connection.readyState === 1) {
      const subTopic = await SubTopic.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { status },
        { new: true }
      );
      if (!subTopic) return res.status(404).json({ message: "Sub-topic not found" });

      const allTopicSubTopics = await SubTopic.find({ topic: subTopic.topic, user: req.user._id });
      const allCompleted = allTopicSubTopics.length > 0 && allTopicSubTopics.every((st) => st.status === "completed");
      const anyInProgress = allTopicSubTopics.some((st) => st.status === "in_progress" || st.status === "completed");

      let topicStatus = "not_started";
      if (allCompleted) topicStatus = "completed";
      else if (anyInProgress) topicStatus = "in_progress";

      await Topic.findByIdAndUpdate(subTopic.topic, { status: topicStatus });
      return res.json({ success: true, message: "Sub-topic status updated", subTopic, topicStatus });
    }

    // Local Store Mode
    const db = readDB();
    const stIdx = db.subtopics.findIndex((st) => (st._id === req.params.id || st.id === req.params.id) && st.user.toString() === userId);
    if (stIdx === -1) return res.status(404).json({ message: "Sub-topic not found" });

    db.subtopics[stIdx].status = status;
    const parentTopicId = (db.subtopics[stIdx].topic || "").toString();

    const siblings = db.subtopics.filter((st) => (st.topic || "").toString() === parentTopicId);
    const allCompleted = siblings.length > 0 && siblings.every((st) => st.status === "completed");
    const anyInProgress = siblings.some((st) => st.status === "in_progress" || st.status === "completed");

    let topicStatus = "not_started";
    if (allCompleted) topicStatus = "completed";
    else if (anyInProgress) topicStatus = "in_progress";

    const tIdx = db.topics.findIndex((t) => (t._id || t.id).toString() === parentTopicId);
    if (tIdx !== -1) {
      db.topics[tIdx].status = topicStatus;
    }

    writeDB(db);
    res.json({ success: true, message: "Sub-topic status updated", subTopic: db.subtopics[stIdx], topicStatus });
  } catch (error) {
    res.status(500).json({ message: "Server error updating sub-topic status", error: error.message });
  }
};

// @route   DELETE /api/subtopics/:id
exports.deleteSubTopic = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const stId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const subTopic = await SubTopic.findOneAndDelete({ _id: stId, user: req.user._id });
      if (!subTopic) return res.status(404).json({ message: "Sub-topic not found" });
      return res.json({ success: true, message: "Sub-topic deleted successfully" });
    }

    // Local Store Mode
    const db = readDB();
    db.subtopics = db.subtopics.filter((st) => st._id !== stId && st.id !== stId);
    writeDB(db);

    res.json({ success: true, message: "Sub-topic deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting sub-topic", error: error.message });
  }
};
