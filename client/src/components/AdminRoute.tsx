import React from 'react';
import { useAuth } from '@/lib/auth';
import BlackSeaComingSoon from '@/pages/BlackSeaComingSoon';

interface AdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  fallback = <BlackSeaComingSoon /> 
}) => {
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.email === 'cosmin.trica@outlook.com';
  
  if (!isAdmin) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

export default AdminRoute;
