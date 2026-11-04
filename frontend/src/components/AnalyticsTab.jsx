import React from "react";
import {
  ShieldCheck,
  TrendingUp,
  BarChart2,
  PieChart,
  Calendar,
} from "lucide-react";
import { financeApi } from "../api";
import { money } from "../utils/currency";

export default function AnalyticsTab({ analytics, currentMonth, onMonthChange }) {
  const summary = analytics?.summary || {
    total_income: 0,
    total_expense: 0,
    net_savings: 0,
    savings_rate: 0,
    financial_health_score: 50,
  };
  const categorySpending = analytics?.category_spending || [];
  const incomeSources = analytics?.income_sources || [];
  const monthlyTrends = analytics?.monthly_trends || [];

  return (
    <div className="tab-container-animate">
      {/* FILTER & TOP ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>Financial Analytics & Habits</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Visual intelligence into your spending patterns and savings performance
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Reporting Month:</label>
          <input
            type="month"
            className="form-control"
            style={{ width: "auto", padding: "6px 12px" }}
            value={currentMonth}
            onChange={(e) => onMonthChange(e.target.value)}
          />
        </div>
      </div>

      {/* DISCIPLINE SCORE CARD */}
      <div className="panel" style={{ background: "var(--bg-card)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ maxWidth: "600px" }}>
            <span className="badge" style={{ background: "var(--primary-subtle)", color: "var(--primary)", marginBottom: "10px" }}>
              Financial Discipline Score
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "var(--text-main)" }}>
              Score: {summary.financial_health_score} / 100
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px", lineHeight: "1.5" }}>
              {summary.savings_rate >= 20
                ? "Excellent financial habit! You are saving over 20% of your total allowance and freelance inflows. You are on track to achieve your sinking funds on time."
                : summary.savings_rate >= 10
                ? "Good effort! Your savings rate is positive, but reducing non-essential entertainment or dining out will help hit the recommended 25% student benchmark."
                : "Heads up! Expenses are consuming nearly all of your incoming funds. Consider revising your category limits to prevent running short before month end."}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Net Balance</div>
            <div style={{ fontSize: "28px", fontWeight: "700", fontFamily: "var(--font-mono)", color: summary.net_savings >= 0 ? "var(--success)" : "var(--danger)" }}>
              ₹{money.format(summary.net_savings)}
            </div>
            <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
              Savings Rate: <strong>{summary.savings_rate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* CATEGORY AND INCOME DISTRIBUTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* CATEGORY BREAKDOWN */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Category-Wise Spending Breakdown</h3>
              <p>Where pocket money goes (shown as % share of total expenditure)</p>
            </div>
          </div>

          {categorySpending.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>No expense data for this month.</p>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Transactions</th>
                    <th>Distribution</th>
                    <th style={{ textAlign: "right" }}>Money Spent (% Share)</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySpending.map((cat) => (
                    <tr key={cat.category}>
                      <td>
                        <span className={`badge badge-${cat.category}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td>{cat.count} txns</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div className="bar-track" style={{ width: "90px", height: "6px" }}>
                            <div className="bar-fill" style={{ width: `${cat.percentage}%`, background: "var(--primary)" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{cat.percentage}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span className="badge-spent-pct">
                            {cat.percentage}% of spend
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                            ₹{money.format(cat.amount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* INCOME SOURCES BREAKDOWN */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Income Sources Distribution</h3>
              <p>Breakdown of allowance, stipends, and freelance</p>
            </div>
          </div>

          {incomeSources.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>No income recorded for this period.</p>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Inflow Events</th>
                    <th>Share</th>
                    <th style={{ textAlign: "right" }}>Total Inflow</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeSources.map((src) => (
                    <tr key={src.source}>
                      <td>
                        <span className="badge" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                          {src.label}
                        </span>
                      </td>
                      <td>{src.count} events</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div className="bar-track" style={{ width: "90px", height: "6px" }}>
                            <div className="bar-fill" style={{ width: `${src.percentage}%`, background: "var(--success)" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{src.percentage}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", fontFamily: "var(--font-mono)", color: "var(--success)" }}>
                        ₹{money.format(src.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
