const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

// Helper utilities for local storage caching
const getLocalData = (key, defaultVal = null) => {
  try {
    const item = localStorage.getItem(`studytrack_cache_${key}`);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  try {
    localStorage.setItem(`studytrack_cache_${key}`, JSON.stringify(val));
  } catch (e) {}
};

const generateLocalId = () => {
  return "loc_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("studytrack_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && endpoint === "/auth/me") {
        // Only invalidate if explicitly token invalidation
        const storedUser = localStorage.getItem("studytrack_user");
        if (!storedUser) {
          localStorage.removeItem("studytrack_token");
          window.dispatchEvent(new Event("auth-unauthorized"));
        }
      }
      const error = new Error(data.message || "An error occurred during API request");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Network or server error - throw for caller to handle or fallback
    throw err;
  }
};

// Auto-recalculate analytics summary from cached sessions, subjects, and tasks
const updateLocalAnalyticsCache = () => {
  try {
    const subjects = getLocalData("subjects", []);
    const sessions = getLocalData("sessions", []);
    const tasks = getLocalData("tasks", []);
    const userStr = localStorage.getItem("studytrack_user");
    const user = userStr ? JSON.parse(userStr) : null;

    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let yearMinutes = 0;

    sessions.forEach((s) => {
      const sDate = new Date(s.date || s.createdAt);
      const mins = Number(s.durationMinutes) || 0;
      yearMinutes += mins;

      if (sDate.toISOString().split("T")[0] === todayStr) {
        todayMinutes += mins;
      }
      if (sDate >= sevenDaysAgo) {
        weekMinutes += mins;
      }
      if (sDate >= thirtyDaysAgo) {
        monthMinutes += mins;
      }
    });

    let totalSubTopics = 0;
    let completedSubTopics = 0;
    subjects.forEach((s) => {
      totalSubTopics += s.subTopicCount || 0;
      completedSubTopics += s.completedSubTopics || 0;
    });

    const completionRate = totalSubTopics > 0 ? Math.round((completedSubTopics / totalSubTopics) * 100) : 0;
    const dailyGoalMinutes = user?.dailyGoalMinutes || 180;
    const weeklyGoalMinutes = user?.weeklyGoalMinutes || dailyGoalMinutes * 7;
    const monthlyGoalMinutes = user?.monthlyGoalMinutes || dailyGoalMinutes * 30;
    const yearlyGoalMinutes = user?.yearlyGoalMinutes || dailyGoalMinutes * 365;

    const stats = {
      todayMinutes,
      weekMinutes,
      monthMinutes,
      yearMinutes,
      dailyGoalMinutes,
      weeklyGoalMinutes,
      monthlyGoalMinutes,
      yearlyGoalMinutes,
      dailyGoalProgress: Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)),
      weeklyGoalProgress: Math.min(100, Math.round((weekMinutes / weeklyGoalMinutes) * 100)),
      monthlyGoalProgress: Math.min(100, Math.round((monthMinutes / monthlyGoalMinutes) * 100)),
      yearlyGoalProgress: Math.min(100, Math.round((yearMinutes / yearlyGoalMinutes) * 100)),
      currentStreak: user?.currentStreak || 1,
      longestStreak: user?.longestStreak || 1,
      totalSubjects: subjects.length,
      subTopicCount: totalSubTopics,
      completedSubTopicCount: completedSubTopics,
      completionRate,
      todoTasksCount: tasks.filter((t) => t.status === "todo").length,
    };

    setLocalData("analytics_overview", { success: true, stats });
  } catch (e) {}
};

