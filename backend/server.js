const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

// Route imports
const authRoutes = require("./routes/authRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const topicRoutes = require("./routes/topicRoutes");
const subTopicRoutes = require("./routes/subTopicRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const taskRoutes = require("./routes/taskRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const templateRoutes = require("./routes/templateRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes (mounted with /api/ and bare prefix for seamless Vercel Serverless compatibility)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/subjects", subjectRoutes);
app.use("/subjects", subjectRoutes);

app.use("/api/topics", topicRoutes);
app.use("/topics", topicRoutes);

app.use("/api/subtopics", subTopicRoutes);
app.use("/subtopics", subTopicRoutes);

app.use("/api/sessions", sessionRoutes);
app.use("/sessions", sessionRoutes);

app.use("/api/tasks", taskRoutes);
app.use("/tasks", taskRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/analytics", analyticsRoutes);

app.use("/api/templates", templateRoutes);
app.use("/templates", templateRoutes);

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "StudyTrack API is live and operational",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

const { seedDemoUser } = require("./config/seedDemo");

const PORT = process.env.PORT || 5000;

let dbPromise = null;
const initDB = async () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        await connectDB();
        await seedDemoUser();
      } catch (err) {
        console.warn("DB initialization warning:", err.message);
      }
    })();
  }
  return dbPromise;
};

// Ensure DB is initialized for serverless requests (Vercel)
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  initDB();
}

// If running directly (e.g. locally or on standalone server)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`StudyTrack Server running on port ${PORT}`);
  });
  // Initialize DB in background without blocking server responsiveness
  initDB();
}

module.exports = app;