import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  X,
} from "lucide-react";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState({ text: "", type: "" });

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid email/username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetMsg({ text: "", type: "" });
    if (!resetEmail || !newPassword) {
      setResetMsg({ text: "Please enter your email or username and new password", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setResetMsg({ text: "Password must be at least 6 characters", type: "error" });
      return;
    }

    setResetLoading(true);
    try {
      const res = await resetPassword(resetEmail, newPassword);
      setResetMsg({ text: res.message || "Password updated! You can now log in.", type: "success" });
      setEmail(resetEmail);
      setPassword(newPassword);
      setTimeout(() => {
        setShowResetModal(false);
        setResetMsg({ text: "", type: "" });
      }, 1500);
    } catch (err) {
      setResetMsg({ text: err.message || "Failed to reset password", type: "error" });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "36px 32px",
          textAlign: "center",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 20px 50px -15px rgba(0,0,0,0.8), 0 0 40px -10px rgba(99, 102, 241, 0.25)",
        }}
      >
        {/* Logo */}
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
            marginBottom: "16px",
          }}
        >
          <Sparkles size={26} />
        </div>

        <h1 style={{ fontSize: "1.75rem", margin: "0 0 6px 0", fontWeight: 700 }}>
          Sign In to <span className="gradient-text">StudyTrack</span>
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
          Welcome back! Enter your details to continue.
        </p>

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
          <Link
            to="/register"
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
            Register Now
          </Link>
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
            Sign In
          </div>
        </div>

        {/* Error / Alert box */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              fontSize: "0.85rem",
              marginBottom: "18px",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, color: "#f43f5e" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: "left", marginBottom: "16px" }}>
            <label className="form-label" style={{ fontSize: "0.825rem" }}>
              Email or Username
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "38px" }}
                placeholder="Enter your email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "22px", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label" style={{ fontSize: "0.825rem", margin: 0 }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-primary)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: "relative", marginTop: "6px" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                style={{ paddingLeft: "38px", paddingRight: "38px" }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
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

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: "0.95rem", marginBottom: "18px" }}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
            Register Now
          </Link>
        </p>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel animate-scale-up"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "28px 24px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowResetModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbbf24",
                }}
              >
                <KeyRound size={20} />
              </div>
              <div style={{ textAlign: "left" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Reset Password</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Set a new password to access your account
                </p>
              </div>
            </div>

            {resetMsg.text && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: resetMsg.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                  border: resetMsg.type === "success" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(244, 63, 94, 0.3)",
                  color: resetMsg.type === "success" ? "#6ee7b7" : "#fda4af",
                }}
              >
                {resetMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{resetMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group" style={{ textAlign: "left", marginBottom: "14px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your email or username"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ textAlign: "left", marginBottom: "20px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: "10px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: "10px" }}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
