const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/studytrack";

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.warn("MongoDB Atlas connection error:", err.message);
    console.log("Note: If using MongoDB Atlas, please verify network access / whitelist IP (0.0.0.0/0) in Atlas Console.");
    console.log("Attempting local MongoDB fallback at mongodb://127.0.0.1:27017/studytrack ...");
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/studytrack", {
        serverSelectionTimeoutMS: 3000,
      });
      console.log("Connected to Local MongoDB (127.0.0.1:27017)");
    } catch (localErr) {
      console.warn("Local MongoDB also unavailable. Please ensure MongoDB is running or Atlas IP is whitelisted.");
    }
  }
};

module.exports = connectDB;
