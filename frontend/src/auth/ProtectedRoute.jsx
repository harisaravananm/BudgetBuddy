import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-loading">Loading BudgetBuddy workspace...</div>;
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
