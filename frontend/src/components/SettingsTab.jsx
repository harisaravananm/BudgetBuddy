import React, { useEffect, useState } from "react";
import { authApi, notificationsApi } from "../api";
import { Mail, Send, BellRing } from "lucide-react";

export default function SettingsTab({ profile, onProfileSaved, theme, onThemeChange }) {
  const [fullName, setFullName] = useState(profile.profile.full_name || "");
  const [monthlyIncome, setMonthlyIncome] = useState(profile.profile.monthly_income || "0.00");
  const [currency, setCurrency] = useState(profile.profile.currency || "INR");
  const [savingsTarget, setSavingsTarget] = useState(profile.profile.savings_target_percent || 20);
  const [notifsEnabled, setNotifsEnabled] = useState(profile.profile.notifications_enabled ?? true);
  const [emailNotifsEnabled, setEmailNotifsEnabled] = useState(profile.profile.email_notifications_enabled ?? true);
  const [alertThreshold, setAlertThreshold] = useState(profile.profile.alert_threshold_percent || 80);
  const [largeAlertEnabled, setLargeAlertEnabled] = useState(profile.profile.large_expense_alert_enabled ?? true);
  const [largeThreshold, setLargeThreshold] = useState(profile.profile.large_expense_threshold || 5000);
  const [testEmailBusy, setTestEmailBusy] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState("");
  const [currentRole, setCurrentRole] = useState(profile.role);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Admin Data State
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (profile.role === "admin") {
      fetchAdminData();
    }
  }, [profile.role]);

  async function fetchAdminData() {
    setAdminLoading(true);
    try {
      const data = await authApi.getAdminUsers();
      setAdminData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const updated = await authApi.updateProfile({
        full_name: fullName,
        monthly_income: monthlyIncome,
        currency,
        savings_target_percent: parseInt(savingsTarget),
        notifications_enabled: notifsEnabled,
        email_notifications_enabled: emailNotifsEnabled,
        alert_threshold_percent: parseInt(alertThreshold),
        large_expense_alert_enabled: largeAlertEnabled,
        large_expense_threshold: parseFloat(largeThreshold),
      }, currentRole);
      onProfileSaved(updated);
      setMessage("Profile settings successfully updated!");
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  
  async function handleSendTestEmail() {
    setTestEmailBusy(true);
    setTestEmailStatus("");
    try {
      const res = await notificationsApi.sendTestEmail(profile.email);
      setTestEmailStatus(res.message || "Real-time test email dispatched successfully!");
    } catch (err) {
      setTestEmailStatus("Failed to send: " + (err.response?.data?.error || err.message));
    } finally {
      setTestEmailBusy(false);
    }
  }

  async function handleRoleSwitch(targetRole) {
    setBusy(true);
    try {
      const updated = await authApi.upgradeRole(targetRole);
      setCurrentRole(targetRole);
      onProfileSaved(updated);
      setMessage(`Switched account role to ${targetRole.toUpperCase()}`);
    } catch (err) {
      setMessage("Role change failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2>User Profile & Preferences</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          Configure your student monthly income, savings targets, and role permissions
        </p>
      </div>

      <div className="panel settings-theme-panel">
        <div>
          <h3>Appearance</h3>
          <p>Choose a comfortable theme, or follow your device preference.</p>
        </div>
        <button
          type="button"
          className="theme-switch"
          aria-pressed={theme === "dark"}
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        >
          <span className="theme-switch-track"><span /></span>
          <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "28px" }}>
        {/* PROFILE SETTINGS FORM */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Profile & Financial Preferences</h3>
              <p>Baseline calculations for your budget formulas</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="text"
                disabled
                className="form-control"
                value={profile.email}
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>

            <div className="settings-finance-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="form-group">
                <label>Monthly Income Setup (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Preferred Currency</label>
                <select
                  className="form-control"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Default Savings Target ({savingsTarget}% of income)</label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(e.target.value)}
                style={{ accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                BudgetBuddy automatically suggests allocating ₹{((parseFloat(monthlyIncome || 0) * parseInt(savingsTarget)) / 100).toFixed(0)} to sinking funds.
              </span>
            </div>


            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", marginTop: "8px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={16} color="var(--primary)" /> Real-Time Email Notifications & Alerts
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="emailNotifToggle"
                    checked={emailNotifsEnabled}
                    onChange={(e) => setEmailNotifsEnabled(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                  />
                  <label htmlFor="emailNotifToggle" style={{ fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
                    Enable Real-Time Email Notifications (SMTP / Gmail / SendGrid)
                  </label>
                </div>

                <div className="form-group" style={{ marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <label>Budget Warning Alert Threshold</label>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>{alertThreshold}% of budget</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Sends an alert email when category expenses hit {alertThreshold}% or exceed 100% of the limit.
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="largeAlertToggle"
                    checked={largeAlertEnabled}
                    onChange={(e) => setLargeAlertEnabled(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                  />
                  <label htmlFor="largeAlertToggle" style={{ fontSize: "13px", cursor: "pointer" }}>
                    Alert immediately on large single expenses
                  </label>
                </div>

                {largeAlertEnabled && (
                  <div className="form-group" style={{ marginLeft: "26px" }}>
                    <label style={{ fontSize: "12px" }}>Large Expense Trigger (₹)</label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      className="form-control"
                      value={largeThreshold}
                      onChange={(e) => setLargeThreshold(e.target.value)}
                      style={{ maxWidth: "200px" }}
                    />
                  </div>
                )}

                <div style={{ marginTop: "10px", padding: "12px", background: "var(--bg-canvas)", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>Test SMTP Connectivity</div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Send real-time verification email to {profile.email}</div>
                    </div>
                    <button
                      type="button"
                      disabled={testEmailBusy}
                      onClick={handleSendTestEmail}
                      className="btn btn-outline btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Send size={13} /> {testEmailBusy ? "Sending..." : "Send Test Email"}
                    </button>
                  </div>
                  {testEmailStatus && (
                    <p style={{ fontSize: "11px", marginTop: "8px", color: testEmailStatus.includes("Failed") ? "var(--danger)" : "var(--success)" }}>
                      {testEmailStatus}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {message && (
              <p style={{ color: message.includes("Error") ? "var(--danger)" : "var(--success)", fontSize: "13px" }}>
                {message}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
              {busy ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        </div>

        {/* ROLE MANAGEMENT */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Account Role & Permissions</h3>
              <p>Experience BudgetBuddy across different user tiers</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase" }}>Current Active Role</span>
                <span className={`badge role-${profile.role}`}>{profile.role.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {profile.role === "student" && "🎓 Student Tier: Free budget planning, expense tracking, and goal setting tailored for college students."}
                {profile.role === "premium" && "⭐ Premium Tier: Priority reporting, advanced trend forecasting, and unlimited goal creation."}
                {profile.role === "admin" && "🛡️ Admin Tier: Full system administration, user management, and platform analytics oversight."}
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>Switch / Test User Roles</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${currentRole === "student" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => handleRoleSwitch("student")}
                >
                  Student
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currentRole === "premium" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => handleRoleSwitch("premium")}
                >
                  ⭐ Premium
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${currentRole === "admin" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => handleRoleSwitch("admin")}
                >
                  🛡️ Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN SYSTEM MANAGEMENT PANEL (IF ADMIN) */}
      {profile.role === "admin" && (
        <div className="panel" style={{ border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <div className="panel-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🛡️</span>
                <h3>Admin Management Portal</h3>
                <span className="badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>ADMIN ACCESS ONLY</span>
              </div>
              <p>Platform user oversight and database activity audit</p>
            </div>
          </div>

          {adminLoading ? (
            <p style={{ color: "var(--text-muted)", padding: "20px" }}>Loading administration metrics...</p>
          ) : adminData ? (
            <div>
              {/* ADMIN METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>TOTAL USERS</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#fff" }}>{adminData.metrics.total_users}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>STUDENTS</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#60a5fa" }}>{adminData.metrics.student_users}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>PREMIUM USERS</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#fbbf24" }}>{adminData.metrics.premium_users}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>ADMINISTRATORS</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#f87171" }}>{adminData.metrics.admin_users}</div>
                </div>
              </div>

              {/* USER AUDIT TABLE */}
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Full Name</th>
                      <th>Role</th>
                      <th>Monthly Income</th>
                      <th>Activity (Incomes / Expenses / Goals)</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.users.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.email}</strong></td>
                        <td>{u.profile?.full_name || "—"}</td>
                        <td><span className={`badge role-${u.role}`}>{u.role.toUpperCase()}</span></td>
                        <td>₹{parseFloat(u.profile?.monthly_income || 0).toLocaleString("en-IN")}</td>
                        <td>
                          {u.incomes_count} Incomes • {u.expenses_count} Expenses • {u.goals_count} Goals
                        </td>
                        <td>{new Date(u.date_joined).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
