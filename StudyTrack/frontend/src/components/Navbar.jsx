import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Plus, User, Flame, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Navbar = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Welcome back, <span className="gradient-text">{user?.name?.split(" ")[0] || "Scholar"}</span> 👋
          </h1>
          <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>
            Let's make today productive and achieve your goals.
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Quick Launch Study Session */}
        <button
          onClick={() => navigate("/session")}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.875rem" }}
        >
          <Play size={16} fill="currentColor" />
          <span>Quick Study</span>
        </button>

        {/* User Profile Avatar Pill */}
        <button
          onClick={onOpenProfile}
          className="btn-secondary"
          style={{
            padding: "6px 12px 6px 6px",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user?.name?.split(" ")[0]}</span>
        </button>
      </div>
    </header>
  );
};
