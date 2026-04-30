import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LabProvider } from './context/LabContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import { Toaster } from 'react-hot-toast';

// Real Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WaitingApprovalPage from './pages/WaitingApprovalPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import StockPage from './pages/Stock/StockPage';
import ComponentDetailPage from './pages/Stock/ComponentDetailPage';
import ProjectsPage from './pages/Projects/ProjectsPage';
import CreateProjectPage from './pages/Projects/CreateProjectPage';
import ProjectDetailPage from './pages/Projects/ProjectDetailPage';
import RefreshPage from './pages/Projects/RefreshPage';
import CloseProjectPage from './pages/Projects/CloseProjectPage';

import DashboardPage from './pages/Dashboards/DashboardPage';
const DischargePage = () => <div><h2 className="text-2xl font-bold text-gray-900">Fiches de Décharge</h2></div>;
const UsersPage = () => <div><h2 className="text-2xl font-bold text-gray-900">Utilisateurs</h2></div>;
const CrossLabViewPage = () => <div><h2 className="text-2xl font-bold text-gray-900">Vue Croisée</h2></div>;

// Lab routes reusable factory
const LabRoutes = ({ lab }) => (
  <>
    <Route path={`/${lab}/login`} element={<LoginPage />} />
    <Route path={`/${lab}/register`} element={<RegisterPage />} />
    <Route path={`/${lab}/waiting`} element={<WaitingApprovalPage />} />
    <Route path={`/${lab}/unauthorized`} element={<UnauthorizedPage />} />

    <Route
      path={`/${lab}`}
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="stock" element={<StockPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="projects/:id" element={<ProjectDetailPage />} />
      <Route path="discharge" element={<DischargePage />} />
      <Route
        path="users"
        element={
          <ProtectedRoute allowedRoles={['LAB_ADMIN']}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route path={lab === 'lab1' ? 'lab3-view' : 'lab1-view'} element={<CrossLabViewPage />} />
    </Route>
  </>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lab1/login" replace />} />

      {/* Lab 1 Routes */}
      <Route path="/lab1/login" element={<LoginPage />} />
      <Route path="/lab1/register" element={<RegisterPage />} />
      <Route path="/lab1/waiting" element={<WaitingApprovalPage />} />
      <Route path="/lab1/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/lab1" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="stock/:id" element={<ComponentDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><CreateProjectPage /></ProtectedRoute>} />
        <Route path="projects/refresh" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><RefreshPage /></ProtectedRoute>} />
        <Route path="projects/:id/close" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><CloseProjectPage /></ProtectedRoute>} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="discharge" element={<DischargePage />} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="lab3-view" element={<CrossLabViewPage />} />
      </Route>

      {/* Lab 3 Routes */}
      <Route path="/lab3/login" element={<LoginPage />} />
      <Route path="/lab3/register" element={<RegisterPage />} />
      <Route path="/lab3/waiting" element={<WaitingApprovalPage />} />
      <Route path="/lab3/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/lab3" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="stock/:id" element={<ComponentDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><CreateProjectPage /></ProtectedRoute>} />
        <Route path="projects/refresh" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><RefreshPage /></ProtectedRoute>} />
        <Route path="projects/:id/close" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><CloseProjectPage /></ProtectedRoute>} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="discharge" element={<DischargePage />} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['LAB_ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="lab1-view" element={<CrossLabViewPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LabProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </LabProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
