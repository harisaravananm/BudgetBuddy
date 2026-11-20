import React, { useState } from "react";
import { financeApi } from "../api";

export default function DashboardTab({
  analytics,
  goals,
  recentExpenses,
  recentIncomes,
  onOpenDeposit,
  onOpenAddTransaction,
}) {
  const summary = analytics?.summary || {
    total_income: 0,
    total_expense: 0,
    net_savings: 0,
    savings_rate: 0,
    financial_health_score: 50,
  };

  const budgets = analytics?.budgets || [];
  const categorySpending = analytics?.category_spending || [];
  const monthlyTrends = analytics?.monthly_trends || [];

  const getScoreColor = (score) => {
    if (score >= 80) return "var(--success)";
    if (score >= 60) return "var(--info)";
    if (score >= 40) return "var(--warning)";
    return "var(--danger)";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "🌟 Excellent Discipline";
    if (score >= 60) return "👍 Stable Financial Health";
    if (score >= 40) return "⚠️ Needs Budget Attention";
    return "🚨 High Overspending Risk";
  };

  // Find max value for trend chart scaling
  const maxTrend = Math.max(
    ...monthlyTrends.map((t) => Math.max(t.income, t.expense, 1000)),
    10000
  );

  return (
    <div>
      {/* KEY STATS ROW */}
      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Monthly Income</span>
            <div className="stat-card-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}>
              💰
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "var(--success)" }}>
            ₹{summary.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>Verified inflows for this cycle</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Expenses</span>
            <div className="stat-card-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)" }}>
              💸
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "var(--danger)" }}>
            ₹{summary.total_expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>{categorySpending.length} active spending categories</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Net Savings</span>
            <div className="stat-card-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "var(--info)" }}>
              🛡️
            </div>
          </div>
          <div className="stat-card-value" style={{ color: summary.net_savings >= 0 ? "var(--info)" : "var(--danger)" }}>
            ₹{summary.net_savings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span style={{ color: "var(--text-muted)" }}>Savings rate: </span>
            <strong style={{ color: summary.savings_rate >= 20 ? "var(--success)" : "var(--warning)" }}>
              {summary.savings_rate}%
            </strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Financial Score</span>
            <div className="stat-card-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
              🎯
            </div>
          </div>
          <div className="stat-card-value" style={{ color: getScoreColor(summary.financial_health_score) }}>
            {summary.financial_health_score} <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>/ 100</span>
          </div>
          <div className="stat-card-sub">
            <span style={{ fontSize: "11px", fontWeight: "700" }}>{getScoreLabel(summary.financial_health_score)}</span>
          </div>
        </article>
      </section>

      {/* TWO COLUMN GRID: BUDGET UTILIZATION & CATEGORY SPENDING */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "28px" }}>
        
        {/* BUDGET UTILIZATION */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Budget Utilization Tracking</h3>
              <p>Real-time limits vs monthly expenditures</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onOpenAddTransaction}>
              + Add Expense
            </button>
          </div>

          {budgets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>No budgets configured for this month.</p>
            </div>
          ) : (
            <div className="bar-chart-container">
              {budgets.map((b) => {
                const pct = b.percentage_used;
                const isOver = b.is_over_budget;
                const isAlert = b.is_alert;
                const fillCol = isOver ? "var(--danger)" : isAlert ? "var(--warning)" : "var(--success)";
                const label = b.category ? b.category.charAt(0).toUpperCase() + b.category.slice(1) : "Overall Monthly Limit";

                return (
                  <div key={b.id} className="bar-row">
                    <div className="bar-info">
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong>{label}</strong>
                        {isOver && <span className="badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>Exceeded!</span>}
                        {!isOver && isAlert && <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>High Alert</span>}
                      </span>
                      <span>
                        ₹{parseFloat(b.spent_amount).toLocaleString("en-IN")} / ₹{parseFloat(b.limit_amount).toLocaleString("en-IN")}{" "}
                        <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: fillCol,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)" }}>
                      <span>Remaining: ₹{parseFloat(b.remaining_amount).toLocaleString("en-IN")}</span>
                      <span>Alert threshold: {b.alert_threshold_percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CATEGORY SPENDING BREAKDOWN */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Category-Wise Spending</h3>
              <p>Distribution of current month expenses</p>
            </div>
          </div>

          {categorySpending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>No expense data for this month.</p>
            </div>
          ) : (
            <div className="bar-chart-container">
              {categorySpending.map((cat) => {
                const colors = {
                  food: "#fb923c",
                  travel: "#60a5fa",
                  shopping: "#f472b6",
                  education: "#a78bfa",
                  entertainment: "#facc15",
                  misc: "#94a3b8",
                };
                const col = colors[cat.category] || "#818cf8";
                return (
                  <div key={cat.category} className="bar-row">
                    <div className="bar-info">
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: col }} />
                        {cat.label} ({cat.count} txns)
                      </span>
                      <span>
                        <strong>₹{cat.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>{" "}
                        <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${cat.percentage}%`, background: col }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 6-MONTH TRENDS & SAVINGS GOALS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "28px" }}>
        
        {/* 6-MONTH TRAJECTORY CHART */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Financial Trajectory (6-Month Trends)</h3>
              <p>Inflows vs Outflows history</p>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: "600" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--success)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--success)" }} /> Income
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--danger)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--danger)" }} /> Expense
              </span>
            </div>
          </div>

          <div className="trend-chart-box">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "180px", gap: "12px", padding: "10px 0" }}>
              {monthlyTrends.map((item, idx) => {
                const incHeight = Math.max(8, (item.income / maxTrend) * 150);
                const expHeight = Math.max(8, (item.expense / maxTrend) * 150);
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "150px" }}>
                      <div
                        title={`Income: ₹${item.income}`}
                        style={{
                          width: "16px",
                          height: `${incHeight}px`,
                          background: "linear-gradient(to top, var(--success), #34d399)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.4s",
                        }}
                      />
                      <div
                        title={`Expense: ₹${item.expense}`}
                        style={{
                          width: "16px",
                          height: `${expHeight}px`,
                          background: "linear-gradient(to top, var(--danger), #f43f5e)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.4s",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {item.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ACTIVE SAVINGS GOALS */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Savings Goals</h3>
              <p>Target milestones & progress</p>
            </div>
          </div>

          {goals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>No active savings goals found.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {goals.slice(0, 3).map((g) => {
                const isComplete = g.status === "completed" || g.progress_percent >= 100;
                return (
                  <div
                    key={g.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div>
                        <strong style={{ fontSize: "14px" }}>{g.name}</strong>
                        {isComplete && <span className="badge" style={{ marginLeft: "8px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>Completed 🎯</span>}
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onOpenDeposit(g)}
                      >
                        + Deposit
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                      <span>Saved: ₹{parseFloat(g.saved_amount).toLocaleString("en-IN")}</span>
                      <span>Target: ₹{parseFloat(g.target_amount).toLocaleString("en-IN")}</span>
                    </div>

                    <div className="bar-track" style={{ height: "8px" }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, g.progress_percent)}%`,
                          background: isComplete ? "var(--success)" : "linear-gradient(90deg, var(--primary), #06b6d4)",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                      <span>{g.progress_percent}% achieved</span>
                      {g.deadline && <span>Deadline: {g.deadline}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent Transactions</h3>
            <p>Latest pocket money, scholarship, and daily expenses</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onOpenAddTransaction}>
            + Record New
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category / Source</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.slice(0, 5).map((e) => (
                <tr key={`exp-${e.id}`}>
                  <td>{e.date}</td>
                  <td><span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>Expense</span></td>
                  <td>
                    <span className={`badge badge-${e.category}`}>
                      {e.category.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{e.note || "—"}</td>
                  <td style={{ color: "var(--danger)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                    -₹{parseFloat(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {recentIncomes.slice(0, 3).map((i) => (
                <tr key={`inc-${i.id}`}>
                  <td>{i.date}</td>
                  <td><span className="badge" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>Income</span></td>
                  <td>
                    <span className="badge" style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee" }}>
                      {i.source.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{i.note || "—"}</td>
                  <td style={{ color: "var(--success)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                    +₹{parseFloat(i.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
