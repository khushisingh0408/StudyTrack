import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  Target,
  AlertCircle,
  GraduationCap,
  HeartPulse,
  Code,
  Landmark,
  Atom,
  Briefcase,
  Scale,
  Eye,
  EyeOff,
} from "lucide-react";

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [academicField, setAcademicField] = useState("engineering");
  const [targetExam, setTargetExam] = useState("GATE CS / Placement Exams");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(180);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const academicFields = [
    { id: "medical", name: "MBBS / NEET-PG / Medical", icon: HeartPulse, defaultExam: "NEET PG / USMLE", color: "#f43f5e" },
    { id: "engineering", name: "Engineering / B.Tech / Tech", icon: Code, defaultExam: "GATE CS / Placements", color: "#6366f1" },
    { id: "competitive", name: "UPSC / Civil Services / Govt", icon: Landmark, defaultExam: "UPSC CSE Prelims", color: "#f59e0b" },
    { id: "science", name: "JEE / NEET / Science", icon: Atom, defaultExam: "JEE Main / NEET", color: "#06b6d4" },
    { id: "commerce", name: "Commerce / CA / MBA CAT", icon: Briefcase, defaultExam: "CA Inter / CAT", color: "#10b981" },
    { id: "law", name: "Law / Judiciary / CLAT", icon: Scale, defaultExam: "Judiciary / CLAT PG", color: "#8b5cf6" },
  ];

  const handleFieldChange = (fieldId) => {
    setAcademicField(fieldId);
    const found = academicFields.find((f) => f.id === fieldId);
    if (found) {
      setTargetExam(found.defaultExam);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // 1. Register user
      await register({
        name,
        email,
        password,
        academicField,
        targetExam,
        dailyGoalMinutes: Number(dailyGoalMinutes),
        weeklyGoalMinutes: Number(dailyGoalMinutes) * 7,
        monthlyGoalMinutes: Number(dailyGoalMinutes) * 30,
        yearlyGoalMinutes: Number(dailyGoalMinutes) * 365,
      });

      // 2. Automatically load starter syllabus template for this field
      try {
        await api.applyTemplate({ templateId: academicField });
      } catch (tmplErr) {
        console.warn("Auto template preload skipped:", tmplErr);
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "580px",
          padding: "36px 32px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 50px -10px rgba(99, 102, 241, 0.25)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 0 24px rgba(99, 102, 241, 0.6)",
              marginBottom: "14px",
            }}
          >
            <GraduationCap size={28} />
          </div>

          <h1 style={{ fontSize: "1.65rem", margin: "0 0 6px 0", fontWeight: 700 }}>
            Create Your <span className="gradient-text">StudyTrack</span> Account
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Smart study planner & tracker tailored for your academic goal.
          </p>
        </div>

        {/* Tab switch between Register and Sign In */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "8px 0",
              textAlign: "center",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#ffffff",
              background: "var(--accent-primary)",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
            }}
          >
            Register Now
          </div>
          <Link
            to="/login"
            style={{
              flex: 1,
              padding: "8px 0",
              textAlign: "center",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              textDecoration: "none",
              borderRadius: "6px",
              transition: "all 0.2s",
            }}
          >
            Sign In
          </Link>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Select Academic Stream */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              1. Choose Your Academic Stream / Course
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "4px" }}>
              {academicFields.map((field) => {
                const Icon = field.icon;
                const isSelected = academicField === field.id;
                return (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => handleFieldChange(field.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: isSelected ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.02)",
                      border: isSelected ? `2px solid ${field.color}` : "1px solid var(--border-subtle)",
                      color: isSelected ? "#ffffff" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Icon size={18} style={{ color: field.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: isSelected ? 600 : 500 }}>
                      {field.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="Enter your username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: "38px", paddingRight: "38px" }}
                  placeholder="Create password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Exam / Goal</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                  placeholder="e.g. UPSC, NEET, GATE, University"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  required
                />
                <Target size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label className="form-label">Daily Target Study Hours</label>
            <select
              className="form-select"
              value={dailyGoalMinutes}
              onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
            >
              <option value={120}>2 Hours / Day (Regular College)</option>
              <option value={180}>3 Hours / Day (Focused Preparation)</option>
              <option value={240}>4 Hours / Day (Intense Exam Prep)</option>
              <option value={360}>6 Hours / Day (Full-Time Aspirant)</option>
              <option value={480}>8+ Hours / Day (Intense Mode)</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: "1rem", marginBottom: "16px" }}
            disabled={loading}
          >
            {loading ? "Creating Your Workspace..." : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
};
