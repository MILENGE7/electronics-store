import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap admin-only pages: <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  // Wait for AuthContext's server-confirmed /auth/me check before gating —
  // the cached `user.role` it starts with is just localStorage JSON a user
  // can hand-edit, and rendering admin-only content (and firing its data
  // requests) off that alone would leak admin UI/data shape before any
  // request came back 403.
  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" replace />;

  return children;
}

// Wrap customer-facing/shopping pages (Home, product pages, cart, checkout,
// orders, wishlist, compare, notifications) so a logged-in admin — whose job
// is managing the store, not shopping in it — is sent to /admin instead.
// Does NOT require login: anonymous visitors and customers pass straight
// through unaffected.
export function CustomerRoute({ children }) {
  const { user } = useAuth();

  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;

  return children;
}
