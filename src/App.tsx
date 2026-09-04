import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Visualization from '@/pages/Visualization';
import Chatbot from '@/pages/Chatbot';
import OnboardingTour from '@/components/OnboardingTour';

function AppRoutes() {
  const { session } = useAuth();
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    if (!session) return;
    const seen = localStorage.getItem('patentscope_onboarding_complete');
    if (!seen) {
      const timer = setTimeout(() => setTourActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [session]);

  function closeTour() {
    setTourActive(false);
    localStorage.setItem('patentscope_onboarding_complete', 'true');
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visualization"
          element={
            <ProtectedRoute>
              <Layout>
                <Visualization />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedRoute>
              <Layout>
                <Chatbot />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      {tourActive && session && <OnboardingTour onClose={closeTour} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