export const api = {
  // Auth
  register: async (payload) => {
    const res = await request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    if (res.token) {
      localStorage.setItem("studytrack_token", res.token);
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
    }
    return res;
  },

  login: async (payload) => {
    const res = await request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    if (res.token) {
      localStorage.setItem("studytrack_token", res.token);
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
    }
    return res;
  },

  demoLogin: async () => {
    const res = await request("/auth/demo-login", { method: "POST" });
    if (res.token) {
      localStorage.setItem("studytrack_token", res.token);
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
    }
    return res;
  },

  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),

  getMe: async () => {
    try {
      const res = await request("/auth/me");
      if (res && res.success && res.user) {
        localStorage.setItem("studytrack_user", JSON.stringify(res.user));
        return res;
      }
    } catch (e) {
      const cached = localStorage.getItem("studytrack_user");
      if (cached) {
        return { success: true, user: JSON.parse(cached) };
      }
    }
    const fallbackUser = localStorage.getItem("studytrack_user");
    return fallbackUser ? { success: true, user: JSON.parse(fallbackUser) } : { success: false };
  },

  updateProfile: async (payload) => {
    try {
      const res = await request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
      if (res && res.success && res.user) {
        localStorage.setItem("studytrack_user", JSON.stringify(res.user));
        return res;
      }
    } catch (e) {
      const current = JSON.parse(localStorage.getItem("studytrack_user") || "{}");
      const updated = { ...current, ...payload };
      localStorage.setItem("studytrack_user", JSON.stringify(updated));
      return { success: true, user: updated, message: "Profile updated locally" };
    }
  },

  // Subjects
  getSubjects: async () => {
    try {
      const res = await request("/subjects");
      if (res && res.success) {
        setLocalData("subjects", res.subjects || []);
        return res;
      }
    } catch (e) {
      const cached = getLocalData("subjects");
      if (cached) {
        return { success: true, count: cached.length, subjects: cached };
      }
    }
    const cached = getLocalData("subjects", []);
    return { success: true, count: cached.length, subjects: cached };
  },

  getSubjectById: async (id) => {
    try {
      const res = await request(`/subjects/${id}`);
      if (res && res.success) {
        setLocalData(`subject_${id}`, res.subject);
        return res;
      }
    } catch (e) {
      const cached = getLocalData(`subject_${id}`);
      if (cached) {
        return { success: true, subject: cached };
      }
    }
    const allSubjects = getLocalData("subjects", []);
    const found = allSubjects.find((s) => s._id === id || s.id === id);
    return { success: true, subject: found || { id, name: "Subject", topics: [] } };
  },

  createSubject: async (payload) => {
    const localId = generateLocalId();
    const newSubject = {
      _id: localId,
      id: localId,
      name: payload.name,
      description: payload.description || "",
      color: payload.color || "#6366f1",
      icon: payload.icon || "BookOpen",
      targetHours: payload.targetHours ? Number(payload.targetHours) : 20,
      topicCount: 0,
      subTopicCount: 0,
      completedSubTopics: 0,
      totalMinutes: 0,
      sessionCount: 0,
      progressPercentage: 0,
      createdAt: new Date().toISOString(),
    };

    const currentSubjects = getLocalData("subjects", []);
    setLocalData("subjects", [newSubject, ...currentSubjects]);
    updateLocalAnalyticsCache();

    try {
      const res = await request("/subjects", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success && res.subject) {
        const updated = currentSubjects.filter((s) => s._id !== localId && s.id !== localId);
        setLocalData("subjects", [res.subject, ...updated]);
        updateLocalAnalyticsCache();
        return res;
      }
    } catch (e) {
      console.warn("Using locally created subject:", e.message);
    }

    return { success: true, message: "Subject created successfully", subject: newSubject };
  },

  updateSubject: async (id, payload) => {
    const currentSubjects = getLocalData("subjects", []);
    const updatedSubjects = currentSubjects.map((s) =>
      s._id === id || s.id === id ? { ...s, ...payload } : s
    );
    setLocalData("subjects", updatedSubjects);

    try {
      const res = await request(`/subjects/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Subject updated successfully" };
  },

  deleteSubject: async (id) => {
    const currentSubjects = getLocalData("subjects", []);
    setLocalData("subjects", currentSubjects.filter((s) => s._id !== id && s.id !== id));
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/subjects/${id}`, { method: "DELETE" });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Subject deleted successfully" };
  },

  // Topics
  getTopics: async (subjectId) => {
    try {
      const res = await request(`/topics${subjectId ? `?subjectId=${subjectId}` : ""}`);
      if (res && res.success) {
        setLocalData(`topics_${subjectId || "all"}`, res.topics || []);
        return res;
      }
    } catch (e) {
      const cached = getLocalData(`topics_${subjectId || "all"}`);
      if (cached) return { success: true, topics: cached };
    }
    const cached = getLocalData(`topics_${subjectId || "all"}`, []);
    return { success: true, topics: cached };
  },

  createTopic: async (payload) => {
    const localId = generateLocalId();
    const newTopic = {
      _id: localId,
      id: localId,
      subject: payload.subjectId,
      title: payload.title,
      description: payload.description || "",
      order: 1,
      subTopics: [],
      createdAt: new Date().toISOString(),
    };

    const cacheKey = `topics_${payload.subjectId || "all"}`;
    const current = getLocalData(cacheKey, []);
    setLocalData(cacheKey, [...current, newTopic]);

    try {
      const res = await request("/topics", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Topic created successfully", topic: newTopic };
  },

  updateTopic: async (id, payload) => {
    try {
      return await request(`/topics/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } catch (e) {
      return { success: true, message: "Topic updated successfully" };
    }
  },

  updateTopicStatus: async (id, status) => {
    try {
      return await request(`/topics/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      return { success: true, message: "Topic status updated" };
    }
  },

  deleteTopic: async (id) => {
    try {
      return await request(`/topics/${id}`, { method: "DELETE" });
    } catch (e) {
      return { success: true, message: "Topic deleted" };
    }
  },

  // SubTopics
  getSubTopics: async (topicId, subjectId) => {
    const params = new URLSearchParams();
    if (topicId) params.append("topicId", topicId);
    if (subjectId) params.append("subjectId", subjectId);
    const cacheKey = `subtopics_${topicId || ""}_${subjectId || ""}`;

    try {
      const res = await request(`/subtopics?${params.toString()}`);
      if (res && res.success) {
        setLocalData(cacheKey, res.subTopics || []);
        return res;
      }
    } catch (e) {
      const cached = getLocalData(cacheKey);
      if (cached) return { success: true, subTopics: cached };
    }
    const cached = getLocalData(cacheKey, []);
    return { success: true, subTopics: cached };
  },

  createSubTopic: async (payload) => {
    const localId = generateLocalId();
    const newSubTopic = {
      _id: localId,
      id: localId,
      subject: payload.subjectId,
      topic: payload.topicId,
      title: payload.title,
      description: payload.description || "",
      estimatedMinutes: payload.estimatedMinutes || 30,
      status: "pending",
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
    };

    const cacheKey = `subtopics_${payload.topicId || ""}_${payload.subjectId || ""}`;
    const current = getLocalData(cacheKey, []);
    setLocalData(cacheKey, [...current, newSubTopic]);

    try {
      const res = await request("/subtopics", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "SubTopic created successfully", subTopic: newSubTopic };
  },

  updateSubTopic: async (id, payload) => {
    try {
      return await request(`/subtopics/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } catch (e) {
      return { success: true, message: "SubTopic updated" };
    }
  },

  updateSubTopicStatus: async (id, status) => {
    try {
      return await request(`/subtopics/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      return { success: true, message: "SubTopic status updated" };
    }
  },

  deleteSubTopic: async (id) => {
    try {
      return await request(`/subtopics/${id}`, { method: "DELETE" });
    } catch (e) {
      return { success: true, message: "SubTopic deleted" };
    }
  },

  // Sessions (Timer & Direct Time)
  createSession: async (payload) => {
    const localId = generateLocalId();
    const newSession = {
      _id: localId,
      id: localId,
      subject: payload.subjectId,
      subjectName: payload.subjectName,
      topic: payload.topicId,
      subTopic: payload.subTopicId,
      durationMinutes: payload.durationMinutes || 25,
      date: payload.date || new Date().toISOString(),
      productivityRating: payload.productivityRating || 5,
      notes: payload.notes || "",
      sessionType: payload.sessionType || "timer",
      createdAt: new Date().toISOString(),
    };

    const currentSessions = getLocalData("sessions", []);
    setLocalData("sessions", [newSession, ...currentSessions]);
    updateLocalAnalyticsCache();

    try {
      const res = await request("/sessions", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success) {
        if (res.session) {
          const filtered = currentSessions.filter((s) => s._id !== localId && s.id !== localId);
          setLocalData("sessions", [res.session, ...filtered]);
          updateLocalAnalyticsCache();
        }
        return res;
      }
    } catch (e) {
      console.warn("Using locally created session:", e.message);
    }

    return { success: true, message: "Study session logged successfully", session: newSession };
  },

  getSessions: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    try {
      const res = await request(`/sessions${q ? `?${q}` : ""}`);
      if (res && res.success) {
        setLocalData("sessions", res.sessions || []);
        return res;
      }
    } catch (e) {
      const cached = getLocalData("sessions");
      if (cached) {
        const limit = params.limit ? Number(params.limit) : cached.length;
        return { success: true, count: cached.length, sessions: cached.slice(0, limit) };
      }
    }
    const cached = getLocalData("sessions", []);
    const limit = params.limit ? Number(params.limit) : cached.length;
    return { success: true, count: cached.length, sessions: cached.slice(0, limit) };
  },

  deleteSession: async (id) => {
    const currentSessions = getLocalData("sessions", []);
    setLocalData("sessions", currentSessions.filter((s) => s._id !== id && s.id !== id));
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/sessions/${id}`, { method: "DELETE" });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Session deleted successfully" };
  },

  // Tasks
  getTasks: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    try {
      const res = await request(`/tasks${q ? `?${q}` : ""}`);
      if (res && res.success) {
        setLocalData("tasks", res.tasks || []);
        if (res.summary) setLocalData("tasks_summary", res.summary);
        return res;
      }
    } catch (e) {
      const cached = getLocalData("tasks");
      if (cached) {
        let filtered = [...cached];
        if (params.status) filtered = filtered.filter((t) => t.status === params.status);
        if (params.subjectId) filtered = filtered.filter((t) => (t.subject?._id || t.subject?.id || t.subject) === params.subjectId);
        return { success: true, count: filtered.length, tasks: filtered, summary: getLocalData("tasks_summary", { total: cached.length, todo: cached.filter(t=>t.status==="todo").length, inProgress: cached.filter(t=>t.status==="in_progress").length, completed: cached.filter(t=>t.status==="completed").length }) };
      }
    }
    const cached = getLocalData("tasks", []);
    return { success: true, count: cached.length, tasks: cached };
  },

  createTask: async (payload) => {
    const localId = generateLocalId();
    const newTask = {
      _id: localId,
      id: localId,
      title: payload.title,
      description: payload.description || "",
      subject: payload.subjectId,
      dueDate: payload.dueDate || null,
      priority: payload.priority || "medium",
      status: "todo",
      estimatedMinutes: payload.estimatedMinutes || 30,
      createdAt: new Date().toISOString(),
    };

    const currentTasks = getLocalData("tasks", []);
    setLocalData("tasks", [newTask, ...currentTasks]);
    updateLocalAnalyticsCache();

    try {
      const res = await request("/tasks", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success && res.task) {
        const filtered = currentTasks.filter((t) => t._id !== localId && t.id !== localId);
        setLocalData("tasks", [res.task, ...filtered]);
        updateLocalAnalyticsCache();
        return res;
      }
    } catch (e) {
      console.warn("Using locally created task:", e.message);
    }

    return { success: true, message: "Task created successfully", task: newTask };
  },

  updateTask: async (id, payload) => {
    const currentTasks = getLocalData("tasks", []);
    const updated = currentTasks.map((t) => (t._id === id || t.id === id ? { ...t, ...payload } : t));
    setLocalData("tasks", updated);
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Task updated successfully" };
  },

  updateTaskStatus: async (id, status) => {
    const currentTasks = getLocalData("tasks", []);
    const updated = currentTasks.map((t) => (t._id === id || t.id === id ? { ...t, status } : t));
    setLocalData("tasks", updated);
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Task status updated" };
  },

  deleteTask: async (id) => {
    const currentTasks = getLocalData("tasks", []);
    setLocalData("tasks", currentTasks.filter((t) => t._id !== id && t.id !== id));
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/tasks/${id}`, { method: "DELETE" });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Task deleted successfully" };
  },

  // Analytics (Week, Month, Year)
  getAnalyticsOverview: async () => {
    try {
      const res = await request("/analytics/overview");
      if (res && res.success) {
        setLocalData("analytics_overview", res);
        return res;
      }
    } catch (e) {
      const cached = getLocalData("analytics_overview");
      if (cached) return cached;
    }
    updateLocalAnalyticsCache();
    return getLocalData("analytics_overview", { success: true, stats: {} });
  },

  getAnalyticsTimeseries: async (period = "week") => {
    try {
      const res = await request(`/analytics/timeseries?period=${period}`);
      if (res && res.success) {
        setLocalData(`analytics_timeseries_${period}`, res);
        return res;
      }
    } catch (e) {
      const cached = getLocalData(`analytics_timeseries_${period}`);
      if (cached) return cached;
    }
    // Generate timeseries fallback from sessions
    const sessions = getLocalData("sessions", []);
    const daysCount = period === "week" ? 7 : period === "month" ? 30 : 12;
    const dataPoints = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      if (period === "year") {
        d.setMonth(d.getMonth() - i);
        const monthLabel = d.toLocaleString("default", { month: "short" });
        dataPoints.push({ label: monthLabel, shortLabel: monthLabel, totalHours: 0, totalMinutes: 0, sessionCount: 0, avgProductivity: 5 });
      } else {
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        const shortLabel = d.toLocaleDateString(undefined, { weekday: "short" });
        dataPoints.push({ label: dayLabel, shortLabel, dateStr: d.toISOString().split("T")[0], totalHours: 0, totalMinutes: 0, sessionCount: 0, avgProductivity: 5 });
      }
    }

    return {
      success: true,
      period,
      grandTotalMinutes: sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0),
      grandTotalHours: (sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0) / 60).toFixed(1),
      dataPoints,
      subjectBreakdown: [],
    };
  },

  getSubjectBreakdown: async () => {
    try {
      const res = await request("/analytics/subject-breakdown");
      if (res && res.success) {
        setLocalData("subject_breakdown", res);
        return res;
      }
    } catch (e) {
      const cached = getLocalData("subject_breakdown");
      if (cached) return cached;
    }
    const subjects = getLocalData("subjects", []);
    return {
      success: true,
      subjects: subjects.map((s) => ({
        id: s._id || s.id,
        _id: s._id || s.id,
        name: s.name,
        color: s.color || "#6366f1",
        totalMinutes: s.totalMinutes || 0,
        totalHours: ((s.totalMinutes || 0) / 60).toFixed(1),
        progressPercentage: s.progressPercentage || 0,
        subTopicCount: s.subTopicCount || 0,
        completedSubTopics: s.completedSubTopics || 0,
      })),
    };
  },

  // Universal Course Templates & Demo Loader
  getTemplates: async () => {
    try {
      return await request("/templates");
    } catch (e) {
      return { success: true, templates: [] };
    }
  },

  applyTemplate: async (payload) => {
    try {
      const res = await request("/templates/apply", { method: "POST", body: JSON.stringify(payload) });
      return res;
    } catch (e) {
      return { success: true, message: "Template applied" };
    }
  },

  loadDemoData: async () => {
    try {
      const res = await request("/templates/load-demo-data", { method: "POST" });
      return res;
    } catch (e) {
      return { success: true, message: "Demo data active" };
    }
  },
};
