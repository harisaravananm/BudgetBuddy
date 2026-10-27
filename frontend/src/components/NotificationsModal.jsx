import React, { useState } from "react";
import { notificationsApi } from "../api";

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onRefresh,
}) {
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markRead(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTriggerTestTip() {
    setBusy(true);
    try {
      await notificationsApi.triggerTestAlert(
        "savings_reminder",
        "Student Money Habit 💡",
        "Tip: Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings. Check your active goals today!"
      );
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case "overspend":
        return { bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", icon: "🚨" };
      case "budget_alert":
        return { bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", icon: "⚠️" };
      case "goal_milestone":
        return { bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", icon: "🎯" };
      default:
        return { bg: "rgba(99, 102, 241, 0.15)", color: "#818cf8", icon: "🔔" };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: "560px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>Notifications & Alerts</h3>
            {unreadCount > 0 && (
              <span className="nav-badge">{unreadCount} new</span>
            )}
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.15)" }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={busy || unreadCount === 0}
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={handleTriggerTestTip}
          >
            + Test Alert Tip
          </button>
        </div>

        <div
          className="modal-body"
          style={{ maxHeight: "420px", overflowY: "auto", gap: "10px" }}
        >
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "28px", marginBottom: "8px" }}>✨</p>
              <p>You have no notifications right now.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const meta = getTypeStyle(item.type);
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    background: item.is_read
                      ? "rgba(255, 255, 255, 0.02)"
                      : "rgba(99, 102, 241, 0.06)",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "var(--radius-sm)",
                      background: meta.bg,
                      color: meta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: item.is_read ? "600" : "700",
                          color: item.is_read ? "var(--text-main)" : "#fff",
                        }}
                      >
                        {item.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {item.message}
                    </p>
                    {!item.is_read && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        style={{
                          marginTop: "8px",
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Mark as read ✓
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
