import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Timer,
  CheckSquare,
  BarChart3,
  User,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const MobileNav = ({ onOpenProfile }) => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Home", end: true },
    { to: "/subjects", icon: BookOpen, label: "Syllabus" },
    { to: "/session", icon: Timer, label: "Timer", isCenter: true },
    { to: "/tasks", icon: CheckSquare, label: "Tasks" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.isCenter) {
          const isActive = location.pathname === "/session";
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`mobile-nav-center-btn ${isActive ? "active" : ""}`}
              aria-label="Launch Live Study Session Timer"
            >
              <div className="mobile-nav-center-icon">
                <Icon size={24} />
              </div>
              <span className="mobile-nav-label">Timer</span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={20} className="mobile-nav-icon" />
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        );
      })}

      {/* Profile / Goal Button */}
      <button
        onClick={onOpenProfile}
        className="mobile-nav-item mobile-nav-btn"
        aria-label="Open User Goals and Settings"
      >
        <div className="mobile-nav-avatar">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <span className="mobile-nav-label">Profile</span>
      </button>
    </nav>
  );
};
