import React, { useEffect, useState } from "react";
import { reportsApi } from "../api";

export default function ReportsTab({ currentMonth, onMonthChange }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReport();
  }, [currentMonth]);

  async function fetchReport() {
    setLoading(true);
    setError("");
    try {
      const data = await reportsApi.getSummary(currentMonth);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(format) {
    const token = localStorage.getItem("budgetbuddy_access");
    let url = "";
    if (format === "csv") url = reportsApi.getCsvUrl(currentMonth);
    else if (format === "excel") url = reportsApi.getExcelUrl(currentMonth);
    else if (format === "pdf") url = reportsApi.getPdfUrl(currentMonth);

    // For file downloads with Authorization header, fetch blob and trigger download
    fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => {
        if (format === "pdf") {
          // Open PDF/HTML report preview in new tab for direct printing / saving as PDF
          return res.text().then((html) => {
            const win = window.open("", "_blank");
            win.document.write(html);
            win.document.close();
          });
        }
        return res.blob().then((blob) => {
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `budgetbuddy_${currentMonth || "report"}.${format === "excel" ? "xls" : "csv"}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        });
      })
      .catch((err) => alert("Failed to generate download: " + err.message));
  }

  return (
    <div>
      {/* HEADER & CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>Financial Reports & Data Export</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Generate monthly financial statements, export to Excel/CSV, or print PDF reports
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="month"
            className="form-control"
            style={{ width: "auto", padding: "8px 14px" }}
            value={currentMonth}
            onChange={(e) => onMonthChange(e.target.value)}
          />
          <button className="btn btn-outline" onClick={() => handleDownload("csv")}>
            📥 Export CSV
          </button>
          <button className="btn btn-outline" onClick={() => handleDownload("excel")}>
            📊 Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => handleDownload("pdf")}>
            📄 View & Print PDF Statement
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          Generating statement...
        </div>
      ) : error ? (
        <div style={{ color: "var(--danger)", padding: "20px" }}>{error}</div>
      ) : report ? (
        <div className="panel" style={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid var(--border-accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "18px", marginBottom: "20px" }}>
            <div>
              <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", marginBottom: "6px" }}>
                OFFICIAL FINANCIAL STATEMENT
              </span>
              <h3 style={{ fontSize: "20px" }}>BudgetBuddy Monthly Report — {report.month_label}</h3>
              <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>Account: {report.user_email}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Report Currency</div>
              <strong style={{ fontSize: "16px", color: "var(--primary)" }}>{report.currency} (₹)</strong>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Income</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--success)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                ₹{report.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Expenses</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--danger)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                ₹{report.total_expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Net Savings</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: report.net_savings >= 0 ? "var(--info)" : "var(--danger)", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                ₹{report.net_savings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Savings Efficiency</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--primary)", marginTop: "4px" }}>
                {report.savings_rate}%
              </div>
            </div>
          </div>

          {/* BREAKDOWN SECTIONS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <div>
              <h4 style={{ fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                Inflow Breakdown (Incomes)
              </h4>
              {report.income_breakdown.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>No incomes for this month.</p>
              ) : (
                report.income_breakdown.map((i) => (
                  <div key={i.source} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span>{i.label}</span>
                    <strong style={{ color: "var(--success)" }}>₹{i.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({i.percentage}%)</strong>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                Outflow Breakdown (Expenses)
              </h4>
              {report.expense_breakdown.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>No expenses for this month.</p>
              ) : (
                report.expense_breakdown.map((e) => (
                  <div key={e.category} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span>{e.label}</span>
                    <strong style={{ color: "var(--danger)" }}>₹{e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({e.percentage}%)</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BUDGET SUMMARY */}
          {report.budget_summary.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
                Budget Compliance Summary
              </h4>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Budget Scope</th>
                      <th>Limit</th>
                      <th>Actual Spent</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.budget_summary.map((b) => (
                      <tr key={b.category}>
                        <td><strong>{b.label}</strong></td>
                        <td>₹{b.limit.toLocaleString("en-IN")}</td>
                        <td style={{ color: b.over_budget ? "var(--danger)" : "var(--text-main)" }}>
                          ₹{b.spent.toLocaleString("en-IN")} ({b.percentage_used}%)
                        </td>
                        <td>₹{b.remaining.toLocaleString("en-IN")}</td>
                        <td>
                          <span className="badge" style={{ background: b.over_budget ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)", color: b.over_budget ? "#f87171" : "#34d399" }}>
                            {b.over_budget ? "Overspent" : "Within Limit"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
