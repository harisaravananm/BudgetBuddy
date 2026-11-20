import React, { useState } from "react";
import { financeApi } from "../api";

export default function TransactionModal({ isOpen, onClose, onSuccess }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [source, setSource] = useState("pocket_money");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setBusy(true);
    try {
      if (type === "expense") {
        await financeApi.createExpense({ category, amount, date, note });
      } else {
        await financeApi.createIncome({ source, amount, date, note });
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
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Transaction</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                className={`btn ${type === "expense" ? "btn-danger" : "btn-outline"}`}
                onClick={() => setType("expense")}
              >
                💸 Expense
              </button>
              <button
                type="button"
                className={`btn ${type === "income" ? "btn-success" : "btn-outline"}`}
                onClick={() => setType("income")}
              >
                💰 Income
              </button>
            </div>

            {type === "expense" ? (
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="food">🍔 Food & Dining</option>
                  <option value="travel">✈️ Travel & Transit</option>
                  <option value="shopping">🛍️ Shopping & Supplies</option>
                  <option value="education">📚 Education & Books</option>
                  <option value="entertainment">🎬 Entertainment</option>
                  <option value="misc">📦 Miscellaneous</option>
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
                  <option value="pocket_money">👛 Pocket Money</option>
                  <option value="scholarship">🎓 Scholarship / Stipend</option>
                  <option value="freelance">💻 Freelance / Projects</option>
                  <option value="other">💵 Other Sources</option>
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
                className="form-control"
                placeholder="e.g. 450.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Note / Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Campus cafeteria lunch"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`btn ${type === "expense" ? "btn-primary" : "btn-success"}`}>
              {busy ? "Saving..." : `Save ${type === "expense" ? "Expense" : "Income"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
