const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_FILE = path.join(__dirname, "../data/local_db.json");
const BACKUP_FILE = path.join(__dirname, "../data/local_db.backup.json");

// Ensure data directory exists
const ensureDataDir = () => {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = JSON.stringify(
      {
        users: [],
        subjects: [],
        topics: [],
        subtopics: [],
        sessions: [],
        tasks: [],
      },
      null,
      2
    );
    fs.writeFileSync(DB_FILE, initialData, "utf-8");
  }
};

ensureDataDir();

const readDB = () => {
  try {
    ensureDataDir();
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.warn("Primary local_db read error, attempting backup recovery:", e.message);
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupData = fs.readFileSync(BACKUP_FILE, "utf-8");
        const parsed = JSON.parse(backupData);
        // Restore primary from backup
        fs.writeFileSync(DB_FILE, backupData, "utf-8");
        return parsed;
      }
    } catch (bkErr) {
      console.error("Backup recovery failed:", bkErr.message);
    }
    return { users: [], subjects: [], topics: [], subtopics: [], sessions: [], tasks: [] };
  }
};

const writeDB = (data) => {
  try {
    ensureDataDir();
    const jsonStr = JSON.stringify(data, null, 2);
    // 1. Write to backup first
    try {
      fs.writeFileSync(BACKUP_FILE, jsonStr, "utf-8");
    } catch (bErr) {
      // Non-fatal
    }
    // 2. Write to main file
    fs.writeFileSync(DB_FILE, jsonStr, "utf-8");
  } catch (err) {
    console.error("Error persisting data to local_db:", err.message);
  }
};

const generateId = () => {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
};

module.exports = {
  readDB,
  writeDB,
  generateId,
};
