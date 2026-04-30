import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import {
  Package, FolderKanban, FileText, Users, AlertTriangle,
  TrendingUp, ArrowRight, Clock, CheckCircle, RefreshCw,
  Activity, Layers, Bell,
} from 'lucide-react';

const KPICard = ({ icon: Icon, label, value, color, sub, trend }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 shadow-sm border ${color.border} bg-white group hover:shadow-md transition-all duration-200`}>
    <div className={`absolute inset-0 opacity-5 ${color.bg}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color.text}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color.iconBg}`}>
        <Icon className={`w-6 h-6 ${color.iconColor}`} />
      </div>
    </div>
    {trend !== undefined && (
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <TrendingUp className="w-3 h-3" />
        <span>{trend}</span>
      </div>
    )}
  </div>
);

const statutConfig = {
  EN_ATTENTE: { label: 'En Attente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROUVE:   { label: 'Approuvé',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  EN_COURS:   { label: 'En Cours',   cls: 'bg-green-100 text-green-700 border-green-200' },
  EXPOSE:     { label: 'Exposé',     cls: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Chargement du tableau de bord…</p>
      </div>
    </div>
  );

  const { stats = {}, lowStockAlerts = [], recentProjects = [] } = data || {};

  const kpis = [
    { icon: Layers, label: 'Total Composants', value: stats.totalComponents, color: { border: 'border-blue-100', bg: 'bg-blue-600', text: 'text-blue-700', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' }, sub: 'dans votre lab' },
    { icon: FolderKanban, label: 'Projets Actifs', value: stats.activeProjects, color: { border: 'border-emerald-100', bg: 'bg-emerald-600', text: 'text-emerald-700', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' }, sub: 'en cours d\'exécution' },
    { icon: FileText, label: 'Fiches en Attente', value: stats.pendingFiches, color: { border: 'border-amber-100', bg: 'bg-amber-600', text: 'text-amber-700', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' }, sub: 'nécessitent une action' },
    { icon: Users, label: 'Utilisateurs en Attente', value: stats.pendingUsers, color: { border: 'border-purple-100', bg: 'bg-purple-600', text: 'text-purple-700', iconBg: 'bg-purple-50', iconColor: 'text-purple-500' }, sub: 'en attente d\'approbation' },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, <span className="text-primary-600">{user?.prenom} {user?.nom}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Voici un aperçu de l'activité de votre laboratoire.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Activity className="w-3.5 h-3.5" />
          <span>Mis à jour à {new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Low stock alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Alertes Stock Critique</h2>
                <p className="text-xs text-gray-400">Composants avec qté ≤ 5</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lowStockAlerts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {lowStockAlerts.length > 0 ? `${lowStockAlerts.length} alerte(s)` : '✓ Tout va bien'}
            </span>
          </div>
          {lowStockAlerts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
              Aucun composant en rupture critique
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {lowStockAlerts.map(c => (
                <Link key={c.id} to={`/${lab}/stock/${c.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors group">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.nom}</p>
                    <p className="text-xs text-gray-400">N°{c.numero} · {c.armoire} › C{c.casier}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-lg font-bold ${c.qtyDisponible <= 0 ? 'text-red-600' : c.qtyDisponible <= 2 ? 'text-orange-600' : 'text-amber-600'}`}>
                        {c.qtyDisponible}
                      </span>
                      <p className="text-xs text-gray-400">disponible</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions requises + recent projects */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-gray-900 text-sm">Actions Requises</h2>
            </div>
            <div className="space-y-2">
              {stats.pendingFiches > 0 && (
                <Link to={`/${lab}/discharge`} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{stats.pendingFiches} fiche(s) en attente</p>
                      <p className="text-xs text-amber-600">Nécessitent approbation supervisor</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              {stats.pendingUsers > 0 && (
                <Link to={`/${lab}/users`} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-semibold text-purple-800">{stats.pendingUsers} utilisateur(s) en attente</p>
                      <p className="text-xs text-purple-600">En attente d'approbation admin</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              {stats.pendingFiches === 0 && stats.pendingUsers === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">✓ Aucune action requise</p>
              )}
            </div>
          </div>

          {/* Recent projects */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Projets Récents
              </h2>
              <Link to={`/${lab}/projects`} className="text-xs text-primary-600 hover:underline font-medium">Voir tout →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentProjects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Aucun projet</p>
              )}
              {recentProjects.map(p => {
                const s = statutConfig[p.statut] || {};
                return (
                  <Link key={p.id} to={`/${lab}/projects/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{p.titre}</p>
                      <p className="text-xs text-gray-400">{p.encadrant}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${s.cls}`}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
