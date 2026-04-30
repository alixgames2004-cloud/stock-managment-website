import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLab } from '../context/LabContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, FolderKanban, FileText, Users,
  LogOut, ArrowRightLeft, RefreshCw, BookOpen, Layers,
  ChevronRight, FlaskConical,
} from 'lucide-react';

// ── Role-based nav config ──────────────────────────────────────────────────────
const getNavItems = (lab, role) => {
  const isLab1 = lab === 'lab1';

  if (role === 'LAB_ADMIN') return [
    { label: 'Tableau de bord', path: `/${lab}/dashboard`, icon: LayoutDashboard },
    { label: 'Stock', path: `/${lab}/stock`, icon: Layers },
    { label: 'Projets', path: `/${lab}/projects`, icon: FolderKanban },
    { label: 'Fiches de Décharge', path: `/${lab}/discharge`, icon: FileText },
    { label: 'Utilisateurs', path: `/${lab}/users`, icon: Users },
    { label: isLab1 ? 'Vue LAB3' : 'Vue LAB1', path: `/${lab}/${isLab1 ? 'lab3-view' : 'lab1-view'}`, icon: ArrowRightLeft },
  ];

  if (role === 'SUPERVISOR') return [
    { label: 'Tableau de bord', path: `/${lab}/dashboard`, icon: LayoutDashboard },
    { label: 'Mes Projets', path: `/${lab}/projects`, icon: FolderKanban },
    { label: 'Fiches en Attente', path: `/${lab}/discharge`, icon: FileText },
    { label: 'Stock (lecture)', path: `/${lab}/stock`, icon: Package, readonly: true },
  ];

  if (role === 'STUDENT') return [
    { label: 'Mon Projet', path: `/${lab}/dashboard`, icon: BookOpen },
  ];

  return [
    { label: 'Tableau de bord', path: `/${lab}/dashboard`, icon: LayoutDashboard },
  ];
};

const roleLabels = {
  LAB_ADMIN: 'Administrateur',
  SUPERVISOR: 'Encadrant',
  STUDENT: 'Étudiant',
};

const roleBadgeStyle = {
  LAB_ADMIN: 'bg-blue-500/20 text-blue-200',
  SUPERVISOR: 'bg-emerald-500/20 text-emerald-200',
  STUDENT: 'bg-amber-500/20 text-amber-200',
};

// ── Layout ─────────────────────────────────────────────────────────────────────
const AdminLayout = () => {
  const { lab } = useLab();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLab3 = lab === 'lab3';
  const navItems = getNavItems(lab, user?.role);

  // Sidebar theme
  const sidebar = isLab3
    ? { bg: 'bg-accent-700', hover: 'hover:bg-accent-600', active: 'bg-accent-800', logo: 'text-accent-200', sep: 'border-accent-600' }
    : { bg: 'bg-primary-900', hover: 'hover:bg-primary-700', active: 'bg-primary-700', logo: 'text-primary-300', sep: 'border-primary-700' };

  const handleLogout = () => { logout(); navigate(`/${lab}/login`); };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className={`w-64 flex flex-col flex-shrink-0 ${sidebar.bg} shadow-xl`}>

        {/* Logo */}
        <div className="px-6 pt-7 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">SquadLab</h1>
              <p className={`text-xs font-semibold tracking-widest ${sidebar.logo}`}>{lab.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.prenom} {user?.nom}</p>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${roleBadgeStyle[user?.role] || 'bg-white/10 text-white/70'}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.path === `/${lab}/dashboard`
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? `${sidebar.active} text-white shadow-sm`
                    : `text-white/70 ${sidebar.hover} hover:text-white`
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-white/60'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                <span className="text-sm font-medium truncate">{item.label}</span>
                {item.readonly && (
                  <span className="ml-auto text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-bold">LECTURE</span>
                )}
                {isActive && <ChevronRight className="ml-auto w-3.5 h-3.5 text-white/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 ${sidebar.hover} hover:text-white transition-all group`}
          >
            <LogOut className="w-4 h-4 text-white/50 group-hover:text-red-300 transition-colors" style={{ width: '1rem', height: '1rem' }} />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 shadow-sm z-10">
          {/* Breadcrumb-style page title */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FlaskConical className="w-4 h-4 text-primary-400" />
            <span className="font-semibold text-primary-600">{lab.toUpperCase()}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600 font-medium capitalize">
              {location.pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Dashboard'}
            </span>
          </div>

          {/* Right: role badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
              user?.role === 'LAB_ADMIN' ? 'bg-blue-50 text-blue-700' :
              user?.role === 'SUPERVISOR' ? 'bg-emerald-50 text-emerald-700' :
              'bg-amber-50 text-amber-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                user?.role === 'LAB_ADMIN' ? 'bg-blue-500' :
                user?.role === 'SUPERVISOR' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              {roleLabels[user?.role] || user?.role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
