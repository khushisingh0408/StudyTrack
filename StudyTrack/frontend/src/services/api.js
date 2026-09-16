// API service client with automatic auth header injection

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("studytrack_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
      localStorage.removeItem("studytrack_token");
      localStorage.removeItem("studytrack_user");
      window.dispatchEvent(new Event("auth-unauthorized"));
    }
    const error = new Error(data.message || "An error occurred during API request");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Auth
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  demoLogin: () => request("/auth/demo-login", { method: "POST" }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  getMe: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),

  // Subjects
  getSubjects: () => request("/subjects"),
  getSubjectById: (id) => request(`/subjects/${id}`),
  createSubject: (payload) => request("/subjects", { method: "POST", body: JSON.stringify(payload) }),
  updateSubject: (id, payload) => request(`/subjects/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: "DELETE" }),

  // Topics
  getTopics: (subjectId) => request(`/topics${subjectId ? `?subjectId=${subjectId}` : ""}`),
  createTopic: (payload) => request("/topics", { method: "POST", body: JSON.stringify(payload) }),
  updateTopic: (id, payload) => request(`/topics/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateTopicStatus: (id, status) => request(`/topics/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteTopic: (id) => request(`/topics/${id}`, { method: "DELETE" }),

  // SubTopics
  getSubTopics: (topicId, subjectId) => {
    const params = new URLSearchParams();
    if (topicId) params.append("topicId", topicId);
    if (subjectId) params.append("subjectId", subjectId);
    return request(`/subtopics?${params.toString()}`);
  },
  createSubTopic: (payload) => request("/subtopics", { method: "POST", body: JSON.stringify(payload) }),
  updateSubTopic: (id, payload) => request(`/subtopics/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateSubTopicStatus: (id, status) => request(`/subtopics/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteSubTopic: (id) => request(`/subtopics/${id}`, { method: "DELETE" }),

  // Sessions (Timer & Direct Time)
  createSession: (payload) => request("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  getSessions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/sessions${q ? `?${q}` : ""}`);
  },
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),

  // Tasks
  getTasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/tasks${q ? `?${q}` : ""}`);
  },
  createTask: (payload) => request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  // Analytics (Week, Month, Year)
  getAnalyticsOverview: () => request("/analytics/overview"),
  getAnalyticsTimeseries: (period = "week") => request(`/analytics/timeseries?period=${period}`),
  getSubjectBreakdown: () => request("/analytics/subject-breakdown"),

  // Universal Course Templates & Demo Loader
  getTemplates: () => request("/templates"),
  applyTemplate: (payload) => request("/templates/apply", { method: "POST", body: JSON.stringify(payload) }),
  loadDemoData: () => request("/templates/load-demo-data", { method: "POST" }),
};
