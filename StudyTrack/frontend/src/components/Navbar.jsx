import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Plus, User, Flame, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Navbar = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {/* Left: Brand / Welcome Info */}
      <div className="header-left">
        {/* Mobile Logo Brand (visible on mobile where sidebar is hidden) */}
        <div className="mobile-brand mobile-only">
          <div className="mobile-logo-icon">
            <Sparkles size={18} />
          </div>
          <span className="mobile-brand-title">
            Study<span>Track</span>
          </span>
        </div>

        {/* Desktop Welcome Title */}
        <div className="desktop-welcome desktop-only">
          <h1 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Welcome back, <span className="gradient-text">{user?.name?.split(" ")[0] || "Scholar"}</span> 👋
          </h1>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Let's make today productive and achieve your study goals.
          </span>
        </div>
      </div>

      {/* Right: Actions (Streak, Quick Timer, Profile) */}
      <div className="header-right">
        {/* Streak Pill */}
        <div className="header-streak-pill" title={`${user?.currentStreak || 0} Day Study Streak`}>
          <Flame size={16} className="flame-glow" style={{ color: "#fbbf24" }} />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fef08a" }}>
            {user?.currentStreak || 0}d
          </span>
        </div>

        {/* Quick Launch Study Session */}
        <button
          onClick={() => navigate("/session")}
          className="btn-primary header-study-btn"
          title="Quick Study Session"
        >
          <Play size={15} fill="currentColor" />
          <span className="desktop-only">Quick Study</span>
        </button>

        {/* User Profile Avatar Pill */}
        <button
          onClick={onOpenProfile}
          className="btn-secondary header-profile-btn"
          title="Profile & Target Goals"
        >
          <div className="header-avatar">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="header-username desktop-only">
            {user?.name?.split(" ")[0] || "Scholar"}
          </span>
        </button>
      </div>
    </header>
  );
};
