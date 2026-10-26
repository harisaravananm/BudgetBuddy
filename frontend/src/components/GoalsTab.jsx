import React, { useEffect, useState } from "react";
import { financeApi } from "../api";

export default function GoalsTab({ goals, onRefresh, activeGoalToDeposit, onClearActiveGoal }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [depositGoal, setDepositGoal] = useState(activeGoalToDeposit || null);
  const [withdrawGoal, setWithdrawGoal] = useState(null);

  // New Goal State
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("0");
  const [deadline, setDeadline] = useState("");

  // Action Amount State
  const [actionAmount, setActionAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeGoalToDeposit) {
      setDepositGoal(activeGoalToDeposit);
    }
  }, [activeGoalToDeposit]);

  async function handleCreateGoal(e) {
    e.preventDefault();
    setError("");
    if (!name || !targetAmount || parseFloat(targetAmount) <= 0) {
      setError("Please specify a goal name and valid target amount.");
      return;
    }
    setBusy(true);
    try {
      await financeApi.createGoal({
        name,
        target_amount: targetAmount,
        saved_amount: savedAmount || "0",
        deadline: deadline || null,
      });
      setShowAddModal(false);
      setName("");
      setTargetAmount("");
      setSavedAmount("0");
      setDeadline("");
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeposit(e) {
    e.preventDefault();
    setError("");
    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError("Please specify a positive amount to deposit.");
      return;
    }
    setBusy(true);
    try {
      await financeApi.depositGoal(depositGoal.id, actionAmount);
      setDepositGoal(null);
      if (onClearActiveGoal) onClearActiveGoal();
      setActionAmount("");
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    setError("");
    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError("Please specify a positive amount to withdraw.");
      return;
    }
    setBusy(true);
    try {
      await financeApi.withdrawGoal(withdrawGoal.id, actionAmount);
      setWithdrawGoal(null);
      setActionAmount("");
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteGoal(id) {
    if (!window.confirm("Are you sure you want to remove this savings goal?")) return;
    try {
      await financeApi.deleteGoal(id);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalSaved = goals.reduce((acc, g) => acc + parseFloat(g.saved_amount), 0);
  const totalTarget = goals.reduce((acc, g) => acc + parseFloat(g.target_amount), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div>
      {/* SUMMARY BANNER */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Saved in Goals</span>
            <span style={{ fontSize: "20px" }}>🏦</span>
          </div>
          <div className="stat-card-value" style={{ color: "var(--success)" }}>
            ₹{totalSaved.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>Aggregated across {goals.length} target funds</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Overall Goals Target</span>
            <span style={{ fontSize: "20px" }}>🎯</span>
          </div>
          <div className="stat-card-value" style={{ color: "var(--info)" }}>
            ₹{totalTarget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">
            <span>Remaining to save: ₹{(totalTarget - totalSaved).toLocaleString("en-IN")}</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Aggregate Completion</span>
            <span style={{ fontSize: "20px" }}>🚀</span>
          </div>
          <div className="stat-card-value" style={{ color: "var(--primary)" }}>
            {overallProgress}%
          </div>
          <div className="stat-card-sub">
            <span>{goals.filter((g) => g.status === "completed").length} goals fully achieved</span>
          </div>
        </article>
      </div>

      {/* GOALS PANEL */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Savings Goals & Sinking Funds</h3>
            <p>Save for laptops, semester trips, certifications, and emergency funds</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Create New Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>🎯</p>
            <p>No savings goals set up yet. Click "+ Create New Goal" to begin your journey!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
            {goals.map((g) => {
              const isDone = g.status === "completed" || g.progress_percent >= 100;
              return (
                <div
                  key={g.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${isDone ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "16px", fontWeight: "700" }}>{g.name}</h4>
                      {g.deadline && (
                        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                          Target Date: {g.deadline}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {isDone && (
                        <span className="badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                          Achieved! 🎉
                        </span>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: "var(--text-dim)", padding: "2px 8px" }}
                        onClick={() => handleDeleteGoal(g.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                      <span style={{ fontSize: "24px", fontWeight: "800", fontFamily: "var(--font-mono)", color: isDone ? "var(--success)" : "var(--text-main)" }}>
                        ₹{parseFloat(g.saved_amount).toLocaleString("en-IN")}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        of ₹{parseFloat(g.target_amount).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="bar-track" style={{ height: "12px" }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, g.progress_percent)}%`,
                          background: isDone
                            ? "var(--success)"
                            : "linear-gradient(90deg, #6366f1, #06b6d4)",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-dim)", marginTop: "6px" }}>
                      <strong>{g.progress_percent}% Funded</strong>
                      <span>Remaining: ₹{Math.max(0, parseFloat(g.target_amount) - parseFloat(g.saved_amount)).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "8px" }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setDepositGoal(g)}
                    >
                      💰 Deposit Funds
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={parseFloat(g.saved_amount) <= 0}
                      onClick={() => setWithdrawGoal(g)}
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE GOAL MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Savings Goal</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateGoal}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Goal Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. New Laptop Fund, Japan Trip, Semester Fees"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-control"
                    placeholder="e.g. 60000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Initial Saved Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={savedAmount}
                    onChange={(e) => setSavedAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Target Deadline (Optional)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-primary">
                  {busy ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT MODAL */}
      {depositGoal && (
        <div className="modal-overlay" onClick={() => { setDepositGoal(null); if (onClearActiveGoal) onClearActiveGoal(); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Deposit into {depositGoal.name}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => { setDepositGoal(null); if (onClearActiveGoal) onClearActiveGoal(); }}>✕</button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="modal-body">
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Current balance: <strong>₹{parseFloat(depositGoal.saved_amount).toLocaleString("en-IN")}</strong> / ₹{parseFloat(depositGoal.target_amount).toLocaleString("en-IN")}
                </p>
                <div className="form-group">
                  <label>Deposit Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-control"
                    placeholder="e.g. 2000"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                  />
                </div>
                {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => { setDepositGoal(null); if (onClearActiveGoal) onClearActiveGoal(); }}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-success">
                  {busy ? "Processing..." : "Confirm Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {withdrawGoal && (
        <div className="modal-overlay" onClick={() => setWithdrawGoal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdraw from {withdrawGoal.name}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setWithdrawGoal(null)}>✕</button>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className="modal-body">
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Available in fund: <strong>₹{parseFloat(withdrawGoal.saved_amount).toLocaleString("en-IN")}</strong>
                </p>
                <div className="form-group">
                  <label>Withdrawal Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={withdrawGoal.saved_amount}
                    required
                    className="form-control"
                    placeholder="e.g. 1000"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                  />
                </div>
                {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setWithdrawGoal(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-danger">
                  {busy ? "Processing..." : "Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
