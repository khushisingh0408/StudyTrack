import React, { useState } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";
import { User, Target, Flame, CheckCircle, AlertCircle, Calendar, GraduationCap } from "lucide-react";

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [academicField, setAcademicField] = useState(user?.academicField || "engineering");
  const [targetExam, setTargetExam] = useState(user?.targetExam || "Target Competitive Exam");
  const [targetExamDate, setTargetExamDate] = useState(
    user?.targetExamDate ? user.targetExamDate.split("T")[0] : ""
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(user?.dailyGoalMinutes || 120);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(user?.weeklyGoalMinutes || 840);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const academicFields = [
    { id: "medical", name: "MBBS / NEET-PG / Medical" },
    { id: "engineering", name: "Engineering / B.Tech / Tech" },
    { id: "competitive", name: "UPSC / Civil Services / Govt" },
    { id: "science", name: "JEE / NEET / 12th Science" },
    { id: "commerce", name: "Commerce / CA / MBA CAT" },
    { id: "law", name: "Law / Judiciary / CLAT" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      await updateProfile({
        name,
        academicField,
        targetExam,
        targetExamDate: targetExamDate ? new Date(targetExamDate) : null,
        dailyGoalMinutes: Number(dailyGoalMinutes),
        weeklyGoalMinutes: Number(weeklyGoalMinutes),
      });
      setMessage({ text: "Profile and study goals updated successfully!", type: "success" });
      setTimeout(() => {
        onClose();
        setMessage({ text: "", type: "" });
      }, 1200);
    } catch (err) {
      setMessage({ text: err.message || "Failed to update profile", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Study Profile & Target Exam Settings" maxWidth="580px">
      <form onSubmit={handleSubmit}>
        {message.text && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.875rem",
              background: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
              color: message.type === "success" ? "#6ee7b7" : "#fda4af",
              border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
            }}
          >
            {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", marginBottom: "20px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{user?.name}</div>
            <div style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>{user?.email}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.813rem", color: "#fbbf24", marginTop: "4px" }}>
              <Flame size={14} className="flame-glow" />
              <span>Current Streak: <strong>{user?.currentStreak || 0} days</strong></span>
              <span style={{ color: "var(--text-muted)" }}>(Best: {user?.longestStreak || 0})</span>
            </div>
          </div>
        </div>

        <div className="grid-cols-2">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Academic Field / Stream</label>
            <select
              className="form-select"
              value={academicField}
              onChange={(e) => setAcademicField(e.target.value)}
            >
              {academicFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-cols-2">
          <div className="form-group">
            <label className="form-label">Target Exam Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. NEET PG 2026, UPSC 2026, GATE"
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Exam Date (for countdown)</label>
            <input
              type="date"
              className="form-input"
              value={targetExamDate}
              onChange={(e) => setTargetExamDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-cols-2">
          <div className="form-group">
            <label className="form-label">Daily Study Goal (Minutes)</label>
            <input
              type="number"
              className="form-input"
              value={dailyGoalMinutes}
              min="15"
              step="15"
              onChange={(e) => setDailyGoalMinutes(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              ~ {(dailyGoalMinutes / 60).toFixed(1)} hours/day
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Weekly Study Goal (Minutes)</label>
            <input
              type="number"
              className="form-input"
              value={weeklyGoalMinutes}
              min="60"
              step="30"
              onChange={(e) => setWeeklyGoalMinutes(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              ~ {(weeklyGoalMinutes / 60).toFixed(1)} hours/week
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving Changes..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
