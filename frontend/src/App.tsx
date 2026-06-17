import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SnapshotsPage from './pages/SnapshotsPage';
import SnapshotDetailPage from './pages/SnapshotDetailPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ExplorePage from './pages/ExplorePage';

function AppInit({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuth();
  useEffect(() => { fetchMe(); }, []);
  return <>{children}</>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return <div className="flex items-center justify-center h-screen text-gray-500 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/snapshots" element={<PrivateRoute><SnapshotsPage /></PrivateRoute>} />
          <Route path="/snapshots/:id" element={<PrivateRoute><SnapshotDetailPage /></PrivateRoute>} />
          <Route path="/sessions" element={<PrivateRoute><SessionsPage /></PrivateRoute>} />
          <Route path="/sessions/:id" element={<PrivateRoute><SessionDetailPage /></PrivateRoute>} />
          <Route path="/explore" element={<PrivateRoute><ExplorePage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppInit>
    </BrowserRouter>
  );
}
