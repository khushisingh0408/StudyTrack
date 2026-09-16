const mongoose = require("mongoose");
const StudySession = require("../models/StudySession");
const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const SubTopic = require("../models/SubTopic");
const User = require("../models/User");
const { readDB, writeDB, generateId } = require("../config/localStore");

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getYesterdayDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// @route   POST /api/sessions
// @desc    Log a study session with optional Topic and optional Sub-Topic
exports.createSession = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    let {
      subjectId,
      subjectName,
      topicId,
      topicName,
      subTopicId,
      subTopicName,
      sessionType,
      durationMinutes,
      date,
      productivityRating,
      notes,
      tags,
      markSubTopicCompleted,
    } = req.body;

    if (!durationMinutes || Number(durationMinutes) <= 0) {
      return res.status(400).json({ message: "Valid study duration in minutes is required (e.g. 60 for 1 hour)" });
    }

    if (!subjectId && !subjectName) {
      return res.status(400).json({ message: "Subject name or selection is required" });
    }

    const sessionDate = date ? new Date(date) : new Date();
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#3b82f6", "#f43f5e"];

    // 1. Resolve Subject (Find or Auto-Create)
    if (mongoose.connection.readyState === 1) {
      let subject;
      if (subjectId) {
        subject = await Subject.findOne({ _id: subjectId, user: req.user._id });
      }
      if (!subject && subjectName) {
        subject = await Subject.findOne({ name: new RegExp(`^${subjectName.trim()}$`, "i"), user: req.user._id });
        if (!subject) {
          subject = await Subject.create({
            user: req.user._id,
            name: subjectName.trim(),
            color: colors[Math.floor(Math.random() * colors.length)],
            targetHours: 30,
          });
        }
      }
      if (!subject) {
        return res.status(400).json({ message: "Could not identify or create subject" });
      }
      subjectId = subject._id;

      // 2. Resolve Topic (Optional - Find or Auto-Create if provided)
      let resolvedTopicId = null;
      if (topicId) {
        const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
        if (topic) resolvedTopicId = topic._id;
      } else if (topicName && topicName.trim()) {
        let topic = await Topic.findOne({
          subject: subjectId,
          title: new RegExp(`^${topicName.trim()}$`, "i"),
          user: req.user._id,
        });
        if (!topic) {
          topic = await Topic.create({
            user: req.user._id,
            subject: subjectId,
            title: topicName.trim(),
            status: "in_progress",
          });
        }
        resolvedTopicId = topic._id;
      }

      // 3. Resolve Sub-Topic (Optional - Find or Auto-Create if provided)
      let resolvedSubTopicId = null;
      if (subTopicId) {
        const st = await SubTopic.findOne({ _id: subTopicId, user: req.user._id });
        if (st) resolvedSubTopicId = st._id;
      } else if (subTopicName && subTopicName.trim() && resolvedTopicId) {
        let st = await SubTopic.findOne({
          topic: resolvedTopicId,
          title: new RegExp(`^${subTopicName.trim()}$`, "i"),
          user: req.user._id,
        });
        if (!st) {
          st = await SubTopic.create({
            user: req.user._id,
            subject: subjectId,
            topic: resolvedTopicId,
            title: subTopicName.trim(),
            estimatedMinutes: Number(durationMinutes),
            status: markSubTopicCompleted ? "completed" : "in_progress",
          });
        }
        resolvedSubTopicId = st._id;
      }

      // 4. Create Session Record
      const session = await StudySession.create({
        user: req.user._id,
        subject: subjectId,
        topic: resolvedTopicId,
        subTopic: resolvedSubTopicId,
        sessionType: sessionType || "timer",
        durationMinutes: Number(durationMinutes),
        date: sessionDate,
        productivityRating: productivityRating ? Number(productivityRating) : 5,
        notes: notes || "",
        tags: tags || [],
      });

      // Update Subtopic completion if requested
      if (markSubTopicCompleted && resolvedSubTopicId) {
        await SubTopic.findByIdAndUpdate(resolvedSubTopicId, { status: "completed" });
      }

      // Update Streak
      const user = await User.findById(req.user._id);
      if (user) {
        const todayStr = getTodayDateStr();
        const yesterdayStr = getYesterdayDateStr();
        if (user.lastStudyDate === yesterdayStr) {
          user.currentStreak += 1;
        } else if (user.lastStudyDate !== todayStr) {
          user.currentStreak = 1;
        }
        if (user.currentStreak > user.longestStreak) {
          user.longestStreak = user.currentStreak;
        }
        user.lastStudyDate = todayStr;
        await user.save();
      }

      const populatedSession = await StudySession.findById(session._id)
        .populate("subject", "name color icon")
        .populate("topic", "title")
        .populate("subTopic", "title");

      return res.status(201).json({
        success: true,
        message: `Saved ${durationMinutes} mins study for ${subject.name}!`,
        session: populatedSession,
        userStreak: {
          currentStreak: user ? user.currentStreak : 0,
          longestStreak: user ? user.longestStreak : 0,
        },
      });
    }

    // Local Store Mode
    const db = readDB();

    // 1. Resolve Subject
    let subject = null;
    if (subjectId) {
      subject = db.subjects.find((s) => (s._id === subjectId || s.id === subjectId) && (s.user || "").toString() === userId);
    }
    if (!subject && subjectName) {
      subject = db.subjects.find(
        (s) => s.name.toLowerCase() === subjectName.trim().toLowerCase() && (s.user || "").toString() === userId
      );
      if (!subject) {
        const newSubjId = generateId();
        subject = {
          _id: newSubjId,
          id: newSubjId,
          user: userId,
          name: subjectName.trim(),
          color: colors[Math.floor(Math.random() * colors.length)],
          targetHours: 30,
          createdAt: new Date().toISOString(),
        };
        db.subjects.push(subject);
      }
    }
    if (!subject) {
      return res.status(400).json({ message: "Could not identify or create subject" });
    }
    const resolvedSubjectId = subject._id || subject.id;

    // 2. Resolve Topic (Optional)
    let resolvedTopicId = null;
    if (topicId) {
      const topic = db.topics.find((t) => (t._id === topicId || t.id === topicId) && (t.user || "").toString() === userId);
      if (topic) resolvedTopicId = topic._id || topic.id;
    } else if (topicName && topicName.trim()) {
      let topic = db.topics.find(
        (t) =>
          (t.subject || "").toString() === resolvedSubjectId.toString() &&
          t.title.toLowerCase() === topicName.trim().toLowerCase() &&
          (t.user || "").toString() === userId
      );
      if (!topic) {
        const newTopId = generateId();
        topic = {
          _id: newTopId,
          id: newTopId,
          user: userId,
          subject: resolvedSubjectId,
          title: topicName.trim(),
          status: "in_progress",
          createdAt: new Date().toISOString(),
        };
        db.topics.push(topic);
      }
      resolvedTopicId = topic._id || topic.id;
    }

    // 3. Resolve SubTopic (Optional)
    let resolvedSubTopicId = null;
    if (subTopicId) {
      const st = db.subtopics.find((s) => (s._id === subTopicId || s.id === subTopicId) && (s.user || "").toString() === userId);
      if (st) resolvedSubTopicId = st._id || st.id;
    } else if (subTopicName && subTopicName.trim() && resolvedTopicId) {
      let st = db.subtopics.find(
        (s) =>
          (s.topic || "").toString() === resolvedTopicId.toString() &&
          s.title.toLowerCase() === subTopicName.trim().toLowerCase() &&
          (s.user || "").toString() === userId
      );
      if (!st) {
        const newStId = generateId();
        st = {
          _id: newStId,
          id: newStId,
          user: userId,
          subject: resolvedSubjectId,
          topic: resolvedTopicId,
          title: subTopicName.trim(),
          estimatedMinutes: Number(durationMinutes),
          status: markSubTopicCompleted ? "completed" : "in_progress",
          createdAt: new Date().toISOString(),
        };
        db.subtopics.push(st);
      }
      resolvedSubTopicId = st._id || st.id;
    }

    // 4. Create Session
    const newSessionId = generateId();
    const newSession = {
      _id: newSessionId,
      id: newSessionId,
      user: userId,
      subject: resolvedSubjectId,
      topic: resolvedTopicId || null,
      subTopic: resolvedSubTopicId || null,
      sessionType: sessionType || "timer",
      durationMinutes: Number(durationMinutes),
      date: sessionDate.toISOString(),
      productivityRating: productivityRating ? Number(productivityRating) : 5,
      notes: notes || "",
      tags: tags || [],
      createdAt: new Date().toISOString(),
    };
    db.sessions.push(newSession);

    if (markSubTopicCompleted && resolvedSubTopicId) {
      const stIdx = db.subtopics.findIndex((s) => s._id === resolvedSubTopicId || s.id === resolvedSubTopicId);
      if (stIdx !== -1) db.subtopics[stIdx].status = "completed";
    }

    // Update Streak
    const userIdx = db.users.findIndex((u) => u._id === userId || u.id === userId);
    let currentStreak = 0;
    let longestStreak = 0;

    if (userIdx !== -1) {
      const todayStr = getTodayDateStr();
      const yesterdayStr = getYesterdayDateStr();

      if (db.users[userIdx].lastStudyDate === yesterdayStr) {
        db.users[userIdx].currentStreak = (db.users[userIdx].currentStreak || 0) + 1;
      } else if (db.users[userIdx].lastStudyDate !== todayStr) {
        db.users[userIdx].currentStreak = 1;
      }

      if (db.users[userIdx].currentStreak > (db.users[userIdx].longestStreak || 0)) {
        db.users[userIdx].longestStreak = db.users[userIdx].currentStreak;
      }
      db.users[userIdx].lastStudyDate = todayStr;

      currentStreak = db.users[userIdx].currentStreak;
      longestStreak = db.users[userIdx].longestStreak;
    }

    writeDB(db);

    const topic = resolvedTopicId ? db.topics.find((t) => (t._id || t.id).toString() === resolvedTopicId.toString()) : null;
    const subTopic = resolvedSubTopicId ? db.subtopics.find((st) => (st._id || st.id).toString() === resolvedSubTopicId.toString()) : null;

    res.status(201).json({
      success: true,
      message: `Saved ${durationMinutes} mins study for ${subject.name}!`,
      session: {
        ...newSession,
        subject: { name: subject.name, color: subject.color, icon: subject.icon },
        topic: topic ? { title: topic.title } : null,
        subTopic: subTopic ? { title: subTopic.title } : null,
      },
      userStreak: {
        currentStreak,
        longestStreak,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error saving study session", error: error.message });
  }
};

// @route   GET /api/sessions
exports.getSessions = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { subjectId, startDate, endDate, limit = 50, page = 1 } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = { user: req.user._id };
      if (subjectId) filter.subject = subjectId;
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.date.$lte = end;
        }
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [sessions, total] = await Promise.all([
        StudySession.find(filter)
          .sort({ date: -1, createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("subject", "name color icon")
          .populate("topic", "title")
          .populate("subTopic", "title")
          .lean(),
        StudySession.countDocuments(filter),
      ]);
      return res.json({ success: true, total, page: Number(page), limit: Number(limit), sessions });
    }

    // Local Store Mode
    const db = readDB();
    let sessions = db.sessions.filter((s) => (s.user || "").toString() === userId);

    if (subjectId) {
      sessions = sessions.filter((s) => (s.subject || "").toString() === subjectId.toString());
    }

    if (startDate || endDate) {
      sessions = sessions.filter((s) => {
        const d = new Date(s.date);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      });
    }

    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = sessions.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginated = sessions.slice(skip, skip + Number(limit));

    const populated = paginated.map((s) => {
      const subject = db.subjects.find((subj) => (subj._id || subj.id).toString() === (s.subject || "").toString());
      const topic = db.topics.find((t) => (t._id || t.id).toString() === (s.topic || "").toString());
      const subTopic = db.subtopics.find((st) => (st._id || st.id).toString() === (s.subTopic || "").toString());
      return {
        ...s,
        subject: subject ? { name: subject.name, color: subject.color, icon: subject.icon } : null,
        topic: topic ? { title: topic.title } : null,
        subTopic: subTopic ? { title: subTopic.title } : null,
      };
    });

    res.json({ success: true, total, page: Number(page), limit: Number(limit), sessions: populated });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching sessions", error: error.message });
  }
};

// @route   DELETE /api/sessions/:id
exports.deleteSession = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const sId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const session = await StudySession.findOneAndDelete({ _id: sId, user: req.user._id });
      if (!session) return res.status(404).json({ message: "Session not found" });
      return res.json({ success: true, message: "Study session deleted successfully" });
    }

    // Local Store Mode
    const db = readDB();
    db.sessions = db.sessions.filter((s) => s._id !== sId && s.id !== sId);
    writeDB(db);

    res.json({ success: true, message: "Study session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting session", error: error.message });
  }
};
