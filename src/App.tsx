import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from '@/components/layout/AppLayout';

// Page Imports
import { LoginPage } from '@/pages/LoginPage';
import { POSPage } from '@/pages/POSPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MenuManagerPage } from '@/pages/MenuManagerPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { PurchasePage } from '@/pages/PurchasePage';
import { ExpensePage } from '@/pages/ExpensePage';
import { DayClosePage } from '@/pages/DayClosePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

// Protected Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Redirect "/" based on user role
function RootRedirect() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'CASHIER') {
    return <Navigate to="/pos" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '13px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Routes inside AppLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Index Route redirect */}
          <Route index element={<RootRedirect />} />

          {/* Module Pages */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="menu" element={<MenuManagerPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="purchases" element={<PurchasePage />} />
          <Route path="expenses" element={<ExpensePage />} />
          <Route path="day-close" element={<DayClosePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all Wildcard Route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </TooltipProvider>
  );
}
