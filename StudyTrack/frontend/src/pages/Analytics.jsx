import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Modal } from "../components/Modal";
import confetti from "canvas-confetti";
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
  Plus,
  Play,
  CheckCircle,
  FileText,
  Zap,
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
  const navigate = useNavigate();
  const { refreshUserStats } = useAuth();
  const [period, setPeriod] = useState("week"); // 'week' | 'month' | 'year'
  const [timeseriesData, setTimeseriesData] = useState(null);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manual Time Entry Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
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

  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualHours, setManualHours] = useState(1);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualProductivity, setManualProductivity] = useState(5);
  const [manualNotes, setManualNotes] = useState("");
  const [manualMarkCompleted, setManualMarkCompleted] = useState(true);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState("");

  useEffect(() => {
    fetchAnalytics();
    loadSubjects();
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

  const loadSubjects = async () => {
    try {
      const res = await api.getSubjects();
      if (res.success && res.subjects.length > 0) {
        setSubjects(res.subjects);
        if (!selectedSubjectId) {
          setSelectedSubjectId(res.subjects[0]._id || res.subjects[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading subjects in analytics:", err);
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

  const handleSaveManualTime = async (e) => {
    e.preventDefault();
    const totalMinutes = Number(manualHours) * 60 + Number(manualMinutes);

    if (totalMinutes <= 0) {
      alert("Please enter a valid study duration greater than 0 minutes.");
      return;
    }

    const finalSubjectName = isCustomSubject ? customSubjectName.trim() : null;
    const finalSubjectId = !isCustomSubject ? selectedSubjectId : null;

    if (!finalSubjectId && !finalSubjectName) {
      alert("Please select or type a Subject name");
      return;
    }

    const finalTopicName = isCustomTopic ? customTopicName.trim() : null;
    const finalTopicId = !isCustomTopic && selectedTopicId ? selectedTopicId : null;

    const finalSubTopicName = isCustomSubTopic ? customSubTopicName.trim() : null;
    const finalSubTopicId = !isCustomSubTopic && selectedSubTopicId ? selectedSubTopicId : null;

    setManualSaving(true);
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
        date: new Date(manualDate),
        productivityRating: manualProductivity,
        notes: manualNotes,
        markSubTopicCompleted: manualMarkCompleted && (!!finalSubTopicId || !!finalSubTopicName),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setIsManualModalOpen(false);
      setManualNotes("");
      setManualSuccessMsg(res.message || `Added ${totalMinutes} mins study time to Analytics! 🔥`);
      await fetchAnalytics();
      await loadSubjects();
      refreshUserStats();
      setTimeout(() => setManualSuccessMsg(""), 4500);
    } catch (err) {
      alert(err.message || "Failed to save study time");
    } finally {
      setManualSaving(false);
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
      {/* Top Header & Action Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 4px 0" }}>
            Performance <span className="gradient-text">& Study Analytics</span>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Deep study analytics across <strong>Week</strong>, <strong>Month</strong>, and <strong>Year</strong>. Padhai ka time yahan add aur analyze karein.
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

          {/* "+ Log Study Time" Direct Button */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="btn-primary"
            style={{
              padding: "8px 16px",
              fontSize: "0.875rem",
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)",
            }}
            title="Add Past or Offline Study Time Directly"
          >
            <Plus size={16} />
            <span>+ Log Study Time</span>
          </button>

          <button
            onClick={() => navigate("/session?mode=timer")}
            className="btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.875rem" }}
            title="Start Live Timer / Stopwatch"
          >
            <Play size={15} fill="currentColor" />
            <span>Live Timer</span>
          </button>

          <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: "8px 14px" }} title="Export CSV Report">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {manualSuccessMsg && (
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
          <span>{manualSuccessMsg}</span>
        </div>
      )}

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", margin: "0 0 4px 0" }}>Subject Mastery & Curriculum Overview</h3>
            <p style={{ fontSize: "0.813rem", color: "var(--text-muted)", margin: 0 }}>
              Cumulative progress, sub-topic completion rates, and target hours comparison.
            </p>
          </div>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="btn-ghost"
            style={{ fontSize: "0.85rem", color: "var(--accent-primary)" }}
          >
            <Plus size={15} />
            <span>+ Add Time for Subject</span>
          </button>
        </div>

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

      {/* --- Modal: Manual Study Time Logger --- */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="📝 Log Past / Offline Study Time"
        maxWidth="600px"
      >
        <form onSubmit={handleSaveManualTime}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Padhai ka time manually enter karein — yeh record turant aapke Analytics charts, totals aur streak me jud jayega.
          </p>

          {/* Subject Hierarchy */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
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
                  placeholder="Type Subject Name (e.g. Maths, Biology)"
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Optional Topic */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>
                    2. Topic <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomTopic(!isCustomTopic)}
                    className="btn-ghost"
                    style={{ fontSize: "0.7rem", padding: "0 4px", color: "var(--accent-primary)" }}
                  >
                    {isCustomTopic ? "← Existing" : "+ New"}
                  </button>
                </div>

                {isCustomTopic ? (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Topic name"
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
                    <option value="">No specific topic</option>
                    {topics.map((t) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Optional SubTopic */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>
                    3. Sub-Topic <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubTopic(!isCustomSubTopic)}
                    className="btn-ghost"
                    style={{ fontSize: "0.7rem", padding: "0 4px", color: "var(--accent-primary)" }}
                  >
                    {isCustomSubTopic ? "← Existing" : "+ New"}
                  </button>
                </div>

                {isCustomSubTopic ? (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Sub-topic name"
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
                    <option value="">No specific sub-topic</option>
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

          {/* Date & Duration */}
          <div className="grid-cols-2" style={{ marginBottom: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Study Date</label>
              <input
                type="date"
                className="form-input"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Study Duration</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Hours"
                    min="0"
                    max="24"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Hours</span>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Minutes"
                    min="0"
                    max="59"
                    step="5"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick preset chips */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
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
                  setManualHours(preset.h);
                  setManualMinutes(preset.m);
                }}
                className="btn-ghost"
                style={{
                  padding: "3px 8px",
                  fontSize: "0.75rem",
                  background: manualHours === preset.h && manualMinutes === preset.m ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${manualHours === preset.h && manualMinutes === preset.m ? "rgba(99, 102, 241, 0.5)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-sm)",
                  color: manualHours === preset.h && manualMinutes === preset.m ? "#a5b4fc" : "var(--text-secondary)",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Star Focus Rating */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="form-label">Focus & Productivity Rating (1 - 5 Stars)</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setManualProductivity(star)}
                  className="btn-ghost"
                  style={{
                    padding: "6px 10px",
                    color: manualProductivity >= star ? "#fbbf24" : "var(--text-muted)",
                    background: manualProductivity >= star ? "rgba(245, 158, 11, 0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${manualProductivity >= star ? "rgba(245, 158, 11, 0.3)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Star size={16} fill={manualProductivity >= star ? "currentColor" : "none"} />
                  <span style={{ marginLeft: "4px", fontWeight: 600 }}>{star}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="form-label">Study Notes & Key Insights</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="What topics or formulas did you cover?"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
            />
          </div>

          {(selectedSubTopicId || customSubTopicName) && (
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "20px" }}>
              <input
                type="checkbox"
                checked={manualMarkCompleted}
                onChange={(e) => setManualMarkCompleted(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)" }}
              />
              <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                Mark sub-topic as <strong>Completed</strong>
              </span>
            </label>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsManualModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={manualSaving}>
              {manualSaving ? "Saving..." : "Save to Analytics"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
