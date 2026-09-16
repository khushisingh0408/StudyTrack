import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Timer,
  CheckSquare,
  BarChart3,
  Flame,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ onOpenProfile }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/subjects", icon: BookOpen, label: "Subjects & Syllabus" },
    { to: "/session", icon: Timer, label: "Study Session" },
    { to: "/tasks", icon: CheckSquare, label: "Tasks & Progress" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px 24px 8px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 0 16px rgba(99, 102, 241, 0.5)",
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Study<span style={{ color: "var(--accent-primary)" }}>Track</span>
          </h2>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Pro Workspace
          </span>
        </div>
      </div>

      {/* Streak Badge Widget */}
      <div
        style={{
          margin: "18px 0",
          padding: "12px 14px",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.08))",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fbbf24",
          }}
        >
          <Flame size={20} className="flame-glow" />
        </div>
        <div>
          <div style={{ fontSize: "0.813rem", color: "var(--text-secondary)", fontWeight: 500 }}>Study Streak</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fef08a" }}>
            {user?.currentStreak || 0} Day{user?.currentStreak === 1 ? "" : "s"} 🔥
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, marginTop: "6px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "11px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.938rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                background: isActive ? "rgba(99, 102, 241, 0.18)" : "transparent",
                border: isActive ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                boxShadow: isActive ? "0 4px 12px rgba(99, 102, 241, 0.15)" : "none",
                transition: "all 0.2s ease",
              })}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Section & Settings */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <button
          onClick={onOpenProfile}
          className="btn-ghost"
          style={{ width: "100%", justifyContent: "flex-start", padding: "10px 14px", fontSize: "0.9rem" }}
        >
          <Settings size={18} />
          <span>Goals & Settings</span>
        </button>

        <button
          onClick={logout}
          className="btn-ghost"
          style={{ width: "100%", justifyContent: "flex-start", padding: "10px 14px", fontSize: "0.9rem", color: "#fda4af" }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
