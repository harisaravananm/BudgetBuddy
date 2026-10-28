import React, { useState } from "react";

export default function DashboardTab({
  analytics,
  goals,
  recentExpenses,
  recentIncomes,
  onOpenDeposit,
  onOpenAddTransaction,
  onOpenEditTransaction,
}) {
  const [percentMode, setPercentMode] = useState(true); // User request: Money spent should be shown as % not in numbers

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

  // User requirement: Money spent should be shown as % not in numbers
  const totalIncome = summary.total_income || 0;
  const totalExpense = summary.total_expense || 0;
  const spentPercent = totalIncome > 0
    ? ((totalExpense / totalIncome) * 100).toFixed(1)
    : totalExpense > 0 ? "100.0" : "0.0";

  // Month progress calculation for Velocity Gauge
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthDayPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
  const velocityRatio = monthDayPercent > 0 ? (parseFloat(spentPercent) / monthDayPercent).toFixed(2) : "1.00";

  // Find max value for trend chart scaling
  const maxTrend = Math.max(
    ...monthlyTrends.map((t) => Math.max(t.income, t.expense, 1000)),
    10000
  );

  return (
    <div className="tab-container-animate">
      {/* KEY STATS ROW */}
      <section className="stats-grid">
        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Monthly Inflows</span>
            <div className="stat-card-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}>
              💰
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--success)" }}>
            ₹{summary.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>Pocket money, scholarship & grants</span>
          </div>
        </article>

        {/* MANDATE: MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
        <article className="stat-card stat-card-hover-glow" style={{ borderColor: parseFloat(spentPercent) > 80 ? "rgba(239, 68, 68, 0.4)" : "var(--border-subtle)" }}>
          <div className="stat-card-header">
            <span className="stat-card-label" style={{ color: "#f87171" }}>
              Total Money Spent (% Exhausted)
            </span>
            <div className="stat-card-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)" }}>
              💸
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: parseFloat(spentPercent) > 85 ? "var(--danger)" : "#f87171" }}>
            {spentPercent}% Spent
          </div>
          <div className="stat-card-sub">
            <span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
              {100 - Math.min(100, parseFloat(spentPercent))}% unspent buffer
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {categorySpending.length} active spending categories
            </span>
          </div>
        </article>

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Net Savings Reserve</span>
            <div className="stat-card-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "var(--info)" }}>
              🛡️
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

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Financial Discipline Score</span>
            <div className="stat-card-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
              🎯
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: getScoreColor(summary.financial_health_score) }}>
            {summary.financial_health_score} <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>/ 100</span>
          </div>
          <div className="stat-card-sub">
            <span style={{ fontSize: "11px", fontWeight: "700" }}>{getScoreLabel(summary.financial_health_score)}</span>
          </div>
        </article>
      </section>

      {/* INNOVATION: SPENDING VELOCITY & BURN-RATE SPEEDOMETER */}
      <section className="panel panel-interactive" style={{ padding: "18px 24px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
              <h4 style={{ fontSize: "15px", color: "white" }}>Innovation: Spending Velocity & Pocket Money Burn Meter</h4>
              <span className="badge" style={{ background: parseFloat(velocityRatio) > 1.2 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)", color: parseFloat(velocityRatio) > 1.2 ? "#f87171" : "#34d399" }}>
                Velocity: {velocityRatio}x
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Day {currentDay} of {daysInMonth} ({monthDayPercent}% of month elapsed) vs <strong>{spentPercent}% of pocket money consumed</strong>.
              {parseFloat(velocityRatio) > 1.2
                ? " ⚠️ Caution: Spending faster than calendar days! Slow down to avoid running dry."
                : " ✅ Great discipline: Spending velocity is within optimal safe pacing."}
            </p>
          </div>
          <div style={{ width: "240px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-dim)" }}>Month Elapsed: {monthDayPercent}%</span>
              <span style={{ color: "#f87171", fontWeight: "700" }}>Spent: {spentPercent}%</span>
            </div>
            <div className="bar-track" style={{ height: "8px" }}>
              <div className="bar-fill" style={{ width: `${Math.min(100, parseFloat(spentPercent))}%`, background: parseFloat(velocityRatio) > 1.2 ? "var(--danger)" : "var(--primary)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMN GRID: BUDGET UTILIZATION & CATEGORY SPENDING */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "28px" }}>
        
        {/* BUDGET UTILIZATION - SHOWING MONEY SPENT AS % */}
        <section className="panel panel-interactive" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Budget Utilization Tracking</h3>
              <p>Spending is evaluated as percentage utilized against guardrails</p>
            </div>
            <button className="btn btn-outline btn-sm btn-interactive" onClick={onOpenAddTransaction}>
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
                  <div key={b.id} className="bar-row bar-row-hover">
                    <div className="bar-info">
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong>{label}</strong>
                        {isOver && <span className="badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>Exceeded!</span>}
                        {!isOver && isAlert && <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>High Alert</span>}
                      </span>
                      {/* MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
                      <span className="font-mono" style={{ color: fillCol, fontWeight: "700" }}>
                        {pct}% Spent{" "}
                        <span style={{ color: "var(--text-dim)", fontSize: "11px", fontWeight: "normal" }}>
                          (of ₹{parseFloat(b.limit_amount).toLocaleString("en-IN")})
                        </span>
                      </span>
                    </div>
                    <div className="bar-track bar-track-animated">
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

        {/* CATEGORY SPENDING BREAKDOWN - SHOWING SPENT AS % */}
        <section className="panel panel-interactive" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Category-Wise Spending Breakdown</h3>
              <p>Percentage share of total student expenditure</p>
            </div>
          </div>

          {categorySpending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
              <p>No expense data recorded for this month.</p>
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
                  <div key={cat.category} className="bar-row bar-row-hover">
                    <div className="bar-info">
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: col }} />
                        {cat.label} ({cat.count} txns)
                      </span>
                      {/* MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
                      <span className="font-mono">
                        <strong style={{ color: col, fontSize: "14px" }}>{cat.percentage}% of spending</strong>
                      </span>
                    </div>
                    <div className="bar-track bar-track-animated">
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
        <section className="panel panel-interactive" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Financial Trajectory (6-Month Trends)</h3>
              <p>Historical comparison of inflows and outflows</p>
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
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "180px", gap: "12px", padding: "10px 0" }}>
              {monthlyTrends.map((item, idx) => {
                const incHeight = Math.max(8, (item.income / maxTrend) * 150);
                const expHeight = Math.max(8, (item.expense / maxTrend) * 150);
                const monthSpentPct = item.income > 0 ? ((item.expense / item.income) * 100).toFixed(0) : "0";
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "150px" }}>
                      <div
                        className="trend-bar-interactive"
                        title={`Inflow: ₹${item.income}`}
                        style={{
                          width: "16px",
                          height: `${incHeight}px`,
                          background: "linear-gradient(to top, var(--success), #34d399)",
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                      <div
                        className="trend-bar-interactive"
                        title={`Outflow: ${monthSpentPct}% spent (₹${item.expense})`}
                        style={{
                          width: "16px",
                          height: `${expHeight}px`,
                          background: "linear-gradient(to top, var(--danger), #f43f5e)",
                          borderRadius: "4px 4px 0 0",
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
        <section className="panel panel-interactive" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Savings Goals (Sinking Funds)</h3>
              <p>Target milestones for student needs</p>
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
                    className="goal-card-hover"
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
                        className="btn btn-outline btn-sm btn-interactive"
                        onClick={() => onOpenDeposit(g)}
                      >
                        + Deposit
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                      <span>Saved: ₹{parseFloat(g.saved_amount).toLocaleString("en-IN")}</span>
                      <span>Target: ₹{parseFloat(g.target_amount).toLocaleString("en-IN")}</span>
                    </div>

                    <div className="bar-track bar-track-animated" style={{ height: "8px" }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, g.progress_percent)}%`,
                          background: isComplete ? "var(--success)" : "linear-gradient(90deg, var(--primary), #06b6d4)",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                      <span style={{ fontWeight: "700", color: "var(--primary)" }}>{g.progress_percent}% achieved</span>
                      {g.deadline && <span>Deadline: {g.deadline}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* RECENT TRANSACTIONS TABLE - SHOWING MONEY SPENT AS % */}
      <section className="panel panel-interactive">
        <div className="panel-header">
          <div>
            <h3>Recent Financial Activity</h3>
            <p>Pocket money inflows and categorized outflows</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className={`btn btn-sm ${percentMode ? "btn-primary" : "btn-outline"} btn-interactive`}
              onClick={() => setPercentMode(!percentMode)}
            >
              {percentMode ? "⚡ Spent As % (Active)" : "₹ Show Currency"}
            </button>
            <button className="btn btn-primary btn-sm btn-interactive" onClick={onOpenAddTransaction}>
              + Record New
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table table-hover-effect">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category / Source</th>
                <th>Note</th>
                <th style={{ textAlign: "right" }}>
                  {percentMode ? "Money Spent (% Weight)" : "Amount (₹)"}
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
                  <tr key={`exp-${e.id}`} className="tr-interactive">
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{e.date}</td>
                    <td><span className="badge badge-glow" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>Expense</span></td>
                    <td>
                      <span className={`badge badge-${e.category} badge-hover-pulse`}>
                        {e.category.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{e.note || "—"}</td>
                    
                    {/* MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {percentMode ? (
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span
                            className="badge-spent-pct"
                            title={`Nominal amount: ₹${parseFloat(e.amount).toLocaleString("en-IN")}`}
                          >
                            -{expPct}% of inflow
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                            ₹{parseFloat(e.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--danger)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                          -₹{parseFloat(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-outline btn-sm btn-interactive"
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                        onClick={() => onOpenEditTransaction({ ...e, txnType: "expense" })}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recentIncomes.slice(0, 3).map((i) => (
                <tr key={`inc-${i.id}`} className="tr-interactive">
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{i.date}</td>
                  <td><span className="badge badge-glow" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>Income</span></td>
                  <td>
                    <span className="badge badge-hover-pulse" style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }}>
                      {i.source.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{i.note || "—"}</td>
                  <td style={{ textAlign: "right", color: "var(--success)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                    +₹{parseFloat(i.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-outline btn-sm btn-interactive"
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => onOpenEditTransaction({ ...i, txnType: "income" })}
                    >
                      ✏️ Edit
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
