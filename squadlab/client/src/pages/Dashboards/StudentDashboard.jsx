import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import { FolderKanban, Package, FileText, User, MapPin, RefreshCw } from 'lucide-react';

const statutConfig = {
  EN_ATTENTE: { label: 'En Attente', cls: 'bg-amber-100 text-amber-700' },
  APPROUVE:   { label: 'Approuvé',   cls: 'bg-blue-100 text-blue-700' },
  EN_COURS:   { label: 'En Cours',   cls: 'bg-green-100 text-green-700' },
  EXPOSE:     { label: 'Exposé',     cls: 'bg-purple-100 text-purple-700' },
};

const retourColors = {
  DANS_PROJET: 'bg-blue-100 text-blue-700',
  RENDU:       'bg-green-100 text-green-700',
  ENDOMMAGE:   'bg-orange-100 text-orange-700',
  PERDU:       'bg-red-100 text-red-700',
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/student')
      .then(r => setData(r.data?.data || { projects: [] }))
      .catch(err => {
        console.error('Student dashboard error:', err?.response?.data || err.message);
        setData({ projects: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  const { projects = [] } = data || {};

  if (projects.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
        <FolderKanban className="w-10 h-10 text-gray-300" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-700">Aucun projet trouvé</h2>
        <p className="text-sm text-gray-400 mt-1">Votre encadrant n'a pas encore créé de projet pour vous.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Mon Projet <span className="text-primary-600">👋</span>
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Bienvenue, {user?.prenom} {user?.nom} — voici vos fiches et composants attribués.</p>
      </div>

      {projects.map(project => {
        const s = statutConfig[project.statut] || {};
        const initialSheet = project.dischargeSheets?.find(sh => !sh.isRefresh);
        const refreshSheets = project.dischargeSheets?.filter(sh => sh.isRefresh) || [];
        const allItems = project.dischargeSheets?.flatMap(sh => sh.items || []) || [];
        const activeItems = allItems.filter(i => i.statutRetour === 'DANS_PROJET');

        return (
          <div key={project.id} className="space-y-5">
            {/* Project card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{project.titre}</h2>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${project.type === 'PFE' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'}`}>
                      {project.type === 'PFE' ? 'PFE' : 'Mini Projet'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Créé le {new Date(project.createdAt).toLocaleDateString('fr-DZ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-primary-400" />
                  <span><b>Encadrant:</b> {project.encadrant ? `${project.encadrant.prenom} ${project.encadrant.nom}` : '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span><b>{activeItems.length}</b> composant(s) actuellement attribués</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span><b>{project.dischargeSheets?.length || 0}</b> fiche(s) de décharge</span>
                </div>
              </div>
            </div>

            {/* Sheets */}
            {[...(initialSheet ? [initialSheet] : []), ...refreshSheets].map(sheet => (
              <div key={sheet.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sheet.isRefresh ? 'bg-blue-400' : 'bg-primary-500'}`} />
                  <span className="font-mono text-sm font-bold text-gray-700">{sheet.numeroFiche}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sheet.isRefresh ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {sheet.isRefresh ? 'Rafraîchissement' : 'Fiche Initiale'}
                  </span>
                  <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-semibold ${sheet.statut === 'APPROUVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {sheet.statut === 'APPROUVE' ? 'Approuvée' : 'En attente'}
                  </span>
                </div>

                {(sheet.items || []).length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">Aucun composant dans cette fiche</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Composant', 'Emplacement', 'Qté', 'Statut'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(sheet.items || []).map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-semibold text-gray-800">
                            {item.component?.nom || item.componentNom || '—'}
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">
                            {item.component?.armoire || item.componentArmoire || '?'} › C{item.component?.casier ?? item.componentCasier ?? '?'}
                          </td>
                          <td className="px-5 py-3 font-bold text-gray-700">{item.quantiteAccordee ?? 0}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${retourColors[item.statutRetour] || 'bg-gray-100 text-gray-700'}`}>
                              {(item.statutRetour || '').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default StudentDashboard;
