const mongoose = require("mongoose");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { readDB, writeDB, generateId } = require("../config/localStore");
const { seedDemoUser, DEMO_EMAIL } = require("../config/seedDemo");

const generateToken = (userObj) => {
  let payload;
  if (typeof userObj === "object" && userObj !== null) {
    payload = {
      id: (userObj._id || userObj.id || "").toString(),
      name: userObj.name || "Scholar",
      email: (userObj.email || "").toLowerCase(),
      academicField: userObj.academicField || "engineering",
      targetExam: userObj.targetExam || "",
      targetExamDate: userObj.targetExamDate || null,
      dailyGoalMinutes: userObj.dailyGoalMinutes ? Number(userObj.dailyGoalMinutes) : 120,
      weeklyGoalMinutes: userObj.weeklyGoalMinutes ? Number(userObj.weeklyGoalMinutes) : 840,
      currentStreak: userObj.currentStreak || 1,
      longestStreak: userObj.longestStreak || 1,
    };
  } else {
    payload = { id: String(userObj) };
  }

  return jwt.sign(payload, process.env.JWT_SECRET || "studytrack_super_secret_jwt_key_2026_secure_key", {
    expiresIn: "90d",
  });
};

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, dailyGoalMinutes, weeklyGoalMinutes, academicField, targetExam, targetExamDate } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        dailyGoalMinutes: dailyGoalMinutes ? Number(dailyGoalMinutes) : 120,
        weeklyGoalMinutes: weeklyGoalMinutes ? Number(weeklyGoalMinutes) : 840,
        academicField: academicField || "engineering",
        targetExam: targetExam || "",
        targetExamDate: targetExamDate ? new Date(targetExamDate) : null,
      });

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          academicField: user.academicField,
          targetExam: user.targetExam,
          targetExamDate: user.targetExamDate,
          dailyGoalMinutes: user.dailyGoalMinutes,
          weeklyGoalMinutes: user.weeklyGoalMinutes,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
        },
      });
    }

    // Local Store Mode
    const db = readDB();
    const existing = db.users.find((u) => u.email === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUserId = generateId();

    const newUser = {
      _id: newUserId,
      id: newUserId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      dailyGoalMinutes: dailyGoalMinutes ? Number(dailyGoalMinutes) : 120,
      weeklyGoalMinutes: weeklyGoalMinutes ? Number(weeklyGoalMinutes) : 840,
      academicField: academicField || "engineering",
      targetExam: targetExam || "",
      targetExamDate: targetExamDate || null,
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDB(db);

    const token = generateToken(newUser);
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email/username and password" });
    }

    const rawIdentifier = email.trim();
    const candidateSet = new Set();
    candidateSet.add(rawIdentifier.toLowerCase());

    // Support compound inputs like "khushikumari33031@gmail.com/khushi" or "khushi/khushikumari33031@gmail.com"
    if (rawIdentifier.includes("/") || rawIdentifier.includes(",")) {
      const parts = rawIdentifier.split(/[\/,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      parts.forEach((p) => candidateSet.add(p));
    }
    const candidates = Array.from(candidateSet);

    // If attempting demo login, ensure demo is seeded
    if (candidates.some((c) => c === "demo@studytrack.com" || c === "demo" || c === "demo student")) {
      await seedDemoUser();
    }

    if (mongoose.connection.readyState === 1) {
      const queryList = [];
      candidates.forEach((c) => {
        queryList.push({ email: c });
        const escaped = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        queryList.push({ name: new RegExp(`^${escaped}$`, "i") });
      });

      const user = await User.findOne({ $or: queryList });
      if (!user) {
        return res.status(401).json({
          message: "No account found with this email/username. Please register or check spelling.",
          notFound: true,
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          message: "Incorrect password for this account. Please try again.",
          wrongPassword: true,
        });
      }

      const token = generateToken(user);

      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          academicField: user.academicField,
          targetExam: user.targetExam,
          targetExamDate: user.targetExamDate,
          dailyGoalMinutes: user.dailyGoalMinutes,
          weeklyGoalMinutes: user.weeklyGoalMinutes,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
        },
      });
    }

    // Local Store Mode
    let db = readDB();
    let user = db.users.find((u) => {
      const uEmail = (u.email || "").toLowerCase();
      const uName = (u.name || "").toLowerCase();
      return candidates.some((c) => {
        if (uEmail === c || uName === c) return true;
        // Check if candidate matches username ignoring spaces
        if (uName.replace(/\s+/g, "") === c.replace(/\s+/g, "")) return true;
        // Check if candidate contains email
        if (c.includes("@") && c.includes(uEmail)) return true;
        return false;
      });
    });

    if (!user) {
      return res.status(401).json({
        message: "No account found with this email/username. Please register or check spelling.",
        notFound: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect password for this account. Please try again.",
        wrongPassword: true,
      });
    }

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};

