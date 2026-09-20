const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const SubTopic = require("../models/SubTopic");
const StudySession = require("../models/StudySession");
const Task = require("../models/Task");
const { readDB, writeDB, generateId } = require("./localStore");

const DEMO_EMAIL = "demo@studytrack.com";
const DEMO_PASSWORD = "demo12345";
const DEMO_USER_ID = "demo_user_studytrack";

const seedDemoUser = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    // 1. Seed in Local Store
    const db = readDB();
    let localDemoUser = db.users.find((u) => (u.email || "").toLowerCase() === DEMO_EMAIL);

    if (!localDemoUser) {
      localDemoUser = {
        _id: DEMO_USER_ID,
        id: DEMO_USER_ID,
        name: "Demo Student",
        email: DEMO_EMAIL,
        password: hashedPassword,
        dailyGoalMinutes: 180,
        weeklyGoalMinutes: 1260,
        monthlyGoalMinutes: 5400,
        yearlyGoalMinutes: 64800,
        academicField: "engineering",
        targetExam: "GATE CS & Tech Interviews 2026",
        targetExamDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        currentStreak: 5,
        longestStreak: 12,
        lastStudyDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
      };
      db.users.push(localDemoUser);

      // Create sample subjects for demo user
      const s1Id = "sub_dsa_" + generateId();
      const s2Id = "sub_cn_" + generateId();
      const s3Id = "sub_os_" + generateId();
      const s4Id = "sub_dbms_" + generateId();

      const subjects = [
        {
          _id: s1Id,
          id: s1Id,
          user: DEMO_USER_ID,
          name: "Data Structures & Algorithms",
          description: "Arrays, Trees, Graphs, Dynamic Programming & LeetCode Practice",
          color: "#6366f1",
          icon: "Code2",
          targetHours: 70,
          createdAt: new Date().toISOString(),
        },
        {
          _id: s2Id,
          id: s2Id,
          user: DEMO_USER_ID,
          name: "Computer Networks",
          description: "OSI 7 Layers, TCP/IP, Routing Protocols, DNS, HTTP",
          color: "#3b82f6",
          icon: "Network",
          targetHours: 45,
          createdAt: new Date().toISOString(),
        },
        {
          _id: s3Id,
          id: s3Id,
          user: DEMO_USER_ID,
          name: "Operating Systems",
          description: "Processes, Threads, CPU Scheduling, Virtual Memory, Deadlocks",
          color: "#06b6d4",
          icon: "Cpu",
          targetHours: 40,
          createdAt: new Date().toISOString(),
        },
        {
          _id: s4Id,
          id: s4Id,
          user: DEMO_USER_ID,
          name: "Database Management Systems (DBMS)",
          description: "SQL Queries, ACID Properties, Normalization, Indexing",
          color: "#10b981",
          icon: "Database",
          targetHours: 40,
          createdAt: new Date().toISOString(),
        },
      ];

      db.subjects.push(...subjects);

      // Topics & Subtopics
      const t1Id = "top_trees_" + generateId();
      const t2Id = "top_dp_" + generateId();
      const t3Id = "top_tcp_" + generateId();

      db.topics.push(
        {
          _id: t1Id,
          id: t1Id,
          user: DEMO_USER_ID,
          subject: s1Id,
          title: "Trees & Binary Search Trees",
          description: "Traversals, LCA, Segment Trees",
          order: 0,
          status: "completed",
          createdAt: new Date().toISOString(),
        },
        {
          _id: t2Id,
          id: t2Id,
          user: DEMO_USER_ID,
          subject: s1Id,
          title: "Dynamic Programming",
          description: "Knapsack, LCS, Matrix Chain Multiplication",
          order: 1,
          status: "in_progress",
          createdAt: new Date().toISOString(),
        },
        {
          _id: t3Id,
          id: t3Id,
          user: DEMO_USER_ID,
          subject: s2Id,
          title: "Transport Layer & Flow Control",
          description: "TCP 3-Way Handshake, Sliding Window",
          order: 0,
          status: "completed",
          createdAt: new Date().toISOString(),
        }
      );

      db.subtopics.push(
        {
          _id: "subt_" + generateId(),
          id: "subt_" + generateId(),
          user: DEMO_USER_ID,
          subject: s1Id,
          topic: t1Id,
          title: "Binary Tree Traversals (In/Pre/Post/Level Order)",
          estimatedMinutes: 45,
          notes: "BFS queue vs DFS recursion stack",
          status: "completed",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "subt_" + generateId(),
          id: "subt_" + generateId(),
          user: DEMO_USER_ID,
          subject: s1Id,
          topic: t2Id,
          title: "0/1 Knapsack Problem & Memoization",
          estimatedMinutes: 50,
          notes: "dp[i][w] = max(dp[i-1][w], val[i-1] + dp[i-1][w-wt[i-1]])",
          status: "in_progress",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "subt_" + generateId(),
          id: "subt_" + generateId(),
          user: DEMO_USER_ID,
          subject: s2Id,
          topic: t3Id,
          title: "TCP 3-Way Handshake & Teardown",
          estimatedMinutes: 40,
          notes: "SYN, SYN-ACK, ACK sequence and sequence numbers",
          status: "completed",
          createdAt: new Date().toISOString(),
        }
      );

      // Sample Study Sessions (for realistic charts)
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const sessionDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = sessionDate.toISOString().split("T")[0];
        const minutes = [90, 120, 150, 80, 140, 180, 110][6 - i] || 120;

        db.sessions.push({
          _id: "sess_" + generateId(),
          id: "sess_" + generateId(),
          user: DEMO_USER_ID,
          subject: s1Id,
          topic: t1Id,
          durationMinutes: minutes,
          date: sessionDate.toISOString(),
          dateString: dateStr,
          mode: "timer",
          efficiency: 90,
          notes: "Focused study session with active problem solving",
          createdAt: sessionDate.toISOString(),
        });
      }

      // Sample Tasks
      db.tasks.push(
        {
          _id: "task_" + generateId(),
          id: "task_" + generateId(),
          user: DEMO_USER_ID,
          title: "Solve 5 DP questions on LeetCode",
          subject: s1Id,
          priority: "high",
          dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "task_" + generateId(),
          id: "task_" + generateId(),
          user: DEMO_USER_ID,
          title: "Revise TCP vs UDP header structure",
          subject: s2Id,
          priority: "medium",
          dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: "completed",
          createdAt: new Date().toISOString(),
        }
      );

      writeDB(db);
      console.log("✅ Demo account seeded in LocalStore (demo@studytrack.com / demo12345)");
    }

    // 2. Seed in MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      let mongoUser = await User.findOne({ email: DEMO_EMAIL });
      if (!mongoUser) {
        mongoUser = await User.create({
          name: "Demo Student",
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          dailyGoalMinutes: 180,
          weeklyGoalMinutes: 1260,
          monthlyGoalMinutes: 5400,
          yearlyGoalMinutes: 64800,
          academicField: "engineering",
          targetExam: "GATE CS & Tech Interviews 2026",
          targetExamDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          currentStreak: 5,
          longestStreak: 12,
          lastStudyDate: new Date().toISOString().split("T")[0],
        });
        console.log("✅ Demo account seeded in MongoDB Atlas (demo@studytrack.com / demo12345)");
      }
    }
  } catch (err) {
    console.warn("⚠️ Demo seeding error:", err.message);
  }
};

module.exports = {
  seedDemoUser,
  DEMO_EMAIL,
  DEMO_PASSWORD,
};
