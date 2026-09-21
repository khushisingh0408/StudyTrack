import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { StatCard } from "../components/StatCard";
import {
  Timer,
  Clock,
  Flame,
  CheckCircle,
  BookOpen,
  Plus,
  Play,
  ArrowRight,
  TrendingUp,
  Award,
  Calendar,
  Star,
  Sparkles,
} from "lucide-react";

export const Dashboard = () => {
  const { user, refreshUserStats } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, subjectsRes, sessionsRes, tasksRes, breakdownRes] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getSubjects(),
        api.getSessions({ limit: 5 }),
        api.getTasks({ status: "todo" }),
        api.getSubjectBreakdown(),
      ]);

      if (overviewRes.success) setStats(overviewRes.stats);
      if (subjectsRes.success) setSubjects(subjectsRes.subjects || []);
      if (sessionsRes.success) setRecentSessions(sessionsRes.sessions || []);
      if (tasksRes.success) setUpcomingTasks((tasksRes.tasks || []).slice(0, 4));
      if (breakdownRes.success) {
        setSubjectBreakdown(breakdownRes.subjects || []);
        if (breakdownRes.subjects && breakdownRes.subjects.length > 0) {
          setExpandedSubjectId(breakdownRes.subjects[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (mins) => {
    if (!mins || mins === 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const motivationalQuotes = {
    medical: "The art of medicine was to be learned only by its practice and by its service. Every case study counts.",
    engineering: "First solve the problem. Then, write the code. Build systems that scale.",
    competitive: "Consistency is the DNA of mastery. One PYQ and one concept at a time.",
    science: "Physics & Chemistry rewarded patience and deep intuition. Master the fundamentals.",
    commerce: "Accountability breeds excellence. Know your numbers inside out.",
    law: "Justice is truth in action. Master the sections, precedents, and arguments.",
  };

  const currentQuote = motivationalQuotes[user?.academicField] || motivationalQuotes.engineering;

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Main Focus Goal Banner */}
      <div
        className="glass-panel"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(139, 92, 246, 0.1))",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a5b4fc", fontSize: "0.875rem", fontWeight: 600, marginBottom: "4px" }}>
            <Sparkles size={16} />
            <span>DAILY STUDY MOMENTUM</span>
          </div>
          <h2 style={{ fontSize: "1.35rem", margin: 0 }}>
            {stats?.dailyGoalProgress >= 100
              ? "🎉 Daily Target Completed! Outstanding Focus!"
              : `Today's Goal: ${stats?.dailyGoalProgress || 0}% completed (${formatMinutes(stats?.todayMinutes)} / ${formatMinutes(stats?.dailyGoalMinutes)})`}
          </h2>
          <p style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>
            "{currentQuote}"
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/session?mode=timer")}
            className="btn-primary"
            style={{ padding: "10px 18px" }}
          >
            <Play size={16} fill="currentColor" />
            <span>Start Timer</span>
          </button>
          <button
            onClick={() => navigate("/session?mode=direct")}
            className="btn-secondary"
            style={{ padding: "10px 18px" }}
          >
            <Clock size={16} />
            <span>Log Direct Time</span>
          </button>
          <button
            onClick={() => navigate("/subjects")}
            className="btn-secondary"
            style={{ padding: "10px 18px" }}
          >
            <BookOpen size={16} />
            <span>Course Syllabus</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid (Daily, Weekly, Monthly, Yearly, Streak, Mastery) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <StatCard
          title="Today's Study Time"
          value={formatMinutes(stats?.todayMinutes)}
          subtext={`Target: ${formatMinutes(stats?.dailyGoalMinutes)} / day`}
          icon={Timer}
          color="indigo"
          progress={stats?.dailyGoalProgress || 0}
        />
        <StatCard
          title="Weekly Study Time"
          value={formatMinutes(stats?.weekMinutes)}
          subtext={`Goal: ${formatMinutes(stats?.weeklyGoalMinutes)} / week`}
          icon={TrendingUp}
          color="emerald"
          progress={stats?.weeklyGoalProgress || 0}
        />
        <StatCard
          title="Monthly Study Time"
          value={formatMinutes(stats?.monthMinutes)}
          subtext={`Target: ${formatMinutes(stats?.monthlyGoalMinutes || 5400)} / month`}
          icon={Calendar}
          color="cyan"
          progress={stats?.monthlyGoalProgress || 0}
        />
        <StatCard
          title="Yearly Study Time"
          value={formatMinutes(stats?.yearMinutes)}
          subtext={`Target: ${formatMinutes(stats?.yearlyGoalMinutes || 64800)} / year`}
          icon={Clock}
          color="indigo"
          progress={stats?.yearlyGoalProgress || 0}
        />
        <StatCard
          title="Active Streak"
          value={`${stats?.currentStreak || 0} Days`}
          subtext={`Personal best: ${stats?.longestStreak || 0} days`}
          icon={Flame}
          color="amber"
        />
        <StatCard
          title="Curriculum Mastery"
          value={`${stats?.completionRate || 0}%`}
          subtext={`${stats?.completedSubTopicCount || 0} / ${stats?.subTopicCount || 0} Sub-Topics done`}
          icon={Award}
          color="rose"
          progress={stats?.completionRate || 0}
        />
      </div>

      {/* Main 2-Column Section: Subject Progress & Recent Activity / Tasks */}
      <div className="responsive-2col">
        {/* Left Column: Subjects & Syllabus Progress */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Subjects & Curriculum Mastery</h3>
              <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>
                3-Level hierarchy: Subject → Topics → Sub-Topics
              </span>
            </div>
            <button onClick={() => navigate("/subjects")} className="btn-ghost" style={{ fontSize: "0.813rem" }}>
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {subjectBreakdown.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                border: "1px dashed var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <BookOpen size={36} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
              <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem" }}>No Subjects Added Yet</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Load a pre-configured course syllabus (MBBS, Engineering, UPSC, etc.) or create your own custom subjects.
              </p>
              <button onClick={() => navigate("/subjects")} className="btn-primary" style={{ padding: "8px 16px" }}>
                <Plus size={16} />
                <span>Browse Syllabus Templates</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {subjectBreakdown.slice(0, 6).map((subject) => {
                const sId = subject.id;
                const isExpanded = expandedSubjectId === sId;
                const hasTopics = subject.topics && subject.topics.length > 0;

                return (
                  <div
                    key={sId}
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      background: "rgba(255,255,255,0.02)",
                      overflow: "hidden",
                      borderLeft: `4px solid ${subject.color || "var(--accent-primary)"}`,
                    }}
                  >
                    {/* Subject Row */}
                    <div
                      onClick={() => setExpandedSubjectId(isExpanded ? null : sId)}
                      style={{
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{subject.name}</span>
                            <span
                              className="badge badge-indigo"
                              style={{
                                fontSize: "0.68rem",
                                padding: "1px 6px",
                                background: `${subject.color}20`,
                                color: subject.color,
                              }}
                            >
                              {subject.topicCount} Topics
                            </span>
                          </div>
                          <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {subject.completedSubTopics}/{subject.subTopicCount} Sub-Topics completed ({subject.progressPercentage}% done)
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#818cf8" }}>
                            {subject.totalHours} hrs
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            of {subject.targetHours}h target
                          </div>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Topic-Level Performance Breakdown */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "12px 16px 14px",
                          borderTop: "1px solid var(--border-subtle)",
                          background: "rgba(0,0,0,0.2)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                            Topic Performance & Time Logged
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/session?mode=direct`);
                            }}
                            className="btn-ghost"
                            style={{ fontSize: "0.75rem", padding: "2px 6px", color: "var(--accent-primary)" }}
                          >
                            + Log for this Subject
                          </button>
                        </div>

                        {!hasTopics && subject.totalMinutes === 0 && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            No study sessions or topics logged for this subject yet.
                          </div>
                        )}

                        {/* If student logged time without a specific topic */}
                        {subject.generalHours > 0 && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderRadius: "var(--radius-sm)",
                              background: "rgba(255,255,255,0.02)",
                              fontSize: "0.813rem",
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)" }}>
                              📖 General Subject Study (Direct / Untagged)
                            </span>
                            <span style={{ fontWeight: 600, color: "#cbd5e1" }}>
                              {subject.generalHours} hrs
                            </span>
                          </div>
                        )}

                        {/* List topics with exact time */}
                        {subject.topics &&
                          subject.topics.map((topic) => (
                            <div
                              key={topic.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                borderRadius: "var(--radius-sm)",
                                background: "rgba(255,255,255,0.02)",
                                fontSize: "0.813rem",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: topic.status === "completed" ? "#34d399" : "var(--text-muted)" }}>
                                  {topic.status === "completed" ? "✓" : "•"}
                                </span>
                                <span style={{ fontWeight: 500 }}>{topic.title}</span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                  {topic.completedSubTopics}/{topic.subTopicCount} sub-topics
                                </span>
                                <span style={{ fontWeight: 700, color: topic.hours > 0 ? "#818cf8" : "var(--text-muted)" }}>
                                  {topic.hours > 0 ? `${topic.hours} hrs` : "0h"}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Tasks & Recent Sessions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Upcoming Tasks */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Pending Tasks & Revisions</h3>
                <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>
                  {upcomingTasks.length} task{upcomingTasks.length === 1 ? "" : "s"} due soon
                </span>
              </div>
              <button onClick={() => navigate("/tasks")} className="btn-ghost" style={{ fontSize: "0.813rem" }}>
                <span>All Tasks</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                <CheckCircle size={28} style={{ color: "#34d399", marginBottom: "8px" }} />
                <p>All caught up! No pending tasks.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcomingTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => navigate("/tasks")}
                    className="glass-panel-interactive"
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className={`badge ${
                          task.priority === "urgent"
                            ? "badge-rose"
                            : task.priority === "high"
                            ? "badge-amber"
                            : "badge-indigo"
                        }`}
                        style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                      >
                        {task.priority}
                      </span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{task.title}</span>
                    </div>

                    {task.subject && (
                      <span style={{ fontSize: "0.75rem", color: task.subject.color || "var(--text-muted)" }}>
                        {task.subject.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Study Sessions */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Recent Study Activity</h3>
                <span style={{ fontSize: "0.813rem", color: "var(--text-muted)" }}>Latest logged sessions</span>
              </div>
              <button onClick={() => navigate("/analytics")} className="btn-ghost" style={{ fontSize: "0.813rem" }}>
                <span>Full Analytics</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                <Clock size={28} style={{ color: "var(--text-muted)", marginBottom: "8px" }} />
                <p>No study sessions recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recentSessions.map((session) => (
                  <div
                    key={session._id}
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: session.subject?.color || "var(--accent-primary)",
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                          {session.subject?.name || "General Study"}
                        </span>
                        <span
                          className="badge badge-indigo"
                          style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                        >
                          {session.sessionType === "timer" ? "⏱️ Timer" : "📝 Direct"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {session.topic?.title ? `${session.topic.title} • ` : ""}
                        {new Date(session.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#818cf8" }}>
                        {formatMinutes(session.durationMinutes)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px", justifyContent: "flex-end", color: "#fbbf24", fontSize: "0.75rem" }}>
                        <Star size={12} fill="currentColor" />
                        <span>{session.productivityRating || 4}/5</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
