const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { readDB, writeDB } = require("../config/localStore");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "studytrack_super_secret_jwt_key_2026_secure_key");

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      const db = readDB();
      const found = db.users.find((u) => u._id === decoded.id || u.id === decoded.id);
      if (found) {
        const { password, ...safeUser } = found;
        user = safeUser;
      } else if (decoded.id) {
        // Construct valid user from verified JWT payload (ensures stateless serverless persistence)
        user = {
          _id: decoded.id,
          id: decoded.id,
          name: decoded.name || "Scholar",
          email: decoded.email || "student@studytrack.com",
          academicField: decoded.academicField || "engineering",
          targetExam: decoded.targetExam || "Target Exam",
          targetExamDate: decoded.targetExamDate || null,
          dailyGoalMinutes: decoded.dailyGoalMinutes || 180,
          weeklyGoalMinutes: decoded.weeklyGoalMinutes || 1260,
          monthlyGoalMinutes: decoded.monthlyGoalMinutes || 5400,
          yearlyGoalMinutes: decoded.yearlyGoalMinutes || 64800,
          currentStreak: decoded.currentStreak || 1,
          longestStreak: decoded.longestStreak || 1,
        };
        db.users.push(user);
        writeDB(db);
      }
    }

    if (!user) {
      user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name || "Scholar",
        email: decoded.email || "student@studytrack.com",
        academicField: decoded.academicField || "engineering",
        targetExam: decoded.targetExam || "Target Exam",
        dailyGoalMinutes: decoded.dailyGoalMinutes || 180,
        weeklyGoalMinutes: decoded.weeklyGoalMinutes || 1260,
        monthlyGoalMinutes: decoded.monthlyGoalMinutes || 5400,
        yearlyGoalMinutes: decoded.yearlyGoalMinutes || 64800,
        currentStreak: 1,
        longestStreak: 1,
      };
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token", error: error.message });
  }
};

module.exports = authMiddleware;
