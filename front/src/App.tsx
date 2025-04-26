import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import CategoriesPage from "./pages/CategoriesPage";
import FlavorsPage from "./pages/FlavorsPage";
import WeightsPage from "./pages/WeightsPage";
import CouponsPage from "./pages/CouponsPage";
import AdminsPage from "./pages/AdminsPage";
import AdminCreatePage from "./pages/AdminCreatePage";
import NotFoundPage from "./pages/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProductDetailPage from "./pages/ProductDetailPage";

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={<LoginPage />}
          errorElement={<ErrorBoundary />}
        />

        {/* Authenticated routes */}
        <Route
          path="/"
          element={<DashboardLayout />}
          errorElement={<ErrorBoundary />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductsPage />} />
          <Route path="products/edit/:id" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/new" element={<CategoriesPage />} />
          <Route path="categories/:id" element={<CategoriesPage />} />

          <Route path="flavors" element={<FlavorsPage />} />
          <Route path="flavors/new" element={<FlavorsPage />} />
          <Route path="flavors/:id" element={<FlavorsPage />} />
          <Route path="weights" element={<WeightsPage />} />
          <Route path="weights/new" element={<WeightsPage />} />
          <Route path="weights/:id" element={<WeightsPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="coupons/new" element={<CouponsPage />} />
          <Route path="coupons/:id" element={<CouponsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="admins/new" element={<AdminCreatePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
};

export default App;
