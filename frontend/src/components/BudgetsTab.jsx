import React, { useState } from "react";
import { financeApi } from "../api";

export default function BudgetsTab({ budgets, onRefresh, totalIncome = 0 }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [category, setCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Total allocated & overall
  const totalAllocated = budgets.reduce((acc, b) => acc + (b.category ? parseFloat(b.limit_amount) : 0), 0);
  const overallBudget = budgets.find((b) => !b.category);

  // Overall percentage of budget spent
  const overallSpentPercent = overallBudget
    ? overallBudget.percentage_used
    : budgets.length > 0
    ? (
        (budgets.reduce((acc, b) => acc + parseFloat(b.spent_amount || 0), 0) /
          Math.max(1, budgets.reduce((acc, b) => acc + parseFloat(b.limit_amount || 0), 0))) *
        100
      ).toFixed(1)
    : "0.0";

  function openEdit(b) {
    setEditBudget(b);
    setCategory(b.category || "");
    setLimitAmount(b.limit_amount);
    setThreshold(b.alert_threshold_percent || "80");
    setMonth(b.month);
    setShowAddModal(true);
  }

  function openNew() {
    setEditBudget(null);
    setCategory("");
    setLimitAmount("");
    setThreshold("80");
    setShowAddModal(true);
  }

  async function handleSaveBudget(e) {
    e.preventDefault();
    setError("");
    if (!limitAmount || parseFloat(limitAmount) <= 0) {
      setError("Please enter a valid budget limit.");
      return;
    }
    setBusy(true);
    try {
      if (editBudget) {
        await financeApi.updateBudget(editBudget.id, {
          limit_amount: limitAmount,
          alert_threshold_percent: parseInt(threshold) || 80,
        });
      } else {
        await financeApi.createBudget({
          month,
          category,
          limit_amount: limitAmount,
          alert_threshold_percent: parseInt(threshold) || 80,
        });
      }
      setShowAddModal(false);
      setLimitAmount("");
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this budget limit?")) return;
    try {
      await financeApi.deleteBudget(id);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  // INNOVATION: Student 50/30/20 Smart Budget Generator
  async function applySmartBudget(inflowBase) {
    setBusy(true);
    setError("");
    try {
      const base = parseFloat(inflowBase) || totalIncome || 10000;
      // 50% Needs: Food (30%), Travel (20%)
      // 30% Wants: Shopping (15%), Entertainment (15%)
      // 20% Growth: Education (10%), Misc (10%)
      const allocations = [
        { category: "", limit_amount: (base * 0.9).toFixed(2), label: "Overall Monthly Ceiling" },
        { category: "food", limit_amount: (base * 0.3).toFixed(2), label: "Food & Dining (30%)" },
        { category: "travel", limit_amount: (base * 0.2).toFixed(2), label: "Travel & Transit (20%)" },
        { category: "shopping", limit_amount: (base * 0.15).toFixed(2), label: "Shopping & Supplies (15%)" },
        { category: "entertainment", limit_amount: (base * 0.15).toFixed(2), label: "Entertainment & Leisure (15%)" },
        { category: "education", limit_amount: (base * 0.1).toFixed(2), label: "Education & Books (10%)" },
      ];

      for (const item of allocations) {
        // check if already exists
        const existing = budgets.find((b) => (b.category || "") === item.category);
        if (existing) {
          await financeApi.updateBudget(existing.id, {
            limit_amount: item.limit_amount,
            alert_threshold_percent: 80,
          });
        } else {
          await financeApi.createBudget({
            month,
            category: item.category,
            limit_amount: item.limit_amount,
            alert_threshold_percent: 80,
          });
        }
      }
      setShowSmartModal(false);
      onRefresh();
    } catch (err) {
      setError("Failed to auto-generate budgets: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-container-animate">
      {/* SUMMARY BANNER: SHOWING MONEY SPENT AS % NOT IN NUMBERS */}
      <div className="stats-grid" style={{ marginBottom: "28px" }}>
        
        {/* MONEY SPENT AS % FOCUS */}
        <article className="stat-card stat-card-hover-glow" style={{ borderColor: parseFloat(overallSpentPercent) > 85 ? "rgba(239, 68, 68, 0.4)" : "var(--primary-glow)" }}>
          <div className="stat-card-header">
            <span className="stat-card-label" style={{ color: parseFloat(overallSpentPercent) > 85 ? "#f87171" : "var(--primary)" }}>
              Budget Consumed (% Spent)
            </span>
            <div className="stat-card-icon" style={{ background: "rgba(99, 102, 241, 0.18)", color: "var(--primary)" }}>
              🎯
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: parseFloat(overallSpentPercent) > 100 ? "var(--danger)" : parseFloat(overallSpentPercent) > 80 ? "var(--warning)" : "var(--primary)", fontSize: "32px" }}>
            {overallSpentPercent}% Spent
          </div>
          <div className="stat-card-sub">
            <span className="badge" style={{ background: parseFloat(overallSpentPercent) > 100 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)", color: parseFloat(overallSpentPercent) > 100 ? "#f87171" : "#34d399" }}>
              {parseFloat(overallSpentPercent) > 100 ? "🚨 Overspent!" : `${(100 - Math.min(100, parseFloat(overallSpentPercent))).toFixed(1)}% Headroom`}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              Ceiling: ₹{overallBudget ? parseFloat(overallBudget.limit_amount).toLocaleString("en-IN") : "Not Set"}
            </span>
          </div>
        </article>

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Category Guardrails</span>
            <div className="stat-card-icon" style={{ background: "rgba(6, 182, 212, 0.18)", color: "var(--info)" }}>
              📊
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--info)" }}>
            {budgets.filter((b) => b.category).length} Categories
          </div>
          <div className="stat-card-sub">
            <span>₹{totalAllocated.toLocaleString("en-IN")} allocated across subjects</span>
          </div>
        </article>

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Overspending & Threshold Alerts</span>
            <div className="stat-card-icon" style={{ background: "rgba(245, 158, 11, 0.18)", color: "var(--warning)" }}>
              ⚠️
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: budgets.some((b) => b.is_over_budget) ? "var(--danger)" : "var(--success)" }}>
            {budgets.filter((b) => b.is_alert || b.is_over_budget).length} Alerts
          </div>
          <div className="stat-card-sub">
            <span style={{ color: budgets.some((b) => b.is_over_budget) ? "var(--danger)" : "var(--success)" }}>
              {budgets.filter((b) => b.is_over_budget).length} categories exceeding limit
            </span>
          </div>
        </article>
      </div>

      {/* INNOVATIVE ACTION TOOLBAR */}
      <div className="panel panel-interactive" style={{ padding: "18px 24px", marginBottom: "28px", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>💡</span>
              <strong style={{ fontSize: "15px", color: "white" }}>Innovation: 50/30/20 Student Budget Allocator</strong>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Automatically construct balanced category budgets based on your monthly pocket money & scholarship inflows.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-outline btn-interactive"
              style={{ borderColor: "rgba(99, 102, 241, 0.5)", background: "rgba(99, 102, 241, 0.15)" }}
              onClick={() => setShowSmartModal(true)}
            >
              ✨ Auto-Allocate (50/30/20)
            </button>
            <button className="btn btn-primary btn-interactive" onClick={openNew}>
              + Set Budget Limit
            </button>
          </div>
        </div>
      </div>

      {/* BUDGET CARDS PANEL */}
      <div className="panel panel-interactive">
        <div className="panel-header">
          <div>
            <h3>Monthly Budget Allocation & Spending Guardrails</h3>
            <p>Spending is evaluated as percentage utilized to avoid cognitive financial fatigue</p>
          </div>
        </div>

        {budgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "36px", marginBottom: "12px" }}>🎯</p>
            <h4 style={{ color: "white", marginBottom: "6px" }}>No Budgets Configured For This Month</h4>
            <p style={{ maxWidth: "420px", margin: "0 auto 16px auto", fontSize: "13px" }}>
              Setting up category limits is essential for students to prevent running out of pocket money before the month ends.
            </p>
            <button className="btn btn-primary btn-interactive" onClick={() => setShowSmartModal(true)}>
              ✨ 1-Click Auto-Allocate My Budget
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
            {budgets.map((b) => {
              const pct = b.percentage_used;
              const isOver = b.is_over_budget;
              const isAlert = b.is_alert;
              const barColor = isOver ? "var(--danger)" : isAlert ? "var(--warning)" : "var(--success)";
              const title = b.category ? b.category.toUpperCase() : "OVERALL MONTHLY SPENDING CEILING";
              const categoryIcons = {
                food: "🍔",
                travel: "✈️",
                shopping: "🛍️",
                education: "📚",
                entertainment: "🎬",
                misc: "📦",
                "": "🎯",
              };
              const icon = categoryIcons[b.category || ""] || "📌";

              return (
                <div
                  key={b.id}
                  className="budget-card-enhanced"
                  style={{
                    borderColor: isOver
                      ? "rgba(239, 68, 68, 0.6)"
                      : isAlert
                      ? "rgba(245, 158, 11, 0.6)"
                      : "var(--border-subtle)",
                    boxShadow: isOver
                      ? "0 10px 30px -10px rgba(239, 68, 68, 0.35)"
                      : isAlert
                      ? "0 10px 30px -10px rgba(245, 158, 11, 0.35)"
                      : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>{icon}</span>
                      <div>
                        <h4 style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>{title}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                          Cycle: {b.month.substring(0, 7)} • Alert at {b.alert_threshold_percent}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn btn-outline btn-sm btn-interactive"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => openEdit(b)}
                        title="Edit limit"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-outline btn-sm btn-interactive btn-danger-hover"
                        style={{ padding: "4px 8px", fontSize: "11px", color: "var(--danger)" }}
                        onClick={() => handleDelete(b.id)}
                        title="Delete limit"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* USER SPECIFICATION: MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "6px" }}>
                    <div>
                      <div className="font-mono" style={{ fontSize: "28px", fontWeight: "800", color: barColor }}>
                        {pct}% Spent
                      </div>
                      <span style={{ fontSize: "11px", color: isOver ? "#f87171" : isAlert ? "#fbbf24" : "var(--text-muted)" }}>
                        {isOver ? "🚨 Limit Exceeded (Overspent)" : isAlert ? "⚠️ Warning Threshold Crossed" : "✅ Safe Spending Trajectory"}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                        Limit Ceiling: <strong>₹{parseFloat(b.limit_amount).toLocaleString("en-IN")}</strong>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Remaining: <strong>{(100 - Math.min(100, pct)).toFixed(1)}% buffer</strong>
                      </div>
                    </div>
                  </div>

                  {/* ANIMATED PROGRESS BAR WITH SHIMMER */}
                  <div className="bar-track bar-track-animated" style={{ height: "12px" }}>
                    <div
                      className={`bar-fill ${isOver ? "bar-fill-overspent" : "bar-fill-gradient"}`}
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: barColor,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", paddingTop: "4px", borderTop: "1px dashed var(--border-subtle)" }}>
                    <span>Threshold Trigger: {b.alert_threshold_percent}%</span>
                    <span>Remaining Amount: ₹{parseFloat(b.remaining_amount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT BUDGET MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-animated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>{editBudget ? "✏️" : "🎯"}</span>
                <div>
                  <h3>{editBudget ? "Update Budget Guardrail" : "Create Student Budget Limit"}</h3>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {editBudget ? "Adjust limit or notification alert threshold" : "Set spending caps by category to enforce financial discipline"}
                  </p>
                </div>
              </div>
              <button className="btn btn-outline btn-sm btn-close-hover" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <div className="modal-body">
                {!editBudget && (
                  <div className="form-group">
                    <label>Budget Scope / Category</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">🎯 Overall Monthly Spending Limit</option>
                      <option value="food">🍔 Food & Dining</option>
                      <option value="travel">✈️ Travel & Transit</option>
                      <option value="shopping">🛍️ Shopping & Supplies</option>
                      <option value="education">📚 Education & Books</option>
                      <option value="entertainment">🎬 Entertainment & Leisure</option>
                      <option value="misc">📦 Miscellaneous Expenses</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Spending Limit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-control font-mono"
                    placeholder="e.g. 5000"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label>Alert Trigger Threshold ({threshold}%)</label>
                    <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "700" }}>{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Automated alert notification will fire when spending reaches {threshold}% of limit.
                  </span>
                </div>

                {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-outline btn-interactive" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-primary btn-interactive">
                  {busy ? "Saving..." : editBudget ? "Update Budget" : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INNOVATIVE SMART 50/30/20 ALLOCATOR MODAL */}
      {showSmartModal && (
        <div className="modal-overlay" onClick={() => setShowSmartModal(false)}>
          <div className="modal-card modal-animated" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>✨</span>
                <div>
                  <h3>50/30/20 Smart Student Budget Generator</h3>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Algorithmic budget allocation engineered for university student pocket money
                  </p>
                </div>
              </div>
              <button className="btn btn-outline btn-sm btn-close-hover" onClick={() => setShowSmartModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                The 50/30/20 student budgeting framework distributes your monthly allowance or stipend into optimal discipline ratios:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", margin: "10px 0" }}>
                <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <strong style={{ color: "var(--success)", fontSize: "13px" }}>50% Needs</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Food (30%) & Transit (20%)
                  </div>
                </div>
                <div style={{ padding: "12px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                  <strong style={{ color: "var(--warning)", fontSize: "13px" }}>30% Wants</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Shopping (15%) & Leisure (15%)
                  </div>
                </div>
                <div style={{ padding: "12px", background: "rgba(99, 102, 241, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
                  <strong style={{ color: "var(--primary)", fontSize: "13px" }}>20% Sinking</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Education (10%) & Emergency (10%)
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Monthly Allowance / Pocket Money Base (₹)</label>
                <input
                  type="number"
                  className="form-control font-mono"
                  defaultValue={totalIncome > 0 ? totalIncome : 12000}
                  id="smartBaseInput"
                />
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Pre-filled from your verified inflows (₹{totalIncome.toLocaleString("en-IN")}). You can customize the base.
                </span>
              </div>

              {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn btn-outline btn-interactive" onClick={() => setShowSmartModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn btn-primary btn-interactive"
                onClick={() => {
                  const inputVal = document.getElementById("smartBaseInput")?.value;
                  applySmartBudget(inputVal);
                }}
              >
                {busy ? "Applying Guardrails..." : "🚀 Auto-Generate & Apply All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
