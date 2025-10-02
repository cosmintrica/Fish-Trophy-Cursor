import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  fallback = <div>Acces restricționat</div>
}) => {
  const { user } = useAuth();

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AdminRoute;
