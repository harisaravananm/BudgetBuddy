import React, { useState } from "react";
import { financeApi } from "../api";

export default function BudgetsTab({ budgets, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [threshold, setThreshold] = useState("80");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateBudget(e) {
    e.preventDefault();
    setError("");
    if (!limitAmount || parseFloat(limitAmount) <= 0) {
      setError("Please enter a valid budget limit.");
      return;
    }
    setBusy(true);
    try {
      await financeApi.createBudget({
        month,
        category,
        limit_amount: limitAmount,
        alert_threshold_percent: parseInt(threshold) || 80,
      });
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

  const totalAllocated = budgets.reduce((acc, b) => acc + (b.category ? parseFloat(b.limit_amount) : 0), 0);
  const overallBudget = budgets.find((b) => !b.category);

  return (
    <div>
      {/* SUMMARY BANNER */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Monthly Spending Ceiling</span>
            <span style={{ fontSize: "20px" }}>🎯</span>
          </div>
          <div className="stat-card-value" style={{ color: "var(--primary)" }}>
            ₹{overallBudget ? parseFloat(overallBudget.limit_amount).toLocaleString("en-IN") : "Not Set"}
          </div>
          <div className="stat-card-sub">
            <span>Overall limit across all student expenditures</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Category Allocations</span>
            <span style={{ fontSize: "20px" }}>📊</span>
          </div>
          <div className="stat-card-value" style={{ color: "var(--info)" }}>
            ₹{totalAllocated.toLocaleString("en-IN")}
          </div>
          <div className="stat-card-sub">
            <span>Allocated across {budgets.filter((b) => b.category).length} categories</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Alerts</span>
            <span style={{ fontSize: "20px" }}>⚠️</span>
          </div>
          <div className="stat-card-value" style={{ color: budgets.some((b) => b.is_over_budget) ? "var(--danger)" : "var(--success)" }}>
            {budgets.filter((b) => b.is_alert || b.is_over_budget).length} Alerts
          </div>
          <div className="stat-card-sub">
            <span>{budgets.filter((b) => b.is_over_budget).length} overspent limits</span>
          </div>
        </article>
      </div>

      {/* BUDGET CARDS PANEL */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Budget Allocation & Monitoring</h3>
            <p>Set spending guardrails to prevent student overspending</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Set Budget Limit
          </button>
        </div>

        {budgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "24px", marginBottom: "8px" }}>📝</p>
            <p>No budgets configured for this month. Click "+ Set Budget Limit" to start!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
            {budgets.map((b) => {
              const pct = b.percentage_used;
              const isOver = b.is_over_budget;
              const isAlert = b.is_alert;
              const barColor = isOver ? "var(--danger)" : isAlert ? "var(--warning)" : "var(--success)";
              const title = b.category ? b.category.toUpperCase() : "OVERALL MONTHLY LIMIT";

              return (
                <div
                  key={b.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${isOver ? "rgba(239, 68, 68, 0.4)" : isAlert ? "rgba(245, 158, 11, 0.4)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: "700" }}>{title}</h4>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                        Month: {b.month.substring(0, 7)}
                      </span>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: "var(--text-dim)", padding: "2px 8px" }}
                      onClick={() => handleDelete(b.id)}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "22px", fontWeight: "800", fontFamily: "var(--font-mono)" }}>
                      ₹{parseFloat(b.spent_amount).toLocaleString("en-IN")}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      Limit: ₹{parseFloat(b.limit_amount).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="bar-track" style={{ height: "10px" }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: barColor,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-dim)" }}>
                    <span style={{ fontWeight: "700", color: barColor }}>
                      {pct}% Used {isOver ? "(Overspent!)" : isAlert ? "(Threshold Alert)" : ""}
                    </span>
                    <span>Remaining: ₹{parseFloat(b.remaining_amount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE BUDGET MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Budget Limit</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBudget}>
              <div className="modal-body">
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
                    <option value="entertainment">🎬 Entertainment</option>
                    <option value="misc">📦 Miscellaneous</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Spending Limit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-control"
                    placeholder="e.g. 5000"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Alert Warning Threshold ({threshold}%)</label>
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
                    Trigger automated notification when spending hits {threshold}% of limit.
                  </span>
                </div>

                {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-primary">
                  {busy ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
