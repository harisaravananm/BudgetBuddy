import React, { useState } from "react";
import { financeApi } from "../api";

export default function TransactionsTab({
  expenses,
  incomes,
  onRefresh,
  onOpenAddModal,
}) {
  const [filterType, setFilterType] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState(null);

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
      if (!matchNote && !matchAmount) return false;
    }
    return true;
  });

  async function handleDelete(item) {
    if (!window.confirm("Are you sure you want to delete this transaction record?")) return;
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

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>All Financial Transactions</h3>
            <p>Track your student pocket money, stipends, and day-to-day spending</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-primary" onClick={onOpenAddModal}>
              + Record Transaction
            </button>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
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
              Incomes ({incomes.length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px", marginLeft: "auto", flexWrap: "wrap" }}>
            <select
              className="form-control"
              style={{ width: "auto", padding: "6px 12px", fontSize: "12px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories / Sources</option>
              <optgroup label="Expenses">
                <option value="food">🍔 Food</option>
                <option value="travel">✈️ Travel</option>
                <option value="shopping">🛍️ Shopping</option>
                <option value="education">📚 Education</option>
                <option value="entertainment">🎬 Entertainment</option>
                <option value="misc">📦 Misc</option>
              </optgroup>
              <optgroup label="Incomes">
                <option value="pocket_money">👛 Pocket Money</option>
                <option value="scholarship">🎓 Scholarship</option>
                <option value="freelance">💻 Freelance</option>
                <option value="other">💵 Other</option>
              </optgroup>
            </select>

            <input
              type="text"
              placeholder="Search description / amount..."
              className="form-control"
              style={{ width: "220px", padding: "6px 12px", fontSize: "12px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category / Source</th>
                <th>Description</th>
                <th>Amount</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isExp = item.txnType === "expense";
                  return (
                    <tr key={`${item.txnType}-${item.id}`}>
                      <td>{item.date}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: isExp ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: isExp ? "#f87171" : "#34d399",
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
                          <span className="badge" style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee" }}>
                            {item.source.replace("_", " ").toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{item.note || "—"}</td>
                      <td
                        style={{
                          color: isExp ? "var(--danger)" : "var(--success)",
                          fontWeight: "700",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {isExp ? "-" : "+"}₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--danger)" }}
                          disabled={busyId === item.id}
                          onClick={() => handleDelete(item)}
                        >
                          Delete ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
