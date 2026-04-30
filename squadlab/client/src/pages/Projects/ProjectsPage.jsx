import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PlusCircle, Eye, Users, Clock, CheckCircle, Loader, Presentation, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const STATUTS = [
  { key: 'ALL',       label: 'Tous',      icon: null },
  { key: 'EN_ATTENTE', label: 'En Attente', icon: Clock, color: 'text-amber-500' },
  { key: 'APPROUVE',   label: 'Approuvé',   icon: CheckCircle, color: 'text-green-500' },
  { key: 'EN_COURS',   label: 'En Cours',   icon: Loader, color: 'text-blue-500' },
  { key: 'EXPOSE',     label: 'Exposé',     icon: Presentation, color: 'text-purple-500' },
];

const statutColors = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  APPROUVE:   'bg-green-100 text-green-700',
  EN_COURS:   'bg-blue-100 text-blue-700',
  EXPOSE:     'bg-purple-100 text-purple-700',
};

const ProjectsPage = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = user?.role === 'LAB_ADMIN';
  const isLab3 = lab === 'lab3';
  const themeActive = isLab3 ? 'border-accent-500 text-accent-600' : 'border-primary-600 text-primary-600';
  const themeBtn = isLab3 ? 'bg-accent-600 hover:bg-accent-700' : 'bg-primary-700 hover:bg-primary-800';

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'ALL') params.statut = activeTab;
      const res = await api.get('/projects', { params });
      setProjects(res.data.data);
    } catch {
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (project) => {
    if (!window.confirm(`Supprimer le projet "${project.titre}" et libérer les composants réservés ?`)) return;
    setDeletingId(project.id);
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success('Projet supprimé, stock libéré');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projets</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des projets étudiants</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate(`/${lab}/projects/new`)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${themeBtn}`}
          >
            <PlusCircle className="w-4 h-4" />
            Créer un projet
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {STATUTS.map(s => {
          const Icon = s.icon;
          const isActive = activeTab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive ? themeActive + ' border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive && s.color}`} />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aucun projet trouvé</p>
          {isAdmin && <p className="text-sm mt-1">Créez le premier projet avec le bouton en haut</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => {
            const isMine = project.labId === user?.labId;
            const sheet = project.dischargeSheets?.[0];
            return (
              <div
                key={project.id}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                  !isMine ? 'border-gray-200 opacity-80' : 'border-gray-200'
                }`}
              >
                {/* Card top accent */}
                <div className={`h-1 ${project.labNom === 'LAB1' ? 'bg-primary-600' : 'bg-accent-500'}`} />
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{project.titre}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(project.createdAt).toLocaleDateString('fr-DZ')}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        project.type === 'PFE' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {project.type === 'PFE' ? 'PFE' : 'Mini'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${statutColors[project.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {project.statut.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-xs w-20 flex-shrink-0">Encadrant:</span>
                      <span className="font-medium truncate">
                        {project.encadrant ? `${project.encadrant.prenom} ${project.encadrant.nom}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-xs w-20 flex-shrink-0">Chef:</span>
                      <span className="font-medium truncate">{project.chefGroupeNom || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{(project.membresNoms?.length || 0) + 1} membre{(project.membresNoms?.length || 0) + 1 > 1 ? 's' : ''}</span>
                      {sheet && (
                        <span className="ml-auto text-xs text-gray-400 font-mono">{sheet.numeroFiche}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/${lab}/projects/${project.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </button>
                    {isAdmin && isMine && project.statut === 'EN_ATTENTE' && (
                      <button
                        onClick={() => handleDelete(project)}
                        disabled={deletingId === project.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {deletingId === project.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    {!isMine && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        👁 {project.labNom}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
