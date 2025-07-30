import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Toaster } from 'sonner';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';
import CustomersPage from '@/pages/CustomersPage';
import QuotesPage from '@/pages/QuotesPage';
import UsersPage from '@/pages/UsersPage';
import ImportPage from '@/pages/ImportPage';
import SystemPage from '@/pages/SystemPage';
import ColorOptionsPage from '@/pages/ColorOptionsPage';
import BoxMaterialsPage from '@/pages/BoxMaterialsPage';
import PricingPage from '@/pages/PricingPage';

// Layout
import AdminLayout from '@/components/layout/AdminLayout';
import LoadingSpinner from '@/components/LoadingSpinner';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/quotes" element={<QuotesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/system" element={<SystemPage />} />
                  <Route path="/color-options" element={<ColorOptionsPage />} />
                  <Route path="/box-materials" element={<BoxMaterialsPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

export default App;