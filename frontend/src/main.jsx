import { StrictMode } from "react";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useSearchParams, useParams } from "react-router-dom";
import App, { AuthView } from "./App";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import { authApi, setAccessToken } from "./api";
import "./styles.css";

function LoginPage() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <AuthView />;
}

function OAuthCallback() {
  const { provider } = useParams();
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const expected = sessionStorage.getItem("budgetbuddy_oauth_state");
    const state = params.get("state");
    if (!expected || !state || expected !== state) {
      setError("OAuth security verification failed. Please try signing in again.");
      sessionStorage.removeItem("budgetbuddy_oauth_state");
      return;
    }
    sessionStorage.removeItem("budgetbuddy_oauth_state");
    const code = params.get("code");
    if (!code) {
      setError("No authorization code received from provider.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
    authApi
      .oauthExchange(provider, code, redirectUri)
      .then((tokens) => {
        if (tokens.access) setAccessToken(tokens.access);
        return authApi.getMe();
      })
      .then(setUser)
      .then(() => navigate("/", { replace: true }))
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || "Unable to complete OAuth sign in.";
        setError(msg);
      });
  }, [navigate, params, provider, setUser]);

  const providerLabel = provider === "github" ? "GitHub" : provider === "google" ? "Google" : "OAuth";

  return (
    <div className="auth-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="auth-box" style={{ maxWidth: "420px", textAlign: "center", padding: "32px 24px" }}>
        {error ? (
          <div>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ fontSize: "18px", color: "var(--danger)", marginBottom: "8px" }}>Sign In Failed</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>{error}</p>
            <a href="/login" className="btn btn-primary btn-sm" style={{ textDecoration: "none", display: "inline-block" }}>
              Back to Sign In
            </a>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "36px", marginBottom: "12px", animation: "spin 1.5s linear infinite" }}>🔄</div>
            <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>Authenticating with {providerLabel}...</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Securely setting up your student workspace session.</p>
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallback />} />
          <Route path="/overview" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="*" element={<ProtectedRoute><App /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
