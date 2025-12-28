import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { PairAnalysis } from './pages/PairAnalysis';
import { Performance } from './pages/Performance';
import { RiskCalculator } from './pages/Calculator';
import { Alerts } from './pages/Alerts';
import { Subscription } from './pages/Subscription';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { ProInsights } from './pages/ProInsights';
import { Loader2 } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false, premiumOnly = false }) => {
  const { isAuthenticated, loading, isAdmin, isPremium } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen luxury-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (premiumOnly && !isPremium && !isAdmin) {
    return <Navigate to="/subscription" replace />;
  }

  return children;
};

// Public Route - redirect to dashboard if authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen luxury-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Router with Auth Check
function AppRouter() {
  const location = useLocation();
  
  // Handle OAuth callback - check for session_id in hash
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/analysis/:pair" element={<ProtectedRoute><PairAnalysis /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
      <Route path="/calculator" element={<ProtectedRoute><RiskCalculator /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="/subscription/success" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* Premium Routes */}
      <Route path="/insights" element={<ProtectedRoute premiumOnly><ProInsights /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
