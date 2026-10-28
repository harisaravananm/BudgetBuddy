import React, { useEffect, useState } from "react";
import { financeApi } from "../api";

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  editItem = null,
  totalIncome = 0,
  budgetLimit = 0,
}) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [source, setSource] = useState("pocket_money");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editItem) {
      setType(editItem.txnType || (editItem.category ? "expense" : "income"));
      setAmount(editItem.amount || "");
      if (editItem.category) setCategory(editItem.category);
      if (editItem.source) setSource(editItem.source);
      setDate(editItem.date || new Date().toISOString().split("T")[0]);
      setNote(editItem.note || "");
    } else {
      setType("expense");
      setAmount("");
      setCategory("food");
      setSource("pocket_money");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
    }
    setError("");
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const baseDenominator = budgetLimit > 0 ? budgetLimit : totalIncome > 0 ? totalIncome : 0;
  const impactPercent = baseDenominator > 0 && numAmount > 0 ? ((numAmount / baseDenominator) * 100).toFixed(1) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setBusy(true);
    try {
      if (editItem) {
        if (type === "expense") {
          await financeApi.updateExpense(editItem.id, { category, amount, date, note });
        } else {
          await financeApi.updateIncome(editItem.id, { source, amount, date, note });
        }
      } else {
        if (type === "expense") {
          await financeApi.createExpense({ category, amount, date, note });
        } else {
          await financeApi.createIncome({ source, amount, date, note });
        }
      }
      setAmount("");
      setNote("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-animated" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>{editItem ? "✏️" : "💳"}</span>
            <div>
              <h3>{editItem ? "Edit Transaction" : "Record Financial Transaction"}</h3>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {editItem ? "Update details & re-calculate student budget impact" : "Log pocket money inflows or day-to-day campus expenses"}
              </p>
            </div>
          </div>
          <button className="btn btn-outline btn-sm btn-close-hover" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!editItem && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  className={`btn ${type === "expense" ? "btn-danger active-shadow-danger" : "btn-outline"} btn-interactive`}
                  onClick={() => setType("expense")}
                >
                  💸 Student Expense
                </button>
                <button
                  type="button"
                  className={`btn ${type === "income" ? "btn-success active-shadow-success" : "btn-outline"} btn-interactive`}
                  onClick={() => setType("income")}
                >
                  💰 Pocket Money / Income
                </button>
              </div>
            )}

            {type === "expense" ? (
              <div className="form-group">
                <label>Expense Category (Milestone 2 Specification)</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="food">🍔 Food & Dining</option>
                  <option value="travel">✈️ Travel & Transit</option>
                  <option value="shopping">🛍️ Shopping & Supplies</option>
                  <option value="education">📚 Education & Books</option>
                  <option value="entertainment">🎬 Entertainment & Leisure</option>
                  <option value="misc">📦 Miscellaneous Expenses</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Income Source</label>
                <select
                  className="form-control"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="pocket_money">👛 Pocket Money (Parents/Allowance)</option>
                  <option value="scholarship">🎓 Scholarship / Merit Grant</option>
                  <option value="freelance">💻 Freelance / Internship Stipend</option>
                  <option value="other">💵 Other Inflow Sources</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-control font-mono"
                placeholder="e.g. 450.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* INNOVATION: Real-time Percentage Impact Preview */}
            {type === "expense" && impactPercent !== null && (
              <div
                className="innovation-callout"
                style={{
                  background: parseFloat(impactPercent) > 20
                    ? "rgba(239, 68, 68, 0.12)"
                    : parseFloat(impactPercent) > 10
                    ? "rgba(245, 158, 11, 0.12)"
                    : "rgba(99, 102, 241, 0.12)",
                  border: `1px solid ${
                    parseFloat(impactPercent) > 20
                      ? "rgba(239, 68, 68, 0.3)"
                      : parseFloat(impactPercent) > 10
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(99, 102, 241, 0.3)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>
                  {parseFloat(impactPercent) > 20 ? "⚠️" : "💡"}
                </span>
                <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                  <strong style={{ color: parseFloat(impactPercent) > 20 ? "#f87171" : "#a5b4fc" }}>
                    Relative Spending Impact: {impactPercent}% of monthly allocation
                  </strong>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                    This expense will consume <strong>{impactPercent}%</strong> of your monthly {budgetLimit > 0 ? "budget limit" : "pocket money"}.
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Transaction Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Note / Purpose</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Library books, Hostel mess bill, Metro pass"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn btn-outline btn-interactive" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`btn ${type === "expense" ? "btn-primary" : "btn-success"} btn-interactive`}
            >
              {busy ? "Saving..." : editItem ? "Update Transaction" : `Save ${type === "expense" ? "Expense" : "Income"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
