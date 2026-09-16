import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  BarChart3,
  Calendar,
  Clock,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Award,
  Star,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Analytics = () => {
  const [period, setPeriod] = useState("week"); // 'week' | 'month' | 'year'
  const [timeseriesData, setTimeseriesData] = useState(null);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [tsRes, subjRes] = await Promise.all([
        api.getAnalyticsTimeseries(period),
        api.getSubjectBreakdown(),
      ]);

      if (tsRes.success) setTimeseriesData(tsRes);
      if (subjRes.success) setSubjectBreakdown(subjRes.subjects || []);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!timeseriesData || !timeseriesData.dataPoints) return;
    const headers = ["Label", "Date", "Duration (Minutes)", "Duration (Hours)", "Sessions", "Avg Productivity"];
    const rows = timeseriesData.dataPoints.map((p) => [
      `"${p.label}"`,
      `"${p.dateStr}"`,
      p.totalMinutes,
      p.totalHours,
      p.sessionCount,
      p.avgProductivity,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `studytrack_analytics_${period}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart configs
  const labels = timeseriesData?.dataPoints?.map((p) => p.shortLabel || p.label) || [];
  const hoursData = timeseriesData?.dataPoints?.map((p) => p.totalHours) || [];
  const productivityData = timeseriesData?.dataPoints?.map((p) => (p.sessionCount > 0 ? p.avgProductivity : null)) || [];

  const barChartData = {
    labels,
    datasets: [
      {
        label: "Study Hours",
        data: hoursData,
        backgroundColor: "rgba(99, 102, 241, 0.75)",
        borderColor: "#818cf8",
        borderWidth: 1.5,
        borderRadius: 8,
        hoverBackgroundColor: "rgba(99, 102, 241, 0.95)",
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#f8fafc",
        bodyColor: "#a5b4fc",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => ` ${context.parsed.y} Hours Studied`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { size: 12 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { size: 12 } },
        beginAtZero: true,
      },
    },
  };

  // Doughnut chart for subject distribution
  const doughnutLabels = timeseriesData?.subjectBreakdown?.map((s) => s.name) || [];
  const doughnutValues = timeseriesData?.subjectBreakdown?.map((s) => s.hours) || [];
  const doughnutColors = timeseriesData?.subjectBreakdown?.map((s) => s.color) || ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

  const doughnutData = {
    labels: doughnutLabels.length > 0 ? doughnutLabels : ["No Study Data"],
    datasets: [
      {
        data: doughnutValues.length > 0 ? doughnutValues : [1],
        backgroundColor: doughnutValues.length > 0 ? doughnutColors : ["rgba(255,255,255,0.1)"],
        borderColor: "#0f172a",
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#cbd5e1", boxWidth: 12, padding: 16 },
      },
    },
    cutout: "70%",
  };

  // Line chart for productivity
  const lineChartData = {
    labels,
    datasets: [
      {
        label: "Productivity Rating (1 - 5)",
        data: productivityData,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#ffffff",
        pointRadius: 4,
        fill: true,
        tension: 0.35,
        spanGaps: true,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#f8fafc",
        bodyColor: "#fde68a",
        padding: 12,
        callbacks: {
          label: (context) => ` Focus Rating: ${context.parsed.y}/5 Stars`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
      },
      y: {
        min: 1,
        max: 5,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", stepSize: 1 },
      },
    },
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header & Period Selector (Week / Month / Year) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 4px 0" }}>
            Performance <span className="gradient-text">& Analytics</span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Analyze deep study trends across <strong>Week</strong>, <strong>Month</strong>, and <strong>Year</strong>.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Week / Month / Year Tabs */}
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
              onClick={() => setPeriod("week")}
              className={period === "week" ? "btn-primary" : "btn-ghost"}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: "0.875rem" }}
            >
              Week View
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={period === "month" ? "btn-primary" : "btn-ghost"}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: "0.875rem" }}
            >
              Month View
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={period === "year" ? "btn-primary" : "btn-ghost"}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: "0.875rem" }}
            >
              Year View
            </button>
          </div>

          <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: "8px 14px" }} title="Export CSV Report">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid-cols-4">
        <div className="glass-panel" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            {period.toUpperCase()} TOTAL STUDY TIME
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#a5b4fc", marginTop: "4px" }}>
            {timeseriesData?.grandTotalHours || 0} Hours
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            ~ {timeseriesData?.grandTotalMinutes || 0} minutes logged
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            AVERAGE DAILY STUDY
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>
            {period === "week"
              ? ((timeseriesData?.grandTotalHours || 0) / 7).toFixed(1)
              : period === "month"
              ? ((timeseriesData?.grandTotalHours || 0) / 30).toFixed(1)
              : ((timeseriesData?.grandTotalHours || 0) / 365).toFixed(1)}{" "}
            Hrs / Day
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Consistent study pace</span>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            MOST STUDIED SUBJECT
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fbbf24", marginTop: "6px" }}>
            {timeseriesData?.subjectBreakdown && timeseriesData.subjectBreakdown.length > 0
              ? timeseriesData.subjectBreakdown[0].name
              : "None yet"}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {timeseriesData?.subjectBreakdown && timeseriesData.subjectBreakdown.length > 0
              ? `${timeseriesData.subjectBreakdown[0].hours} hrs (${timeseriesData.subjectBreakdown[0].percentage}%)`
              : "Log a session to track"}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            TOTAL SESSIONS RECORDED
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
            {timeseriesData?.dataPoints?.reduce((acc, p) => acc + (p.sessionCount || 0), 0) || 0} Sessions
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>High focus cycles</span>
        </div>
      </div>

      {/* Main Charts Grid: Bar Chart & Doughnut Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "24px" }}>
        {/* Study Duration Bar Chart */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Study Time Distribution</h3>
              <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>
                {period === "week" ? "Daily breakdown (Past 7 Days)" : period === "month" ? "Daily timeline (Past 30 Days)" : "12-Month study trajectory"}
              </span>
            </div>
            <span className="badge badge-indigo">Hours Studied</span>
          </div>

          <div style={{ flex: 1, minHeight: "280px" }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Subject Share Doughnut Chart */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Subject Share</h3>
              <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>Proportion of hours per subject</span>
            </div>
            <PieIcon size={18} style={{ color: "var(--text-muted)" }} />
          </div>

          <div style={{ flex: 1, minHeight: "260px", position: "relative" }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Productivity Trend Line Chart */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Focus & Productivity Rating Trend</h3>
            <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>
              Average self-rated focus score per session (1 - 5 stars)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#fbbf24", fontSize: "0.85rem", fontWeight: 600 }}>
            <Star size={16} fill="currentColor" />
            <span>Focus Scale</span>
          </div>
        </div>

        <div style={{ height: "220px" }}>
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      </div>

      {/* Subject Detailed Breakdown Table */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1.15rem", margin: "0 0 4px 0" }}>Subject Mastery & Curriculum Overview</h3>
        <p style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginBottom: "18px" }}>
          Cumulative progress, sub-topic completion rates, and target hours comparison.
        </p>

        {subjectBreakdown.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No subjects to display.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 14px" }}>Subject</th>
                  <th style={{ padding: "12px 14px" }}>Hours Studied</th>
                  <th style={{ padding: "12px 14px" }}>Target Goal</th>
                  <th style={{ padding: "12px 14px" }}>Sub-Topics Done</th>
                  <th style={{ padding: "12px 14px" }}>Mastery Progress</th>
                  <th style={{ padding: "12px 14px" }}>Avg Focus</th>
                </tr>
              </thead>
              <tbody>
                {subjectBreakdown.map((subj) => {
                  const isExpanded = expandedSubjectId === subj.id;
                  const hasTopics = subj.topics && subj.topics.length > 0;

                  return (
                    <React.Fragment key={subj.id}>
                      <tr
                        onClick={() => setExpandedSubjectId(isExpanded ? null : subj.id)}
                        style={{
                          borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.04)",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "14px", fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", transition: "transform 0.2s ease", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>
                              ▶
                            </span>
                            <span
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background: subj.color || "var(--accent-primary)",
                              }}
                            />
                            <span>{subj.name}</span>
                            <span className="badge badge-indigo" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                              {subj.topicCount} Topics
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "14px", fontWeight: 700, color: "#818cf8" }}>
                          {subj.totalHours} hrs
                        </td>
                        <td style={{ padding: "14px", color: "var(--text-secondary)" }}>
                          {subj.targetHours} hrs
                        </td>
                        <td style={{ padding: "14px" }}>
                          {subj.completedSubTopics} / {subj.subTopicCount}
                        </td>
                        <td style={{ padding: "14px", width: "180px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "999px" }}>
                              <div
                                style={{
                                  width: `${subj.progressPercentage || 0}%`,
                                  height: "100%",
                                  background: subj.color || "var(--accent-primary)",
                                  borderRadius: "999px",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{subj.progressPercentage}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#fbbf24" }}>
                            <Star size={14} fill="currentColor" />
                            <span>{subj.avgProductivity || "-"}/5</span>
                          </div>
                        </td>
                      </tr>

                      {/* Nested Topic-Level Deep Dive Breakdown */}
                      {isExpanded && (
                        <tr style={{ background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td colSpan={6} style={{ padding: "12px 18px 16px 36px" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>
                              Topic-Wise Study Hours for {subj.name}
                            </div>

                            {subj.generalHours > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 12px",
                                  borderRadius: "var(--radius-sm)",
                                  background: "rgba(255,255,255,0.02)",
                                  fontSize: "0.813rem",
                                  marginBottom: "6px",
                                }}
                              >
                                <span style={{ color: "var(--text-secondary)" }}>
                                  📖 General / Direct Subject Study (No sub-topic specified)
                                </span>
                                <span style={{ fontWeight: 600, color: "#cbd5e1" }}>
                                  {subj.generalHours} hrs
                                </span>
                              </div>
                            )}

                            {!hasTopics && subj.generalHours === 0 ? (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                No specific topic study recorded yet.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {subj.topics &&
                                  subj.topics.map((t) => (
                                    <div
                                      key={t.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "6px 12px",
                                        borderRadius: "var(--radius-sm)",
                                        background: "rgba(255,255,255,0.02)",
                                        fontSize: "0.813rem",
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ color: t.status === "completed" ? "#34d399" : "var(--text-muted)" }}>
                                          {t.status === "completed" ? "✓" : "•"}
                                        </span>
                                        <span>{t.title}</span>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                          ({t.sessionCount} sessions)
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                          {t.completedSubTopics}/{t.subTopicCount} sub-topics
                                        </span>
                                        <span style={{ fontWeight: 700, color: t.hours > 0 ? "#818cf8" : "var(--text-muted)", minWidth: "50px", textAlign: "right" }}>
                                          {t.hours > 0 ? `${t.hours} hrs` : "0h"}
                                        </span>
                                        {t.percentageOfSubject > 0 && (
                                          <span className="badge badge-indigo" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                                            {t.percentageOfSubject}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
