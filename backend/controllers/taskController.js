const mongoose = require("mongoose");
const Task = require("../models/Task");
const { readDB, writeDB, generateId } = require("../config/localStore");

// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { status, priority, subjectId, topicId } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = { user: req.user._id };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (subjectId) filter.subject = subjectId;
      if (topicId) filter.topic = topicId;

      const tasks = await Task.find(filter)
        .sort({ dueDate: 1, createdAt: -1 })
        .populate("subject", "name color icon")
        .populate("topic", "title")
        .populate("subTopic", "title")
        .lean();

      const summary = {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        completed: tasks.filter((t) => t.status === "completed").length,
      };
      return res.json({ success: true, summary, tasks });
    }

    // Local Store Mode
    const db = readDB();
    let tasks = db.tasks.filter((t) => (t.user || "").toString() === userId);

    if (status) tasks = tasks.filter((t) => t.status === status);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);
    if (subjectId) tasks = tasks.filter((t) => (t.subject || "").toString() === subjectId.toString());
    if (topicId) tasks = tasks.filter((t) => (t.topic || "").toString() === topicId.toString());

    tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const populated = tasks.map((t) => {
      const subject = db.subjects.find((s) => (s._id || s.id).toString() === (t.subject || "").toString());
      const topic = db.topics.find((tp) => (tp._id || tp.id).toString() === (t.topic || "").toString());
      const subTopic = db.subtopics.find((st) => (st._id || st.id).toString() === (t.subTopic || "").toString());
      return {
        ...t,
        subject: subject
          ? { _id: subject._id || subject.id, id: subject._id || subject.id, name: subject.name, color: subject.color, icon: subject.icon }
          : null,
        topic: topic ? { _id: topic._id || topic.id, id: topic._id || topic.id, title: topic.title } : null,
        subTopic: subTopic ? { _id: subTopic._id || subTopic.id, id: subTopic._id || subTopic.id, title: subTopic.title } : null,
      };
    });

    const allUserTasks = db.tasks.filter((t) => (t.user || "").toString() === userId);
    const summary = {
      total: allUserTasks.length,
      todo: allUserTasks.filter((t) => t.status === "todo").length,
      inProgress: allUserTasks.filter((t) => t.status === "in_progress").length,
      completed: allUserTasks.filter((t) => t.status === "completed").length,
    };

    res.json({ success: true, summary, tasks: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching tasks", error: error.message });
  }
};

// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { subjectId, topicId, subTopicId, title, description, dueDate, priority, estimatedMinutes } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (mongoose.connection.readyState === 1) {
      const task = await Task.create({
        user: req.user._id,
        subject: subjectId || null,
        topic: topicId || null,
        subTopic: subTopicId || null,
        title,
        description: description || "",
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        status: "todo",
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : 30,
      });

      const populatedTask = await Task.findById(task._id)
        .populate("subject", "name color icon")
        .populate("topic", "title")
        .populate("subTopic", "title");

      return res.status(201).json({ success: true, message: "Task created successfully", task: populatedTask });
    }

    // Local Store Mode
    const db = readDB();
    const newId = generateId();
    const newTask = {
      _id: newId,
      id: newId,
      user: userId,
      subject: subjectId || null,
      topic: topicId || null,
      subTopic: subTopicId || null,
      title,
      description: description || "",
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority: priority || "medium",
      status: "todo",
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : 30,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    db.tasks.push(newTask);
    writeDB(db);

    const subject = db.subjects.find((s) => (s._id || s.id).toString() === (subjectId || "").toString());
    const topic = db.topics.find((t) => (t._id || t.id).toString() === (topicId || "").toString());
    const subTopic = db.subtopics.find((st) => (st._id || st.id).toString() === (subTopicId || "").toString());

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: {
        ...newTask,
        subject: subject
          ? { _id: subject._id || subject.id, id: subject._id || subject.id, name: subject.name, color: subject.color, icon: subject.icon }
          : null,
        topic: topic ? { _id: topic._id || topic.id, id: topic._id || topic.id, title: topic.title } : null,
        subTopic: subTopic ? { _id: subTopic._id || subTopic.id, id: subTopic._id || subTopic.id, title: subTopic.title } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error creating task", error: error.message });
  }
};

// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { title, description, dueDate, priority, status, estimatedMinutes, subjectId, topicId, subTopicId } = req.body;

    if (mongoose.connection.readyState === 1) {
      let task = await Task.findOne({ _id: req.params.id, user: req.user._id });
      if (!task) return res.status(404).json({ message: "Task not found" });

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
      if (priority !== undefined) task.priority = priority;
      if (estimatedMinutes !== undefined) task.estimatedMinutes = Number(estimatedMinutes);
      if (subjectId !== undefined) task.subject = subjectId || null;
      if (topicId !== undefined) task.topic = topicId || null;
      if (subTopicId !== undefined) task.subTopic = subTopicId || null;

      if (status !== undefined) {
        task.status = status;
        if (status === "completed" && !task.completedAt) task.completedAt = new Date();
        else if (status !== "completed") task.completedAt = null;
      }

      await task.save();
      const populatedTask = await Task.findById(task._id)
        .populate("subject", "name color icon")
        .populate("topic", "title")
        .populate("subTopic", "title");
      return res.json({ success: true, message: "Task updated successfully", task: populatedTask });
    }

    // Local Store Mode
    const db = readDB();
    const tIdx = db.tasks.findIndex((t) => (t._id === req.params.id || t.id === req.params.id) && t.user.toString() === userId);
    if (tIdx === -1) return res.status(404).json({ message: "Task not found" });

    if (title !== undefined) db.tasks[tIdx].title = title;
    if (description !== undefined) db.tasks[tIdx].description = description;
    if (dueDate !== undefined) db.tasks[tIdx].dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    if (priority !== undefined) db.tasks[tIdx].priority = priority;
    if (estimatedMinutes !== undefined) db.tasks[tIdx].estimatedMinutes = Number(estimatedMinutes);
    if (subjectId !== undefined) db.tasks[tIdx].subject = subjectId || null;
    if (topicId !== undefined) db.tasks[tIdx].topic = topicId || null;
    if (subTopicId !== undefined) db.tasks[tIdx].subTopic = subTopicId || null;

    if (status !== undefined) {
      db.tasks[tIdx].status = status;
      if (status === "completed") db.tasks[tIdx].completedAt = new Date().toISOString();
      else db.tasks[tIdx].completedAt = null;
    }

    writeDB(db);

    const task = db.tasks[tIdx];
    const subject = db.subjects.find((s) => (s._id || s.id).toString() === (task.subject || "").toString());
    const topic = db.topics.find((tp) => (tp._id || tp.id).toString() === (task.topic || "").toString());
    const subTopic = db.subtopics.find((st) => (st._id || st.id).toString() === (task.subTopic || "").toString());

    res.json({
      success: true,
      message: "Task updated successfully",
      task: {
        ...task,
        subject: subject
          ? { _id: subject._id || subject.id, id: subject._id || subject.id, name: subject.name, color: subject.color, icon: subject.icon }
          : null,
        topic: topic ? { _id: topic._id || topic.id, id: topic._id || topic.id, title: topic.title } : null,
        subTopic: subTopic ? { _id: subTopic._id || subTopic.id, id: subTopic._id || subTopic.id, title: subTopic.title } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error updating task", error: error.message });
  }
};

// @route   PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { status } = req.body;

    if (!["todo", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid task status" });
    }

    if (mongoose.connection.readyState === 1) {
      const completedAt = status === "completed" ? new Date() : null;
      const task = await Task.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { status, completedAt },
        { new: true }
      )
        .populate("subject", "name color icon")
        .populate("topic", "title")
        .populate("subTopic", "title");

      if (!task) return res.status(404).json({ message: "Task not found" });
      return res.json({ success: true, message: "Task status updated", task });
    }

    // Local Store Mode
    const db = readDB();
    const tIdx = db.tasks.findIndex((t) => (t._id === req.params.id || t.id === req.params.id) && t.user.toString() === userId);
    if (tIdx === -1) return res.status(404).json({ message: "Task not found" });

    db.tasks[tIdx].status = status;
    db.tasks[tIdx].completedAt = status === "completed" ? new Date().toISOString() : null;
    writeDB(db);

    const task = db.tasks[tIdx];
    const subject = db.subjects.find((s) => (s._id || s.id).toString() === (task.subject || "").toString());
    const topic = db.topics.find((tp) => (tp._id || tp.id).toString() === (task.topic || "").toString());
    const subTopic = db.subtopics.find((st) => (st._id || st.id).toString() === (task.subTopic || "").toString());

    res.json({
      success: true,
      message: "Task status updated",
      task: {
        ...task,
        subject: subject
          ? { _id: subject._id || subject.id, id: subject._id || subject.id, name: subject.name, color: subject.color, icon: subject.icon }
          : null,
        topic: topic ? { _id: topic._id || topic.id, id: topic._id || topic.id, title: topic.title } : null,
        subTopic: subTopic ? { _id: subTopic._id || subTopic.id, id: subTopic._id || subTopic.id, title: subTopic.title } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error updating task status", error: error.message });
  }
};

// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const tId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const task = await Task.findOneAndDelete({ _id: tId, user: req.user._id });
      if (!task) return res.status(404).json({ message: "Task not found" });
      return res.json({ success: true, message: "Task deleted successfully" });
    }

    // Local Store Mode
    const db = readDB();
    db.tasks = db.tasks.filter((t) => t._id !== tId && t.id !== tId);
    writeDB(db);

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting task", error: error.message });
  }
};
