import React, { useState } from "react";
import { financeApi } from "../api";

export default function TransactionsTab({
  expenses,
  incomes,
  onRefresh,
  onOpenAddModal,
  onOpenEditModal,
  totalIncome = 0,
  budgetLimit = 0,
}) {
  const [filterType, setFilterType] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [percentMode, setPercentMode] = useState(true); // Default to true as user requested "money spent should be shown as % not in numbers"
  const [viewMode, setViewMode] = useState("list"); // "list" or "daily"

  // Calculate total expense & income for percentage calculations
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const totalIncomeAmount = incomes.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
  const effectiveBase = budgetLimit > 0 ? budgetLimit : totalIncomeAmount > 0 ? totalIncomeAmount : totalExpenseAmount;

  // Percentage of income spent
  const overallSpentPercent = totalIncomeAmount > 0
    ? ((totalExpenseAmount / totalIncomeAmount) * 100).toFixed(1)
    : budgetLimit > 0
    ? ((totalExpenseAmount / budgetLimit) * 100).toFixed(1)
    : totalExpenseAmount > 0 ? "100.0" : "0.0";

  // Combine and sort
  const combined = [
    ...expenses.map((e) => ({ ...e, txnType: "expense" })),
    ...incomes.map((i) => ({ ...i, txnType: "income" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = combined.filter((item) => {
    if (filterType !== "all" && item.txnType !== filterType) return false;
    if (categoryFilter !== "all") {
      if (item.txnType === "expense" && item.category !== categoryFilter) return false;
      if (item.txnType === "income" && item.source !== categoryFilter) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNote = item.note && item.note.toLowerCase().includes(q);
      const matchAmount = item.amount && item.amount.toString().includes(q);
      const matchCat = (item.category || item.source || "").toLowerCase().includes(q);
      if (!matchNote && !matchAmount && !matchCat) return false;
    }
    return true;
  });

  // Daily grouping for timeline/daily view
  const dailyGroups = filtered.reduce((groups, item) => {
    const d = item.date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
    return groups;
  }, {});

  async function handleDelete(item) {
    if (!window.confirm(`Are you sure you want to delete this ${item.txnType} record?`)) return;
    setBusyId(item.id);
    try {
      if (item.txnType === "expense") {
        await financeApi.deleteExpense(item.id);
      } else {
        await financeApi.deleteIncome(item.id);
      }
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Calculate percentage weight for individual expense
  const getExpensePercentage = (amount) => {
    const num = parseFloat(amount) || 0;
    if (effectiveBase > 0) {
      return ((num / effectiveBase) * 100).toFixed(1);
    }
    if (totalExpenseAmount > 0) {
      return ((num / totalExpenseAmount) * 100).toFixed(1);
    }
    return "0.0";
  };

  return (
    <div className="tab-container-animate">
      {/* INNOVATIVE HEADER STATS: MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
      <section className="stats-grid" style={{ marginBottom: "24px" }}>
        
        {/* KEY USER SPEC: Money Spent Shown as % */}
        <article className="stat-card stat-card-hover-glow" style={{ borderColor: "rgba(239, 68, 68, 0.35)" }}>
          <div className="stat-card-header">
            <span className="stat-card-label" style={{ color: "#f87171" }}>
              Total Money Spent (% of Allowance)
            </span>
            <div className="stat-card-icon" style={{ background: "rgba(239, 68, 68, 0.18)", color: "#f87171" }}>
              📉
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "#f87171", fontSize: "30px" }}>
            {overallSpentPercent}% Spent
          </div>
          <div className="stat-card-sub">
            <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
              {parseFloat(overallSpentPercent) > 80 ? "⚠️ High Depletion" : "✅ Within Threshold"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {100 - Math.min(100, parseFloat(overallSpentPercent))}% remaining buffer
            </span>
          </div>
        </article>

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Verified Income Inflows</span>
            <div className="stat-card-icon" style={{ background: "rgba(16, 185, 129, 0.18)", color: "var(--success)" }}>
              💰
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--success)" }}>
            ₹{totalIncomeAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>{incomes.length} inflow events recorded</span>
          </div>
        </article>

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Relative Spend Velocity</span>
            <div className="stat-card-icon" style={{ background: "rgba(99, 102, 241, 0.18)", color: "var(--primary)" }}>
              ⚡
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--primary)" }}>
            {(parseFloat(overallSpentPercent) / (new Date().getDate() || 1)).toFixed(1)}% <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>/ day</span>
          </div>
          <div className="stat-card-sub">
            <span>Day {new Date().getDate()} burn pace across month</span>
          </div>
        </article>

        <article className="stat-card stat-card-hover-glow">
          <div className="stat-card-header">
            <span className="stat-card-label">Student Behavioral Mode</span>
            <div className="stat-card-icon" style={{ background: "rgba(6, 182, 212, 0.18)", color: "var(--info)" }}>
              🧠
            </div>
          </div>
          <div style={{ marginTop: "4px" }}>
            <button
              onClick={() => setPercentMode(!percentMode)}
              className={`btn btn-sm ${percentMode ? "btn-primary" : "btn-outline"} btn-interactive`}
              style={{ width: "100%", justifyContent: "space-between", padding: "8px 12px" }}
            >
              <span>{percentMode ? "⚡ Spent As % (Active)" : "₹ Show Currency"}</span>
              <span style={{ fontSize: "11px", opacity: 0.8 }}>Toggle</span>
            </button>
          </div>
          <div className="stat-card-sub" style={{ marginTop: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {percentMode ? "Eliminates number bias by showing spent as %" : "Standard numeric currency view"}
            </span>
          </div>
        </article>
      </section>

      {/* TRANSACTIONS PANEL */}
      <div className="panel panel-interactive">
        <div className="panel-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3>Student Financial Transaction Ledger</h3>
              <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc" }}>
                Milestone 2 Operational
              </span>
            </div>
            <p>Track pocket money, college stipends, mess, transport, and daily spending</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="view-toggle-group">
              <button
                className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-outline"} btn-interactive`}
                onClick={() => setViewMode("list")}
              >
                📋 Table View
              </button>
              <button
                className={`btn btn-sm ${viewMode === "daily" ? "btn-primary" : "btn-outline"} btn-interactive`}
                onClick={() => setViewMode("daily")}
              >
                📅 Daily Breakdown
              </button>
            </div>
            <button className="btn btn-primary btn-interactive" onClick={onOpenAddModal}>
              + Record Transaction
            </button>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-outline"} btn-interactive`}
              onClick={() => setFilterType("all")}
            >
              All Records ({combined.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === "expense" ? "btn-danger" : "btn-outline"} btn-interactive`}
              onClick={() => setFilterType("expense")}
            >
              Expenses ({expenses.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === "income" ? "btn-success" : "btn-outline"} btn-interactive`}
              onClick={() => setFilterType("income")}
            >
              Incomes ({incomes.length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px", marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="form-control"
              style={{ width: "auto", padding: "6px 12px", fontSize: "12px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">🔍 All Categories & Sources</option>
              <optgroup label="Expense Categories">
                <option value="food">🍔 Food & Dining</option>
                <option value="travel">✈️ Travel & Transit</option>
                <option value="shopping">🛍️ Shopping & Supplies</option>
                <option value="education">📚 Education & Books</option>
                <option value="entertainment">🎬 Entertainment</option>
                <option value="misc">📦 Miscellaneous</option>
              </optgroup>
              <optgroup label="Income Sources">
                <option value="pocket_money">👛 Pocket Money</option>
                <option value="scholarship">🎓 Scholarship</option>
                <option value="freelance">💻 Freelance / Projects</option>
                <option value="other">💵 Other Inflow</option>
              </optgroup>
            </select>

            <input
              type="text"
              placeholder="Search description, note, amount..."
              className="form-control"
              style={{ width: "230px", padding: "6px 12px", fontSize: "12px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LIST / TABLE VIEW */}
        {viewMode === "list" && (
          <div className="table-responsive">
            <table className="custom-table table-hover-effect">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category / Source</th>
                  <th>Description / Note</th>
                  <th style={{ textAlign: "right" }}>
                    {percentMode ? "Money Spent (% Weight)" : "Amount (₹)"}
                  </th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                      <p style={{ fontSize: "28px", marginBottom: "8px" }}>🔍</p>
                      <p>No matching transactions found in this filter.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isExp = item.txnType === "expense";
                    const expPct = isExp ? getExpensePercentage(item.amount) : null;
                    return (
                      <tr key={`${item.txnType}-${item.id}`} className="tr-interactive">
                        <td style={{ whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                          {item.date}
                        </td>
                        <td>
                          <span
                            className="badge badge-glow"
                            style={{
                              background: isExp ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                              color: isExp ? "#f87171" : "#34d399",
                              border: `1px solid ${isExp ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                            }}
                          >
                            {isExp ? "Expense" : "Income"}
                          </span>
                        </td>
                        <td>
                          {isExp ? (
                            <span className={`badge badge-${item.category} badge-hover-pulse`}>
                              {item.category.toUpperCase()}
                            </span>
                          ) : (
                            <span
                              className="badge badge-hover-pulse"
                              style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }}
                            >
                              {item.source.replace("_", " ").toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-main)", maxWidth: "260px" }}>
                          <span style={{ fontWeight: "500" }}>{item.note || "—"}</span>
                        </td>
                        
                        {/* MONEY SPENT SHOWN AS % NOT IN NUMBERS */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {isExp ? (
                            percentMode ? (
                              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                                <span
                                  className="badge-spent-pct"
                                  title={`Nominal value: ₹${parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                                >
                                  -{expPct}% of budget
                                </span>
                                <span style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                                  ₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--danger)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                                -₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            )
                          ) : (
                            <span style={{ color: "var(--success)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                              +₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              className="btn btn-outline btn-sm btn-interactive"
                              title="Edit transaction"
                              onClick={() => onOpenEditModal(item)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn btn-outline btn-sm btn-interactive btn-danger-hover"
                              style={{ color: "var(--danger)" }}
                              disabled={busyId === item.id}
                              onClick={() => handleDelete(item)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* DAILY BREAKDOWN TIMELINE VIEW (Milestone 2 Daily Transaction History) */}
        {viewMode === "daily" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {Object.keys(dailyGroups).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No transaction records available.
              </div>
            ) : (
              Object.entries(dailyGroups).map(([dayDate, dayItems]) => {
                const dayExpenseSum = dayItems
                  .filter((x) => x.txnType === "expense")
                  .reduce((sum, x) => sum + parseFloat(x.amount || 0), 0);
                const dayIncomeSum = dayItems
                  .filter((x) => x.txnType === "income")
                  .reduce((sum, x) => sum + parseFloat(x.amount || 0), 0);
                const daySpentPct = effectiveBase > 0 ? ((dayExpenseSum / effectiveBase) * 100).toFixed(1) : "0.0";

                return (
                  <div key={dayDate} className="daily-group-card">
                    <div className="daily-group-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "16px" }}>🗓️</span>
                        <strong style={{ fontSize: "14px" }}>{dayDate}</strong>
                        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                          ({dayItems.length} transactions)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                        {dayIncomeSum > 0 && (
                          <span style={{ color: "var(--success)", fontWeight: "700", fontSize: "12px" }}>
                            +{dayIncomeSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {/* Money Spent shown as % */}
                        <span className="badge" style={{ background: "rgba(239, 68, 68, 0.18)", color: "#f87171" }}>
                          Spent: {percentMode ? `-${daySpentPct}% of allocation` : `-₹${dayExpenseSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                      {dayItems.map((item) => {
                        const isExp = item.txnType === "expense";
                        const itemPct = isExp ? getExpensePercentage(item.amount) : null;
                        return (
                          <div key={`${item.txnType}-${item.id}`} className="daily-sub-item">
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span className={`badge ${isExp ? `badge-${item.category}` : "badge-info"}`}>
                                {(item.category || item.source).toUpperCase()}
                              </span>
                              <span style={{ fontSize: "13px", color: "var(--text-main)" }}>
                                {item.note || "No note recorded"}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {isExp ? (
                                <span style={{ color: "#f87171", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                                  {percentMode ? `-${itemPct}% of budget` : `-₹${parseFloat(item.amount).toLocaleString("en-IN")}`}
                                </span>
                              ) : (
                                <span style={{ color: "var(--success)", fontWeight: "700", fontFamily: "var(--font-mono)" }}>
                                  +₹{parseFloat(item.amount).toLocaleString("en-IN")}
                                </span>
                              )}
                              <button
                                className="btn btn-outline btn-sm btn-interactive"
                                style={{ padding: "2px 6px", fontSize: "11px" }}
                                onClick={() => onOpenEditModal(item)}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-outline btn-sm btn-interactive"
                                style={{ padding: "2px 6px", fontSize: "11px", color: "var(--danger)" }}
                                onClick={() => handleDelete(item)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
