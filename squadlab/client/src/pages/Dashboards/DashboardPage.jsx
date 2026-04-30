import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import SupervisorDashboard from './SupervisorDashboard';
import StudentDashboard from './StudentDashboard';
import Spinner from '../../components/ui/Spinner';

const DashboardPage = () => {
  const { user, isInitializing } = useAuth();

  if (isInitializing || !user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    );
  }

  if (user.role === 'LAB_ADMIN') return <AdminDashboard />;
  if (user.role === 'SUPERVISOR') return <SupervisorDashboard />;
  // STUDENT or any other approved role → student view
  return <StudentDashboard />;
};

export default DashboardPage;
