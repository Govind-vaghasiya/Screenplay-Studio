// Protected route wrapper — redirects to landing page if not authenticated
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { IconLoader } from '@/components/common/Icons';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'var(--color-bg-base)',
      }}>
        <IconLoader size={32} color="var(--color-accent-400)" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
