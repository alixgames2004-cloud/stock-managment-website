import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, FileText, Trash2, Clock, CheckCircle,
  Loader, Presentation, Pencil, Plus, X, Search, Loader2,
  AlertTriangle, Save, Printer, ThumbsUp, BadgeCheck, RefreshCw, XCircle,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import PrintableSheet from '../../components/PrintableSheet';

const statutConfig = {
  EN_ATTENTE: { label: 'En Attente',  color: 'bg-amber-100 text-amber-700',   icon: Clock },
  APPROUVE:   { label: 'Approuvé',    color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  EN_COURS:   { label: 'En Cours',    color: 'bg-blue-100 text-blue-700',     icon: Loader },
  EXPOSE:     { label: 'Exposé',      color: 'bg-purple-100 text-purple-700', icon: Presentation },
};

const retourColors = {
  DANS_PROJET: 'bg-blue-100 text-blue-700',
  RENDU:       'bg-green-100 text-green-700',
  ENDOMMAGE:   'bg-orange-100 text-orange-700',
  PERDU:       'bg-red-100 text-red-700',
};

// ── Composant inline edit (EN_ATTENTE, LAB_ADMIN) ────────────────────────────
const ComposantEditSection = ({ projectId, sheet, onSaved, user }) => {
  const [editItems, setEditItems] = useState(() =>
    (sheet?.items || []).map(i => ({
      componentId: i.componentId, nom: i.componentNom,
      armoire: i.componentArmoire, casier: i.componentCasier, banque: i.componentBanque,
      qtyDisponible: null, quantiteDemandee: i.quantiteDemandee,
    }))
  );
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [insuffisants, setInsuffisants] = useState([]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get('/components', { params: { name: search } });
        setResults(res.data.data.filter(c => c.labId === user?.labId));
      } catch { toast.error('Erreur de recherche'); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const addItem = (comp) => {
    if (editItems.find(i => i.componentId === comp.id)) { toast('Déjà ajouté', { icon: 'ℹ️' }); return; }
    setEditItems(prev => [...prev, { componentId: comp.id, nom: comp.nom, armoire: comp.armoire, casier: comp.casier, banque: comp.banque, qtyDisponible: comp.qtyDisponible, quantiteDemandee: 1 }]);
    setSearch(''); setResults([]);
  };

  const handleSave = async () => {
    if (editItems.length === 0) { toast.error('Au moins un composant requis'); return; }
    setInsuffisants([]); setSaving(true);
    try {
      const res = await api.put(`/projects/${projectId}/composants`, {
        composants: editItems.map(i => ({ componentId: i.componentId, quantiteDemandee: i.quantiteDemandee })),
      });
      toast.success('Composants mis à jour !');
      onSaved(res.data.data);
    } catch (err) {
      if (err.response?.status === 409) { setInsuffisants(err.response.data.insuffisants || []); toast.error('Stock insuffisant'); }
      else toast.error(err.response?.data?.error || 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {insuffisants.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="font-semibold text-red-800 text-sm">Stock insuffisant</span></div>
          {insuffisants.map(i => <div key={i.componentId} className="text-xs text-red-700 ml-6"><b>{i.nom}</b> — demandé: {i.quantiteDemandee}, dispo: {i.qtyDisponible}</div>)}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ajouter un composant..." className="w-full pl-9 pr-3 py-2 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-primary-50" />
        {searchLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y shadow-sm">
          {results.map(comp => {
            const already = !!editItems.find(i => i.componentId === comp.id);
            return (
              <div key={comp.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{comp.nom}</p><p className="text-xs text-gray-400">{comp.armoire} › C{comp.casier}</p></div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comp.qtyDisponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{comp.qtyDisponible} dispo</span>
                <button type="button" onClick={() => addItem(comp)} disabled={already} className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg font-medium ${already ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                  {already ? 'Ajouté' : <><Plus className="w-3 h-3" />Ajouter</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {editItems.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-red-200 rounded-lg text-gray-400 text-sm">⚠ Au moins un composant requis</div>
      ) : (
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            {['Composant','Emplacement','Qté',''].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {editItems.map(item => {
              const isInsuff = insuffisants.find(i => i.componentId === item.componentId);
              return (
                <tr key={item.componentId} className={isInsuff ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-2.5 font-medium">{item.nom}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{item.armoire} › C{item.casier}{item.banque ? ` › B${item.banque}` : ''}</td>
                  <td className="px-4 py-2.5"><input type="number" min="1" value={item.quantiteDemandee} onChange={e => setEditItems(prev => prev.map(i => i.componentId === item.componentId ? { ...i, quantiteDemandee: Math.max(1, parseInt(e.target.value) || 1) } : i))} className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none ${isInsuff ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} /></td>
                  <td className="px-4 py-2.5 text-center"><button type="button" onClick={() => setEditItems(prev => prev.filter(i => i.componentId !== item.componentId))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || editItems.length === 0} className="inline-flex items-center gap-2 px-5 py-2 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-lg disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
};

// ── Validate inline (APPROUVE, LAB_ADMIN): edit quantiteAccordee per item ────
const ValidateSection = ({ project, sheet, onValidated }) => {
  const [accordees, setAccordees] = useState(() => {
    const map = {};
    // Default to quantiteDemandee so nothing is accidentally zeroed out
    (sheet?.items || []).forEach(i => { map[i.id] = i.quantiteAccordee > 0 ? i.quantiteAccordee : i.quantiteDemandee; });
    return map;
  });
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const composants = Object.entries(accordees).map(([dischargeItemId, quantiteAccordee]) => ({ dischargeItemId, quantiteAccordee: Math.max(1, parseInt(quantiteAccordee) || 1) }));
      const res = await api.patch(`/projects/${project.id}/validate`, { composants });
      toast.success('Projet validé — composants remis en cours !');
      onValidated(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation');
    } finally { setValidating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <b>Étape finale :</b> Vérifiez les quantités accordées avant de remettre les composants au groupe.
      </div>
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead><tr className="bg-gray-50 border-b border-gray-200">
          {['Composant','Qté demandée','Qté accordée'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {(sheet?.items || []).map(item => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium">{item.componentNom}</td>
              <td className="px-4 py-2.5 text-center text-gray-600">{item.quantiteDemandee}</td>
              <td className="px-4 py-2.5">
                <input type="number" min="1" max={item.quantiteDemandee} value={accordees[item.id] ?? item.quantiteDemandee}
                  onChange={e => setAccordees(prev => ({ ...prev, [item.id]: Math.min(item.quantiteDemandee, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-20 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <button onClick={handleValidate} disabled={validating} className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg disabled:opacity-60">
          {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
          {validating ? 'Validation...' : 'Valider — Remettre les composants'}
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ProjectDetailPage = () => {
  const { id } = useParams();
  const { lab } = useLab();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingComposants, setEditingComposants] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const isAdmin = user?.role === 'LAB_ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/projects/${id}`);
        setProject(res.data.data);
      } catch {
        toast.error('Projet introuvable');
        navigate(`/${lab}/projects`);
      } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer "${project.titre}" et libérer le stock ?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success('Projet supprimé, stock libéré');
      navigate(`/${lab}/projects`);
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setDeleting(false); }
  };

  const handleApprove = async () => {
    setApprovingId(project.id);
    try {
      const res = await api.patch(`/projects/${project.id}/approve`);
      setProject(res.data.data);
      toast.success('Fiche approuvée ! Le projet est maintenant APPROUVÉ.');
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setApprovingId(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  if (!project) return null;

  const statut = statutConfig[project.statut] || {};
  const StatutIcon = statut.icon || Clock;
  const isMine = project.labId === user?.labId;
  const initialSheet = project.dischargeSheets?.find(s => !s.isRefresh);
  const refreshSheets = project.dischargeSheets?.filter(s => s.isRefresh) || [];
  const canEdit = isAdmin && isMine && project.statut === 'EN_ATTENTE';
  const canApprove = isSupervisor && project.statut === 'EN_ATTENTE' && project.encadrant?.id === user?.id;
  const canValidate = isAdmin && isMine && project.statut === 'APPROUVE';

  const InfoRow = ({ label, value }) => (
    <div className="flex gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  );

  // Build print props
  const printProject = {
    titre: project.titre, type: project.type, statut: project.statut,
    labNom: project.labNom, encadrant: project.encadrant,
    chefGroupeNom: project.chefGroupeNom, membresNoms: project.membresNoms || [],
  };
  const printSheet = initialSheet ? { ...initialSheet, items: initialSheet.items || [] } : null;

  return (
    <>
      {showPrint && <PrintableSheet sheet={printSheet} project={printProject} onClose={() => setShowPrint(false)} />}

      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate(`/${lab}/projects`)} className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{project.titre}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${statut.color}`}>
                  <StatutIcon className="w-3.5 h-3.5" />{statut.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${project.type === 'PFE' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'}`}>
                  {project.type === 'PFE' ? 'PFE' : 'Mini Projet'}
                </span>
              </div>
              <p className="text-sm text-gray-400">Créé le {new Date(project.createdAt).toLocaleDateString('fr-DZ')} · {project.labNom}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {initialSheet && (
              <button onClick={() => setShowPrint(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            )}
            {canEdit && (
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                {deleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />} Supprimer
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider text-primary-600">Informations</h2>
              <InfoRow label="Encadrant" value={project.encadrant ? `${project.encadrant.prenom} ${project.encadrant.nom}` : null} />
              <InfoRow label="Chef de groupe" value={project.chefGroupeNom} />
              <InfoRow label="Lab" value={project.labNom} />
              <InfoRow label="Type" value={project.type === 'PFE' ? 'PFE' : 'Mini Projet'} />
            </Card>

            <Card>
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary-500" />Équipe ({(project.membresNoms?.length || 0) + 1})</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-primary-50 border border-primary-100">
                  <div className="w-8 h-8 rounded-full bg-primary-200 text-primary-700 flex items-center justify-center text-xs font-bold">{(project.chefGroupeNom || '?')[0].toUpperCase()}</div>
                  <p className="text-sm font-medium flex-1">{project.chefGroupeNom}</p>
                  <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-semibold">Chef</span>
                </div>
                {(project.membresNoms || []).map((name, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{name[0]?.toUpperCase()}</div>
                    <p className="text-sm font-medium">{name}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── EN_COURS action panel (Admin) ── */}
            {isAdmin && isMine && project.statut === 'EN_COURS' && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-blue-900">Projet en cours</h3>
                    <p className="text-sm text-blue-700 mt-1">Prenez des composants supplémentaires ou clôturez le projet.</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/${lab}/projects/refresh?projectId=${project.id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" /> Prendre des composants
                    </button>
                    <button
                      title="Irréversible — le projet passera en état EXPOSÉ"
                      onClick={() => navigate(`/${lab}/projects/${project.id}/close`)}
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-red-400 text-red-700 bg-white hover:bg-red-50 font-semibold text-sm rounded-lg"
                    >
                      <XCircle className="w-4 h-4" /> Clôturer le projet
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* ── EXPOSE terminal panel (all roles) ── */}
            {project.statut === 'EXPOSE' && (
              <Card className="border-2 border-purple-200 bg-purple-50">
                <div className="flex items-center gap-3">
                  <Presentation className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-purple-900">État terminal — Projet exposé</h3>
                    <p className="text-sm text-purple-700 mt-0.5">Ce projet est clôturé. Aucune modification n'est possible.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Action panel for SUPERVISOR (EN_ATTENTE) ── */}
            {canApprove && (
              <Card className="border-2 border-green-200 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-900">En attente de votre approbation</h3>
                    <p className="text-sm text-green-700 mt-1">Vérifiez la liste des composants ci-dessous, puis approuvez la fiche.</p>
                  </div>
                  <button onClick={handleApprove} disabled={!!approvingId} className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-semibold text-sm rounded-lg disabled:opacity-60 whitespace-nowrap">
                    {approvingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}Approuver la fiche
                  </button>
                </div>
              </Card>
            )}

            {/* ── Discharge sheet card ── */}
            <Card className="p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  <h2 className="font-bold text-gray-900">Fiche initiale</h2>
                  {initialSheet && <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{initialSheet.numeroFiche}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {initialSheet && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${initialSheet.statut === 'APPROUVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {initialSheet.statut.replace('_', ' ')}
                    </span>
                  )}
                  {canEdit && (
                    <button onClick={() => setEditingComposants(p => !p)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${editingComposants ? 'bg-gray-200 text-gray-700' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>
                      <Pencil className="w-3.5 h-3.5" />{editingComposants ? 'Annuler' : 'Modifier'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {!initialSheet ? (
                  <p className="text-center py-8 text-gray-400">Aucune fiche de décharge</p>
                ) : editingComposants ? (
                  <ComposantEditSection projectId={project.id} sheet={initialSheet} onSaved={p => { setProject(p); setEditingComposants(false); }} user={user} />
                ) : canValidate ? (
                  <ValidateSection project={project} sheet={initialSheet} onValidated={p => { setProject(p); setValidating(false); }} />
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {['N°','Composant','Emplacement','Qté dem.','Qté acc.','Statut'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(initialSheet.items || []).map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-500 text-xs">{item.componentNumero}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{item.componentNom}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{item.componentArmoire} › C{item.componentCasier}{item.componentBanque ? ` › B${item.componentBanque}` : ''}</td>
                              <td className="px-4 py-3 text-center font-bold text-gray-700">{item.quantiteDemandee}</td>
                              <td className="px-4 py-3 text-center font-bold text-green-700">{item.quantiteAccordee}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${retourColors[item.statutRetour] || 'bg-gray-100 text-gray-700'}`}>
                                  {item.statutRetour.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex gap-6 text-xs text-gray-400">
                      <span>Créé le {new Date(initialSheet.dateCreation).toLocaleDateString('fr-DZ')}</span>
                      {initialSheet.dateApprobation && <span>Approuvé le {new Date(initialSheet.dateApprobation).toLocaleDateString('fr-DZ')}</span>}
                      <span className="ml-auto">{initialSheet.items.length} composant{initialSheet.items.length > 1 ? 's' : ''}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* ── Refresh sheets ── */}
            {refreshSheets.length > 0 && (
              <Card className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    Fiches de renouvellement ({refreshSheets.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {refreshSheets.map(rsheet => (
                    <div key={rsheet.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-sm font-semibold text-gray-700">{rsheet.numeroFiche}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{new Date(rsheet.dateCreation).toLocaleDateString('fr-DZ')}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">APPROUVÉ</span>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-100">
                          {['Composant','Emplacement','Qté'].map(h => <th key={h} className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {rsheet.items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">{item.componentNom}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{item.componentArmoire} › C{item.componentCasier}{item.componentBanque ? ` › B${item.componentBanque}` : ''}</td>
                              <td className="px-3 py-2 text-center font-bold text-blue-700">{item.quantiteAccordee}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectDetailPage;
