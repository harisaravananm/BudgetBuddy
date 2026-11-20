import { StrictMode } from "react";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useSearchParams, useParams } from "react-router-dom";
import App, { AuthView } from "./App";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
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
      setError("OAuth verification failed. Please try again.");
      sessionStorage.removeItem("budgetbuddy_oauth_state");
      return;
    }
    sessionStorage.removeItem("budgetbuddy_oauth_state");
    const code = params.get("code");
    import("./api").then(({ authApi, setAccessToken }) => {
      return authApi.oauthExchange(provider, code, `${window.location.origin}/auth/callback/${provider}`);
    }).then((tokens) => {
      setAccessToken(tokens.access);
      return import("./api").then(({ authApi }) => authApi.getMe());
    }).then(setUser).then(() => navigate("/", { replace: true })).catch(() => setError("Unable to complete OAuth sign in."));
  }, [navigate, params, provider, setUser]);
  return (
    <div className="auth-loading">
      {error ? (
        <p>
          {error}{" "}
          <a href="/login">Retry sign in</a>
        </p>
      ) : "Completing sign in..."}
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
