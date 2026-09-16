const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    color: {
      type: String,
      default: "#6366f1", // default indigo
    },
    icon: {
      type: String,
      default: "BookOpen",
    },
    targetHours: {
      type: Number,
      default: 20,
      min: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);
