import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Target,
  PiggyBank,
  TrendingUp,
  FileText,
  Settings,
  Sun,
  Moon,
  Bell,
  Menu,
  Plus,
} from "lucide-react";
import { financeApi, notificationsApi } from "./api";
import { useAuth } from "./auth/AuthContext";
import DashboardTab from "./components/DashboardTab";
import TransactionsTab from "./components/TransactionsTab";
import BudgetsTab from "./components/BudgetsTab";
import GoalsTab from "./components/GoalsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import ReportsTab from "./components/ReportsTab";
import SettingsTab from "./components/SettingsTab";
import TransactionModal from "./components/TransactionModal";
import NotificationsModal from "./components/NotificationsModal";

export function AuthView() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate("/overview", { replace: true });
    } catch (err) {
      const responseErrors = err.response?.data;
      if (responseErrors && typeof responseErrors === "object") {
        setFieldErrors(responseErrors);
        setError(responseErrors.detail || "");
      } else if (!err.response) {
        setError("Cannot reach server. Is the backend running?");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoLogin(demoEmail, demoPassword) {
    setError("");
    setBusy(true);
    try {
      await login(demoEmail, demoPassword);
      navigate("/overview", { replace: true });
    } catch (err) {
      setError("Demo login error: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleOAuthLogin(provider) {
    setError("");
    const state = crypto.randomUUID();
    sessionStorage.setItem("budgetbuddy_oauth_state", state);
    const callback = `${window.location.origin}/auth/callback/${provider}`;
    const params = new URLSearchParams({
      client_id: provider === "google" ? import.meta.env.VITE_GOOGLE_CLIENT_ID : import.meta.env.VITE_GITHUB_CLIENT_ID,
      redirect_uri: callback,
      response_type: "code",
      state,
      scope: provider === "google" ? "openid email profile" : "read:user user:email",
    });
    const endpoint = provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://github.com/login/oauth/authorize";
    window.location.assign(`${endpoint}?${params.toString()}`);
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
              {fieldErrors.full_name?.map((message) => <p key={message} className="field-error">{message}</p>)}
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
            {fieldErrors.email?.map((message) => <p key={message} className="field-error">{message}</p>)}
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              required
              className="form-control"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Hide" : "Show"}
            </button>
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "5px" }}>
              Use at least 8 characters.
            </p>
            {fieldErrors.password?.map((message) => <p key={message} className="field-error">{message}</p>)}
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

        <div style={{ margin: "20px 0 10px 0", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", textAlign: "center", marginBottom: "10px" }}>
            Or Continue With OAuth2
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => handleOAuthLogin("google")}
            >
              🌐 Google
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => handleOAuthLogin("github")}
            >
              🐙 GitHub
            </button>
          </div>
        </div>

        {/* ONE-CLICK DEMO ACCOUNTS */}
        {import.meta.env.VITE_DEMO_MODE === "true" && <div className="demo-credentials">
          <div style={{ fontWeight: "700", color: "#a5b4fc", display: "flex", justifyContent: "space-between" }}>
            <span>Quick demo access</span>
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
              Student
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleDemoLogin("premium@budgetbuddy.local", "Premium123!")}
            >
              Premium
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleDemoLogin("admin@budgetbuddy.local", "Admin123!")}
            >
              Admin
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
}

export default function App() {
  const { user: profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("budgetbuddy_theme");
    return saved || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("budgetbuddy_theme", theme);
  }, [theme]);

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
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [activeGoalToDeposit, setActiveGoalToDeposit] = useState(null);

  function handleOpenAddTransaction() {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  }

  function handleOpenEditTransaction(item) {
    setEditingTransaction(item);
    setShowTransactionModal(true);
  }

  function handleCloseTransactionModal() {
    setEditingTransaction(null);
    setShowTransactionModal(false);
  }

  useEffect(() => {
    if (profile) {
      fetchAllData();
    }
  }, [profile, selectedMonth]);

  useEffect(() => {
    if (!profile) return undefined;
    const timer = window.setInterval(() => {
      notificationsApi.getUnreadCount().then((data) => setUnreadCount(data.count)).catch(() => {});
    }, 60000);
    return () => window.clearInterval(timer);
  }, [profile]);

  async function fetchAllData() {
    try {
      const [anData, expData, incData, bgData, glData, ntData] = await Promise.all([
        financeApi.getDashboardSummary().catch(() => null),
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

  const navItems = [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard },
    { key: "transactions", label: "Transactions", icon: Receipt },
    { key: "budgets", label: "Budgets", icon: Target },
    { key: "goals", label: "Savings Goals", icon: PiggyBank },
    { key: "analytics", label: "Trends", icon: TrendingUp },
    { key: "reports", label: "Reports", icon: FileText },
    { key: "settings", label: profile.role === "admin" ? "Settings & Admin" : "Settings", icon: Settings },
  ];

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <button className={`sidebar-backdrop ${sidebarOpen ? "is-visible" : ""}`} aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">BB</div>
          <div className="brand-info">
            <h2>BudgetBuddy</h2>
            <span>Student Finance</span>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-item ${activeTab === item.key ? "active" : ""}`}
                onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.key === "budgets" && budgets.some((b) => b.is_over_budget) && (
                  <span className="nav-badge">Alert</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            {profile.avatar_url ? <img className="user-avatar" src={profile.avatar_url} alt="" /> : <div className="user-avatar">
              {(profile.profile?.full_name || profile.email).charAt(0).toUpperCase()}
            </div>}
            <div className="user-meta">
              <div className="name">{profile.profile?.full_name || profile.email}</div>
              <span className={`role role-${profile.role}`}>{profile.role}</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => logout()}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* TOPBAR */}
        <header className="top-header">
          <button className="mobile-menu-btn btn btn-outline" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Menu size={16} />
          </button>
          <div className="header-title">
            <h1>
              {navItems.find((n) => n.key === activeTab)?.label}
            </h1>
            <p>Pocket money discipline, expense budgeting & savings tracker</p>
          </div>

          <div className="header-actions">
            <button
              className="btn btn-outline theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span style={{ fontSize: "12px", marginLeft: "4px" }}>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <button
              className="btn btn-outline"
              style={{ position: "relative" }}
              onClick={() => setShowNotificationsModal(true)}
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="nav-badge" style={{ position: "absolute", top: "-5px", right: "-5px" }}>
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              className="btn btn-primary record-transaction-btn"
              onClick={handleOpenAddTransaction}
            >
              <Plus size={14} /> Record Transaction
            </button>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className="content-body">
          {(() => {
            const totalIncomeVal =
              analytics?.summary?.total_income ||
              incomes.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0);
            const overallBudget = budgets.find((b) => !b.category);
            const overallBudgetLimit = overallBudget ? parseFloat(overallBudget.limit_amount) : 0;

            return (
              <>
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
                    onOpenAddTransaction={handleOpenAddTransaction}
                    onOpenEditTransaction={handleOpenEditTransaction}
                  />
                )}

                {activeTab === "transactions" && (
                  <TransactionsTab
                    expenses={expenses}
                    incomes={incomes}
                    onRefresh={fetchAllData}
                    onOpenAddModal={handleOpenAddTransaction}
                    onOpenEditModal={handleOpenEditTransaction}
                    totalIncome={totalIncomeVal}
                    budgetLimit={overallBudgetLimit}
                  />
                )}

                {activeTab === "budgets" && (
                  <BudgetsTab
                    budgets={budgets}
                    onRefresh={fetchAllData}
                    totalIncome={totalIncomeVal}
                  />
                )}
              </>
            );
          })()}

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
              theme={theme}
              onThemeChange={setTheme}
            />
          )}
        </main>
      </div>

      {/* TRANSACTION MODAL */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={handleCloseTransactionModal}
        onSuccess={fetchAllData}
        editItem={editingTransaction}
        totalIncome={
          analytics?.summary?.total_income ||
          incomes.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0)
        }
        budgetLimit={
          budgets.find((b) => !b.category)
            ? parseFloat(budgets.find((b) => !b.category).limit_amount)
            : 0
        }
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
