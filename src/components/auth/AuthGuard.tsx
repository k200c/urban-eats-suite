import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'customer';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: AppRole[];
}

export function AuthGuard({ children, requireAuth = true, allowedRoles }: AuthGuardProps) {
  const { user, role, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role restrictions
  if (allowedRoles && user) {
    const userRole = role || 'customer';
    if (!allowedRoles.includes(userRole)) {
      // Redirect non-admin users to menu
      return <Navigate to="/menu" replace />;
    }
  }

  return <>{children}</>;
}