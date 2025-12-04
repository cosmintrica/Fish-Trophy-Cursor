import React from 'react';
import { useAdmin } from '@/hooks/useAdmin';

interface AdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  fallback = <div>Acces restricționat</div>
}) => {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return <div>Se verifică permisiunile...</div>;
  }

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AdminRoute;
