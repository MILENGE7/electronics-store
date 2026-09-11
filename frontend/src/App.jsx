import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute, { CustomerRoute } from "./components/ProtectedRoute";
import ComparisonBar from "./components/ComparisonBar";
import AdminLayout from "./components/admin/AdminLayout";

const Home = lazy(() => import("./pages/Home"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Compare = lazy(() => import("./pages/Compare"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Account = lazy(() => import("./pages/Account"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Notifications = lazy(() => import("./pages/Notifications"));

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminSecurity = lazy(() => import("./pages/admin/Security"));

function Loading() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
      fontSize: "18px"
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />

      <main>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
            <Route path="/products/:id" element={<CustomerRoute><ProductDetail /></CustomerRoute>} />
            <Route path="/compare" element={<CustomerRoute><Compare /></CustomerRoute>} />
            <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/checkout"
              element={
                <CustomerRoute>
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                </CustomerRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <CustomerRoute>
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                </CustomerRoute>
              }
            />

            <Route
              path="/orders/:id"
              element={
                <CustomerRoute>
                  <ProtectedRoute>
                    <OrderDetail />
                  </ProtectedRoute>
                </CustomerRoute>
              }
            />

            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wishlist"
              element={
                <CustomerRoute>
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                </CustomerRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <CustomerRoute>
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                </CustomerRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout>
                    <Dashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/products"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout>
                    <AdminProducts />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout>
                    <AdminCategories />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout>
                    <AdminOrders />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/security"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout>
                    <AdminSecurity />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>

      <ComparisonBar />
    </>
  );
}
