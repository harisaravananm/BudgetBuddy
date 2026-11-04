import React, { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
  TrendingDown,
  Calendar,
  SlidersHorizontal,
  Plus,
  Edit2,
  AlertCircle,
  PiggyBank,
} from "lucide-react";
import { categoryColor } from "../categoryVisuals";

export default function DashboardTab({
  analytics,
  goals,
  recentExpenses,
  recentIncomes,
  onOpenDeposit,
  onOpenAddTransaction,
  onOpenEditTransaction,
}) {
  const [percentMode, setPercentMode] = useState(true);

  const summary = analytics?.summary || {
    total_income: 0,
    total_expense: 0,
    net_savings: 0,
    savings_rate: 0,
    financial_health_score: null,
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
    if (score >= 80) return "Strong Financial Discipline";
    if (score >= 60) return "Healthy & Stable";
    if (score >= 40) return "Requires Budget Attention";
    return "High Overspending Pace";
  };

  // Money spent shown as % of allowance/income
  const totalIncome = summary.total_income || 0;
  const totalExpense = summary.total_expense || 0;
  const spentPercent = totalIncome > 0
    ? ((totalExpense / totalIncome) * 100).toFixed(1)
    : totalExpense > 0 ? "100.0" : "0.0";

  // Month progress calculation for spending velocity
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthDayPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
  const velocityRatio = monthDayPercent > 0 ? (parseFloat(spentPercent) / monthDayPercent).toFixed(2) : "1.00";
  const hasScore = summary.financial_health_score !== null && summary.financial_health_score !== undefined;

  const maxTrend = Math.max(
    ...monthlyTrends.map((t) => Math.max(t.income, t.expense, 1000)),
    10000
  );

  return (
    <div className="tab-container-animate">
      {/* KEY STATS ROW */}
      <section className="stats-grid">
        {/* Income Card */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Monthly Inflows</span>
            <div className="stat-card-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--success)" }}>
            ₹{summary.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>Pocket money, stipends & earnings</span>
          </div>
        </article>

        {/* Money Spent as % Card */}
        <article className="stat-card" style={{ borderColor: parseFloat(spentPercent) > 80 ? "var(--danger-border)" : "var(--border-subtle)" }}>
          <div className="stat-card-header">
            <span className="stat-card-label" style={{ color: "var(--danger)" }}>
              Expenses (% of Allowance)
            </span>
            <div className="stat-card-icon" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--danger)" }}>
            {spentPercent}% Spent
          </div>
          <div className="stat-card-sub">
            <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger-text)" }}>
              {(100 - Math.min(100, parseFloat(spentPercent))).toFixed(1)}% remaining buffer
            </span>
          </div>
        </article>

        {/* Net Savings Card */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Net Savings Reserve</span>
            <div className="stat-card-icon" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: summary.net_savings >= 0 ? "var(--info)" : "var(--danger)" }}>
            ₹{summary.net_savings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span style={{ color: "var(--text-muted)" }}>Savings rate: </span>
            <strong style={{ color: summary.savings_rate >= 20 ? "var(--success)" : "var(--warning)" }}>
              {summary.savings_rate}%
            </strong>
          </div>
        </article>

        {/* Financial Discipline Score */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Discipline Score</span>
            <div className="stat-card-icon" style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          {hasScore ? (
            <div className="stat-card-value font-mono" style={{ color: getScoreColor(summary.financial_health_score) }}>
              <span className="score-gauge" style={{ "--score": `${summary.financial_health_score}%`, "--score-color": getScoreColor(summary.financial_health_score) }}>
                <span>{summary.financial_health_score}</span>
              </span>
              <span style={{ fontSize: "14px", color: "var(--text-dim)", fontWeight: 400 }}>/ 100</span>
            </div>
          ) : (
            <div className="stat-card-value font-mono" style={{ fontSize: "16px", color: "var(--text-muted)", minHeight: "36px", display: "flex", alignItems: "center" }}>
              Active
            </div>
          )}
          <div className="stat-card-sub">
            <span style={{ fontSize: "11px", fontWeight: "600" }}>
              {hasScore ? getScoreLabel(summary.financial_health_score) : "Tracks budget discipline"}
            </span>
          </div>
        </article>
      </section>

      {/* SPENDING PACE BANNER */}
      <section className="panel" style={{ padding: "18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-main)" }}>Monthly Spending Pace</h4>
              <span className="badge" style={{ background: parseFloat(velocityRatio) > 1.2 ? "var(--danger-bg)" : "var(--success-bg)", color: parseFloat(velocityRatio) > 1.2 ? "var(--danger)" : "var(--success)" }}>
                Pace: {velocityRatio}x
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Day {currentDay} of {daysInMonth} ({monthDayPercent}% of month elapsed) vs <strong>{spentPercent}% of monthly allowance consumed</strong>.
              {parseFloat(velocityRatio) > 1.2
                ? " Spending is currently outpacing calendar days. Consider slowing down to ensure buffer remains."
                : " Spending is tracking comfortably within expected calendar pace."}
            </p>
          </div>
          <div style={{ width: "240px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
              <span style={{ color: "var(--text-dim)" }}>Month Elapsed: {monthDayPercent}%</span>
              <span style={{ color: "var(--danger)", fontWeight: "600" }}>Spent: {spentPercent}%</span>
            </div>
            <div className="bar-track" style={{ height: "7px" }}>
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min(100, parseFloat(spentPercent))}%`,
                  background: parseFloat(velocityRatio) > 1.2 ? "var(--danger)" : "var(--primary)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMN GRID: BUDGET UTILIZATION & CATEGORY BREAKDOWN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* Budget Utilization (Showing Spent as %) */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Budget Utilization</h3>
              <p>Spending tracked as percentage utilized against monthly limits</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onOpenAddTransaction}>
              <Plus size={14} /> Add Expense
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
                const label = b.category ? b.category.charAt(0).toUpperCase() + b.category.slice(1) : "Overall Monthly Ceiling";

                return (
                  <div key={b.id} className="bar-row">
                    <div className="bar-info">
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 600 }}>{label}</span>
                        {isOver && <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>Over limit</span>}
                        {!isOver && isAlert && <span className="badge" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>Warning</span>}
                      </span>
                      <span className="font-mono" style={{ color: fillCol, fontWeight: "600" }}>
                        {pct}% Spent{" "}
                        <span style={{ color: "var(--text-dim)", fontSize: "11px", fontWeight: "normal" }}>
                          (Limit: ₹{parseFloat(b.limit_amount).toLocaleString("en-IN")})
                        </span>
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
                      <span>Remaining Buffer: {(100 - Math.min(100, pct)).toFixed(1)}%</span>
                      <span>Alert threshold: {b.alert_threshold_percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Category Breakdown (Showing Spent as %) */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Category-Wise Spending</h3>
              <p>Distribution of expenditures by student category</p>
            </div>
          </div>

          {categorySpending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>No expense data recorded for this month.</p>
            </div>
          ) : (
            <div className="bar-chart-container">
              {categorySpending.map((cat) => {
                const col = categoryColor(cat.category);
                return (
                  <div key={cat.category} className="bar-row">
                    <div className="bar-info">
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col }} />
                        {cat.label} ({cat.count} txns)
                      </span>
                      <span className="font-mono">
                        <strong style={{ color: col, fontSize: "13px" }}>{cat.percentage}% of spending</strong>
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

      {/* 6-MONTH TRENDS & SAVINGS GOALS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* Trajectory */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Financial Trends</h3>
              <p>Inflows vs outflows over the past 6 months</p>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: "600" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--success)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--success)" }} /> Inflow
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--danger)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--danger)" }} /> Outflow
              </span>
            </div>
          </div>

          <div className="trend-chart-box">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "160px", gap: "12px", padding: "10px 0" }}>
              {monthlyTrends.map((item, idx) => {
                const incHeight = Math.max(8, (item.income / maxTrend) * 130);
                const expHeight = Math.max(8, (item.expense / maxTrend) * 130);
                const monthSpentPct = item.income > 0 ? ((item.expense / item.income) * 100).toFixed(0) : "0";
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "130px" }}>
                      <div
                        className="trend-bar-interactive"
                        title={`Inflow: ₹${item.income}`}
                        style={{
                          width: "14px",
                          height: `${incHeight}px`,
                          background: "var(--success)",
                          borderRadius: "3px 3px 0 0",
                        }}
                      />
                      <div
                        className="trend-bar-interactive"
                        title={`Outflow: ${monthSpentPct}% spent (₹${item.expense})`}
                        style={{
                          width: "14px",
                          height: `${expHeight}px`,
                          background: "var(--danger)",
                          borderRadius: "3px 3px 0 0",
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

        {/* Savings Goals */}
        <section className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Savings Goals</h3>
              <p>Milestone progress toward sinking funds</p>
            </div>
          </div>

          {goals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>No active savings goals found.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {goals.slice(0, 3).map((g) => {
                const isComplete = g.status === "completed" || g.progress_percent >= 100;
                return (
                  <div key={g.id} className="goal-card-hover">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div>
                        <strong style={{ fontSize: "13.5px", color: "var(--text-main)" }}>{g.name}</strong>
                        {isComplete && <span className="badge" style={{ marginLeft: "8px", background: "var(--success-bg)", color: "var(--success)" }}>Completed</span>}
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

                    <div className="bar-track" style={{ height: "6px" }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, g.progress_percent)}%`,
                          background: isComplete ? "var(--success)" : "var(--primary)",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                      <span style={{ fontWeight: "600", color: "var(--primary)" }}>{g.progress_percent}% achieved</span>
                      {g.deadline && <span>Deadline: {g.deadline}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* RECENT TRANSACTIONS */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent Transactions</h3>
            <p>Latest categorized student outflows and pocket money entries</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div className="view-toggle-group">
              <button
                className={`view-toggle-btn ${percentMode ? "active" : ""}`}
                onClick={() => setPercentMode(true)}
              >
                % Spent
              </button>
              <button
                className={`view-toggle-btn ${!percentMode ? "active" : ""}`}
                onClick={() => setPercentMode(false)}
              >
                ₹ Currency
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={onOpenAddTransaction}>
              <Plus size={14} /> Record New
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category / Source</th>
                <th>Note</th>
                <th style={{ textAlign: "right" }}>
                  {percentMode ? "Money Spent (% Share)" : "Amount (₹)"}
                </th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.slice(0, 5).map((e) => {
                const expPct = totalIncome > 0
                  ? ((parseFloat(e.amount) / totalIncome) * 100).toFixed(1)
                  : totalExpense > 0
                  ? ((parseFloat(e.amount) / totalExpense) * 100).toFixed(1)
                  : "0.0";
                return (
                  <tr key={`exp-${e.id}`}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>{e.date}</td>
                    <td><span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>Expense</span></td>
                    <td>
                      <span className={`badge badge-${e.category}`}>
                        {e.category.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-main)" }}>{e.note || "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {percentMode ? (
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span
                            className="badge-spent-pct"
                            title={`Nominal amount: ₹${parseFloat(e.amount).toLocaleString("en-IN")}`}
                          >
                            -{expPct}% of inflow
                          </span>
                          <span style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "2px" }}>
                            ₹{parseFloat(e.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--danger)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                          -₹{parseFloat(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                        onClick={() => onOpenEditTransaction({ ...e, txnType: "expense" })}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recentIncomes.slice(0, 3).map((i) => (
                <tr key={`inc-${i.id}`}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>{i.date}</td>
                  <td><span className="badge" style={{ background: "var(--success-bg)", color: "var(--success)" }}>Income</span></td>
                  <td>
                    <span className="badge" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                      {i.source.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-main)" }}>{i.note || "—"}</td>
                  <td style={{ textAlign: "right", color: "var(--success)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                    +₹{parseFloat(i.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => onOpenEditTransaction({ ...i, txnType: "income" })}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
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
