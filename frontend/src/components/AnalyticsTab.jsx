import React, { useState } from "react";
import { financeApi } from "../api";

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
    <div>
      {/* FILTER & TOP ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
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
      <div className="panel" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.1))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ maxWidth: "600px" }}>
            <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", marginBottom: "10px" }}>
              STUDENT FINANCIAL HEALTH ALGORITHM
            </span>
            <h3 style={{ fontSize: "22px", marginBottom: "8px" }}>
              Discipline Score: {summary.financial_health_score} / 100
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.5" }}>
              {summary.savings_rate >= 20
                ? "Excellent financial habit! You are saving over 20% of your total allowance and freelance inflows. You are on track to achieve your sinking funds on time."
                : summary.savings_rate >= 10
                ? "Good effort! Your savings rate is positive, but try reducing non-essential entertainment or dining out to hit the recommended 25% student benchmark."
                : "Heads up! Your expenses are consuming nearly all of your income. Consider revising your category limits to prevent overspending."}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase" }}>Monthly Net Balance</div>
            <div style={{ fontSize: "32px", fontWeight: "800", fontFamily: "var(--font-mono)", color: summary.net_savings >= 0 ? "var(--success)" : "var(--danger)" }}>
              ₹{summary.net_savings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Savings Rate: <strong>{summary.savings_rate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* CATEGORY AND INCOME DISTRIBUTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "28px" }}>
        
        {/* CATEGORY BREAKDOWN */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <div>
              <h3>Category-Wise Spending Breakdown</h3>
              <p>Where student pocket money goes</p>
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
                    <th>Share</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
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
                          <div className="bar-track" style={{ width: "80px", height: "6px" }}>
                            <div className="bar-fill" style={{ width: `${cat.percentage}%`, background: "var(--primary)" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{cat.percentage}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                        ₹{cat.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeSources.map((src) => (
                    <tr key={src.source}>
                      <td>
                        <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                          {src.label}
                        </span>
                      </td>
                      <td>{src.count} events</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div className="bar-track" style={{ width: "80px", height: "6px" }}>
                            <div className="bar-fill" style={{ width: `${src.percentage}%`, background: "var(--success)" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{src.percentage}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", fontFamily: "var(--font-mono)", color: "var(--success)" }}>
                        ₹{src.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6-MONTH TRAJECTORY TABLE */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Monthly Trends & History</h3>
            <p>Historical comparison across consecutive months</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Inflow (Income)</th>
                <th>Outflow (Expenses)</th>
                <th>Net Savings</th>
                <th>Savings Rate</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTrends.map((t) => {
                const sRate = t.income > 0 ? Math.round((t.savings / t.income) * 100) : 0;
                return (
                  <tr key={t.month}>
                    <td><strong>{t.label}</strong></td>
                    <td style={{ color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                      +₹{t.income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: "var(--danger)", fontFamily: "var(--font-mono)" }}>
                      -₹{t.expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: t.savings >= 0 ? "var(--info)" : "var(--danger)", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
                      ₹{t.savings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="badge" style={{ background: sRate >= 20 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: sRate >= 20 ? "#34d399" : "#fbbf24" }}>
                        {sRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
