import React, { useState } from "react";
import {
  TrendingDown,
  ArrowUpRight,
  Activity,
  Plus,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  List,
} from "lucide-react";
import { financeApi } from "../api";
import { money } from "../utils/currency";

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
  const [percentMode, setPercentMode] = useState(true);
  const [viewMode, setViewMode] = useState("list");

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
      {/* HEADER METRICS BANNER (MONEY SPENT SHOWN AS %) */}
      <section className="stats-grid" style={{ marginBottom: "24px" }}>
        {/* Money Spent Shown as % */}
        <article className="stat-card" style={{ borderColor: parseFloat(overallSpentPercent) > 80 ? "var(--danger-border)" : "var(--border-subtle)" }}>
          <div className="stat-card-header">
            <span className="stat-card-label" style={{ color: "var(--danger)" }}>
              Total Expenses (% of Allowance)
            </span>
            <div className="stat-card-icon" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--danger)" }}>
            {overallSpentPercent}% Spent
          </div>
          <div className="stat-card-sub">
            <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger-text)" }}>
              {parseFloat(overallSpentPercent) > 80 ? "High depletion" : "Safe buffer"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {(100 - Math.min(100, parseFloat(overallSpentPercent))).toFixed(1)}% remaining
            </span>
          </div>
        </article>

        {/* Inflows */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Inflows</span>
            <div className="stat-card-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--success)" }}>
            ₹{money.format(totalIncomeAmount)}
          </div>
          <div className="stat-card-sub">
            <span>{incomes.length} inflow transactions</span>
          </div>
        </article>

        {/* Daily Velocity */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Daily Spend Velocity</span>
            <div className="stat-card-icon" style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-card-value font-mono" style={{ color: "var(--primary)" }}>
            {(parseFloat(overallSpentPercent) / (new Date().getDate() || 1)).toFixed(1)}% <span style={{ fontSize: "13px", color: "var(--text-dim)", fontWeight: 400 }}>/ day</span>
          </div>
          <div className="stat-card-sub">
            <span>Day {new Date().getDate()} average daily pacing</span>
          </div>
        </article>

        {/* View Mode Toggle */}
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Display Preference</span>
          </div>
          <div style={{ marginTop: "4px" }}>
            <div className="view-toggle-group" style={{ width: "100%", justifyContent: "center" }}>
              <button
                className={`view-toggle-btn ${percentMode ? "active" : ""}`}
                style={{ flex: 1, textAlign: "center" }}
                onClick={() => setPercentMode(true)}
              >
                % Percent View
              </button>
              <button
                className={`view-toggle-btn ${!percentMode ? "active" : ""}`}
                style={{ flex: 1, textAlign: "center" }}
                onClick={() => setPercentMode(false)}
              >
                ₹ Currency View
              </button>
            </div>
          </div>
          <div className="stat-card-sub" style={{ marginTop: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {percentMode ? "Showing expenses as % of monthly budget" : "Showing raw currency amounts"}
            </span>
          </div>
        </article>
      </section>

      {/* TRANSACTIONS PANEL */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Transaction Ledger</h3>
            <p>Track student pocket money, stipends, and day-to-day spending</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="view-toggle-group">
              <button
                className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <List size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} /> Table
              </button>
              <button
                className={`view-toggle-btn ${viewMode === "daily" ? "active" : ""}`}
                onClick={() => setViewMode("daily")}
              >
                <Calendar size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} /> Daily
              </button>
            </div>
            <button className="btn btn-primary" onClick={onOpenAddModal}>
              <Plus size={14} /> Record Transaction
            </button>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "18px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setFilterType("all")}
            >
              All ({combined.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === "expense" ? "btn-danger" : "btn-outline"}`}
              onClick={() => setFilterType("expense")}
            >
              Expenses ({expenses.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === "income" ? "btn-success" : "btn-outline"}`}
              onClick={() => setFilterType("income")}
            >
              Inflows ({incomes.length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="form-control"
              style={{ width: "auto", padding: "6px 10px", fontSize: "12px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories & Sources</option>
              <optgroup label="Expense Categories">
                <option value="food">Food & Dining</option>
                <option value="travel">Travel & Transit</option>
                <option value="shopping">Shopping & Supplies</option>
                <option value="education">Education & Books</option>
                <option value="entertainment">Entertainment</option>
                <option value="misc">Miscellaneous</option>
              </optgroup>
              <optgroup label="Income Sources">
                <option value="pocket_money">Pocket Money</option>
                <option value="scholarship">Scholarship / Grant</option>
                <option value="freelance">Freelance / Projects</option>
                <option value="other">Other Inflow</option>
              </optgroup>
            </select>

            <input
              type="text"
              placeholder="Search description, note, amount..."
              className="form-control"
              style={{ width: "220px", padding: "6px 12px", fontSize: "12px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LIST / TABLE VIEW */}
        {viewMode === "list" && (
          <div className="table-responsive">
            <table className="custom-table">
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
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                      No matching transactions found in this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isExp = item.txnType === "expense";
                    const expPct = isExp ? getExpensePercentage(item.amount) : null;
                    return (
                      <tr key={`${item.txnType}-${item.id}`}>
                        <td style={{ whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
                          {item.date}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: isExp ? "var(--danger-bg)" : "var(--success-bg)",
                              color: isExp ? "var(--danger)" : "var(--success)",
                            }}
                          >
                            {isExp ? "Expense" : "Income"}
                          </span>
                        </td>
                        <td>
                          {isExp ? (
                            <span className={`badge badge-${item.category}`}>
                              {item.category.toUpperCase()}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                              {item.source.replace("_", " ").toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-main)", maxWidth: "260px" }}>
                          <span>{item.note || "—"}</span>
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
                                <span style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "2px" }}>
                                  ₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--danger)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                                -₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            )
                          ) : (
                            <span style={{ color: "var(--success)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                              +₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "4px" }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: "4px 8px" }}
                              title="Edit transaction"
                              onClick={() => onOpenEditModal(item)}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: "4px 8px", color: "var(--danger)" }}
                              disabled={busyId === item.id}
                              onClick={() => handleDelete(item)}
                              title="Delete transaction"
                            >
                              <Trash2 size={12} />
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

        {/* DAILY BREAKDOWN TIMELINE VIEW */}
        {viewMode === "daily" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Calendar size={15} style={{ color: "var(--text-muted)" }} />
                        <strong style={{ fontSize: "13.5px", color: "var(--text-main)" }}>{dayDate}</strong>
                        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                          ({dayItems.length} records)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        {dayIncomeSum > 0 && (
                          <span style={{ color: "var(--success)", fontWeight: "600", fontSize: "12px" }}>
                            +₹{money.format(dayIncomeSum)}
                          </span>
                        )}
                        <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                          Spent: {percentMode ? `-${daySpentPct}% of allocation` : `-₹${money.format(dayExpenseSum)}`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                      {dayItems.map((item) => {
                        const isExp = item.txnType === "expense";
                        const itemPct = isExp ? getExpensePercentage(item.amount) : null;
                        return (
                          <div key={`${item.txnType}-${item.id}`} className="daily-sub-item">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className={`badge ${isExp ? `badge-${item.category}` : ""}`} style={!isExp ? { background: "var(--info-bg)", color: "var(--info)" } : {}}>
                                {(item.category || item.source).toUpperCase()}
                              </span>
                              <span style={{ fontSize: "13px", color: "var(--text-main)" }}>
                                {item.note || "No note recorded"}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {isExp ? (
                                <span style={{ color: "var(--danger)", fontWeight: "600", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}>
                                  {percentMode ? `-${itemPct}% of budget` : `-₹${money.format(item.amount)}`}
                                </span>
                              ) : (
                                <span style={{ color: "var(--success)", fontWeight: "600", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}>
                                  +₹{money.format(item.amount)}
                                </span>
                              )}
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: "2px 6px" }}
                                onClick={() => onOpenEditModal(item)}
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: "2px 6px", color: "var(--danger)" }}
                                onClick={() => handleDelete(item)}
                              >
                                <Trash2 size={11} />
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
