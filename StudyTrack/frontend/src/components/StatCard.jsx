import React from "react";

export const StatCard = ({ title, value, subtext, icon: Icon, color = "indigo", progress }) => {
  const colorMap = {
    indigo: {
      bg: "rgba(99, 102, 241, 0.12)",
      text: "#818cf8",
      border: "rgba(99, 102, 241, 0.25)",
      glow: "rgba(99, 102, 241, 0.4)",
    },
    emerald: {
      bg: "rgba(16, 185, 129, 0.12)",
      text: "#34d399",
      border: "rgba(16, 185, 129, 0.25)",
      glow: "rgba(16, 185, 129, 0.4)",
    },
    amber: {
      bg: "rgba(245, 158, 11, 0.12)",
      text: "#fbbf24",
      border: "rgba(245, 158, 11, 0.25)",
      glow: "rgba(245, 158, 11, 0.4)",
    },
    rose: {
      bg: "rgba(244, 63, 94, 0.12)",
      text: "#fb7185",
      border: "rgba(244, 63, 94, 0.25)",
      glow: "rgba(244, 63, 94, 0.4)",
    },
    cyan: {
      bg: "rgba(6, 182, 212, 0.12)",
      text: "#38bdf8",
      border: "rgba(6, 182, 212, 0.25)",
      glow: "rgba(6, 182, 212, 0.4)",
    },
  };

  const c = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="glass-panel"
      style={{
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </span>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, marginTop: "6px", fontFamily: "var(--font-display)", color: "#ffffff" }}>
            {value}
          </div>
        </div>
        {Icon && (
          <div
            style={{
              padding: "12px",
              borderRadius: "14px",
              background: c.bg,
              color: c.text,
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div style={{ marginTop: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
            <span>Progress</span>
            <span style={{ fontWeight: 600, color: c.text }}>{progress}%</span>
          </div>
          <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${c.text}, #818cf8)`,
                borderRadius: "999px",
                transition: "width 0.5s ease-out",
              }}
            />
          </div>
        </div>
      )}

      {subtext && (
        <div style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginTop: "4px" }}>
          {subtext}
        </div>
      )}
    </div>
  );
};
