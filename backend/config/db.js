const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      if (mongoose.connection.readyState === 1) return;
      console.log("Connecting to MongoDB Atlas...");
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log("MongoDB Connected Successfully");
      return;
    } catch (err) {
      console.warn("MongoDB Atlas connection error:", err.message);
    }
  }

  // If in Serverless (Vercel) and no mongoUri is supplied, use the built-in fast local/memory store directly
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log("Serverless mode without MongoDB URI: Using fast localStore database.");
    return;
  }

  // If local development, try local MongoDB
  try {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect("mongodb://127.0.0.1:27017/studytrack", {
      serverSelectionTimeoutMS: 2000,
    });
    console.log("Connected to Local MongoDB (127.0.0.1:27017)");
  } catch (localErr) {
    console.log("Local MongoDB not detected. Operating in localStore DB mode.");
  }
};

module.exports = connectDB;
