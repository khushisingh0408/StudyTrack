const fs = require("fs");
const path = require("path");

const ORIGINAL_DB_FILE = path.join(__dirname, "../data/local_db.json");
const ORIGINAL_BACKUP_FILE = path.join(__dirname, "../data/local_db.backup.json");

// In serverless (e.g. Vercel), the filesystem is read-only except /tmp
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const TMP_DB_FILE = path.join("/tmp", "studytrack_db.json");
const TMP_BACKUP_FILE = path.join("/tmp", "studytrack_db.backup.json");

const DB_FILE = isServerless ? TMP_DB_FILE : ORIGINAL_DB_FILE;
const BACKUP_FILE = isServerless ? TMP_BACKUP_FILE : ORIGINAL_BACKUP_FILE;

// Memory cache fallback in case disk writes are blocked
let memoryDB = null;

// Ensure data directory and seed data exists
const ensureDataDir = () => {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      // If we are in serverless, try to seed from ORIGINAL_DB_FILE
      if (isServerless && fs.existsSync(ORIGINAL_DB_FILE)) {
        try {
          const originalContent = fs.readFileSync(ORIGINAL_DB_FILE, "utf-8");
          fs.writeFileSync(DB_FILE, originalContent, "utf-8");
          return;
        } catch (e) {
          // Fallback to initial seed
        }
      }

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
  } catch (e) {
    // If filesystem write fails, initialize memoryDB
    if (!memoryDB) {
      if (fs.existsSync(ORIGINAL_DB_FILE)) {
        try {
          memoryDB = JSON.parse(fs.readFileSync(ORIGINAL_DB_FILE, "utf-8"));
        } catch (err) {
          memoryDB = { users: [], subjects: [], topics: [], subtopics: [], sessions: [], tasks: [] };
        }
      } else {
        memoryDB = { users: [], subjects: [], topics: [], subtopics: [], sessions: [], tasks: [] };
      }
    }
  }
};

ensureDataDir();

const readDB = () => {
  if (memoryDB) {
    return memoryDB;
  }

  try {
    ensureDataDir();
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupData = fs.readFileSync(BACKUP_FILE, "utf-8");
        const parsed = JSON.parse(backupData);
        try {
          fs.writeFileSync(DB_FILE, backupData, "utf-8");
        } catch (we) {}
        return parsed;
      }
      if (fs.existsSync(ORIGINAL_DB_FILE)) {
        return JSON.parse(fs.readFileSync(ORIGINAL_DB_FILE, "utf-8"));
      }
    } catch (bkErr) {}

    if (!memoryDB) {
      memoryDB = { users: [], subjects: [], topics: [], subtopics: [], sessions: [], tasks: [] };
    }
    return memoryDB;
  }
};

const writeDB = (data) => {
  memoryDB = data;
  try {
    ensureDataDir();
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(BACKUP_FILE, jsonStr, "utf-8");
    } catch (bErr) {}
    fs.writeFileSync(DB_FILE, jsonStr, "utf-8");
  } catch (err) {
    // Disk write error in serverless - handled by memoryDB cache
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
