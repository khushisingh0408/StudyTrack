import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { playChime, toggleFocusAmbience } from "../services/audio";
import { Modal } from "../components/Modal";
import confetti from "canvas-confetti";
import {
  Timer as TimerIcon,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Star,
  BookOpen,
  Sparkles,
  FileText,
  Flame,
  Coffee,
  Volume2,
  VolumeX,
  Tag,
  Check,
  Zap,
  Layers,
  HelpCircle,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export const StudySession = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "direct" ? "direct" : "timer";
  const [activeTab, setActiveTab] = useState(initialMode);
  const { refreshUserStats } = useAuth();
  const navigate = useNavigate();

  // Subjects & Hierarchy data
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [customTopicName, setCustomTopicName] = useState("");
  const [isCustomTopic, setIsCustomTopic] = useState(false);

  const [subTopics, setSubTopics] = useState([]);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
  const [customSubTopicName, setCustomSubTopicName] = useState("");
  const [isCustomSubTopic, setIsCustomSubTopic] = useState(false);

  // Ambience White-Noise
  const [isAmbiencePlaying, setIsAmbiencePlaying] = useState(false);

  // --- Timer Mode State ---
  // timerType: 'stopwatch' | 'pomodoro' | 'focus45' | 'deep60' | 'marathon90' | 'custom' | 'short_break' | 'long_break'
  const [timerType, setTimerType] = useState("stopwatch");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [customInputVal, setCustomInputVal] = useState("30");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [totalTimerSeconds, setTotalTimerSeconds] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerNotes, setTimerNotes] = useState("");
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [timerProductivity, setTimerProductivity] = useState(5);
  const [markSubTopicCompleted, setMarkSubTopicCompleted] = useState(true);

  // --- Direct Time Mode State ---
  const [directDate, setDirectDate] = useState(new Date().toISOString().split("T")[0]);
  const [directHours, setDirectHours] = useState(1);
  const [directMinutes, setDirectMinutes] = useState(0);
  const [directProductivity, setDirectProductivity] = useState(5);
  const [directNotes, setDirectNotes] = useState("");
  const [directMarkCompleted, setDirectMarkCompleted] = useState(true);
  const [directSaving, setDirectSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const timerRef = useRef(null);

  useEffect(() => {
    fetchSubjectsData();
    return () => {
      toggleFocusAmbience(false);
    };
  }, []);

  const fetchSubjectsData = async () => {
    try {
      const res = await api.getSubjects();
      if (res.success && res.subjects.length > 0) {
        setSubjects(res.subjects);
        if (!selectedSubjectId) {
          setSelectedSubjectId(res.subjects[0]._id || res.subjects[0].id);
        }
      } else {
        setIsCustomSubject(true);
      }
    } catch (err) {
      console.error("Error loading subjects in session:", err);
    }
  };

  useEffect(() => {
    if (!selectedSubjectId || isCustomSubject) {
      setTopics([]);
      setSelectedTopicId("");
      return;
    }
    const loadTopics = async () => {
      try {
        const res = await api.getTopics(selectedSubjectId);
        if (res.success) {
          setTopics(res.topics || []);
          setSelectedTopicId("");
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadTopics();
  }, [selectedSubjectId, isCustomSubject]);

  useEffect(() => {
    if (!selectedTopicId || isCustomTopic) {
      setSubTopics([]);
      setSelectedSubTopicId("");
      return;
    }
    const loadSubTopics = async () => {
      try {
        const res = await api.getSubTopics(selectedTopicId, selectedSubjectId);
        if (res.success) {
          setSubTopics(res.subTopics || []);
          setSelectedSubTopicId("");
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSubTopics();
  }, [selectedTopicId, selectedSubjectId, isCustomTopic]);

  // Load saved timer state on mount
  useEffect(() => {
    try {
      const savedTimer = localStorage.getItem("studytrack_active_timer");
      if (savedTimer) {
        const data = JSON.parse(savedTimer);
        if (data.timerType) setTimerType(data.timerType);
        if (data.customMinutes) {
          setCustomMinutes(data.customMinutes);
          setCustomInputVal(String(data.customMinutes));
        }
        if (data.selectedSubjectId) setSelectedSubjectId(data.selectedSubjectId);
        if (data.customSubjectName) setCustomSubjectName(data.customSubjectName);
        if (data.isCustomSubject !== undefined) setIsCustomSubject(data.isCustomSubject);
        if (data.selectedTopicId) setSelectedTopicId(data.selectedTopicId);
        if (data.customTopicName) setCustomTopicName(data.customTopicName);
        if (data.isCustomTopic !== undefined) setIsCustomTopic(data.isCustomTopic);
        if (data.selectedSubTopicId) setSelectedSubTopicId(data.selectedSubTopicId);
        if (data.customSubTopicName) setCustomSubTopicName(data.customSubTopicName);
        if (data.isCustomSubTopic !== undefined) setIsCustomSubTopic(data.isCustomSubTopic);
        if (data.timerNotes) setTimerNotes(data.timerNotes);

        if (data.isRunning && data.lastTimestamp) {
          const elapsed = Math.floor((Date.now() - data.lastTimestamp) / 1000);
          if (data.timerType === "stopwatch") {
            setStopwatchSeconds((data.stopwatchSeconds || 0) + elapsed);
          } else {
            const rem = Math.max(0, (data.secondsLeft || 0) - elapsed);
            setSecondsLeft(rem);
            setTotalTimerSeconds(data.totalTimerSeconds || (data.customMinutes * 60));
          }
          setIsRunning(true);
        } else {
          if (data.stopwatchSeconds) setStopwatchSeconds(data.stopwatchSeconds);
          if (data.secondsLeft) setSecondsLeft(data.secondsLeft);
          if (data.totalTimerSeconds) setTotalTimerSeconds(data.totalTimerSeconds);
        }
      }
    } catch (e) {}
  }, []);

  // Sync active timer state to localStorage
  useEffect(() => {
    if (stopwatchSeconds > 0 || isRunning || timerNotes || customSubjectName || customTopicName) {
      try {
        localStorage.setItem(
          "studytrack_active_timer",
          JSON.stringify({
            timerType,
            customMinutes,
            isRunning,
            lastTimestamp: Date.now(),
            stopwatchSeconds,
            secondsLeft,
            totalTimerSeconds,
            selectedSubjectId,
            customSubjectName,
            isCustomSubject,
            selectedTopicId,
            customTopicName,
            isCustomTopic,
            selectedSubTopicId,
            customSubTopicName,
            isCustomSubTopic,
            timerNotes,
          })
        );
      } catch (e) {}
    }
  }, [
    timerType,
    customMinutes,
    isRunning,
    stopwatchSeconds,
    secondsLeft,
    totalTimerSeconds,
    selectedSubjectId,
    customSubjectName,
    isCustomSubject,
    selectedTopicId,
    customTopicName,
    isCustomTopic,
    selectedSubTopicId,
    customSubTopicName,
    isCustomSubTopic,
    timerNotes,
  ]);

  // Handle Timer ticking
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (timerType === "stopwatch") {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              playChime("success");
              setIsFinishModalOpen(true);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerType]);

  const switchTimerMode = (type, minutes) => {
    setIsRunning(false);
    setTimerType(type);
    if (type === "stopwatch") {
      setStopwatchSeconds(0);
    } else {
      const validMins = Math.max(1, Number(minutes) || 25);
      setCustomMinutes(validMins);
      setSecondsLeft(validMins * 60);
      setTotalTimerSeconds(validMins * 60);
    }
  };

  const handleCustomMinutesChange = (val) => {
    setCustomInputVal(val);
    const num = parseInt(val, 10);
    if (num && num > 0) {
      switchTimerMode("custom", num);
    }
  };

  const handleToggleTimer = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    if (isAmbiencePlaying) {
      toggleFocusAmbience(nextState);
    }
  };

  const handleToggleAmbienceSound = () => {
    const nextState = !isAmbiencePlaying;
    setIsAmbiencePlaying(nextState);
    toggleFocusAmbience(nextState);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    localStorage.removeItem("studytrack_active_timer");
    if (timerType === "stopwatch") {
      setStopwatchSeconds(0);
    } else {
      setSecondsLeft(customMinutes * 60);
    }
  };

  const handleFinishTimerSession = () => {
    setIsRunning(false);
    toggleFocusAmbience(false);
    setIsAmbiencePlaying(false);
    playChime("success");
    setIsFinishModalOpen(true);
  };

  const calculateElapsedMinutes = () => {
    if (timerType === "stopwatch") {
      return Math.max(1, Math.round(stopwatchSeconds / 60));
    }
    const elapsedSecs = totalTimerSeconds - secondsLeft;
    return Math.max(1, Math.round(elapsedSecs / 60));
  };

  const handleSaveTimerData = async () => {
    const elapsedMinutes = calculateElapsedMinutes();
    const finalSubjectName = isCustomSubject ? customSubjectName.trim() : null;
    const finalSubjectId = !isCustomSubject ? selectedSubjectId : null;

    if (!finalSubjectId && !finalSubjectName) {
      alert("Please enter or select a subject name");
      return;
    }

    const finalTopicName = isCustomTopic ? customTopicName.trim() : null;
    const finalTopicId = !isCustomTopic && selectedTopicId ? selectedTopicId : null;

    const finalSubTopicName = isCustomSubTopic ? customSubTopicName.trim() : null;
    const finalSubTopicId = !isCustomSubTopic && selectedSubTopicId ? selectedSubTopicId : null;

    try {
      const res = await api.createSession({
        subjectId: finalSubjectId,
        subjectName: finalSubjectName,
        topicId: finalTopicId,
        topicName: finalTopicName,
        subTopicId: finalSubTopicId,
        subTopicName: finalSubTopicName,
        sessionType: "timer",
        durationMinutes: elapsedMinutes,
        date: new Date(),
        productivityRating: timerProductivity,
        notes: timerNotes,
        markSubTopicCompleted: markSubTopicCompleted && (!!finalSubTopicId || !!finalSubTopicName),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setIsFinishModalOpen(false);
      handleResetTimer();
      setTimerNotes("");
      await fetchSubjectsData();
      refreshUserStats();
      setSaveSuccessMsg(res.message || `Saved ${elapsedMinutes} mins study session to Analytics! 🔥`);
      setTimeout(() => setSaveSuccessMsg(""), 4500);
    } catch (err) {
      alert(err.message || "Failed to save study session");
    }
  };

  // --- Direct Time Submit ---
  const handleSaveDirectData = async (e) => {
    e.preventDefault();
    const totalMinutes = Number(directHours) * 60 + Number(directMinutes);

    if (totalMinutes <= 0) {
      alert("Please enter a valid study duration greater than 0 (e.g., 1 hour)");
      return;
    }

    const finalSubjectName = isCustomSubject ? customSubjectName.trim() : null;
    const finalSubjectId = !isCustomSubject ? selectedSubjectId : null;

    if (!finalSubjectId && !finalSubjectName) {
      alert("Please enter or select a subject name");
      return;
    }

    const finalTopicName = isCustomTopic ? customTopicName.trim() : null;
    const finalTopicId = !isCustomTopic && selectedTopicId ? selectedTopicId : null;

    const finalSubTopicName = isCustomSubTopic ? customSubTopicName.trim() : null;
    const finalSubTopicId = !isCustomSubTopic && selectedSubTopicId ? selectedSubTopicId : null;

    setDirectSaving(true);
    try {
      const res = await api.createSession({
        subjectId: finalSubjectId,
        subjectName: finalSubjectName,
        topicId: finalTopicId,
        topicName: finalTopicName,
        subTopicId: finalSubTopicId,
        subTopicName: finalSubTopicName,
        sessionType: "direct",
        durationMinutes: totalMinutes,
        date: new Date(directDate),
        productivityRating: directProductivity,
        notes: directNotes,
        markSubTopicCompleted: directMarkCompleted && (!!finalSubTopicId || !!finalSubTopicName),
      });

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });

      setSaveSuccessMsg(res.message || `Logged ${totalMinutes} mins study data! Analytics & streak updated 🔥`);
      setDirectNotes("");
      await fetchSubjectsData();
      refreshUserStats();
      setTimeout(() => setSaveSuccessMsg(""), 4500);
    } catch (err) {
      alert(err.message || "Failed to save study session");
    } finally {
      setDirectSaving(false);
    }
  };

  const formatTimeDisplay = () => {
    if (timerType === "stopwatch") {
      const h = Math.floor(stopwatchSeconds / 3600);
      const m = Math.floor((stopwatchSeconds % 3600) / 60);
      const s = stopwatchSeconds % 60;
      if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const selectedSubject = subjects.find((s) => (s._id || s.id) === selectedSubjectId);
  const activeSubTopic = subTopics.find((st) => (st._id || st.id) === selectedSubTopicId);
  const progressPercent = totalTimerSeconds > 0 ? Math.round(((totalTimerSeconds - secondsLeft) / totalTimerSeconds) * 100) : 0;

  // Active Subject Display name
  const currentSubjectDisplayName = isCustomSubject
    ? customSubjectName || "Custom Subject"
    : selectedSubject?.name || "Select or Type Subject";

  const currentTopicDisplayName = isCustomTopic
    ? customTopicName
    : topics.find((t) => (t._id || t.id) === selectedTopicId)?.title;

  const currentSubTopicDisplayName = isCustomSubTopic
    ? customSubTopicName
    : subTopics.find((st) => (st._id || st.id) === selectedSubTopicId)?.title;

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header & Mode Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 4px 0" }}>
            Study <span className="gradient-text">Time Tracker & Performance Logger</span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Padhai ka live time count karein (Stopwatch/Timer) ya pehle padha hua time manually add karein.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              onClick={() => {
                setActiveTab("timer");
                setSearchParams({ mode: "timer" });
              }}
              className={activeTab === "timer" ? "btn-primary" : "btn-ghost"}
              style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)" }}
            >
              <TimerIcon size={16} />
              <span>⏱️ Live Timer / Stopwatch</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("direct");
                setSearchParams({ mode: "direct" });
              }}
              className={activeTab === "direct" ? "btn-primary" : "btn-ghost"}
              style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)" }}
            >
              <Clock size={16} />
              <span>📝 Direct Manual Entry</span>
            </button>
          </div>

          <button
            onClick={() => navigate("/analytics")}
            className="btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
            title="View Analytics"
          >
            <BarChart3 size={16} />
            <span>View Analytics</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div
          className="animate-fade-in"
          style={{
            padding: "14px 18px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: "var(--radius-md)",
            color: "#6ee7b7",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 600,
          }}
        >
          <Sparkles size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Flexible Target Input Hierarchy (Subject -> Topic -> SubTopic) */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🎯 Target Subject & Topic
            </span>
            <span
              className="badge badge-indigo"
              style={{ fontSize: "0.72rem", padding: "2px 8px" }}
            >
              {!selectedTopicId && !customTopicName
                ? "Level 1: Subject-Only Log"
                : !selectedSubTopicId && !customSubTopicName
                ? "Level 2: Topic-Level Tracking"
                : "Level 3: Micro Sub-Topic Mastery"}
            </span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            ✨ Topic & Sub-Topic optional hain. Aap direct subject me bhi time save kar sakte hain!
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {/* 1. Subject (Required - Select or Type) */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                1. Subject <span style={{ color: "#f43f5e" }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomSubject(!isCustomSubject);
                  setSelectedTopicId("");
                  setSelectedSubTopicId("");
                }}
                className="btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0 4px", color: "var(--accent-primary)" }}
              >
                {isCustomSubject ? "← Choose Existing" : "+ Type New Subject"}
              </button>
            </div>

            {isCustomSubject ? (
              <input
                type="text"
                className="form-input"
                placeholder="Type Subject Name (e.g. Maths, Physics, DSA)"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                autoFocus
              />
            ) : (
              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                {subjects.length === 0 && <option value="">No subjects (Click '+ Type New Subject')</option>}
                {subjects.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Topic (Optional - Select or Type) */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="form-label" style={{ margin: 0 }}>
                2. Topic <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomTopic(!isCustomTopic)}
                className="btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0 4px", color: "var(--accent-primary)" }}
              >
                {isCustomTopic ? "← Choose Existing" : "+ Type New Topic"}
              </button>
            </div>

            {isCustomTopic ? (
              <input
                type="text"
                className="form-input"
                placeholder="Type Topic (e.g. Calculus, Organic Chemistry)"
                value={customTopicName}
                onChange={(e) => setCustomTopicName(e.target.value)}
              />
            ) : (
              <select
                className="form-select"
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                disabled={topics.length === 0}
              >
                <option value="">No specific topic / Overall</option>
                {topics.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Sub-Topic (Optional - Select or Type) */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="form-label" style={{ margin: 0 }}>
                3. Sub-Topic <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomSubTopic(!isCustomSubTopic)}
                className="btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0 4px", color: "var(--accent-primary)" }}
              >
                {isCustomSubTopic ? "← Choose Existing" : "+ Type New Subtopic"}
              </button>
            </div>

            {isCustomSubTopic ? (
              <input
                type="text"
                className="form-input"
                placeholder="Type Sub-Topic (e.g. Integration by Parts)"
                value={customSubTopicName}
                onChange={(e) => setCustomSubTopicName(e.target.value)}
              />
            ) : (
              <select
                className="form-select"
                value={selectedSubTopicId}
                onChange={(e) => setSelectedSubTopicId(e.target.value)}
                disabled={subTopics.length === 0}
              >
                <option value="">No specific sub-topic / Overall</option>
                {subTopics.map((st) => (
                  <option key={st._id || st.id} value={st._id || st.id}>
                    {st.title} {st.status === "completed" ? "✓" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* --- Tab 1: Interactive Timer / Stopwatch --- */}
      {activeTab === "timer" && (
        <div className="responsive-2col">
          {/* Left: Timer Circle & Controls */}
          <div
            className="glass-panel"
            style={{
              padding: "36px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Timer Preset Mode Buttons & Ambient Noise Toggle */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
              <button
                onClick={() => switchTimerMode("stopwatch", 0)}
                className={timerType === "stopwatch" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem", fontWeight: 700 }}
              >
                <Clock size={15} />
                <span>⏱️ Live Stopwatch (Count Up)</span>
              </button>
              <button
                onClick={() => switchTimerMode("pomodoro", 25)}
                className={timerType === "pomodoro" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                <Flame size={15} />
                <span>Pomodoro (25m)</span>
              </button>
              <button
                onClick={() => switchTimerMode("focus45", 45)}
                className={timerType === "focus45" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                <Zap size={15} />
                <span>Focus (45m)</span>
              </button>
              <button
                onClick={() => switchTimerMode("deep60", 60)}
                className={timerType === "deep60" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                <Sparkles size={15} />
                <span>Deep Work (60m)</span>
              </button>
              <button
                onClick={() => switchTimerMode("marathon90", 90)}
                className={timerType === "marathon90" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                <TrendingUp size={15} />
                <span>Marathon (90m)</span>
              </button>
              <button
                onClick={() => switchTimerMode("short_break", 5)}
                className={timerType === "short_break" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                <Coffee size={15} />
                <span>Break (5m)</span>
              </button>
              <button
                onClick={handleToggleAmbienceSound}
                className={isAmbiencePlaying ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                title="Toggle Soothing White Noise / Rain Ambience"
              >
                {isAmbiencePlaying ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span>{isAmbiencePlaying ? "Rain Focus ON" : "Rain Sound"}</span>
              </button>
            </div>

            {/* Custom Minutes Input for Countdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "24px",
                padding: "6px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Custom Timer:</span>
              <input
                type="number"
                min="1"
                max="360"
                value={customInputVal}
                onChange={(e) => handleCustomMinutesChange(e.target.value)}
                style={{
                  width: "55px",
                  padding: "3px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  textAlign: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              />
              <span style={{ color: "var(--text-muted)" }}>minutes</span>
              <button
                type="button"
                onClick={() => switchTimerMode("custom", parseInt(customInputVal, 10) || 30)}
                className={timerType === "custom" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "3px 10px", fontSize: "0.78rem" }}
              >
                Set
              </button>
            </div>

            {/* Mode Explanation Pill */}
            <div
              style={{
                marginBottom: "20px",
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: timerType === "stopwatch" ? "rgba(99, 102, 241, 0.15)" : "rgba(245, 158, 11, 0.15)",
                border: `1px solid ${timerType === "stopwatch" ? "rgba(99, 102, 241, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                fontSize: "0.813rem",
                color: timerType === "stopwatch" ? "#a5b4fc" : "#fde68a",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={14} />
              <span>
                {timerType === "stopwatch"
                  ? "⏱️ Stopwatch Active: Padhai shuru karein — jitna der padhenge, time count hota rahega."
                  : `⏳ Countdown Active: ${customMinutes} mins target focus timer.`}
              </span>
            </div>

            {/* Circular Timer Display */}
            <div
              style={{
                position: "relative",
                width: "280px",
                height: "280px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(18,26,47,0.8) 0%, rgba(9,13,22,0.95) 100%)",
                boxShadow: isRunning
                  ? "0 0 50px -10px rgba(99, 102, 241, 0.5), inset 0 0 30px rgba(99, 102, 241, 0.2)"
                  : "0 0 30px -10px rgba(0,0,0,0.5)",
                border: "4px solid rgba(255, 255, 255, 0.05)",
                marginBottom: "32px",
              }}
            >
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <circle cx="140" cy="140" r="128" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="transparent" />
                {timerType !== "stopwatch" && (
                  <circle
                    cx="140"
                    cy="140"
                    r="128"
                    stroke={selectedSubject?.color || "var(--accent-primary)"}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 128}
                    strokeDashoffset={2 * Math.PI * 128 * (1 - progressPercent / 100)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                )}
                {timerType === "stopwatch" && isRunning && (
                  <circle
                    cx="140"
                    cy="140"
                    r="128"
                    stroke="#818cf8"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 128}
                    strokeDashoffset={(2 * Math.PI * 128 * (1 - (stopwatchSeconds % 60) / 60))}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                  />
                )}
              </svg>

              <div style={{ zIndex: 2 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "3.2rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "#ffffff",
                  }}
                >
                  {formatTimeDisplay()}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {timerType === "stopwatch"
                    ? isRunning
                      ? "Studying... (Live Count)"
                      : "Stopwatch Ready"
                    : isRunning
                    ? "Focus Session in Progress"
                    : "Ready to Focus"}
                </div>
              </div>
            </div>

            {/* Timer Action Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={handleToggleTimer}
                className="btn-primary"
                style={{
                  padding: "14px 32px",
                  fontSize: "1.1rem",
                  borderRadius: "var(--radius-full)",
                  boxShadow: isRunning
                    ? "0 0 25px rgba(244, 63, 94, 0.4)"
                    : "0 0 25px rgba(99, 102, 241, 0.5)",
                  background: isRunning
                    ? "linear-gradient(135deg, #f43f5e, #e11d48)"
                    : "linear-gradient(135deg, #6366f1, #4f46e5)",
                }}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                <span>{isRunning ? "Pause Session" : "Start Focus"}</span>
              </button>

              <button
                onClick={handleResetTimer}
                className="btn-secondary"
                style={{ padding: "14px", borderRadius: "50%" }}
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={handleFinishTimerSession}
                className="btn-secondary"
                style={{
                  padding: "12px 20px",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#6ee7b7",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  fontWeight: 600,
                }}
                title="Save Completed Time to Analytics"
              >
                <CheckCircle size={18} />
                <span>Finish & Save to Analytics</span>
              </button>
            </div>
          </div>

          {/* Right: Live Session Notes & Current Target */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Active Target Banner */}
            <div className="glass-panel" style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: "0.813rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Target Currently Tracked
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: selectedSubject?.color || "#fff", marginTop: "4px" }}>
                {currentSubjectDisplayName}
              </div>
              {currentTopicDisplayName && (
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  📌 Topic: <strong>{currentTopicDisplayName}</strong>
                  {currentSubTopicDisplayName && ` → ${currentSubTopicDisplayName}`}
                </div>
              )}
            </div>

            {/* Quick Notes Flashcard */}
            {activeSubTopic?.notes && (
              <div
                className="glass-panel"
                style={{
                  padding: "16px 20px",
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a5b4fc", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                  <Zap size={15} />
                  <span>Key Formulas & High-Yield Notes:</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#f8fafc", lineHeight: 1.4 }}>
                  {activeSubTopic.notes}
                </div>
              </div>
            )}

            <div className="glass-panel" style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <FileText size={18} style={{ color: "var(--accent-primary)" }} />
                <h3 style={{ fontSize: "1.05rem", margin: 0 }}>Active Study Reflections & Key Takeaways</h3>
              </div>
              <textarea
                className="form-textarea"
                style={{ flex: 1, minHeight: "140px", resize: "none" }}
                placeholder="Type your study reflections, formulas, doubts or key insights here while studying..."
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 2: Direct Time Entry Mode --- */}
      {activeTab === "direct" && (
        <div className="glass-panel" style={{ padding: "32px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>
          <form onSubmit={handleSaveDirectData}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <h3 style={{ fontSize: "1.3rem", margin: 0 }}>Direct Study Time Logger</h3>
              <span className="badge badge-amber" style={{ fontSize: "0.75rem" }}>Manual Entry</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
              Offline ya pehle padha hua time yahan daalein (e.g. 2 Hours for Maths, 45 mins for Chemistry). Yeh turant aapke Analytics aur Streak me save ho jayega.
            </p>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Study Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={directDate}
                  onChange={(e) => setDirectDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time Spent (Hours & Minutes)</label>
                <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Hours"
                      min="0"
                      max="24"
                      value={directHours}
                      onChange={(e) => setDirectHours(e.target.value)}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Hours</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Minutes"
                      min="0"
                      max="59"
                      step="5"
                      value={directMinutes}
                      onChange={(e) => setDirectMinutes(e.target.value)}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Minutes</span>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[
                    { label: "15m", h: 0, m: 15 },
                    { label: "30m", h: 0, m: 30 },
                    { label: "45m", h: 0, m: 45 },
                    { label: "1 Hour", h: 1, m: 0 },
                    { label: "1.5 Hrs", h: 1, m: 30 },
                    { label: "2 Hours", h: 2, m: 0 },
                    { label: "3 Hours", h: 3, m: 0 },
                    { label: "4 Hours", h: 4, m: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setDirectHours(preset.h);
                        setDirectMinutes(preset.m);
                      }}
                      className="btn-ghost"
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.75rem",
                        background: directHours === preset.h && directMinutes === preset.m ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${directHours === preset.h && directMinutes === preset.m ? "rgba(99, 102, 241, 0.5)" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-sm)",
                        color: directHours === preset.h && directMinutes === preset.m ? "#a5b4fc" : "var(--text-secondary)",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Focus & Productivity Rating (1 - 5 Stars)</label>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDirectProductivity(star)}
                    className="btn-ghost"
                    style={{
                      padding: "8px 12px",
                      color: directProductivity >= star ? "#fbbf24" : "var(--text-muted)",
                      background: directProductivity >= star ? "rgba(245, 158, 11, 0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${directProductivity >= star ? "rgba(245, 158, 11, 0.3)" : "var(--border-subtle)"}`,
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <Star size={18} fill={directProductivity >= star ? "currentColor" : "none"} />
                    <span style={{ marginLeft: "4px", fontWeight: 600 }}>{star}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Study Notes & Key Takeaways</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="What topics, concepts or questions did you master?"
                value={directNotes}
                onChange={(e) => setDirectNotes(e.target.value)}
              />
            </div>

            {(selectedSubTopicId || customSubTopicName) && (
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", margin: "16px 0" }}>
                <input
                  type="checkbox"
                  checked={directMarkCompleted}
                  onChange={(e) => setDirectMarkCompleted(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
                  Mark sub-topic as <strong>Completed</strong>
                </span>
              </label>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: "12px 28px", fontSize: "1rem" }}
                disabled={directSaving}
              >
                {directSaving ? "Saving Study Data..." : "Save Study Record to Analytics"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- Modal: Save Timer Session Data --- */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="🎉 Session Finished! Save Study Record"
      >
        <div>
          <div style={{ padding: "16px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Time Studied:</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#a5b4fc" }}>
              {calculateElapsedMinutes()} Minutes
            </div>
            <div style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Subject: <strong>{currentSubjectDisplayName}</strong>
              {currentTopicDisplayName ? ` • Topic: ${currentTopicDisplayName}` : ""}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">How productive was this session?</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setTimerProductivity(star)}
                  className="btn-ghost"
                  style={{
                    padding: "8px 12px",
                    color: timerProductivity >= star ? "#fbbf24" : "var(--text-muted)",
                    background: timerProductivity >= star ? "rgba(245, 158, 11, 0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${timerProductivity >= star ? "rgba(245, 158, 11, 0.3)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Star size={18} fill={timerProductivity >= star ? "currentColor" : "none"} />
                  <span style={{ marginLeft: "4px", fontWeight: 600 }}>{star}</span>
                </button>
              ))}
            </div>
          </div>

          {(selectedSubTopicId || customSubTopicName) && (
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", margin: "16px 0" }}>
              <input
                type="checkbox"
                checked={markSubTopicCompleted}
                onChange={(e) => setMarkSubTopicCompleted(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
              />
              <span style={{ fontSize: "0.875rem" }}>
                Mark sub-topic as <strong>Completed</strong>
              </span>
            </label>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsFinishModalOpen(false)}>
              Discard
            </button>
            <button type="submit" className="btn-primary" onClick={handleSaveTimerData}>
              Save & Update Analytics
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
