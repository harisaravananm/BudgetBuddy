const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("budgetbuddy_access");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  // Handle file or non-json responses if requested
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/csv") || contentType.includes("application/vnd.ms-excel")) {
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let msg = "Request failed.";
    if (typeof data === "object") {
      msg = Object.entries(data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ");
    }
    throw new Error(msg || `Error ${response.status}`);
  }

  return data;
}

export const authApi = {
  login: (email, password) =>
    apiRequest("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email, password, full_name) =>
    apiRequest("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }),
  oauthLogin: (provider, email, name) =>
    apiRequest("/api/auth/oauth/", {
      method: "POST",
      body: JSON.stringify({ provider, email, name }),
    }),
  getMe: () => apiRequest("/api/auth/me/"),
  updateProfile: (profileData, role = null) =>
    apiRequest("/api/auth/me/", {
      method: "PATCH",
      body: JSON.stringify({
        profile: profileData,
        ...(role ? { role } : {}),
      }),
    }),
  upgradeRole: (role) =>
    apiRequest("/api/auth/upgrade/", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  getAdminUsers: () => apiRequest("/api/auth/admin/users/"),
};

export const financeApi = {
  getIncomes: (params = "") => apiRequest(`/api/finance/incomes/${params}`),
  createIncome: (data) =>
    apiRequest("/api/finance/incomes/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteIncome: (id) =>
    apiRequest(`/api/finance/incomes/${id}/`, { method: "DELETE" }),

  getExpenses: (params = "") => apiRequest(`/api/finance/expenses/${params}`),
  createExpense: (data) =>
    apiRequest("/api/finance/expenses/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteExpense: (id) =>
    apiRequest(`/api/finance/expenses/${id}/`, { method: "DELETE" }),

  getBudgets: (params = "") => apiRequest(`/api/finance/budgets/${params}`),
  createBudget: (data) =>
    apiRequest("/api/finance/budgets/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteBudget: (id) =>
    apiRequest(`/api/finance/budgets/${id}/`, { method: "DELETE" }),

  getGoals: () => apiRequest("/api/finance/goals/"),
  createGoal: (data) =>
    apiRequest("/api/finance/goals/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  depositGoal: (id, amount) =>
    apiRequest(`/api/finance/goals/${id}/deposit/`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  withdrawGoal: (id, amount) =>
    apiRequest(`/api/finance/goals/${id}/withdraw/`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  deleteGoal: (id) =>
    apiRequest(`/api/finance/goals/${id}/`, { method: "DELETE" }),

  getAnalytics: (month = "") =>
    apiRequest(`/api/finance/analytics/${month ? `?month=${month}` : ""}`),
};

export const notificationsApi = {
  getNotifications: () => apiRequest("/api/notifications/"),
  markRead: (id) =>
    apiRequest(`/api/notifications/${id}/mark_read/`, { method: "POST" }),
  markAllRead: () =>
    apiRequest("/api/notifications/mark_all_read/", { method: "POST" }),
  deleteNotification: (id) =>
    apiRequest(`/api/notifications/${id}/`, { method: "DELETE" }),
  triggerTestAlert: (type, title, message) =>
    apiRequest("/api/notifications/trigger_test_alert/", {
      method: "POST",
      body: JSON.stringify({ type, title, message }),
    }),
};

export const reportsApi = {
  getSummary: (month = "") =>
    apiRequest(`/api/reports/summary/${month ? `?month=${month}` : ""}`),
  getCsvUrl: (month = "") =>
    `${API_URL}/api/reports/export-csv/${month ? `?month=${month}` : ""}`,
  getExcelUrl: (month = "") =>
    `${API_URL}/api/reports/export-excel/${month ? `?month=${month}` : ""}`,
  getPdfUrl: (month = "") =>
    `${API_URL}/api/reports/export-pdf/${month ? `?month=${month}` : ""}`,
};
