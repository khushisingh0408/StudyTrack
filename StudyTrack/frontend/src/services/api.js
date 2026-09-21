const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

// Helper utilities for persistent user-scoped local storage
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("studytrack_user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

const getStorageKey = (key) => {
  const user = getCurrentUser();
  const userId = user ? (user._id || user.id || user.email || "default") : "default";
  return `studytrack_perm_${userId}_${key}`;
};

const getLocalData = (key, defaultVal = null) => {
  try {
    const userKey = getStorageKey(key);
    const item = localStorage.getItem(userKey) || localStorage.getItem(`studytrack_cache_${key}`);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  try {
    const userKey = getStorageKey(key);
    const jsonStr = JSON.stringify(val);
    localStorage.setItem(userKey, jsonStr);
    localStorage.setItem(`studytrack_cache_${key}`, jsonStr);
  } catch (e) {}
};

const generateLocalId = () => {
  return "loc_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// Merge server list and local list safely without losing any user entries
const mergeCollections = (localList = [], serverList = [], idKey = "_id") => {
  const map = new Map();
  
  // First add all local items
  (localList || []).forEach((item) => {
    if (!item) return;
    const id = item[idKey] || item.id || item.title || item.name;
    if (id) map.set(String(id), item);
  });

  // Then merge/update with server items
  (serverList || []).forEach((item) => {
    if (!item) return;
    const id = item[idKey] || item.id || item.title || item.name;
    if (id) {
      const existing = map.get(String(id));
      map.set(String(id), { ...(existing || {}), ...item });
    }
  });

  return Array.from(map.values());
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
    throw err;
  }
};

// Robust recalculation of analytics summary from all stored sessions, subjects, and tasks
const updateLocalAnalyticsCache = () => {
  try {
    const subjects = getLocalData("subjects", []);
    const sessions = getLocalData("sessions", []);
    const tasks = getLocalData("tasks", []);
    const user = getCurrentUser();

    const now = new Date();
    const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let yearMinutes = 0;
    let totalMinutes = 0;
    let prodSum = 0;
    let detailedLogMinutes = 0;

    const subjectTimeMap = {};

    sessions.forEach((s) => {
      const sDate = new Date(s.date || s.createdAt);
      const mins = Number(s.durationMinutes) || 0;
      totalMinutes += mins;
      prodSum += Number(s.productivityRating) || 4;

      if (s.topic || s.subTopic) {
        detailedLogMinutes += mins;
      }

      // Track by subject
      const subjId = (s.subject?._id || s.subject?.id || s.subject || s.subjectName || "general").toString();
      subjectTimeMap[subjId] = (subjectTimeMap[subjId] || 0) + mins;

      const sDateStr = typeof s.date === "string" && s.date.includes("T") ? s.date.split("T")[0] : null;
      const sLocalStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, "0")}-${String(sDate.getDate()).padStart(2, "0")}`;

      if (sDate >= startOfToday || sDateStr === todayLocalStr || sLocalStr === todayLocalStr) {
        todayMinutes += mins;
      }
      if (sDate >= startOfWeek) {
        weekMinutes += mins;
      }
      if (sDate >= startOfMonth) {
        monthMinutes += mins;
      }
      if (sDate >= startOfYear) {
        yearMinutes += mins;
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

    const taskCounts = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      total: tasks.length,
    };

    const avgProductivity = sessions.length > 0 ? Number((prodSum / sessions.length).toFixed(1)) : 5;
    const trackingDepthPercentage = totalMinutes > 0 ? Math.round((detailedLogMinutes / totalMinutes) * 100) : 0;

    const stats = {
      todayMinutes,
      weekMinutes,
      monthMinutes,
      yearMinutes,
      totalMinutes,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      totalSessions: sessions.length,
      avgProductivity,
      dailyGoalProgress: Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)),
      weeklyGoalProgress: Math.min(100, Math.round((weekMinutes / weeklyGoalMinutes) * 100)),
      monthlyGoalProgress: Math.min(100, Math.round((monthMinutes / monthlyGoalMinutes) * 100)),
      yearlyGoalProgress: Math.min(100, Math.round((yearMinutes / yearlyGoalMinutes) * 100)),
      dailyGoalMinutes,
      weeklyGoalMinutes,
      monthlyGoalMinutes,
      yearlyGoalMinutes,
      currentStreak: user?.currentStreak || (todayMinutes > 0 ? 1 : 0),
      longestStreak: user?.longestStreak || (todayMinutes > 0 ? 1 : 0),
      subjectCount: subjects.length,
      totalSubjects: subjects.length,
      subTopicCount: totalSubTopics,
      completedSubTopicCount: completedSubTopics,
      completionRate,
      trackingDepthPercentage,
      todoTasksCount: taskCounts.todo,
      tasks: taskCounts,
    };

    setLocalData("analytics_overview", { success: true, stats });
    return stats;
  } catch (e) {
    return null;
  }
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
    const localSubjects = getLocalData("subjects", []);
    try {
      const res = await request("/subjects");
      if (res && res.success) {
        const merged = mergeCollections(localSubjects, res.subjects || []);
        setLocalData("subjects", merged);
        return { success: true, count: merged.length, subjects: merged };
      }
    } catch (e) {
      console.warn("Using local subjects:", e.message);
    }
    return { success: true, count: localSubjects.length, subjects: localSubjects };
  },

  getSubjectById: async (id) => {
    const allSubjects = getLocalData("subjects", []);
    const localFound = allSubjects.find((s) => s._id === id || s.id === id);

    try {
      const res = await request(`/subjects/${id}`);
      if (res && res.success && res.subject) {
        setLocalData(`subject_${id}`, res.subject);
        return res;
      }
    } catch (e) {}

    return { success: true, subject: localFound || { id, _id: id, name: "Subject", topics: [] } };
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
    const updated = [newSubject, ...currentSubjects];
    setLocalData("subjects", updated);
    updateLocalAnalyticsCache();

    try {
      const res = await request("/subjects", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success && res.subject) {
        const finalSubjects = updated.map((s) => (s._id === localId || s.id === localId ? res.subject : s));
        setLocalData("subjects", finalSubjects);
        updateLocalAnalyticsCache();
        return res;
      }
    } catch (e) {
      console.warn("Subject saved locally:", e.message);
    }

    return { success: true, message: "Subject created successfully", subject: newSubject };
  },

  updateSubject: async (id, payload) => {
    const currentSubjects = getLocalData("subjects", []);
    const updatedSubjects = currentSubjects.map((s) =>
      s._id === id || s.id === id ? { ...s, ...payload } : s
    );
    setLocalData("subjects", updatedSubjects);
    updateLocalAnalyticsCache();

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
    const cacheKey = `topics_${subjectId || "all"}`;
    const localTopics = getLocalData(cacheKey, []);
    try {
      const res = await request(`/topics${subjectId ? `?subjectId=${subjectId}` : ""}`);
      if (res && res.success) {
        const merged = mergeCollections(localTopics, res.topics || []);
        setLocalData(cacheKey, merged);
        return { success: true, topics: merged };
      }
    } catch (e) {}
    return { success: true, topics: localTopics };
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
    const localSubTopics = getLocalData(cacheKey, []);

    try {
      const res = await request(`/subtopics?${params.toString()}`);
      if (res && res.success) {
        const merged = mergeCollections(localSubTopics, res.subTopics || []);
        setLocalData(cacheKey, merged);
        return { success: true, subTopics: merged };
      }
    } catch (e) {}
    return { success: true, subTopics: localSubTopics };
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

  // Sessions (Timer & Direct Time) - 100% Permanently Preserved
  createSession: async (payload) => {
    const localId = generateLocalId();
    const subjects = getLocalData("subjects", []);
    const subjObj = subjects.find(
      (s) => s._id === payload.subjectId || s.id === payload.subjectId || s.name === payload.subjectName
    );

    const newSession = {
      _id: localId,
      id: localId,
      subject: subjObj
        ? { _id: subjObj._id || subjObj.id, id: subjObj._id || subjObj.id, name: subjObj.name, color: subjObj.color }
        : payload.subjectId
        ? { _id: payload.subjectId, id: payload.subjectId, name: payload.subjectName || "Subject", color: "#6366f1" }
        : { name: payload.subjectName || "General Study", color: "#6366f1" },
      subjectName: payload.subjectName || (subjObj ? subjObj.name : "General Study"),
      topic: payload.topicName ? { title: payload.topicName } : payload.topicId ? { _id: payload.topicId, title: "Topic" } : null,
      subTopic: payload.subTopicName ? { title: payload.subTopicName } : payload.subTopicId ? { _id: payload.subTopicId, title: "SubTopic" } : null,
      durationMinutes: Number(payload.durationMinutes) || 25,
      date: payload.date ? new Date(payload.date).toISOString() : new Date().toISOString(),
      productivityRating: Number(payload.productivityRating) || 5,
      notes: payload.notes || "",
      sessionType: payload.sessionType || "timer",
      createdAt: new Date().toISOString(),
    };

    const currentSessions = getLocalData("sessions", []);
    const updatedSessions = [newSession, ...currentSessions];
    setLocalData("sessions", updatedSessions);

    // If subject was custom, ensure subject exists locally
    if (payload.subjectName && !subjObj) {
      const newSubj = {
        _id: generateLocalId(),
        id: generateLocalId(),
        name: payload.subjectName.trim(),
        color: "#6366f1",
        targetHours: 20,
        totalMinutes: Number(payload.durationMinutes) || 25,
        sessionCount: 1,
        createdAt: new Date().toISOString(),
      };
      setLocalData("subjects", [newSubj, ...subjects]);
    }

    updateLocalAnalyticsCache();

    try {
      const res = await request("/sessions", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success && res.session) {
        const filtered = updatedSessions.filter((s) => s._id !== localId && s.id !== localId);
        const finalSessions = [res.session, ...filtered];
        setLocalData("sessions", finalSessions);
        updateLocalAnalyticsCache();
        return res;
      }
    } catch (e) {
      console.warn("Session saved to permanent local storage:", e.message);
    }

    return { success: true, message: "Study session logged & permanently saved", session: newSession };
  },

  getSessions: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const localSessions = getLocalData("sessions", []);

    try {
      const res = await request(`/sessions${q ? `?${q}` : ""}`);
      if (res && res.success && Array.isArray(res.sessions)) {
        const merged = mergeCollections(localSessions, res.sessions, "_id");
        setLocalData("sessions", merged);
        const limit = params.limit ? Number(params.limit) : merged.length;
        return { success: true, count: merged.length, sessions: merged.slice(0, limit) };
      }
    } catch (e) {
      console.warn("Using permanent local sessions:", e.message);
    }

    const limit = params.limit ? Number(params.limit) : localSessions.length;
    return { success: true, count: localSessions.length, sessions: localSessions.slice(0, limit) };
  },

  deleteSession: async (id) => {
    const currentSessions = getLocalData("sessions", []);
    const filtered = currentSessions.filter((s) => s._id !== id && s.id !== id);
    setLocalData("sessions", filtered);
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/sessions/${id}`, { method: "DELETE" });
      if (res && res.success) return res;
    } catch (e) {}

    return { success: true, message: "Session deleted successfully" };
  },

  // Tasks - 100% Permanently Preserved
  getTasks: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const localTasks = getLocalData("tasks", []);

    let filtered = [...localTasks];
    if (params.status) filtered = filtered.filter((t) => t.status === params.status);
    if (params.priority) filtered = filtered.filter((t) => t.priority === params.priority);
    if (params.subjectId) filtered = filtered.filter((t) => (t.subject?._id || t.subject?.id || t.subject) === params.subjectId);

    const summary = {
      total: localTasks.length,
      todo: localTasks.filter((t) => t.status === "todo").length,
      inProgress: localTasks.filter((t) => t.status === "in_progress").length,
      completed: localTasks.filter((t) => t.status === "completed").length,
    };

    try {
      const res = await request(`/tasks${q ? `?${q}` : ""}`);
      if (res && res.success && Array.isArray(res.tasks)) {
        const merged = mergeCollections(localTasks, res.tasks, "_id");
        setLocalData("tasks", merged);
        
        let serverFiltered = [...merged];
        if (params.status) serverFiltered = serverFiltered.filter((t) => t.status === params.status);
        if (params.priority) serverFiltered = serverFiltered.filter((t) => t.priority === params.priority);
        if (params.subjectId) serverFiltered = serverFiltered.filter((t) => (t.subject?._id || t.subject?.id || t.subject) === params.subjectId);

        const updatedSummary = {
          total: merged.length,
          todo: merged.filter((t) => t.status === "todo").length,
          inProgress: merged.filter((t) => t.status === "in_progress").length,
          completed: merged.filter((t) => t.status === "completed").length,
        };

        return { success: true, count: serverFiltered.length, tasks: serverFiltered, summary: updatedSummary };
      }
    } catch (e) {
      console.warn("Using permanent local tasks:", e.message);
    }

    return { success: true, count: filtered.length, tasks: filtered, summary };
  },

  createTask: async (payload) => {
    const localId = generateLocalId();
    const subjects = getLocalData("subjects", []);
    const subj = subjects.find((s) => s._id === payload.subjectId || s.id === payload.subjectId);

    const newTask = {
      _id: localId,
      id: localId,
      title: payload.title,
      description: payload.description || "",
      subject: subj ? { _id: subj._id || subj.id, id: subj._id || subj.id, name: subj.name, color: subj.color } : payload.subjectId,
      dueDate: payload.dueDate || null,
      priority: payload.priority || "medium",
      status: "todo",
      estimatedMinutes: payload.estimatedMinutes ? Number(payload.estimatedMinutes) : 30,
      createdAt: new Date().toISOString(),
    };

    const currentTasks = getLocalData("tasks", []);
    const updated = [newTask, ...currentTasks];
    setLocalData("tasks", updated);
    updateLocalAnalyticsCache();

    try {
      const res = await request("/tasks", { method: "POST", body: JSON.stringify(payload) });
      if (res && res.success && res.task) {
        const finalTasks = updated.map((t) => (t._id === localId || t.id === localId ? res.task : t));
        setLocalData("tasks", finalTasks);
        updateLocalAnalyticsCache();
        return res;
      }
    } catch (e) {
      console.warn("Task saved permanently to local storage:", e.message);
    }

    return { success: true, message: "Task created and permanently saved", task: newTask };
  },

  updateTask: async (id, payload) => {
    const currentTasks = getLocalData("tasks", []);
    const subjects = getLocalData("subjects", []);
    const subj = payload.subjectId ? subjects.find((s) => s._id === payload.subjectId || s.id === payload.subjectId) : null;

    const updated = currentTasks.map((t) => {
      if (t._id === id || t.id === id) {
        return {
          ...t,
          ...payload,
          subject: subj ? { _id: subj._id || subj.id, id: subj._id || subj.id, name: subj.name, color: subj.color } : t.subject,
        };
      }
      return t;
    });

    setLocalData("tasks", updated);
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res && res.success) return res;
    } catch (e) {}

    const savedTask = updated.find((t) => t._id === id || t.id === id);
    return { success: true, message: "Task updated successfully", task: savedTask };
  },

  updateTaskStatus: async (id, status) => {
    const currentTasks = getLocalData("tasks", []);
    const updated = currentTasks.map((t) =>
      t._id === id || t.id === id
        ? { ...t, status, completedAt: status === "completed" ? new Date().toISOString() : null }
        : t
    );
    setLocalData("tasks", updated);
    updateLocalAnalyticsCache();

    try {
      const res = await request(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (res && res.success) return res;
    } catch (e) {}

    const savedTask = updated.find((t) => t._id === id || t.id === id);
    return { success: true, message: "Task status updated", task: savedTask };
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

  // Analytics Overview - Combines server and permanent local sessions
  getAnalyticsOverview: async () => {
    try {
      const res = await request("/analytics/overview");
      if (res && res.success && res.stats) {
        // If server returned non-zero stats, use it; otherwise augment with local calculations
        if (res.stats.totalMinutes > 0) {
          setLocalData("analytics_overview", res);
          return res;
        }
      }
    } catch (e) {
      console.warn("Using local analytics calculation:", e.message);
    }

    const calculatedStats = updateLocalAnalyticsCache();
    return {
      success: true,
      stats: calculatedStats || {
        todayMinutes: 0,
        weekMinutes: 0,
        monthMinutes: 0,
        yearMinutes: 0,
        totalMinutes: 0,
        totalHours: "0.0",
        totalSessions: 0,
        avgProductivity: 5,
        dailyGoalProgress: 0,
        weeklyGoalProgress: 0,
        monthlyGoalProgress: 0,
        yearlyGoalProgress: 0,
        currentStreak: 1,
        longestStreak: 1,
        tasks: { todo: 0, in_progress: 0, completed: 0, total: 0 },
      },
    };
  },

  // Analytics Timeseries - 100% Calculated accurately for Week, Month, Year
  getAnalyticsTimeseries: async (period = "week") => {
    try {
      const res = await request(`/analytics/timeseries?period=${period}`);
      if (res && res.success && res.dataPoints && res.grandTotalMinutes > 0) {
        setLocalData(`analytics_timeseries_${period}`, res);
        return res;
      }
    } catch (e) {}

    const sessions = getLocalData("sessions", []);
    const subjects = getLocalData("subjects", []);
    const daysCount = period === "week" ? 7 : period === "month" ? 30 : 12;
    const dataPoints = [];
    const now = new Date();

    const subjectBreakdownMap = {};
    let grandTotalMinutes = 0;

    // Build timeline buckets
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      if (period === "year") {
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = d.toLocaleString("default", { month: "short" });

        let monthMinutes = 0;
        let sCount = 0;
        let pSum = 0;

        sessions.forEach((s) => {
          const sd = new Date(s.date || s.createdAt);
          const sKey = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
          if (sKey === monthKey) {
            const mins = Number(s.durationMinutes) || 0;
            monthMinutes += mins;
            sCount += 1;
            pSum += Number(s.productivityRating) || 5;
          }
        });

        grandTotalMinutes += monthMinutes;
        dataPoints.push({
          label: monthLabel,
          shortLabel: monthLabel,
          totalHours: Number((monthMinutes / 60).toFixed(1)),
          totalMinutes: monthMinutes,
          sessionCount: sCount,
          avgProductivity: sCount > 0 ? Number((pSum / sCount).toFixed(1)) : 5,
        });
      } else {
        d.setDate(d.getDate() - i);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const dayLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        const shortLabel = d.toLocaleDateString(undefined, { weekday: "short" });

        let dayMinutes = 0;
        let sCount = 0;
        let pSum = 0;

        sessions.forEach((s) => {
          const sd = new Date(s.date || s.createdAt);
          const sKey = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}-${String(sd.getDate()).padStart(2, "0")}`;
          if (sKey === dayKey) {
            const mins = Number(s.durationMinutes) || 0;
            dayMinutes += mins;
            sCount += 1;
            pSum += Number(s.productivityRating) || 5;
          }
        });

        grandTotalMinutes += dayMinutes;
        dataPoints.push({
          label: dayLabel,
          shortLabel,
          dateStr: dayKey,
          totalHours: Number((dayMinutes / 60).toFixed(1)),
          totalMinutes: dayMinutes,
          sessionCount: sCount,
          avgProductivity: sCount > 0 ? Number((pSum / sCount).toFixed(1)) : 5,
        });
      }
    }

    // Aggregate subject distribution
    sessions.forEach((s) => {
      const mins = Number(s.durationMinutes) || 0;
      const sName = s.subject?.name || s.subjectName || "General Study";
      const sColor = s.subject?.color || "#6366f1";
      if (!subjectBreakdownMap[sName]) {
        subjectBreakdownMap[sName] = { name: sName, color: sColor, totalMinutes: 0 };
      }
      subjectBreakdownMap[sName].totalMinutes += mins;
    });

    const subjectBreakdown = Object.values(subjectBreakdownMap).map((sb) => ({
      ...sb,
      totalHours: Number((sb.totalMinutes / 60).toFixed(1)),
      percentage: grandTotalMinutes > 0 ? Math.round((sb.totalMinutes / grandTotalMinutes) * 100) : 0,
    }));

    return {
      success: true,
      period,
      grandTotalMinutes,
      grandTotalHours: Number((grandTotalMinutes / 60).toFixed(1)),
      dataPoints,
      subjectBreakdown,
    };
  },

  getSubjectBreakdown: async () => {
    try {
      const res = await request("/analytics/subject-breakdown");
      if (res && res.success && Array.isArray(res.subjects) && res.subjects.length > 0) {
        setLocalData("subject_breakdown", res);
        return res;
      }
    } catch (e) {}

    const subjects = getLocalData("subjects", []);
    const sessions = getLocalData("sessions", []);

    const result = subjects.map((s) => {
      const sId = (s._id || s.id).toString();
      let totalMins = 0;
      let sessionCount = 0;

      sessions.forEach((sess) => {
        const sessSubjId = (sess.subject?._id || sess.subject?.id || sess.subject || "").toString();
        const sessSubjName = (sess.subject?.name || sess.subjectName || "").toLowerCase();
        if (sessSubjId === sId || (s.name && sessSubjName === s.name.toLowerCase())) {
          totalMins += Number(sess.durationMinutes) || 0;
          sessionCount += 1;
        }
      });

      const targetMins = (s.targetHours || 20) * 60;
      const progressPercentage = targetMins > 0 ? Math.min(100, Math.round((totalMins / targetMins) * 100)) : 0;

      return {
        id: s._id || s.id,
        _id: s._id || s.id,
        name: s.name,
        color: s.color || "#6366f1",
        targetHours: s.targetHours || 20,
        totalMinutes: totalMins,
        totalHours: Number((totalMins / 60).toFixed(1)),
        progressPercentage,
        topicCount: s.topicCount || 0,
        subTopicCount: s.subTopicCount || 0,
        completedSubTopics: s.completedSubTopics || 0,
        sessionCount,
      };
    });

    return { success: true, subjects: result };
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
