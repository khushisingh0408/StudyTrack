const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
      index: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      default: null,
    },
    subTopic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTopic",
      default: null,
    },
    sessionType: {
      type: String,
      enum: ["timer", "direct"],
      default: "timer",
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration in minutes is required"],
      min: [1, "Duration must be at least 1 minute"],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    productivityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4, // 1-5 scale
    },
    notes: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudySession", studySessionSchema);
