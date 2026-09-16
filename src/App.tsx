// Main app component with routing
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ToastContainer } from '@/components/common/Toast';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ScriptEditorPage } from '@/pages/ScriptEditorPage';
import { BreakdownPage } from '@/pages/BreakdownPage';
import { ShotListPage } from '@/pages/ShotListPage';

function NavigateToScript() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/project/${projectId}/script/default-script`} replace />;
}

function NavigateToShots() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/project/${projectId}/shots/scene-1`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<LandingPage />} />

          {/* Protected routes with sidebar layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/project/:projectId" element={<NavigateToScript />} />
            <Route path="/project/:projectId/breakdown" element={<BreakdownPage />} />
            <Route path="/project/:projectId/shots" element={<NavigateToShots />} />
            <Route path="/project/:projectId/shots/:sceneId" element={<ShotListPage />} />
          </Route>

          {/* Fullscreen Screenwriting Studio */}
          <Route
            path="/project/:projectId/script/:scriptId"
            element={
              <ProtectedRoute>
                <ScriptEditorPage />
              </ProtectedRoute>
            }
          />
        </Routes>

        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}
