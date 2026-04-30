import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, Plus, X, Loader2, AlertTriangle,
  CheckCircle2, Printer, FileText, RefreshCw,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import PrintableSheet from '../../components/PrintableSheet';

const typeBadge = (t) => t === 'PFE'
  ? 'bg-indigo-100 text-indigo-700'
  : 'bg-purple-100 text-purple-700';

// ── Left panel: project search ────────────────────────────────────────────────
const ProjectSearch = ({ onSelect, selectedId }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/projects/search', { params: { q } });
        setResults(res.data.data);
      } catch { toast.error('Erreur de recherche'); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Titre du projet ou nom d'un étudiant..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="text-xs text-gray-400 italic px-1">Saisissez au moins 2 caractères</p>
      )}

      {results.length === 0 && q.trim().length >= 2 && !loading && (
        <p className="text-xs text-gray-400 italic px-1">Aucun projet EN COURS trouvé</p>
      )}

      <div className="space-y-2">
        {results.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              selectedId === p.id
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-900 truncate flex-1">{p.titre}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 ${typeBadge(p.type)}`}>{p.type === 'PFE' ? 'PFE' : 'Mini Projet'}</span>
            </div>
            <p className="text-xs text-gray-500">
              Encadrant : {p.encadrant ? `${p.encadrant.prenom} ${p.encadrant.nom}` : '—'}
              {' · '}Chef : {p.chefGroupeNom}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const RefreshPage = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);

  // Component search for new items
  const [compSearch, setCompSearch] = useState('');
  const [compResults, setCompResults] = useState([]);
  const [compSearchLoading, setCompSearchLoading] = useState(false);
  const [selectedComposants, setSelectedComposants] = useState([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [insuffisants, setInsuffisants] = useState([]);

  // Success state
  const [successSheet, setSuccessSheet] = useState(null);
  const [cumulativeItems, setCumulativeItems] = useState([]);
  const [showPrint, setShowPrint] = useState(false);

  // Auto-load project from ?projectId= query param
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (!projectId) return;
    setLoadingProject(true);
    api.get(`/projects/${projectId}`)
      .then(res => {
        const p = res.data.data;
        setSelectedProject({
          id: p.id, titre: p.titre, type: p.type, statut: p.statut,
          chefGroupeNom: p.chefGroupeNom, membresNoms: p.membresNoms || [],
          encadrant: p.encadrant,
          dischargeSheets: p.dischargeSheets || [],
        });
      })
      .catch(() => toast.error('Projet introuvable'))
      .finally(() => setLoadingProject(false));
  }, []);

  // Debounced component search
  useEffect(() => {
    if (!compSearch.trim()) { setCompResults([]); return; }
    const t = setTimeout(async () => {
      setCompSearchLoading(true);
      try {
        // Pass lab name as query param so backend filters by lab — avoids
        // unreliable client-side labId comparison (UUID vs string mismatch)
        const labName = lab === 'lab1' ? 'LAB1' : 'LAB3';
        const res = await api.get('/components', { params: { name: compSearch, lab: labName } });
        setCompResults(res.data.data);
      } catch { toast.error('Erreur de recherche composants'); }
      finally { setCompSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [compSearch, lab]);

  const selectProject = (p) => {
    setSelectedProject(p);
    setSelectedComposants([]);
    setInsuffisants([]);
    setSuccessSheet(null);
    setCumulativeItems([]);
  };

  const addComposant = (comp) => {
    if (selectedComposants.find(c => c.componentId === comp.id)) {
      toast('Déjà dans la liste', { icon: 'ℹ️' }); return;
    }
    setSelectedComposants(prev => [...prev, {
      componentId: comp.id, nom: comp.nom, armoire: comp.armoire,
      casier: comp.casier, banque: comp.banque, qtyDisponible: comp.qtyDisponible,
      quantiteDemandee: 1,
    }]);
    setCompSearch(''); setCompResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedProject) return;
    if (selectedComposants.length === 0) { toast.error('Ajoutez au moins un composant'); return; }
    setInsuffisants([]); setSubmitting(true);
    try {
      const res = await api.post(`/projects/${selectedProject.id}/refresh`, {
        composants: selectedComposants.map(c => ({
          componentId: c.componentId,
          quantiteDemandee: parseInt(c.quantiteDemandee),
        })),
      });
      const { dischargeSheet } = res.data.data;
      toast.success(`Fiche ${dischargeSheet.numeroFiche} générée !`);
      setSuccessSheet(dischargeSheet);
      setSelectedComposants([]);

      // Fetch cumulative components
      const cumRes = await api.get(`/projects/${selectedProject.id}/cumulative-components`);
      setCumulativeItems(cumRes.data.data);
      setShowPrint(true);

      // Refresh project discharge sheets list
      const projRes = await api.get(`/projects/${selectedProject.id}`);
      const p = projRes.data.data;
      setSelectedProject(prev => ({ ...prev, dischargeSheets: p.dischargeSheets || [] }));
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.insuffisants) {
        setInsuffisants(err.response.data.insuffisants);
        toast.error('Stock insuffisant — ajustez les quantités');
      } else {
        toast.error(err.response?.data?.error || 'Erreur lors du refresh');
      }
    } finally { setSubmitting(false); }
  };

  // Build print data for cumulative refresh sheet
  const printProject = selectedProject ? {
    titre: selectedProject.titre, type: selectedProject.type,
    statut: selectedProject.statut, labNom: lab?.toUpperCase(),
    encadrant: selectedProject.encadrant,
    chefGroupeNom: selectedProject.chefGroupeNom,
    membresNoms: selectedProject.membresNoms || [],
  } : null;

  const printSheet = successSheet ? {
    ...successSheet,
    isRefresh: true,
    items: cumulativeItems.map((ci, idx) => ({
      id: ci.componentId, componentId: ci.componentId,
      componentNumero: ci.numero, componentNom: ci.nom,
      componentArmoire: ci.armoire, componentCasier: ci.casier, componentBanque: ci.banque,
      quantiteDemandee: ci.quantiteTotale, quantiteAccordee: ci.quantiteTotale,
      statutRetour: 'DANS_PROJET',
    })),
  } : null;

  return (
    <>
      {showPrint && printSheet && printProject && (
        <PrintableSheet sheet={printSheet} project={printProject} onClose={() => setShowPrint(false)} />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/${lab}/projects`)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary-500" /> Prendre des composants supplémentaires
            </h1>
            <p className="text-sm text-gray-500">Refresh — déduction immédiate du stock, sans approbation superviseur</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Project search */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider text-primary-600">
                Rechercher un projet EN COURS
              </h2>
              <ProjectSearch onSelect={selectProject} selectedId={selectedProject?.id} />
            </Card>
          </div>

          {/* RIGHT: Actions */}
          <div className="lg:col-span-3 space-y-5">
            {loadingProject && <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>}

            {!selectedProject && !loadingProject && (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                <div className="text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sélectionnez un projet EN COURS à gauche</p>
                </div>
              </div>
            )}

            {selectedProject && (
              <>
                {/* Success banner */}
                {successSheet && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-900 text-sm">Composants sortis du stock !</p>
                        <p className="text-xs text-green-700">Fiche <b>{successSheet.numeroFiche}</b> générée.</p>
                      </div>
                    </div>
                    <button onClick={() => setShowPrint(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-700 text-white rounded-lg hover:bg-green-800">
                      <Printer className="w-3.5 h-3.5" /> Imprimer
                    </button>
                  </div>
                )}

                {/* Project info */}
                <Card>
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${typeBadge(selectedProject.type)}`}>{selectedProject.type}</span>
                    {selectedProject.titre}
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Encadrant :</span> <span className="font-medium">{selectedProject.encadrant ? `${selectedProject.encadrant.prenom} ${selectedProject.encadrant.nom}` : '—'}</span></div>
                    <div><span className="text-gray-500">Chef :</span> <span className="font-medium">★ {selectedProject.chefGroupeNom}</span></div>
                  </div>
                  {(selectedProject.membresNoms || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedProject.membresNoms.map((n, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{n}</span>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Existing fiches */}
                {selectedProject.dischargeSheets?.length > 0 && (
                  <Card>
                    <h2 className="font-bold text-gray-900 mb-3 text-sm">Fiches existantes</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-100">
                          {['N° Fiche','Type','Date','Statut'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedProject.dischargeSheets.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-xs">{s.numeroFiche}</td>
                              <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.isRefresh ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{s.isRefresh ? 'Refresh' : 'Initiale'}</span></td>
                              <td className="px-3 py-2 text-xs text-gray-500">{new Date(s.dateCreation).toLocaleDateString('fr-DZ')}</td>
                              <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.statut === 'APPROUVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.statut.replace('_',' ')}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Insufficient stock alert */}
                {insuffisants.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="font-semibold text-red-800 text-sm">Stock insuffisant</span></div>
                    {insuffisants.map(i => (
                      <div key={i.componentId} className="text-xs text-red-700 ml-6"><b>{i.nom}</b> — demandé: {i.quantiteDemandee}, disponible: {i.qtyDisponible}</div>
                    ))}
                  </div>
                )}

                {/* New components section */}
                <Card>
                  <h2 className="font-bold text-gray-900 mb-4">Nouveaux composants à prendre</h2>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="text" value={compSearch} onChange={e => setCompSearch(e.target.value)}
                      placeholder="Chercher un composant..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {compSearchLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
                  </div>

                  {/* Search results */}
                  {compResults.length > 0 && (
                    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden divide-y shadow-sm">
                      {compResults.map(comp => {
                        const already = !!selectedComposants.find(c => c.componentId === comp.id);
                        return (
                          <div key={comp.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{comp.nom}</p>
                              <p className="text-xs text-gray-400">{comp.armoire} › C{comp.casier}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comp.qtyDisponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {comp.qtyDisponible} dispo
                            </span>
                            <button type="button" onClick={() => addComposant(comp)} disabled={already}
                              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg font-medium ${already ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                              {already ? 'Ajouté' : <><Plus className="w-3 h-3" />Ajouter</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected composants table */}
                  {selectedComposants.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                      Recherchez et ajoutez des composants ci-dessus
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                          {['Composant','Emplacement','Dispo','Qté demandée',''].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedComposants.map(c => {
                            const isInsuff = insuffisants.find(i => i.componentId === c.componentId);
                            return (
                              <tr key={c.componentId} className={isInsuff ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                <td className="px-4 py-2.5 font-medium">{c.nom}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">{c.armoire} › C{c.casier}{c.banque ? ` › B${c.banque}` : ''}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.qtyDisponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.qtyDisponible}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <input type="number" min="1" max={c.qtyDisponible} value={c.quantiteDemandee}
                                    onChange={e => setSelectedComposants(prev => prev.map(x => x.componentId === c.componentId ? { ...x, quantiteDemandee: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                                    className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none ${isInsuff ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                                  />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button onClick={() => setSelectedComposants(prev => prev.filter(x => x.componentId !== c.componentId))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex justify-end gap-3 mt-5">
                    <button onClick={() => { setSelectedProject(null); setSelectedComposants([]); setInsuffisants([]); setSuccessSheet(null); }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                      Annuler
                    </button>
                    <button onClick={handleSubmit} disabled={submitting || selectedComposants.length === 0}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg disabled:opacity-60">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {submitting ? 'Sortie en cours...' : 'Valider et sortir les composants'}
                    </button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RefreshPage;
