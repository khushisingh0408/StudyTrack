const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { readDB } = require("../config/localStore");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "studytrack_super_secret_jwt_key_2026_secure_key");

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id).select("-password");
    } else {
      const db = readDB();
      user = db.users.find((u) => u._id === decoded.id || u.id === decoded.id);
      if (user) {
        const { password, ...safeUser } = user;
        user = safeUser;
      }
    }

    if (!user) {
      return res.status(401).json({ message: "User not found or token invalid." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token", error: error.message });
  }
};

module.exports = authMiddleware;
