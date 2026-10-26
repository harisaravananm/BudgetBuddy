import React, { useEffect, useState } from "react";
import { authApi, financeApi, notificationsApi } from "./api";
import DashboardTab from "./components/DashboardTab";
import TransactionsTab from "./components/TransactionsTab";
import BudgetsTab from "./components/BudgetsTab";
import GoalsTab from "./components/GoalsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import ReportsTab from "./components/ReportsTab";
import SettingsTab from "./components/SettingsTab";
import TransactionModal from "./components/TransactionModal";
import NotificationsModal from "./components/NotificationsModal";

function AuthView({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await authApi.register(email, password, fullName);
      }
      const tokens = await authApi.login(email, password);
      localStorage.setItem("budgetbuddy_access", tokens.access);
      localStorage.setItem("budgetbuddy_refresh", tokens.refresh);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoLogin(demoEmail, demoPassword) {
    setError("");
    setBusy(true);
    try {
      const tokens = await authApi.login(demoEmail, demoPassword);
      localStorage.setItem("budgetbuddy_access", tokens.access);
      localStorage.setItem("budgetbuddy_refresh", tokens.refresh);
      onAuthenticated();
    } catch (err) {
      setError("Demo login error: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuthMock(provider) {
    setError("");
    setBusy(true);
    try {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const oauthEmail = `student_${randomId}@student.edu`;
      const oauthName = `College Student ${randomId}`;
      const res = await authApi.oauthLogin(provider, oauthEmail, oauthName);
      localStorage.setItem("budgetbuddy_access", res.access);
      localStorage.setItem("budgetbuddy_refresh", res.refresh);
      onAuthenticated();
    } catch (err) {
      setError("OAuth error: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div className="brand-icon">BB</div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "800" }}>BudgetBuddy</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Student Finance & Expense Management</p>
          </div>
        </div>

        <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>
          {mode === "login" ? "Sign In to Your Workspace" : "Create Student Account"}
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "20px" }}>
          {mode === "login"
            ? "Enter your credentials or test with one-click demo profiles."
            : "Begin managing your pocket money and savings goals today."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {mode === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Aarav Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              className="form-control"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</p>}

          <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "100%", marginTop: "6px" }}>
            {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Register"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <button
            type="button"
            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "13px", cursor: "pointer" }}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account? Register free" : "Already registered? Sign in"}
          </button>
        </div>

        {/* OAUTH SIMULATED BUTTONS */}
        <div style={{ margin: "20px 0 10px 0", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", textAlign: "center", marginBottom: "10px" }}>
            Or Continue With OAuth2
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => handleOAuthMock("google")}
            >
              🌐 Google
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => handleOAuthMock("github")}
            >
              🐙 GitHub
            </button>
          </div>
        </div>

        {/* ONE-CLICK DEMO ACCOUNTS */}
        <div className="demo-credentials">
          <div style={{ fontWeight: "700", color: "#a5b4fc", display: "flex", justifyContent: "space-between" }}>
            <span>⚡ Instant Demo Access</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>Pre-seeded with real data</span>
          </div>
          <p style={{ marginTop: "4px", color: "var(--text-muted)", fontSize: "11px" }}>
            Click below to instantly log in as any role:
          </p>
          <div className="demo-btn-grid">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleDemoLogin("student@budgetbuddy.local", "Student123!")}
            >
              🎓 Student
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleDemoLogin("premium@budgetbuddy.local", "Premium123!")}
            >
              ⭐ Premium
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleDemoLogin("admin@budgetbuddy.local", "Admin123!")}
            >
              🛡️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Global Financial & Notification States
  const [analytics, setAnalytics] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Month state for analytics & reports
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modals state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [activeGoalToDeposit, setActiveGoalToDeposit] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("budgetbuddy_access");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchAllData();
    }
  }, [profile, selectedMonth]);

  async function fetchProfile() {
    try {
      const data = await authApi.getMe();
      setProfile(data);
    } catch {
      localStorage.removeItem("budgetbuddy_access");
      localStorage.removeItem("budgetbuddy_refresh");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllData() {
    try {
      const [anData, expData, incData, bgData, glData, ntData] = await Promise.all([
        financeApi.getAnalytics(selectedMonth).catch(() => null),
        financeApi.getExpenses().catch(() => ({ results: [] })),
        financeApi.getIncomes().catch(() => ({ results: [] })),
        financeApi.getBudgets().catch(() => ({ results: [] })),
        financeApi.getGoals().catch(() => ({ results: [] })),
        notificationsApi.getNotifications().catch(() => ({ results: [], unread_count: 0 })),
      ]);

      if (anData) setAnalytics(anData);
      setExpenses(expData.results || expData || []);
      setIncomes(incData.results || incData || []);
      setBudgets(bgData.results || bgData || []);
      setGoals(glData.results || glData || []);
      setNotifications(ntData.results || ntData || []);
      setUnreadCount(ntData.unread_count || 0);
    } catch (err) {
      console.error("Error refreshing workspace data:", err);
    }
  }

  function handleLogout() {
    localStorage.removeItem("budgetbuddy_access");
    localStorage.removeItem("budgetbuddy_refresh");
    setProfile(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        Loading BudgetBuddy workspace...
      </div>
    );
  }

  if (!profile) {
    return <AuthView onAuthenticated={fetchProfile} />;
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "transactions", label: "Transactions", icon: "💳" },
    { key: "budgets", label: "Budget Planner", icon: "🎯" },
    { key: "goals", label: "Savings Goals", icon: "🏦" },
    { key: "analytics", label: "Analytics & Trends", icon: "📈" },
    { key: "reports", label: "Reports & Export", icon: "📄" },
    { key: "settings", label: profile.role === "admin" ? "Settings & Admin" : "Settings", icon: "⚙️" },
  ];

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">BB</div>
          <div className="brand-info">
            <h2>BudgetBuddy</h2>
            <span>STUDENT FINANCE</span>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? "active" : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.key === "budgets" && budgets.some((b) => b.is_over_budget) && (
                <span className="nav-badge">Alert</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {(profile.profile?.full_name || profile.email).charAt(0).toUpperCase()}
            </div>
            <div className="user-meta">
              <div className="name">{profile.profile?.full_name || profile.email}</div>
              <span className={`role role-${profile.role}`}>{profile.role}</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Sign Out ⎋
          </button>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* TOPBAR */}
        <header className="top-header">
          <div className="header-title">
            <h1>
              {navItems.find((n) => n.key === activeTab)?.icon}{" "}
              {navItems.find((n) => n.key === activeTab)?.label}
            </h1>
            <p>Pocket money discipline, expense budgeting & savings tracker</p>
          </div>

          <div className="header-actions">
            <button
              className="btn btn-outline"
              style={{ position: "relative" }}
              onClick={() => setShowNotificationsModal(true)}
            >
              🔔 Alerts
              {unreadCount > 0 && (
                <span className="nav-badge" style={{ position: "absolute", top: "-5px", right: "-5px" }}>
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setShowTransactionModal(true)}
            >
              + Record Transaction
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className="content-body">
          {activeTab === "dashboard" && (
            <DashboardTab
              analytics={analytics}
              goals={goals}
              recentExpenses={expenses}
              recentIncomes={incomes}
              onOpenDeposit={(g) => {
                setActiveGoalToDeposit(g);
                setActiveTab("goals");
              }}
              onOpenAddTransaction={() => setShowTransactionModal(true)}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsTab
              expenses={expenses}
              incomes={incomes}
              onRefresh={fetchAllData}
              onOpenAddModal={() => setShowTransactionModal(true)}
            />
          )}

          {activeTab === "budgets" && (
            <BudgetsTab
              budgets={budgets}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "goals" && (
            <GoalsTab
              goals={goals}
              onRefresh={fetchAllData}
              activeGoalToDeposit={activeGoalToDeposit}
              onClearActiveGoal={() => setActiveGoalToDeposit(null)}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsTab
              analytics={analytics}
              currentMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          )}

          {activeTab === "reports" && (
            <ReportsTab
              currentMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              profile={profile}
              onProfileSaved={setProfile}
            />
          )}
        </main>
      </div>

      {/* TRANSACTION MODAL */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={fetchAllData}
      />

      {/* NOTIFICATIONS MODAL */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefresh={fetchAllData}
      />
    </div>
  );
}
