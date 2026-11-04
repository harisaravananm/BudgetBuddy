import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry || original?.url?.includes("/auth/refresh/")) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      refreshPromise ||= api.post("/api/auth/refresh/");
      const response = await refreshPromise;
      refreshPromise = null;
      setAccessToken(response.data.access);
      original.headers.Authorization = `Bearer ${response.data.access}`;
      return api(original);
    } catch (refreshError) {
      refreshPromise = null;
      clearAccessToken();
      window.location.assign("/login");
      return Promise.reject(refreshError);
    }
  },
);

export async function apiRequest(path, options = {}) {
  const response = await api.request({ url: path, ...options, data: options.body });
  return response.data;
}

export const authApi = {
  login: (email, password) => apiRequest("/api/auth/login/", { method: "POST", body: { email, password } }),
  register: (email, password, full_name) => apiRequest("/api/auth/register/", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password, full_name: full_name.trim() },
  }),
  refresh: () => apiRequest("/api/auth/refresh/", { method: "POST" }),
  oauthExchange: (provider, code, redirect_uri) => apiRequest(`/api/auth/${provider}/`, { method: "POST", body: { code, redirect_uri } }),
  getMe: () => apiRequest("/api/auth/me/"),
  logout: () => apiRequest("/api/auth/logout/", { method: "POST" }),
  updateProfile: (profileData, role = null) => apiRequest("/api/auth/me/", { method: "PATCH", body: { profile: profileData, ...(role ? { role } : {}) } }),
  upgradeRole: (role) => apiRequest("/api/auth/upgrade/", { method: "POST", body: { role } }),
  getAdminUsers: () => apiRequest("/api/auth/admin/users/"),
};

const resource = (name) => ({
  [`get${name}`]: (params = "") => apiRequest(`/api/finance/${name.toLowerCase()}/${params}`),
});

export const financeApi = {
  getIncomes: (params = "") => apiRequest(`/api/finance/incomes/${params}`),
  createIncome: (data) => apiRequest("/api/finance/incomes/", { method: "POST", body: data }),
  updateIncome: (id, data) => apiRequest(`/api/finance/incomes/${id}/`, { method: "PATCH", body: data }),
  deleteIncome: (id) => apiRequest(`/api/finance/incomes/${id}/`, { method: "DELETE" }),
  getExpenses: (params = "") => apiRequest(`/api/finance/expenses/${params}`),
  createExpense: (data) => apiRequest("/api/finance/expenses/", { method: "POST", body: data }),
  updateExpense: (id, data) => apiRequest(`/api/finance/expenses/${id}/`, { method: "PATCH", body: data }),
  deleteExpense: (id) => apiRequest(`/api/finance/expenses/${id}/`, { method: "DELETE" }),
  getBudgets: (params = "") => apiRequest(`/api/finance/budgets/${params}`),
  createBudget: (data) => apiRequest("/api/finance/budgets/", { method: "POST", body: data }),
  updateBudget: (id, data) => apiRequest(`/api/finance/budgets/${id}/`, { method: "PATCH", body: data }),
  deleteBudget: (id) => apiRequest(`/api/finance/budgets/${id}/`, { method: "DELETE" }),
  getGoals: () => apiRequest("/api/finance/goals/"),
  createGoal: (data) => apiRequest("/api/finance/goals/", { method: "POST", body: data }),
  depositGoal: (id, amount) => apiRequest(`/api/finance/goals/${id}/contribute/`, { method: "POST", body: { amount, date: new Date().toISOString().slice(0, 10) } }),
  withdrawGoal: (id, amount) => apiRequest(`/api/finance/goals/${id}/withdraw/`, { method: "POST", body: { amount } }),
  deleteGoal: (id) => apiRequest(`/api/finance/goals/${id}/`, { method: "DELETE" }),
  getAnalytics: (month = "") => apiRequest(`/api/finance/analytics/${month ? `?month=${month}` : ""}`),
  getDashboardSummary: () => apiRequest("/api/dashboard/summary/"),
};

export const notificationsApi = {
  getNotifications: (params = "") => apiRequest(`/api/notifications/${params}`),
  getUnreadCount: () => apiRequest("/api/notifications/unread-count/"),
  markRead: (id) => apiRequest(`/api/notifications/${id}/read/`, { method: "PATCH" }),
  markAllRead: () => apiRequest("/api/notifications/mark_all_read/", { method: "POST" }),
  deleteNotification: (id) => apiRequest(`/api/notifications/${id}/`, { method: "DELETE" }),
  triggerTestAlert: (type, title, message) => apiRequest("/api/notifications/trigger_test_alert/", { method: "POST", body: { type, title, message } }),
  getSettings: () => apiRequest("/api/notifications/settings/"),
  updateSettings: (data) => apiRequest("/api/notifications/settings/", { method: "PATCH", body: data }),
  sendTestEmail: (email = "") => apiRequest("/api/notifications/send-test-email/", { method: "POST", body: { email } }),
};

export const reportsApi = {
  getSummary: (month = "") => apiRequest(`/api/reports/summary/${month ? `?month=${month}` : ""}`),
  getCsvUrl: (month = "") => `${API_URL}/api/reports/export-csv/${month ? `?month=${month}` : ""}`,
  getExcelUrl: (month = "") => `${API_URL}/api/reports/export-excel/${month ? `?month=${month}` : ""}`,
  getPdfUrl: (month = "") => `${API_URL}/api/reports/export-pdf/${month ? `?month=${month}` : ""}`,
  generate: (data) => apiRequest("/api/reports/generate/", { method: "POST", body: data }),
  history: () => apiRequest("/api/reports/history/"),
};
