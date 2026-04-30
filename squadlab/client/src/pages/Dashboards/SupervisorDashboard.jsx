import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import {
  FolderKanban, FileText, Clock, CheckCircle2, ThumbsUp,
  ArrowRight, Loader, Presentation, AlertTriangle,
} from 'lucide-react';

const statutConfig = {
  EN_ATTENTE: { label: 'En Attente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROUVE:   { label: 'Approuvé',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  EN_COURS:   { label: 'En Cours',   cls: 'bg-green-100 text-green-700 border-green-200' },
  EXPOSE:     { label: 'Exposé',     cls: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/supervisor')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  const { stats = {}, projects = [] } = data || {};
  const pendingProjects = projects.filter(p => p.pendingSheets?.length > 0);
  const activeProjects = projects.filter(p => p.statut === 'EN_COURS');

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, <span className="text-primary-600">{user?.prenom} {user?.nom}</span> 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Vos projets encadrés et actions en attente.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <FolderKanban className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Projets Actifs</p>
            <p className="text-3xl font-bold text-green-700">{stats.myActiveProjects ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">en cours d'exécution</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Fiches à Approuver</p>
            <p className="text-3xl font-bold text-amber-700">{stats.myPendingSheets ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">en attente de votre signature</p>
          </div>
        </div>
      </div>

      {/* Fiches nécessitant approbation */}
      {pendingProjects.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-amber-900 text-sm">Fiches nécessitant votre approbation</h2>
              <p className="text-xs text-amber-700">{pendingProjects.length} projet(s) en attente</p>
            </div>
          </div>
          <div className="divide-y divide-amber-50">
            {pendingProjects.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.titre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.pendingSheets.map(s => (
                      <span key={s.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-mono font-semibold">
                        {s.numeroFiche}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/${lab}/projects/${p.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" /> Approuver
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All my projects */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary-500" /> Tous mes projets encadrés
          </h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">{projects.length} projet(s)</span>
        </div>

        {projects.length === 0 ? (
          <div className="py-16 text-center">
            <FolderKanban className="w-10 h-10 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Aucun projet encadré</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Projet', 'Statut', 'Créé le', 'Fiches en attente', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map(p => {
                const s = statutConfig[p.statut] || {};
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{p.titre}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('fr-DZ')}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.pendingSheets?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                          <Clock className="w-3 h-3" /> {p.pendingSheets.length} fiche(s)
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link to={`/${lab}/projects/${p.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800">
                        Voir <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
