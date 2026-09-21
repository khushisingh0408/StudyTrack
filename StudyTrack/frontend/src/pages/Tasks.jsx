import React, { useState, useEffect, useRef } from "react";
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
  Database,
  HardDrive,
  FolderOpen,
  CheckCheck,
  Info,
  X,
  ShieldCheck,
} from "lucide-react";

export const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, todo: 0, inProgress: 0, completed: 0 });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'todo' | 'in_progress' | 'completed'
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

  // Real-time Storage Feedback Toast & Highlighting State
  const [toastNotification, setToastNotification] = useState(null);
  const [lastSavedTaskId, setLastSavedTaskId] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showStorageToast = (title, locationText, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotification({ title, locationText, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
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

  const fetchTasksOnly = async (overrideSubjectFilter, overridePriorityFilter) => {
    try {
      const subj = overrideSubjectFilter !== undefined ? overrideSubjectFilter : selectedSubjectFilter;
      const prio = overridePriorityFilter !== undefined ? overridePriorityFilter : selectedPriorityFilter;
      const res = await api.getTasks({
        subjectId: subj || undefined,
        priority: prio || undefined,
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
      const sId = task.subject?._id || task.subject?.id || (typeof task.subject === "string" ? task.subject : "");
      setTaskForm({
        title: task.title,
        description: task.description || "",
        subjectId: sId,
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        priority: task.priority || "medium",
        estimatedMinutes: task.estimatedMinutes || 30,
      });
    } else {
      setEditingTask(null);
      const defaultSubjId = subjects.length > 0 ? subjects[0]._id || subjects[0].id : "";
      setTaskForm({
        title: "",
        description: "",
        subjectId: defaultSubjId,
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
      let savedTask = null;
      const selectedSubjectObj = subjects.find(
        (s) => (s._id || s.id).toString() === (taskForm.subjectId || "").toString()
      );
      const subjectDisplayName = selectedSubjectObj ? selectedSubjectObj.name : "General Tasks (Uncategorized)";

      if (editingTask) {
        const res = await api.updateTask(editingTask._id || editingTask.id, taskForm);
        savedTask = res.task;
        showStorageToast(
          "Task Updated & Saved!",
          `Saved in Database under "${subjectDisplayName}" • Updated in ${editingTask.status === "completed" ? "Completed" : editingTask.status === "in_progress" ? "In Progress" : "To Do"} stage.`
        );
      } else {
        const res = await api.createTask(taskForm);
        savedTask = res.task;
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.65 },
        });
        showStorageToast(
          "Task Created & Saved Successfully!",
          `Saved in Database under "${subjectDisplayName}" • Placed in "To Do" Board column & synced with Dashboard.`
        );
      }

      if (savedTask) {
        const newId = savedTask._id || savedTask.id;
        setLastSavedTaskId(newId);
        setTimeout(() => setLastSavedTaskId(null), 7000);
      }

      // If active filter would hide this new task, reset filter so user immediately sees it
      let newSubjectFilter = selectedSubjectFilter;
      if (selectedSubjectFilter && selectedSubjectFilter !== taskForm.subjectId) {
        newSubjectFilter = "";
        setSelectedSubjectFilter("");
      }
      if (searchQuery) {
        setSearchQuery("");
      }

      setIsTaskModalOpen(false);
      await fetchTasksOnly(newSubjectFilter, selectedPriorityFilter);
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
        showStorageToast(
          "Task Moved to Completed!",
          "Status updated in Database and saved to your completed study records."
        );
      } else if (newStatus === "in_progress") {
        showStorageToast(
          "Task Moved to In Progress!",
          "Status updated in Database • Active in current study session queue."
        );
      } else {
        showStorageToast(
          "Task Moved to To Do!",
          "Status updated in Database • Queued in pending tasks list."
        );
      }
      fetchTasksOnly();
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task? It will be removed from your Database.")) {
      try {
        await api.deleteTask(taskId);
        showStorageToast("Task Deleted", "Removed permanently from Database storage.", "info");
        fetchTasksOnly();
      } catch (err) {
        alert(err.message || "Failed to delete task");
      }
    }
  };

  // Filter tasks based on search & status tab
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusTab === "all" || t.status === statusTab;
    return matchesSearch && matchesStatus;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const completionPercentage = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  // Selected subject helper in modal
  const currentModalSubject = subjects.find(
    (s) => (s._id || s.id).toString() === (taskForm.subjectId || "").toString()
  );

  const renderTaskCard = (task) => {
    const isCompleted = task.status === "completed";
    const tId = task._id || task.id;
    const isJustSaved = tId === lastSavedTaskId;
    const subjectName = task.subject?.name || "General Study (No Subject)";
    const subjectColor = task.subject?.color || "var(--accent-primary)";

    return (
      <div
        key={tId}
        className="glass-panel-interactive"
        style={{
          padding: "16px",
          borderRadius: "var(--radius-md)",
          background: isJustSaved
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(18, 26, 47, 0.95))"
            : "rgba(18, 26, 47, 0.9)",
          border: isJustSaved ? "2px solid #818cf8" : "1px solid var(--border-subtle)",
          borderLeft: `5px solid ${subjectColor}`,
          boxShadow: isJustSaved ? "0 0 20px rgba(99, 102, 241, 0.4)" : undefined,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          transition: "all 0.3s ease",
          position: "relative",
        }}
      >
        {/* Saved Confirmation Banner for Newly Added Task */}
        {isJustSaved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(99, 102, 241, 0.25)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.72rem",
              color: "#c7d2fe",
              fontWeight: 600,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Sparkles size={12} style={{ color: "#fbbf24" }} />
              <span>✨ Just Saved to Database!</span>
            </span>
            <span style={{ fontSize: "0.68rem", opacity: 0.85 }}>{subjectName}</span>
          </div>
        )}

        {/* Task Title Row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1 }}>
            <button
              onClick={() => handleStatusChange(tId, isCompleted ? "todo" : "completed")}
              className="btn-ghost"
              style={{ padding: 0, marginTop: "2px", flexShrink: 0 }}
              title={isCompleted ? "Mark as Todo" : "Mark as Completed"}
            >
              {isCompleted ? (
                <CheckCircle2 size={18} style={{ color: "#34d399" }} />
              ) : (
                <Circle size={18} style={{ color: "var(--text-muted)" }} />
              )}
            </button>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: isCompleted ? "line-through" : "none",
                  color: isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                  wordBreak: "break-word",
                }}
              >
                {task.title}
              </span>
              {task.description && (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.4 }}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
            <button onClick={() => handleOpenTaskModal(task)} className="btn-ghost" style={{ padding: "4px" }} title="Edit Task">
              <Edit2 size={13} />
            </button>
            <button onClick={() => handleDeleteTask(tId)} className="btn-ghost" style={{ padding: "4px", color: "#fda4af" }} title="Delete from Database">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Storage Location & Subject Info Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "6px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Saved Location Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: subjectColor,
                background: `${subjectColor}18`,
                border: `1px solid ${subjectColor}40`,
                padding: "2px 7px",
                borderRadius: "6px",
              }}
              title={`Stored under Subject: ${subjectName}`}
            >
              <FolderOpen size={11} />
              <span>{subjectName}</span>
            </span>

            <span
              className={`badge ${
                task.priority === "urgent"
                  ? "badge-rose"
                  : task.priority === "high"
                  ? "badge-amber"
                  : "badge-indigo"
              }`}
              style={{ fontSize: "0.65rem", padding: "1px 6px" }}
            >
              {task.priority}
            </span>
          </div>

          {/* Date & Storage Engine Tag */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {task.dueDate && (
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Calendar size={11} />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <Clock size={11} />
              {task.estimatedMinutes || 30}m
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                color: "#34d399",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "1px 5px",
                borderRadius: "4px",
                fontSize: "0.68rem",
              }}
              title="Saved and synced with Database"
            >
              <Database size={10} />
              <span>DB</span>
            </span>
          </div>
        </div>

        {/* Status Mover Quick Buttons */}
        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
          {task.status !== "todo" && (
            <button
              onClick={() => handleStatusChange(tId, "todo")}
              className="btn-ghost"
              style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(255,255,255,0.04)" }}
              title="Move to To Do Board"
            >
              ← To Do
            </button>
          )}
          {task.status !== "in_progress" && (
            <button
              onClick={() => handleStatusChange(tId, "in_progress")}
              className="btn-ghost"
              style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}
              title="Move to In Progress Board"
            >
              In Progress →
            </button>
          )}
          {task.status !== "completed" && (
            <button
              onClick={() => handleStatusChange(tId, "completed")}
              className="btn-ghost"
              style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}
              title="Move to Completed Board"
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
      {/* Real-time Storage Feedback Toast Notification */}
      {toastNotification && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
            border: "1px solid #6366f1",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(99, 102, 241, 0.35)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            maxWidth: "420px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a5b4fc",
              flexShrink: 0,
            }}
          >
            <Database size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f8fafc", marginBottom: "2px" }}>
              {toastNotification.title}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.4 }}>
              {toastNotification.locationText}
            </div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="btn-ghost"
            style={{ padding: "2px", color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 4px 0" }}>
            Tasks <span className="gradient-text">& Progress Tracker</span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Create tasks, track completion status, and organize study work under your curriculum subjects.
          </p>
        </div>

        <button onClick={() => handleOpenTaskModal()} className="btn-primary" style={{ padding: "10px 20px" }}>
          <Plus size={18} />
          <span>Add New Task</span>
        </button>
      </div>

      {/* Storage & Synchronization Hub Card */}
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.08))",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(99, 102, 241, 0.2)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a5b4fc",
            }}
          >
            <Database size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#f8fafc" }}>
                Task Storage & Auto-Sync System
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#6ee7b7",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  fontWeight: 600,
                }}
              >
                ● Connected & Synced
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Tasks are saved permanently in the <strong>Database</strong> under their assigned <strong>Subject</strong>, stored in the <strong>To Do</strong> column, and synced to your Dashboard.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <FolderOpen size={14} style={{ color: "var(--accent-primary)" }} />
            <span><strong>{subjects.length}</strong> Subjects</span>
          </div>
          <span>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCheck size={14} style={{ color: "#34d399" }} />
            <span><strong>{summary.total}</strong> Stored Tasks</span>
          </div>
        </div>
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

      {/* Quick Status Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setStatusTab("all")}
          className={statusTab === "all" ? "btn-primary" : "btn-secondary"}
          style={{ padding: "6px 14px", fontSize: "0.813rem" }}
        >
          📋 All Tasks ({summary.total})
        </button>
        <button
          onClick={() => setStatusTab("todo")}
          className={statusTab === "todo" ? "btn-primary" : "btn-secondary"}
          style={{
            padding: "6px 14px",
            fontSize: "0.813rem",
            borderColor: statusTab === "todo" ? undefined : "rgba(99, 102, 241, 0.4)",
          }}
        >
          ⏳ To Do ({summary.todo})
        </button>
        <button
          onClick={() => setStatusTab("in_progress")}
          className={statusTab === "in_progress" ? "btn-primary" : "btn-secondary"}
          style={{
            padding: "6px 14px",
            fontSize: "0.813rem",
            borderColor: statusTab === "in_progress" ? undefined : "rgba(245, 158, 11, 0.4)",
          }}
        >
          ⚡ In Progress ({summary.inProgress})
        </button>
        <button
          onClick={() => setStatusTab("completed")}
          className={statusTab === "completed" ? "btn-primary" : "btn-secondary"}
          style={{
            padding: "6px 14px",
            fontSize: "0.813rem",
            borderColor: statusTab === "completed" ? undefined : "rgba(16, 185, 129, 0.4)",
            color: statusTab === "completed" ? "#ffffff" : "#6ee7b7",
          }}
        >
          ✅ Completed ({summary.completed})
        </button>
      </div>

      {/* Filter & Search Bar with Storage Scope */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, minWidth: "220px" }}
          placeholder="Search saved tasks by title or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="form-select"
          style={{ width: "auto", minWidth: "180px" }}
          value={selectedSubjectFilter}
          onChange={(e) => setSelectedSubjectFilter(e.target.value)}
        >
          <option value="">📂 All Subjects ({summary.total} Tasks)</option>
          {subjects.map((s) => {
            const sId = s._id || s.id;
            const subjectTasksCount = tasks.filter(
              (t) => (t.subject?._id || t.subject?.id || t.subject || "").toString() === sId.toString()
            ).length;
            return (
              <option key={sId} value={sId}>
                {s.name} ({subjectTasksCount})
              </option>
            );
          })}
        </select>

        <select
          className="form-select"
          style={{ width: "auto", minWidth: "140px" }}
          value={selectedPriorityFilter}
          onChange={(e) => setSelectedPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent 🔥</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {(selectedSubjectFilter || selectedPriorityFilter || searchQuery) && (
          <button
            onClick={() => {
              setSelectedSubjectFilter("");
              setSelectedPriorityFilter("");
              setSearchQuery("");
            }}
            className="btn-ghost"
            style={{ fontSize: "0.813rem", color: "#fda4af" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tasks Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px", animation: "spinSlow 2s linear infinite" }}>⚡</div>
          <p>Loading tasks from database...</p>
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
          <h3 style={{ fontSize: "1.3rem", margin: "0 0 8px 0" }}>No Tasks in this View</h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 20px" }}>
            Add a new study task. It will be saved into your Database and categorized under your chosen Subject.
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
                <h4 style={{ margin: 0, fontSize: "1rem" }}>To Do (Pending Queue)</h4>
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

      {/* --- Add / Edit Task Modal with Storage Destination Preview --- */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? "Edit Study Task" : "Add New Study Task"}
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
                {subjects.map((s) => {
                  const sId = s._id || s.id;
                  return (
                    <option key={sId} value={sId}>
                      {s.name}
                    </option>
                  );
                })}
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

          {/* Live Storage & Destination Preview Card */}
          <div
            style={{
              marginTop: "16px",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#a5b4fc" }}>
              <Database size={14} />
              <span>WHERE WILL THIS TASK BE SAVED?</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Target Subject: </span>
                <strong style={{ color: currentModalSubject?.color || "#ffffff" }}>
                  {currentModalSubject ? currentModalSubject.name : "General Study"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Storage Engine: </span>
                <strong style={{ color: "#34d399" }}>Persistent Database</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Board Destination: </span>
                <strong style={{ color: "#818cf8" }}>
                  {editingTask ? (editingTask.status === "completed" ? "Completed Column" : editingTask.status === "in_progress" ? "In Progress Column" : "To Do Column") : "To Do Column"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Dashboard Sync: </span>
                <strong style={{ color: "#fde68a" }}>Auto-Synced ✓</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Database size={15} />
              <span>{editingTask ? "Save Changes" : "Save to Database"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
