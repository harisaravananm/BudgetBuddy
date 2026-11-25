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
import { authApi, financeApi, notificationsApi } from "./api";
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
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Password Reset State
  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleRequestReset(e) {
    e.preventDefault();
    setError("");
    setStatusMessage("");
    if (!email) {
      setError("Please provide your registered email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.requestPasswordResetOtp(email);
      setStatusMessage(res.detail || "A 6-digit password reset code has been sent to your email.");
      setResetStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyReset(e) {
    e.preventDefault();
    setError("");
    setStatusMessage("");
    if (resetNewPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.verifyPasswordResetOtp(email, resetCode, resetNewPassword);
      setStatusMessage(res.detail || "Password reset successful! You can now log in.");
      setPassword(resetNewPassword);
      setMode("login");
      setResetStep(1);
    } catch (err) {
      const errData = err.response?.data?.error;
      setError(Array.isArray(errData) ? errData.join(" ") : errData || err.message);
    } finally {
      setBusy(false);
    }
  }

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
        const detailMsg =
          responseErrors.detail ||
          responseErrors.error ||
          (Array.isArray(responseErrors.non_field_errors) ? responseErrors.non_field_errors.join(" ") : "") ||
          (typeof responseErrors === "string" ? responseErrors : "");
        setError(detailMsg || "Authentication failed. Please verify your credentials.");
      } else if (!err.response) {
        setError("Cannot reach server. Is the backend running?");
      } else {
        setError(err.message || "An unexpected error occurred.");
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
    const clientId = provider === "google"
      ? (import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID)
      : (import.meta.env.VITE_GITHUB_CLIENT_ID || import.meta.env.GITHUB_CLIENT_ID);

    if (!clientId) {
      setError(
        `${provider === "google" ? "Google" : "GitHub"} OAuth client ID is not configured (VITE_${provider.toUpperCase()}_CLIENT_ID). You can sign in immediately using any of the one-click demo accounts below.`
      );
      return;
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem("budgetbuddy_oauth_state", state);
    const callback = `${window.location.origin}/auth/callback/${provider}`;
    const params = new URLSearchParams({
      client_id: clientId,
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
          {mode === "login"
            ? "Sign In to Your Workspace"
            : mode === "register"
            ? "Create Student Account"
            : "Reset Account Password"}
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px" }}>
          {mode === "login"
            ? "Enter your credentials or test with one-click demo profiles."
            : mode === "register"
            ? "Begin managing your pocket money and savings goals today."
            : resetStep === 1
            ? "Enter your email address to receive a secure 6-digit reset code."
            : "Enter the 6-digit OTP code sent to your email and your new password."}
        </p>

        {/* PROMINENT ONE-CLICK DEMO BUTTONS (ALWAYS VISIBLE ABOVE THE FOLD) */}
        {mode === "login" && (
          <div style={{ marginBottom: "18px", padding: "12px 14px", background: "var(--bg-muted)", borderRadius: "8px", border: "1.5px dashed var(--primary)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>⚡</span>
                <span>Instant Demo Sign In:</span>
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "1px 6px", borderRadius: "10px" }}>1-Click</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                disabled={busy}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "12px", fontWeight: "700", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                onClick={() => handleDemoLogin("student@budgetbuddy.local", "Student123!")}
                title="Log in as Student (₹25K Allowance)"
              >
                <span>🎓</span>
                <span>Student</span>
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "12px", fontWeight: "700", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderColor: "rgba(168, 85, 247, 0.4)", color: "#a855f7" }}
                onClick={() => handleDemoLogin("premium@budgetbuddy.local", "Premium123!")}
                title="Log in as Premium (₹65K Income)"
              >
                <span>💎</span>
                <span>Premium</span>
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "12px", fontWeight: "700", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderColor: "rgba(239, 68, 68, 0.4)", color: "#ef4444" }}
                onClick={() => handleDemoLogin("admin@budgetbuddy.local", "Admin123!")}
                title="Log in as Admin (Full Control)"
              >
                <span>🛡️</span>
                <span>Admin</span>
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <div style={{ padding: "10px 14px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", color: "var(--success)", fontSize: "12px", marginBottom: "14px" }}>
            {statusMessage}
          </div>
        )}

        {mode === "forgot" ? (
          resetStep === 1 ? (
            <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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

              {error && <p style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</p>}

              <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "100%", marginTop: "6px" }}>
                {busy ? "Sending Code..." : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label>Target Account Email</label>
                <input
                  type="email"
                  disabled
                  className="form-control"
                  value={email}
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group">
                <label>6-Digit Verification Code (OTP)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="form-control"
                  placeholder="123456"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  style={{ letterSpacing: "4px", fontSize: "16px", fontWeight: "700" }}
                />
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Check your inbox (or terminal console). Code is valid for 10 minutes.
                </span>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  placeholder="At least 8 characters"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                />
              </div>

              {error && <p style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</p>}

              <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "100%", marginTop: "6px" }}>
                {busy ? "Updating..." : "Reset Password"}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleRequestReset}
                style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", cursor: "pointer", textAlign: "center" }}
              >
                Didn't receive code? Resend OTP
              </button>
            </form>
          )
        ) : (
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label>Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setResetStep(1); setError(""); setStatusMessage(""); }}
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer", padding: 0 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
        )}

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          {mode === "forgot" ? (
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "13px", cursor: "pointer" }}
              onClick={() => { setMode("login"); setError(""); setStatusMessage(""); }}
            >
              &larr; Return to Sign In
            </button>
          ) : (
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "13px", cursor: "pointer" }}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setStatusMessage(""); }}
            >
              {mode === "login" ? "Need an account? Register free" : "Already registered? Sign in"}
            </button>
          )}
        </div>

        <div style={{ margin: "20px 0 10px 0", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", textAlign: "center", marginBottom: "12px", letterSpacing: "0.05em" }}>
            Or continue with
          </div>

          {/* Google Sign-In Button — official branding */}
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOAuthLogin("google")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--text-main)",
              transition: "all 0.18s ease",
              opacity: busy ? 0.6 : 1,
              marginBottom: "8px",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = "#4285F4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(66,133,244,0.12)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
          >
            {/* Official Google "G" SVG Logo */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          {/* GitHub Sign-In Button */}
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOAuthLogin("github")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--text-main)",
              transition: "all 0.18s ease",
              opacity: busy ? 0.6 : 1,
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.08)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
          >
            {/* GitHub Mark SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        {/* ONE-CLICK DEMO ACCOUNTS */}
        <div className="demo-credentials" style={{ marginTop: "22px", padding: "16px", borderRadius: "10px", background: "var(--bg-muted)", border: "1px dashed var(--border-hover)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontWeight: "700", color: "var(--primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚡</span>
                <span>Demo Accounts (Instant Access)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                Pre-seeded
              </span>
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "11.5px", marginBottom: "12px", lineHeight: "1.4" }}>
              Click below to explore BudgetBuddy with realistic transactions, budgets, and goals:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                {
                  role: "Student",
                  email: "student@budgetbuddy.local",
                  pass: "Student123!",
                  icon: "🎓",
                  badge: "Student Tier",
                  badgeColor: "rgba(59, 130, 246, 0.15)",
                  textColor: "#3b82f6",
                  desc: "₹25K monthly allowance, cafeteria & metro expenses, savings goals",
                },
                {
                  role: "Premium",
                  email: "premium@budgetbuddy.local",
                  pass: "Premium123!",
                  icon: "💎",
                  badge: "Premium Tier",
                  badgeColor: "rgba(168, 85, 247, 0.15)",
                  textColor: "#a855f7",
                  desc: "₹65K income, investments, custom threshold alerts & analytics",
                },
                {
                  role: "Admin",
                  email: "admin@budgetbuddy.local",
                  pass: "Admin123!",
                  icon: "🛡️",
                  badge: "Admin Access",
                  badgeColor: "rgba(239, 68, 68, 0.15)",
                  textColor: "#ef4444",
                  desc: "Full administrative controls, user management & system overview",
                },
              ].map((acc) => (
                <div
                  key={acc.role}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    gap: "10px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "14px" }}>{acc.icon}</span>
                      <strong style={{ fontSize: "13px", color: "var(--text-main)" }}>{acc.role}</strong>
                      <span style={{ fontSize: "10px", fontWeight: "600", padding: "1px 6px", borderRadius: "4px", background: acc.badgeColor, color: acc.textColor }}>
                        {acc.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.desc}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      disabled={busy}
                      className="btn btn-outline btn-sm"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      title="Fill into form"
                      onClick={() => {
                        setEmail(acc.email);
                        setPassword(acc.pass);
                        setMode("login");
                      }}
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="btn btn-primary btn-sm"
                      style={{ padding: "4px 10px", fontSize: "11px", fontWeight: "600" }}
                      onClick={() => handleDemoLogin(acc.email, acc.pass)}
                    >
                      Login
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user: profile, logout, setUser } = useAuth();
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
      import("./utils/emailjsService").then(({ syncEmailJSConfigFromServer }) => {
        syncEmailJSConfigFromServer(notificationsApi.getEmailJSConfig);
      });
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className={`role role-${profile.role}`}>{profile.role}</span>
                {profile.is_email_verified ? (
                  <span style={{ fontSize: "10px", color: "var(--success)", fontWeight: 600 }}>✓ Verified</span>
                ) : (
                  <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 600 }}>⚠ Unverified</span>
                )}
              </div>
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
              onProfileSaved={setUser}
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
