import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Modal } from "../components/Modal";
import confetti from "canvas-confetti";
import {
  BookOpen,
  Plus,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  Trash2,
  FileText,
  Layers,
  Sparkles,
  Zap,
  GraduationCap,
  HeartPulse,
  Code,
  Landmark,
  Atom,
  Briefcase,
  Scale,
  Search,
  Filter,
} from "lucide-react";

export const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    targetHours: 20,
  });

  // Topic Modal State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({ title: "", description: "" });

  // SubTopic Modal State
  const [isSubTopicModalOpen, setIsSubTopicModalOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [editingSubTopic, setEditingSubTopic] = useState(null);
  const [subTopicForm, setSubTopicForm] = useState({
    title: "",
    description: "",
    estimatedMinutes: 30,
    notes: "",
  });

  const colorPresets = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
  ];

  useEffect(() => {
    fetchSubjects();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.getTemplates();
      if (res.success) setTemplates(res.templates || []);
    } catch (e) {
      console.warn("Could not load templates list", e);
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.getSubjects();
      if (res.success) {
        const detailedSubjects = await Promise.all(
          res.subjects.map(async (subj) => {
            const detailRes = await api.getSubjectById(subj._id || subj.id);
            return detailRes.success ? detailRes.subject : subj;
          })
        );
        setSubjects(detailedSubjects);

        if (detailedSubjects.length > 0 && Object.keys(expandedSubjects).length === 0) {
          const firstId = detailedSubjects[0]._id || detailedSubjects[0].id;
          setExpandedSubjects({ [firstId]: true });
          if (detailedSubjects[0].topics && detailedSubjects[0].topics.length > 0) {
            const firstTopicId = detailedSubjects[0].topics[0]._id || detailedSubjects[0].topics[0].id;
            setExpandedTopics({ [firstTopicId]: true });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching subjects hierarchy:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (id) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTopic = (id) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Template Handlers ---
  const handleApplyTemplate = async (templateId, replace = false) => {
    setApplyingTemplate(true);
    try {
      const res = await api.applyTemplate({ templateId, replaceExisting: replace });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setIsTemplateModalOpen(false);
      await fetchSubjects();
      alert(res.message || "Syllabus template loaded successfully!");
    } catch (e) {
      alert("Failed to apply template: " + e.message);
    } finally {
      setApplyingTemplate(false);
    }
  };

  // --- Subject Handlers ---
  const handleOpenSubjectModal = (subj = null) => {
    if (subj) {
      setEditingSubject(subj);
      setSubjectForm({
        name: subj.name,
        description: subj.description || "",
        color: subj.color || "#6366f1",
        targetHours: subj.targetHours || 20,
      });
    } else {
      setEditingSubject(null);
      setSubjectForm({
        name: "",
        description: "",
        color: "#6366f1",
        targetHours: 20,
      });
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject._id || editingSubject.id, subjectForm);
      } else {
        await api.createSubject(subjectForm);
      }
      setIsSubjectModalOpen(false);
      fetchSubjects();
    } catch (err) {
      alert(err.message || "Failed to save subject");
    }
  };

  const handleDeleteSubject = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure? This will delete this subject and all its topics, subtopics, and tasks!")) {
      try {
        await api.deleteSubject(id);
        fetchSubjects();
      } catch (err) {
        alert(err.message || "Failed to delete subject");
      }
    }
  };

  // --- Topic Handlers ---
  const handleOpenTopicModal = (subjectId, topic = null, e = null) => {
    if (e) e.stopPropagation();
    setActiveSubjectId(subjectId);
    if (topic) {
      setEditingTopic(topic);
      setTopicForm({ title: topic.title, description: topic.description || "" });
    } else {
      setEditingTopic(null);
      setTopicForm({ title: "", description: "" });
    }
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    try {
      if (editingTopic) {
        await api.updateTopic(editingTopic._id || editingTopic.id, topicForm);
      } else {
        await api.createTopic({ subjectId: activeSubjectId, ...topicForm });
      }
      setIsTopicModalOpen(false);
      fetchSubjects();
    } catch (err) {
      alert(err.message || "Failed to save topic");
    }
  };

  const handleDeleteTopic = async (topicId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this topic and its subtopics?")) {
      try {
        await api.deleteTopic(topicId);
        fetchSubjects();
      } catch (err) {
        alert(err.message || "Failed to delete topic");
      }
    }
  };

  const handleToggleTopicStatus = async (topic, e) => {
    e.stopPropagation();
    const newStatus = topic.status === "completed" ? "not_started" : "completed";
    try {
      await api.updateTopicStatus(topic._id || topic.id, newStatus);
      fetchSubjects();
    } catch (err) {
      console.error(err);
    }
  };

  // --- SubTopic Handlers ---
  const handleOpenSubTopicModal = (topicId, subTopic = null, e = null) => {
    if (e) e.stopPropagation();
    setActiveTopicId(topicId);
    if (subTopic) {
      setEditingSubTopic(subTopic);
      setSubTopicForm({
        title: subTopic.title,
        description: subTopic.description || "",
        estimatedMinutes: subTopic.estimatedMinutes || 30,
        notes: subTopic.notes || "",
      });
    } else {
      setEditingSubTopic(null);
      setSubTopicForm({
        title: "",
        description: "",
        estimatedMinutes: 30,
        notes: "",
      });
    }
    setIsSubTopicModalOpen(true);
  };

  const handleSaveSubTopic = async (e) => {
    e.preventDefault();
    try {
      if (editingSubTopic) {
        await api.updateSubTopic(editingSubTopic._id || editingSubTopic.id, subTopicForm);
      } else {
        await api.createSubTopic({ topicId: activeTopicId, ...subTopicForm });
      }
      setIsSubTopicModalOpen(false);
      fetchSubjects();
    } catch (err) {
      alert(err.message || "Failed to save sub-topic");
    }
  };

  const handleToggleSubTopicStatus = async (subTopic, e) => {
    e.stopPropagation();
    const newStatus = subTopic.status === "completed" ? "not_started" : "completed";
    try {
      await api.updateSubTopicStatus(subTopic._id || subTopic.id, newStatus);
      fetchSubjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubTopic = async (subTopicId, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this sub-topic?")) {
      try {
        await api.deleteSubTopic(subTopicId);
        fetchSubjects();
      } catch (err) {
        alert(err.message || "Failed to delete subtopic");
      }
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header & Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 4px 0" }}>
            Curriculum <span className="gradient-text">& Syllabus Planner</span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Structured 3-level roadmap: <strong>Subject → Topics → Sub-Topics</strong> (Formulas & Notes)
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="btn-secondary"
            style={{ padding: "10px 16px", borderColor: "rgba(99, 102, 241, 0.4)", color: "#a5b4fc" }}
          >
            <Zap size={16} />
            <span>Browse Course Templates</span>
          </button>

          <button onClick={() => handleOpenSubjectModal()} className="btn-primary">
            <Plus size={18} />
            <span>Add Custom Subject</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="form-input"
          style={{ paddingLeft: "42px" }}
          placeholder="Search subjects or key topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
      </div>

      {/* Hierarchy Explorer */}
      {loading && subjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px", animation: "spinSlow 2s linear infinite" }}>⚡</div>
          <p>Loading curriculum hierarchy...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "60px 24px",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <BookOpen size={48} style={{ color: "var(--accent-primary)", marginBottom: "16px" }} />
          <h3 style={{ fontSize: "1.3rem", margin: "0 0 8px 0" }}>No Subjects Available</h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "460px", margin: "0 auto 24px" }}>
            Choose from standard pre-configured templates (MBBS, Engineering, UPSC, JEE/NEET, CA, Law) or add your own custom subjects.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => setIsTemplateModalOpen(true)} className="btn-primary">
              <Zap size={16} />
              <span>Load Ready-Made Syllabus</span>
            </button>
            <button onClick={() => handleOpenSubjectModal()} className="btn-secondary">
              <Plus size={16} />
              <span>Create Custom</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {filteredSubjects.map((subject) => {
            const sId = subject._id || subject.id;
            const isSubjExpanded = !!expandedSubjects[sId];
            const topicsList = subject.topics || [];
            const allSubTopicsCount = topicsList.reduce((acc, t) => acc + (t.subTopics ? t.subTopics.length : 0), 0);
            const completedSubTopicsCount = topicsList.reduce(
              (acc, t) => acc + (t.subTopics ? t.subTopics.filter((st) => st.status === "completed").length : 0),
              0
            );
            const progress = allSubTopicsCount > 0 ? Math.round((completedSubTopicsCount / allSubTopicsCount) * 100) : 0;

            return (
              <div
                key={sId}
                className="glass-panel"
                style={{
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  borderLeft: `5px solid ${subject.color || "var(--accent-primary)"}`,
                }}
              >
                {/* Subject Header Row */}
                <div
                  onClick={() => toggleSubject(sId)}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                    cursor: "pointer",
                    background: isSubjExpanded ? "rgba(255,255,255,0.02)" : "transparent",
                    borderBottom: isSubjExpanded ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "200px" }}>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        transition: "transform 0.2s ease",
                        transform: isSubjExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      <ChevronRight size={20} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>{subject.name}</span>
                        <span
                          className="badge badge-indigo"
                          style={{
                            fontSize: "0.7rem",
                            background: `${subject.color}20`,
                            color: subject.color,
                            borderColor: `${subject.color}50`,
                          }}
                        >
                          {topicsList.length} Topic{topicsList.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {subject.description && (
                        <div style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {subject.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    {/* Progress Indicator */}
                    <div style={{ width: "120px", textAlign: "right" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                        <strong>{completedSubTopicsCount}/{allSubTopicsCount}</strong> sub-topics
                      </div>
                      <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "999px" }}>
                        <div
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            background: subject.color || "var(--accent-primary)",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={(e) => handleOpenTopicModal(sId, null, e)}
                        className="btn-primary"
                        style={{ padding: "6px 12px", fontSize: "0.813rem" }}
                        title="Add Topic to Subject"
                      >
                        <Plus size={15} />
                        <span>Add Topic</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSubjectModal(subject);
                        }}
                        className="btn-ghost"
                        style={{ padding: "6px" }}
                        title="Edit Subject"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteSubject(sId, e)}
                        className="btn-ghost"
                        style={{ padding: "6px", color: "#fda4af" }}
                        title="Delete Subject"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Subject Content (Topics & SubTopics) */}
                {isSubjExpanded && (
                  <div style={{ padding: "20px 24px", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {topicsList.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "24px",
                          border: "1px dashed var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-secondary)",
                          fontSize: "0.875rem",
                        }}
                      >
                        <p style={{ marginBottom: "12px" }}>No topics in this subject yet.</p>
                        <button
                          onClick={(e) => handleOpenTopicModal(sId, null, e)}
                          className="btn-secondary"
                          style={{ padding: "6px 14px", fontSize: "0.813rem" }}
                        >
                          <Plus size={15} />
                          <span>Create First Topic</span>
                        </button>
                      </div>
                    ) : (
                      topicsList.map((topic) => {
                        const tId = topic._id || topic.id;
                        const isTopicExpanded = !!expandedTopics[tId];
                        const subTopics = topic.subTopics || [];
                        const completedCount = subTopics.filter((st) => st.status === "completed").length;
                        const isTopicCompleted = topic.status === "completed" || (subTopics.length > 0 && completedCount === subTopics.length);

                        return (
                          <div
                            key={tId}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "var(--radius-md)",
                              overflow: "hidden",
                            }}
                          >
                            {/* Topic Row */}
                            <div
                              onClick={() => toggleTopic(tId)}
                              style={{
                                padding: "14px 18px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                background: isTopicExpanded ? "rgba(255,255,255,0.02)" : "transparent",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <button
                                  onClick={(e) => handleToggleTopicStatus(topic, e)}
                                  className="btn-ghost"
                                  style={{ padding: 0 }}
                                  title="Toggle Topic Completion"
                                >
                                  {isTopicCompleted ? (
                                    <CheckCircle2 size={20} style={{ color: "#34d399" }} />
                                  ) : (
                                    <Circle size={20} style={{ color: "var(--text-muted)" }} />
                                  )}
                                </button>

                                <div>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: "0.95rem",
                                      textDecoration: isTopicCompleted ? "line-through" : "none",
                                      color: isTopicCompleted ? "var(--text-muted)" : "var(--text-primary)",
                                    }}
                                  >
                                    {topic.title}
                                  </span>
                                  {topic.description && (
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                      {topic.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {completedCount}/{subTopics.length} done
                                </span>

                                <button
                                  onClick={(e) => handleOpenSubTopicModal(tId, null, e)}
                                  className="btn-secondary"
                                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                  title="Add Sub-Topic"
                                >
                                  <Plus size={13} />
                                  <span>Sub-Topic</span>
                                </button>

                                <button
                                  onClick={(e) => handleOpenTopicModal(sId, topic, e)}
                                  className="btn-ghost"
                                  style={{ padding: "4px" }}
                                >
                                  <Edit2 size={14} />
                                </button>

                                <button
                                  onClick={(e) => handleDeleteTopic(tId, e)}
                                  className="btn-ghost"
                                  style={{ padding: "4px", color: "#fda4af" }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Sub-Topics Nested Checklist */}
                            {isTopicExpanded && (
                              <div
                                style={{
                                  padding: "12px 18px 16px 42px",
                                  borderTop: "1px solid var(--border-subtle)",
                                  background: "rgba(0,0,0,0.25)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                {subTopics.length === 0 ? (
                                  <div style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>
                                    No sub-topics yet. Click "Sub-Topic" above to add bite-sized lessons.
                                  </div>
                                ) : (
                                  subTopics.map((subTopic) => {
                                    const stId = subTopic._id || subTopic.id;
                                    const isDone = subTopic.status === "completed";
                                    return (
                                      <div
                                        key={stId}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "8px 12px",
                                          borderRadius: "var(--radius-sm)",
                                          background: "rgba(255,255,255,0.02)",
                                          border: "1px solid rgba(255,255,255,0.04)",
                                        }}
                                      >
                                        <div
                                          onClick={(e) => handleToggleSubTopicStatus(subTopic, e)}
                                          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flex: 1 }}
                                        >
                                          {isDone ? (
                                            <CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} />
                                          ) : (
                                            <Circle size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                          )}
                                          <span
                                            style={{
                                              fontSize: "0.875rem",
                                              textDecoration: isDone ? "line-through" : "none",
                                              color: isDone ? "var(--text-muted)" : "var(--text-primary)",
                                            }}
                                          >
                                            {subTopic.title}
                                          </span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Clock size={12} />
                                            {subTopic.estimatedMinutes || 30}m
                                          </span>

                                          {subTopic.notes && (
                                            <span
                                              title={subTopic.notes}
                                              onClick={() => alert(`📌 Notes for ${subTopic.title}:\n\n${subTopic.notes}`)}
                                              style={{ color: "#a5b4fc", cursor: "pointer", display: "flex", alignItems: "center" }}
                                            >
                                              <FileText size={14} />
                                            </span>
                                          )}

                                          <button
                                            onClick={(e) => handleOpenSubTopicModal(tId, subTopic, e)}
                                            className="btn-ghost"
                                            style={{ padding: "2px" }}
                                          >
                                            <Edit2 size={13} />
                                          </button>

                                          <button
                                            onClick={(e) => handleDeleteSubTopic(stId, e)}
                                            className="btn-ghost"
                                            style={{ padding: "2px", color: "#fda4af" }}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- Modal: Course Templates Explorer --- */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="⚡ Standard Curriculum Templates"
        maxWidth="680px"
      >
        <div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Select a verified syllabus package to auto-populate all standard subjects, core topics, and subtopics with pre-filled formula notes:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.95rem" }}>
                    <GraduationCap size={18} style={{ color: "var(--accent-primary)" }} />
                    <span>{tmpl.name}</span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
                    {tmpl.description}
                  </p>
                  <div style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600, marginTop: "6px" }}>
                    {tmpl.subjectCount} Subjects • {tmpl.topicCount} Topics • {tmpl.subTopicCount} Sub-Topics
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <button
                    onClick={() => handleApplyTemplate(tmpl.id, false)}
                    className="btn-primary"
                    style={{ flex: 1, padding: "6px 10px", fontSize: "0.78rem" }}
                    disabled={applyingTemplate}
                  >
                    + Add to Syllabus
                  </button>
                  <button
                    onClick={() => handleApplyTemplate(tmpl.id, true)}
                    className="btn-secondary"
                    style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                    disabled={applyingTemplate}
                    title="Replace all existing subjects with this template"
                  >
                    Replace All
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "Create New Subject"}
      >
        <form onSubmit={handleSaveSubject}>
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Pharmacology, Operating Systems, Indian Polity, Constitutional Law"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Key concepts, syllabus overview, goals"
              value={subjectForm.description}
              onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject Color Theme</label>
            <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSubjectForm({ ...subjectForm, color })}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: color,
                    border: subjectForm.color === color ? "3px solid #ffffff" : "none",
                    boxShadow: subjectForm.color === color ? `0 0 12px ${color}` : "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Mastery Study Hours</label>
            <input
              type="number"
              className="form-input"
              min="1"
              value={subjectForm.targetHours}
              onChange={(e) => setSubjectForm({ ...subjectForm, targetHours: Number(e.target.value) })}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsSubjectModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingSubject ? "Save Changes" : "Create Subject"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Topic Modal */}
      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title={editingTopic ? "Edit Topic" : "Add Topic"}
      >
        <form onSubmit={handleSaveTopic}>
          <div className="form-group">
            <label className="form-label">Topic Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cranial Nerves, Dijkstra Algorithm, Fundamental Rights"
              value={topicForm.title}
              onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Details on what this topic covers"
              value={topicForm.description}
              onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsTopicModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingTopic ? "Save Changes" : "Add Topic"}
            </button>
          </div>
        </form>
      </Modal>

      {/* SubTopic Modal */}
      <Modal
        isOpen={isSubTopicModalOpen}
        onClose={() => setIsSubTopicModalOpen(false)}
        title={editingSubTopic ? "Edit Sub-Topic" : "Add Sub-Topic"}
      >
        <form onSubmit={handleSaveSubTopic}>
          <div className="form-group">
            <label className="form-label">Sub-Topic Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Circle of Willis, TCP 3-Way Handshake, Kesavananda Bharati Case"
              value={subTopicForm.title}
              onChange={(e) => setSubTopicForm({ ...subTopicForm, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Study Duration (Minutes)</label>
            <input
              type="number"
              className="form-input"
              min="5"
              step="5"
              value={subTopicForm.estimatedMinutes}
              onChange={(e) => setSubTopicForm({ ...subTopicForm, estimatedMinutes: Number(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Study Notes, Formulas & Mnemonics</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Add key formulas, case laws, mnemonics or pointers..."
              value={subTopicForm.notes}
              onChange={(e) => setSubTopicForm({ ...subTopicForm, notes: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsSubTopicModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingSubTopic ? "Save Changes" : "Add Sub-Topic"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
