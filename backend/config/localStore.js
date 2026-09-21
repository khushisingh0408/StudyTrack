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

// Memory cache
let memoryDB = null;

// Ensure data directory and seed data exists
const ensureDataDir = () => {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      // If in serverless, try to seed from ORIGINAL_DB_FILE
      if (isServerless && fs.existsSync(ORIGINAL_DB_FILE)) {
        try {
          const originalContent = fs.readFileSync(ORIGINAL_DB_FILE, "utf-8");
          fs.writeFileSync(DB_FILE, originalContent, "utf-8");
          return;
        } catch (e) {}
      }

      if (fs.existsSync(BACKUP_FILE)) {
        try {
          const backupContent = fs.readFileSync(BACKUP_FILE, "utf-8");
          fs.writeFileSync(DB_FILE, backupContent, "utf-8");
          return;
        } catch (e) {}
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
    console.error("ensureDataDir error:", e.message);
  }
};

ensureDataDir();

const readDB = () => {
  try {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.users)) {
          memoryDB = parsed;
          return memoryDB;
        }
      }
    }
  } catch (err) {
    // If reading primary DB_FILE failed or was locked, try reading BACKUP_FILE
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupData = fs.readFileSync(BACKUP_FILE, "utf-8");
        if (backupData && backupData.trim()) {
          const parsed = JSON.parse(backupData);
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.users)) {
            memoryDB = parsed;
            try {
              fs.writeFileSync(DB_FILE, backupData, "utf-8");
            } catch (we) {}
            return memoryDB;
          }
        }
      }
    } catch (bErr) {}
  }

  // If memoryDB already has data, return it instead of wiping
  if (memoryDB && Array.isArray(memoryDB.users) && memoryDB.users.length > 0) {
    return memoryDB;
  }

  // Fallback to original DB file if in serverless
  try {
    if (fs.existsSync(ORIGINAL_DB_FILE)) {
      const origData = fs.readFileSync(ORIGINAL_DB_FILE, "utf-8");
      const parsed = JSON.parse(origData);
      if (parsed && Array.isArray(parsed.users)) {
        memoryDB = parsed;
        return memoryDB;
      }
    }
  } catch (origErr) {}

  if (!memoryDB) {
    memoryDB = { users: [], subjects: [], topics: [], subtopics: [], sessions: [], tasks: [] };
  }
  return memoryDB;
};

const writeDB = (data) => {
  if (!data || typeof data !== "object") return;
  memoryDB = data;
  try {
    ensureDataDir();
    const jsonStr = JSON.stringify(data, null, 2);
    // Write backup first
    try {
      fs.writeFileSync(BACKUP_FILE, jsonStr, "utf-8");
    } catch (bErr) {}
    // Write main file
    fs.writeFileSync(DB_FILE, jsonStr, "utf-8");
  } catch (err) {
    console.error("writeDB error:", err.message);
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
