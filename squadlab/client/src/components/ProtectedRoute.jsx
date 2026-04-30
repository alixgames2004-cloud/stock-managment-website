import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLab } from '../context/LabContext';
import Spinner from './ui/Spinner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isInitializing } = useAuth();
  const { lab } = useLab();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/${lab}/login`} state={{ from: location }} replace />;
  }

  if (user && !user.isApproved) {
    return <Navigate to={`/${lab}/waiting`} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${lab}/unauthorized`} replace />;
  }

  return children;
};

export default ProtectedRoute;
