const mongoose = require("mongoose");
const StudySession = require("../models/StudySession");
const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const SubTopic = require("../models/SubTopic");
const Task = require("../models/Task");
const User = require("../models/User");
const { readDB } = require("../config/localStore");

// @route   GET /api/analytics/overview
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const db = readDB();
    const user = mongoose.connection.readyState === 1
      ? await User.findById(req.user._id)
      : db.users.find((u) => u._id === userId || u.id === userId);

    const sessions = mongoose.connection.readyState === 1
      ? await StudySession.find({ user: req.user._id }).populate("subject", "name color").populate("topic", "title").lean()
      : db.sessions.filter((s) => (s.user || "").toString() === userId);

    const subjects = mongoose.connection.readyState === 1
      ? await Subject.find({ user: req.user._id }).lean()
      : db.subjects.filter((s) => (s.user || "").toString() === userId);

    const topics = mongoose.connection.readyState === 1
      ? await Topic.find({ user: req.user._id }).lean()
      : db.topics.filter((t) => (t.user || "").toString() === userId);

    const subTopics = mongoose.connection.readyState === 1
      ? await SubTopic.find({ user: req.user._id }).lean()
      : db.subtopics.filter((st) => (st.user || "").toString() === userId);

    const tasks = mongoose.connection.readyState === 1
      ? await Task.find({ user: req.user._id }).lean()
      : db.tasks.filter((t) => (t.user || "").toString() === userId);

    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let yearMinutes = 0;
    let totalMinutes = 0;
    let prodSum = 0;
    let detailedLogMinutes = 0;

    sessions.forEach((s) => {
      const d = new Date(s.date);
      const mins = s.durationMinutes || 0;
      totalMinutes += mins;
      prodSum += s.productivityRating || 4;

      if (s.topic || s.subTopic) {
        detailedLogMinutes += mins;
      }

      const sDateStr = typeof s.date === "string" && s.date.includes("T") ? s.date.split("T")[0] : null;
      const sLocalStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (d >= startOfToday || sDateStr === todayStr || sLocalStr === todayStr) {
        todayMinutes += mins;
      }
      if (d >= startOfWeek) weekMinutes += mins;
      if (d >= startOfMonth) monthMinutes += mins;
      if (d >= startOfYear) yearMinutes += mins;
    });

    const taskCounts = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      total: tasks.length,
    };

    const completedSubTopics = subTopics.filter((st) => st.status === "completed").length;
    const completionRate = subTopics.length > 0 ? Math.round((completedSubTopics / subTopics.length) * 100) : 0;
    const dailyGoalMinutes = user?.dailyGoalMinutes || 180;
    const weeklyGoalMinutes = user?.weeklyGoalMinutes || (dailyGoalMinutes * 7);
    const monthlyGoalMinutes = user?.monthlyGoalMinutes || (dailyGoalMinutes * 30);
    const yearlyGoalMinutes = user?.yearlyGoalMinutes || (dailyGoalMinutes * 365);

    const dailyGoalProgress = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));
    const weeklyGoalProgress = Math.min(100, Math.round((weekMinutes / weeklyGoalMinutes) * 100));
    const monthlyGoalProgress = Math.min(100, Math.round((monthMinutes / monthlyGoalMinutes) * 100));
    const yearlyGoalProgress = Math.min(100, Math.round((yearMinutes / yearlyGoalMinutes) * 100));

    const avgProductivity = sessions.length > 0 ? Number((prodSum / sessions.length).toFixed(1)) : 0;
    const trackingDepthPercentage = totalMinutes > 0 ? Math.round((detailedLogMinutes / totalMinutes) * 100) : 0;

    res.json({
      success: true,
      stats: {
        todayMinutes,
        weekMinutes,
        monthMinutes,
        yearMinutes,
        totalMinutes,
        totalHours: Number((totalMinutes / 60).toFixed(1)),
        totalSessions: sessions.length,
        avgProductivity,
        dailyGoalProgress,
        weeklyGoalProgress,
        monthlyGoalProgress,
        yearlyGoalProgress,
        dailyGoalMinutes,
        weeklyGoalMinutes,
        monthlyGoalMinutes,
        yearlyGoalMinutes,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        subjectCount: subjects.length,
        topicCount: topics.length,
        subTopicCount: subTopics.length,
        completedSubTopicCount: completedSubTopics,
        completionRate,
        trackingDepthPercentage,
        tasks: taskCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching analytics overview", error: error.message });
  }
};

// @route   GET /api/analytics/timeseries
exports.getTimeseries = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const period = req.query.period || "week";

    const db = readDB();
    const subjects = mongoose.connection.readyState === 1
      ? await Subject.find({ user: req.user._id }).lean()
      : db.subjects.filter((s) => (s.user || "").toString() === userId);

    const subjectMap = {};
    subjects.forEach((s) => {
      subjectMap[(s._id || s.id).toString()] = { name: s.name, color: s.color, icon: s.icon };
    });

    const now = new Date();
    let startDate;
    let dataPoints = [];

    if (period === "week") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${dayNum}`;

        dataPoints.push({
          dateStr,
          label: `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
          shortLabel: dayNames[d.getDay()],
          dayName: dayNames[d.getDay()],
          totalMinutes: 0,
          sessionCount: 0,
          productivitySum: 0,
          subjects: {},
        });
      }
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${dayNum}`;

        dataPoints.push({
          dateStr,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          shortLabel: `${d.getDate()}`,
          totalMinutes: 0,
          sessionCount: 0,
          productivitySum: 0,
          subjects: {},
        });
      }
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      startDate.setHours(0, 0, 0, 0);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const keyStr = `${y}-${String(m + 1).padStart(2, "0")}`;

        dataPoints.push({
          dateStr: keyStr,
          label: `${monthNames[m]} ${y}`,
          shortLabel: monthNames[m],
          totalMinutes: 0,
          sessionCount: 0,
          productivitySum: 0,
          subjects: {},
        });
      }
    }

    const sessions = mongoose.connection.readyState === 1
      ? await StudySession.find({ user: req.user._id, date: { $gte: startDate } }).lean()
      : db.sessions.filter((s) => (s.user || "").toString() === userId && new Date(s.date) >= startDate);

    sessions.forEach((s) => {
      const sDate = new Date(s.date);
      const y = sDate.getFullYear();
      const m = String(sDate.getMonth() + 1).padStart(2, "0");
      const dayNum = String(sDate.getDate()).padStart(2, "0");
      const localDateStr = period === "year" ? `${y}-${m}` : `${y}-${m}-${dayNum}`;
      const isoDateStr = typeof s.date === "string" && s.date.includes("T") ? (period === "year" ? s.date.substring(0, 7) : s.date.split("T")[0]) : null;

      const point = dataPoints.find((p) => p.dateStr === localDateStr || (isoDateStr && p.dateStr === isoDateStr));
      if (point) {
        point.totalMinutes += s.durationMinutes || 0;
        point.sessionCount += 1;
        point.productivitySum += s.productivityRating || 4;

        const sId = (s.subject || "").toString();
        if (!point.subjects[sId]) {
          point.subjects[sId] = {
            name: subjectMap[sId] ? subjectMap[sId].name : "General",
            color: subjectMap[sId] ? subjectMap[sId].color : "#6366f1",
            minutes: 0,
          };
        }
        point.subjects[sId].minutes += s.durationMinutes || 0;
      }
    });

    const subjectTotals = {};
    let grandTotalMinutes = 0;

    const formattedPoints = dataPoints.map((p) => {
      grandTotalMinutes += p.totalMinutes;
      Object.entries(p.subjects).forEach(([sId, data]) => {
        if (!subjectTotals[sId]) {
          subjectTotals[sId] = { name: data.name, color: data.color, minutes: 0 };
        }
        subjectTotals[sId].minutes += data.minutes;
      });

      return {
        label: p.label,
        shortLabel: p.shortLabel,
        dateStr: p.dateStr,
        totalMinutes: p.totalMinutes,
        totalHours: Number((p.totalMinutes / 60).toFixed(1)),
        sessionCount: p.sessionCount,
        avgProductivity: p.sessionCount > 0 ? Number((p.productivitySum / p.sessionCount).toFixed(1)) : 0,
        subjects: Object.values(p.subjects),
      };
    });

    const subjectBreakdown = Object.values(subjectTotals).map((s) => ({
      name: s.name,
      color: s.color,
      minutes: s.minutes,
      hours: Number((s.minutes / 60).toFixed(1)),
      percentage: grandTotalMinutes > 0 ? Math.round((s.minutes / grandTotalMinutes) * 100) : 0,
    }));

    res.json({
      success: true,
      period,
      grandTotalMinutes,
      grandTotalHours: Number((grandTotalMinutes / 60).toFixed(1)),
      dataPoints: formattedPoints,
      subjectBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching timeseries analytics", error: error.message });
  }
};

// @route   GET /api/analytics/subject-breakdown
// @desc    Detailed Subject & Topic deep-dive performance stats
exports.getSubjectBreakdown = async (req, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const db = readDB();

    const subjects = mongoose.connection.readyState === 1
      ? await Subject.find({ user: req.user._id }).lean()
      : db.subjects.filter((s) => (s.user || "").toString() === userId);

    const allTopics = mongoose.connection.readyState === 1
      ? await Topic.find({ user: req.user._id }).lean()
      : db.topics.filter((t) => (t.user || "").toString() === userId);

    const allSubTopics = mongoose.connection.readyState === 1
      ? await SubTopic.find({ user: req.user._id }).lean()
      : db.subtopics.filter((st) => (st.user || "").toString() === userId);

    const allSessions = mongoose.connection.readyState === 1
      ? await StudySession.find({ user: req.user._id }).lean()
      : db.sessions.filter((sess) => (sess.user || "").toString() === userId);

    const result = subjects.map((subj) => {
      const sId = (subj._id || subj.id).toString();
      const subjectSessions = allSessions.filter((sess) => (sess.subject || "").toString() === sId);
      const subjectTopics = allTopics.filter((t) => (t.subject || "").toString() === sId);
      const subjectSubTopics = allSubTopics.filter((st) => (st.subject || "").toString() === sId);

      const totalMinutes = subjectSessions.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);
      const totalHours = Number((totalMinutes / 60).toFixed(1));
      const prodSum = subjectSessions.reduce((acc, sess) => acc + (sess.productivityRating || 4), 0);
      const avgProductivity = subjectSessions.length > 0 ? Number((prodSum / subjectSessions.length).toFixed(1)) : 0;
      const completedSubTopics = subjectSubTopics.filter((st) => st.status === "completed").length;
      const progressPercentage = subjectSubTopics.length > 0 ? Math.round((completedSubTopics / subjectSubTopics.length) * 100) : 0;
      const goalProgress = Math.min(100, Math.round((totalHours / (subj.targetHours || 20)) * 100));

      // Calculate Topic-wise breakdown inside this subject
      const topicStats = subjectTopics.map((topic) => {
        const tId = (topic._id || topic.id).toString();
        const topicSessions = subjectSessions.filter((sess) => (sess.topic || "").toString() === tId);
        const topicSubTopics = subjectSubTopics.filter((st) => (st.topic || "").toString() === tId);
        const topicMinutes = topicSessions.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);
        const completedCount = topicSubTopics.filter((st) => st.status === "completed").length;

        return {
          id: tId,
          title: topic.title,
          status: topic.status,
          minutes: topicMinutes,
          hours: Number((topicMinutes / 60).toFixed(1)),
          sessionCount: topicSessions.length,
          percentageOfSubject: totalMinutes > 0 ? Math.round((topicMinutes / totalMinutes) * 100) : 0,
          subTopicCount: topicSubTopics.length,
          completedSubTopics: completedCount,
        };
      });

      // Also calculate time logged with no specific topic (general subject study)
      const generalSessions = subjectSessions.filter((sess) => !sess.topic);
      const generalMinutes = generalSessions.reduce((acc, sess) => acc + (sess.durationMinutes || 0), 0);

      return {
        id: sId,
        name: subj.name,
        color: subj.color,
        icon: subj.icon,
        targetHours: subj.targetHours || 20,
        totalMinutes,
        totalHours,
        avgProductivity,
        topicCount: subjectTopics.length,
        subTopicCount: subjectSubTopics.length,
        completedSubTopics,
        progressPercentage,
        goalProgress,
        topics: topicStats,
        generalMinutes,
        generalHours: Number((generalMinutes / 60).toFixed(1)),
      };
    });

    res.json({ success: true, subjects: result });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching subject breakdown", error: error.message });
  }
};
