import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Modal } from "../components/Modal";
import confetti from "canvas-confetti";
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Filter,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

export const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, todo: 0, inProgress: 0, completed: 0 });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'list'

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    subjectId: "",
    dueDate: "",
    priority: "medium",
    estimatedMinutes: 30,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [tasksRes, subjectsRes] = await Promise.all([
        api.getTasks(),
        api.getSubjects(),
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.tasks || []);
        if (tasksRes.summary) setSummary(tasksRes.summary);
      }
      if (subjectsRes.success) {
        setSubjects(subjectsRes.subjects || []);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksOnly = async () => {
    try {
      const res = await api.getTasks({
        subjectId: selectedSubjectFilter || undefined,
        priority: selectedPriorityFilter || undefined,
      });
      if (res.success) {
        setTasks(res.tasks || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasksOnly();
  }, [selectedSubjectFilter, selectedPriorityFilter]);

  // Open modal for Create/Edit
  const handleOpenTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || "",
        subjectId: task.subject?._id || task.subject || "",
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        priority: task.priority || "medium",
        estimatedMinutes: task.estimatedMinutes || 30,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        subjectId: subjects.length > 0 ? subjects[0]._id : "",
        dueDate: new Date().toISOString().split("T")[0],
        priority: "medium",
        estimatedMinutes: 30,
      });
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.updateTask(editingTask._id, taskForm);
      } else {
        await api.createTask(taskForm);
      }
      setIsTaskModalOpen(false);
      fetchTasksOnly();
    } catch (err) {
      alert(err.message || "Failed to save task");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      if (newStatus === "completed") {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
      fetchTasksOnly();
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await api.deleteTask(taskId);
        fetchTasksOnly();
      } catch (err) {
        alert(err.message || "Failed to delete task");
      }
    }
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const completionPercentage = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  const renderTaskCard = (task) => {
    const isCompleted = task.status === "completed";
    return (
      <div
        key={task._id}
        className="glass-panel-interactive"
        style={{
          padding: "16px",
          borderRadius: "var(--radius-md)",
          background: "rgba(18, 26, 47, 0.9)",
          border: "1px solid var(--border-subtle)",
          borderLeft: `4px solid ${task.subject?.color || "var(--accent-primary)"}`,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <button
              onClick={() => handleStatusChange(task._id, isCompleted ? "todo" : "completed")}
              className="btn-ghost"
              style={{ padding: 0, marginTop: "2px" }}
              title={isCompleted ? "Mark as Todo" : "Mark as Completed"}
            >
              {isCompleted ? (
                <CheckCircle2 size={18} style={{ color: "#34d399" }} />
              ) : (
                <Circle size={18} style={{ color: "var(--text-muted)" }} />
              )}
            </button>
            <div>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: isCompleted ? "line-through" : "none",
                  color: isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                }}
              >
                {task.title}
              </span>
              {task.description && (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button onClick={() => handleOpenTaskModal(task)} className="btn-ghost" style={{ padding: "4px" }}>
              <Edit2 size={13} />
            </button>
            <button onClick={() => handleDeleteTask(task._id)} className="btn-ghost" style={{ padding: "4px", color: "#fda4af" }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Task Meta Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className={`badge ${
                task.priority === "urgent"
                  ? "badge-rose"
                  : task.priority === "high"
                  ? "badge-amber"
                  : "badge-indigo"
              }`}
              style={{ fontSize: "0.65rem", padding: "2px 6px" }}
            >
              {task.priority}
            </span>

            {task.subject && (
              <span style={{ fontSize: "0.75rem", color: task.subject.color, fontWeight: 500 }}>
                {task.subject.name}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {task.dueDate && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={12} />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={12} />
              {task.estimatedMinutes || 30}m
            </span>
          </div>
        </div>

        {/* Status Mover Quick Buttons */}
        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
          {task.status !== "todo" && (
            <button
              onClick={() => handleStatusChange(task._id, "todo")}
              className="btn-ghost"
              style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(255,255,255,0.04)" }}
            >
              ← To Do
            </button>
          )}
          {task.status !== "in_progress" && (
            <button
              onClick={() => handleStatusChange(task._id, "in_progress")}
              className="btn-ghost"
              style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}
            >
              In Progress
            </button>
          )}
          {task.status !== "completed" && (
            <button
              onClick={() => handleStatusChange(task._id, "completed")}
              className="btn-ghost"
              style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}
            >
              Complete ✓
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 4px 0" }}>
            Tasks <span className="gradient-text">& Progress Tracker</span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Create tasks, track completion status, and drive your study agenda.
          </p>
        </div>

        <button onClick={() => handleOpenTaskModal()} className="btn-primary">
          <Plus size={18} />
          <span>Add New Task</span>
        </button>
      </div>

      {/* Progress Metric Banner */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.813rem", color: "var(--text-secondary)" }}>Overall Completion</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399" }}>
              {completionPercentage}% Done
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: "20px" }}>
            <div style={{ fontSize: "0.813rem", color: "var(--text-secondary)" }}>Summary</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>
              {summary.todo} To Do • {summary.inProgress} In Progress • {summary.completed} Completed
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "4px", borderRadius: "var(--radius-md)" }}>
          <button
            onClick={() => setViewMode("kanban")}
            className={viewMode === "kanban" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 14px", fontSize: "0.813rem" }}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 14px", fontSize: "0.813rem" }}
          >
            List View
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, minWidth: "220px" }}
          placeholder="Search tasks by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="form-select"
          style={{ width: "auto", minWidth: "160px" }}
          value={selectedSubjectFilter}
          onChange={(e) => setSelectedSubjectFilter(e.target.value)}
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: "auto", minWidth: "140px" }}
          value={selectedPriorityFilter}
          onChange={(e) => setSelectedPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tasks Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px", animation: "spinSlow 2s linear infinite" }}>⚡</div>
          <p>Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "60px 24px",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <CheckSquare size={48} style={{ color: "var(--accent-primary)", marginBottom: "16px" }} />
          <h3 style={{ fontSize: "1.3rem", margin: "0 0 8px 0" }}>No Tasks Found</h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 20px" }}>
            Keep track of revisions, assignments, and practice questions by adding a new study task.
          </p>
          <button onClick={() => handleOpenTaskModal()} className="btn-primary">
            <Plus size={18} />
            <span>Add Study Task</span>
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban 3-Column Board */
        <div className="grid-cols-3">
          {/* Column 1: To Do */}
          <div
            className="glass-panel"
            style={{
              padding: "20px",
              background: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              minHeight: "400px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6366f1" }} />
                <h4 style={{ margin: 0, fontSize: "1rem" }}>To Do</h4>
              </div>
              <span className="badge badge-indigo">{todoTasks.length}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {todoTasks.map(renderTaskCard)}
              {todoTasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.813rem" }}>
                  No tasks to do
                </div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div
            className="glass-panel"
            style={{
              padding: "20px",
              background: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              minHeight: "400px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                <h4 style={{ margin: 0, fontSize: "1rem" }}>In Progress</h4>
              </div>
              <span className="badge badge-amber">{inProgressTasks.length}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {inProgressTasks.map(renderTaskCard)}
              {inProgressTasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.813rem" }}>
                  No active tasks
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div
            className="glass-panel"
            style={{
              padding: "20px",
              background: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              minHeight: "400px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
                <h4 style={{ margin: 0, fontSize: "1rem" }}>Completed</h4>
              </div>
              <span className="badge badge-emerald">{completedTasks.length}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {completedTasks.map(renderTaskCard)}
              {completedTasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.813rem" }}>
                  No completed tasks yet
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredTasks.map(renderTaskCard)}
        </div>
      )}

      {/* --- Add / Edit Task Modal --- */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? "Edit Study Task" : "Add New Task"}
      >
        <form onSubmit={handleSaveTask}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Solve 10 LeetCode graph problems, Review Chapter 4"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Details or checklist instructions..."
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Associated Subject</label>
              <select
                className="form-select"
                value={taskForm.subjectId}
                onChange={(e) => setTaskForm({ ...taskForm, subjectId: e.target.value })}
              >
                <option value="">None / General Task</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-select"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent 🔥</option>
              </select>
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Minutes</label>
              <input
                type="number"
                className="form-input"
                min="5"
                step="5"
                value={taskForm.estimatedMinutes}
                onChange={(e) => setTaskForm({ ...taskForm, estimatedMinutes: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingTask ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
