import React, { useState } from "react";
import {
  Target,
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Layers,
  CheckCircle,
} from "lucide-react";
import { financeApi } from "../api";
import { money } from "../utils/currency";
import { categoryVisuals } from "../categoryVisuals";

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

  const displayedBudgets = budgets;
  const totalAllocated = displayedBudgets.reduce(
    (acc, b) => acc + (b.category ? parseFloat(b.limit_amount) : 0),
    0
  );
  const overallBudget = displayedBudgets.find((b) => !b.category);

  // Overall percentage of budget spent
  const overallSpentPercent = overallBudget
    ? overallBudget.percentage_used
    : displayedBudgets.length > 0
    ? (
        (displayedBudgets.reduce((acc, b) => acc + parseFloat(b.spent_amount || 0), 0) /
          Math.max(1, displayedBudgets.reduce((acc, b) => acc + parseFloat(b.limit_amount || 0), 0))) *
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

  async function applySmartBudget(inflowBase) {
    setBusy(true);
    setError("");
    try {
      const base = parseFloat(inflowBase) || totalIncome || 10000;
      const allocations = [
        { category: "", limit_amount: (base * 0.9).toFixed(2), label: "Overall Monthly Ceiling" },
        { category: "food", limit_amount: (base * 0.3).toFixed(2), label: "Food & Dining (30%)" },
        { category: "travel", limit_amount: (base * 0.2).toFixed(2), label: "Travel & Transit (20%)" },
        { category: "shopping", limit_amount: (base * 0.15).toFixed(2), label: "Shopping & Supplies (15%)" },
        { category: "entertainment", limit_amount: (base * 0.15).toFixed(2), label: "Entertainment (15%)" },
        { category: "education", limit_amount: (base * 0.1).toFixed(2), label: "Education & Books (10%)" },
      ];

      for (const item of allocations) {
        const existing = displayedBudgets.find((b) => (b.category || "") === item.category);
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
      {/* SUMMARY BANNER */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        {/* Overall Percentage Spent */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Monthly Ceiling Spent</span>
            <div className="stat-card-icon" style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}>
              <Target size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: parseFloat(overallSpentPercent) > 100 ? "var(--danger)" : parseFloat(overallSpentPercent) > 80 ? "var(--warning)" : "var(--primary)" }}>
            {overallSpentPercent}% Spent
          </div>
          <div className="stat-card-sub">
            <span className="badge" style={{ background: parseFloat(overallSpentPercent) > 100 ? "var(--danger-bg)" : "var(--success-bg)", color: parseFloat(overallSpentPercent) > 100 ? "var(--danger)" : "var(--success)" }}>
              {parseFloat(overallSpentPercent) > 100 ? "Over budget" : `${(100 - Math.min(100, parseFloat(overallSpentPercent))).toFixed(1)}% buffer`}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              Cap: ₹{overallBudget ? money.format(overallBudget.limit_amount) : "Not Set"}
            </span>
          </div>
        </article>

        {/* Category Allocations */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Allocated Categories</span>
            <div className="stat-card-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--info)" }}>
            {displayedBudgets.filter((b) => b.category).length} Categories
          </div>
          <div className="stat-card-sub">
            <span>₹{money.format(totalAllocated)} allocated across categories</span>
          </div>
        </article>

        {/* Alerts */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Threshold Alerts</span>
            <div className="stat-card-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: displayedBudgets.some((b) => b.is_over_budget) ? "var(--danger)" : "var(--success)" }}>
            {displayedBudgets.filter((b) => b.is_alert || b.is_over_budget).length} Alerts
          </div>
          <div className="stat-card-sub">
            <span style={{ color: displayedBudgets.some((b) => b.is_over_budget) ? "var(--danger)" : "var(--success)" }}>
              {displayedBudgets.filter((b) => b.is_over_budget).length} categories exceeding limit
            </span>
          </div>
        </article>
      </div>

      {/* SMART BUDGET ACTION TOOLBAR */}
      <div className="panel" style={{ padding: "18px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} style={{ color: "var(--primary)" }} />
              <strong style={{ fontSize: "14.5px", color: "var(--text-main)" }}>50/30/20 Smart Budget Plan</strong>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Automatically construct balanced category budgets based on your monthly pocket money & scholarship inflows.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowSmartModal(true)}
            >
              <Sparkles size={14} /> Auto-Allocate (50/30/20)
            </button>
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={14} /> Set Budget Limit
            </button>
          </div>
        </div>
      </div>

      {/* BUDGET CARDS PANEL */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Monthly Category Budgets</h3>
            <p>Spending is evaluated as percentage utilized against guardrails</p>
          </div>
        </div>

        {displayedBudgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "14px", marginBottom: "8px", color: "var(--text-main)", fontWeight: 600 }}>No budgets configured for this month</p>
            <p style={{ maxWidth: "420px", margin: "0 auto 16px auto", fontSize: "13px" }}>
              Set category limits to keep student pocket money from running out before the month ends.
            </p>
            <button className="btn btn-primary" onClick={() => setShowSmartModal(true)}>
              <Sparkles size={14} /> Auto-Allocate My Budget
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
            {displayedBudgets.map((b) => {
              const pct = b.percentage_used;
              const isOver = b.is_over_budget;
              const isAlert = b.is_alert;
              const barColor = isOver ? "var(--danger)" : isAlert ? "var(--warning)" : "var(--success)";
              const title = b.category ? b.category.toUpperCase() : "OVERALL MONTHLY CEILING";
              const meta = categoryVisuals[b.category || ""] || categoryVisuals[""];
              const CategoryIcon = meta.icon;

              return (
                <div
                  key={b.id}
                  className="budget-card-enhanced"
                  style={{
                    borderColor: isOver ? "var(--danger-border)" : isAlert ? "var(--warning-border)" : "var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="budget-category-icon" style={{ background: "var(--bg-muted)", color: meta.color }}>
                        <CategoryIcon size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)" }}>{title}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                          Cycle: {b.month.substring(0, 7)} • Alert at {b.alert_threshold_percent}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 8px" }}
                        onClick={() => openEdit(b)}
                        title="Edit limit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 8px", color: "var(--danger)" }}
                        onClick={() => handleDelete(b.id)}
                        title="Delete limit"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* PERCENTAGE SPENT DISPLAY */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div className="font-mono" style={{ fontSize: "24px", fontWeight: "700", color: barColor }}>
                        {pct}% Spent
                      </div>
                      <span style={{ fontSize: "11px", color: isOver ? "var(--danger)" : isAlert ? "var(--warning)" : "var(--text-muted)" }}>
                        {isOver ? "Limit Exceeded" : isAlert ? "Warning Threshold" : "Healthy Pace"}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                        Limit: <strong>₹{money.format(b.limit_amount)}</strong>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Remaining: <strong>{(100 - Math.min(100, pct)).toFixed(1)}% buffer</strong>
                      </div>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="bar-track" style={{ height: "8px" }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: barColor,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", paddingTop: "4px", borderTop: "1px dashed var(--border-subtle)" }}>
                    <span>Threshold: {b.alert_threshold_percent}%</span>
                    <span>Remaining Amount: ₹{money.format(b.remaining_amount)}</span>
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
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{editBudget ? "Update Budget Limit" : "Set Category Budget"}</h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {editBudget ? "Adjust limit or threshold alert" : "Establish monthly caps to prevent overspending"}
                </p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <div className="modal-body">
                {!editBudget && (
                  <div className="form-group">
                    <label>Category Scope</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Overall Monthly Limit (Ceiling)</option>
                      <option value="food">Food & Dining</option>
                      <option value="travel">Travel & Transit</option>
                      <option value="shopping">Shopping & Supplies</option>
                      <option value="education">Education & Books</option>
                      <option value="entertainment">Entertainment & Leisure</option>
                      <option value="misc">Miscellaneous Expenses</option>
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
                    <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>{threshold}%</span>
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
                    Automated notification will trigger when category spending hits {threshold}% of limit.
                  </span>
                </div>

                {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
              </div>
              <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-primary">
                  {busy ? "Saving..." : editBudget ? "Update Budget" : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMART 50/30/20 ALLOCATOR MODAL */}
      {showSmartModal && (
        <div className="modal-overlay" onClick={() => setShowSmartModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h3>50/30/20 Student Budget Blueprint</h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Algorithmic distribution engineered for student pocket money and stipends
                </p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowSmartModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                The 50/30/20 student budgeting framework distributes your monthly allowance or stipend into optimal discipline ratios:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "8px 0" }}>
                <div style={{ padding: "12px", background: "var(--success-bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--success-border)" }}>
                  <strong style={{ color: "var(--success)", fontSize: "13px" }}>50% Needs</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Food (30%) & Transit (20%)
                  </div>
                </div>
                <div style={{ padding: "12px", background: "var(--warning-bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--warning-border)" }}>
                  <strong style={{ color: "var(--warning)", fontSize: "13px" }}>30% Wants</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Shopping (15%) & Leisure (15%)
                  </div>
                </div>
                <div style={{ padding: "12px", background: "var(--primary-subtle)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-accent)" }}>
                  <strong style={{ color: "var(--primary)", fontSize: "13px" }}>20% Savings</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Education (10%) & Emergency (10%)
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Monthly Allowance / Inflow Base (₹)</label>
                <input
                  type="number"
                  className="form-control font-mono"
                  defaultValue={totalIncome > 0 ? totalIncome : 12000}
                  id="smartBaseInput"
                />
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Pre-filled from your verified inflows (₹{money.format(totalIncome)}).
                </span>
              </div>

              {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
            </div>
            <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowSmartModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn btn-primary"
                onClick={() => {
                  const inputVal = document.getElementById("smartBaseInput")?.value;
                  applySmartBudget(inputVal);
                }}
              >
                {busy ? "Applying..." : "Auto-Generate & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