// @route   POST /api/auth/demo-login
exports.demoLogin = async (req, res) => {
  try {
    await seedDemoUser();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: DEMO_EMAIL });
      if (!user) {
        return res.status(404).json({ message: "Demo account could not be initialized" });
      }
      const token = generateToken(user);
      return res.json({
        success: true,
        message: "Demo Login Successful",
        token,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          academicField: user.academicField,
          targetExam: user.targetExam,
          targetExamDate: user.targetExamDate,
          dailyGoalMinutes: user.dailyGoalMinutes,
          weeklyGoalMinutes: user.weeklyGoalMinutes,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
        },
      });
    }

    const db = readDB();
    const user = db.users.find((u) => (u.email || "").toLowerCase() === DEMO_EMAIL);
    if (!user) {
      return res.status(404).json({ message: "Demo account could not be initialized" });
    }

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      message: "Demo Login Successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during demo login", error: error.message });
  }
};

// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Please provide email/username and new password" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const rawIdentifier = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({
        $or: [
          { email: rawIdentifier },
          { name: new RegExp(`^${rawIdentifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
        ],
      });
      if (!user) {
        return res.status(404).json({ message: "No account found with this email/username" });
      }
      user.password = newPassword;
      await user.save();
      return res.json({ success: true, message: "Password reset successful! You can now log in." });
    }

    const db = readDB();
    const userIndex = db.users.findIndex(
      (u) =>
        (u.email || "").toLowerCase() === rawIdentifier ||
        (u.name || "").toLowerCase() === rawIdentifier ||
        (u.name || "").toLowerCase().replace(/\s+/g, "") === rawIdentifier.replace(/\s+/g, "")
    );

    if (userIndex === -1) {
      return res.status(404).json({ message: "No account found with this email/username" });
    }

    const salt = await bcrypt.genSalt(10);
    db.users[userIndex].password = await bcrypt.hash(newPassword, salt);
    writeDB(db);

    res.json({ success: true, message: "Password reset successful! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error resetting password", error: error.message });
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id).select("-password");
      return res.json({ success: true, user });
    }

    const db = readDB();
    const user = db.users.find((u) => u._id === req.user._id || u.id === req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching profile", error: error.message });
  }
};

// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, newPassword, password, dailyGoalMinutes, weeklyGoalMinutes, academicField, targetExam, targetExamDate } = req.body;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (name) user.name = name.trim();
      if (email) user.email = email.trim().toLowerCase();
      if (newPassword || password) {
        const passToSet = (newPassword || password).trim();
        if (passToSet.length >= 6) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(passToSet, salt);
        }
      }
      if (dailyGoalMinutes !== undefined) user.dailyGoalMinutes = Number(dailyGoalMinutes);
      if (weeklyGoalMinutes !== undefined) user.weeklyGoalMinutes = Number(weeklyGoalMinutes);
      if (academicField) user.academicField = academicField;
      if (targetExam !== undefined) user.targetExam = targetExam;
      if (targetExamDate !== undefined) user.targetExamDate = targetExamDate ? new Date(targetExamDate) : null;

      await user.save();
      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          academicField: user.academicField,
          targetExam: user.targetExam,
          targetExamDate: user.targetExamDate,
          dailyGoalMinutes: user.dailyGoalMinutes,
          weeklyGoalMinutes: user.weeklyGoalMinutes,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
        },
      });
    }

    // Local Store Mode
    const db = readDB();
    const userIdx = db.users.findIndex((u) => u._id === req.user._id || u.id === req.user._id);
    if (userIdx === -1) return res.status(404).json({ message: "User not found" });

    if (name) db.users[userIdx].name = name.trim();
    if (email) db.users[userIdx].email = email.trim().toLowerCase();
    if (newPassword || password) {
      const passToSet = (newPassword || password).trim();
      if (passToSet.length >= 6) {
        const salt = await bcrypt.genSalt(10);
        db.users[userIdx].password = await bcrypt.hash(passToSet, salt);
      }
    }
    if (dailyGoalMinutes !== undefined) db.users[userIdx].dailyGoalMinutes = Number(dailyGoalMinutes);
    if (weeklyGoalMinutes !== undefined) db.users[userIdx].weeklyGoalMinutes = Number(weeklyGoalMinutes);
    if (academicField) db.users[userIdx].academicField = academicField;
    if (targetExam !== undefined) db.users[userIdx].targetExam = targetExam;
    if (targetExamDate !== undefined) db.users[userIdx].targetExamDate = targetExamDate;

    writeDB(db);

    const { password: _, ...safeUser } = db.users[userIdx];
    res.json({ success: true, message: "Profile updated successfully", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Server error updating profile", error: error.message });
  }
};
