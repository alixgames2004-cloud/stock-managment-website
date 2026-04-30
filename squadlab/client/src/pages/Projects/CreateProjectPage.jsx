import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, Plus, X, AlertTriangle, Loader2, UserCheck, Users, CheckCircle2, Copy } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

// ── Searchable Select (for supervisors only) ──────────────────────────────────
const SearchSelect = ({ label, options, value, onChange, placeholder, required }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o =>
    `${o.prenom} ${o.nom}`.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:border-primary-400 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        {selected
          ? <span className="font-medium text-gray-900">{selected.prenom} {selected.nom}</span>
          : <span className="text-gray-400">{placeholder}</span>
        }
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher..."
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400 italic">Aucun résultat</p>
          ) : (
            filtered.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange(u.id); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${u.id === value ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700'}`}
              >
                {u.prenom} {u.nom}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const CreateProjectPage = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const navigate = useNavigate();

  // ── Form State ──────────────────────────────────────────────────────────────
  const [titre, setTitre] = useState('');
  const [type, setType] = useState('PFE');
  const [encadrantId, setEncadrantId] = useState('');

  // Chef de groupe — free text
  const [chefGroupeNom, setChefGroupeNom] = useState('');

  // Membres — array of free-text strings
  const [membres, setMembres] = useState([]);
  const [membreInput, setMembreInput] = useState('');

  // Component search & selection
  const [componentSearch, setComponentSearch] = useState('');
  const [componentResults, setComponentResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedComposants, setSelectedComposants] = useState([]);

  // Supervisors list (from backend)
  const [supervisors, setSupervisors] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [insuffisants, setInsuffisants] = useState([]);

  // ── Load supervisors on mount ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get('/users', { params: { role: 'SUPERVISOR' } });
        setSupervisors(res.data.data);
      } catch {
        toast.error('Erreur lors du chargement des superviseurs');
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, []);

  // ── Debounced component search ──────────────────────────────────────────────
  useEffect(() => {
    if (!componentSearch.trim()) { setComponentResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const labName = lab === 'lab1' ? 'LAB1' : 'LAB3';
        const res = await api.get('/components', { params: { name: componentSearch, lab: labName } });
        setComponentResults(res.data.data);
      } catch {
        toast.error('Erreur de recherche composants');
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [componentSearch, lab]);

  // ── Membre handlers ─────────────────────────────────────────────────────────
  const addMembre = () => {
    const name = membreInput.trim();
    if (!name) return;
    if (membres.includes(name)) {
      toast('Ce nom est déjà dans la liste', { icon: 'ℹ️' });
      return;
    }
    setMembres(prev => [...prev, name]);
    setMembreInput('');
  };

  const removeMembre = (name) => setMembres(prev => prev.filter(m => m !== name));

  // ── Composant handlers ──────────────────────────────────────────────────────
  const addComposant = (comp) => {
    if (selectedComposants.find(c => c.componentId === comp.id)) {
      toast('Ce composant est déjà dans la liste', { icon: 'ℹ️' });
      return;
    }
    setSelectedComposants(prev => [
      ...prev,
      {
        componentId: comp.id,
        nom: comp.nom,
        armoire: comp.armoire,
        casier: comp.casier,
        banque: comp.banque,
        qtyDisponible: comp.qtyDisponible,
        quantiteDemandee: 1,
      },
    ]);
    setComponentSearch('');
    setComponentResults([]);
  };

  const removeComposant = (id) => setSelectedComposants(prev => prev.filter(c => c.componentId !== id));

  const updateQty = (id, val) => {
    const qty = Math.max(1, parseInt(val) || 1);
    setSelectedComposants(prev => prev.map(c => c.componentId === id ? { ...c, quantiteDemandee: qty } : c));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setInsuffisants([]);

    if (!titre.trim()) { toast.error('Titre requis'); return; }
    if (!encadrantId) { toast.error('Encadrant requis'); return; }
    if (!chefGroupeNom.trim()) { toast.error('Chef de groupe requis'); return; }
    if (selectedComposants.length === 0) { toast.error('Au moins un composant requis'); return; }

    setSubmitting(true);
    try {
      const payload = {
        titre,
        type,
        encadrantId,
        chefGroupeNom: chefGroupeNom.trim(),
        membresNoms: membres,
        composants: selectedComposants.map(c => ({
          componentId: c.componentId,
          quantiteDemandee: c.quantiteDemandee,
        })),
      };

      const res = await api.post('/projects', payload);
      toast.success('Projet créé et composants réservés !');
      setSuccessData({ id: res.data.data.id, credentials: res.data.studentCredentials });
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.insuffisants) {
        setInsuffisants(err.response.data.insuffisants);
        toast.error('Stock insuffisant — vérifiez les quantités');
      } else {
        toast.error(err.response?.data?.error || 'Erreur lors de la création');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUsers) {
    return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  }

  if (successData) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Projet Créé avec Succès !</h1>
          <p className="text-gray-500 mb-8">Le projet et les fiches de décharge ont été générés.</p>

          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 text-left mb-8">
            <h2 className="font-bold text-primary-900 flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5" /> Compte Étudiant Généré
            </h2>
            <p className="text-sm text-primary-700 mb-4">
              Un compte a été créé automatiquement pour le chef de groupe. Veuillez lui transmettre ces identifiants pour qu'il puisse consulter son projet.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-primary-600 uppercase">Email de connexion</label>
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-primary-200 mt-1">
                  <span className="font-mono text-gray-800 font-medium">{successData.credentials?.email}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(successData.credentials?.email);
                      toast.success('Email copié');
                    }}
                    className="text-primary-400 hover:text-primary-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-primary-600 uppercase">Mot de passe</label>
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-primary-200 mt-1">
                  <span className="font-mono text-gray-800 font-medium">{successData.credentials?.password}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(successData.credentials?.password);
                      toast.success('Mot de passe copié');
                    }}
                    className="text-primary-400 hover:text-primary-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => navigate(`/${lab}/projects/${successData.id}`)}
            className="w-full text-lg py-4"
          >
            Accéder à la fiche du projet →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/${lab}/projects`)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créer un projet</h1>
          <p className="text-gray-500 text-sm">Remplissez les informations et réservez les composants</p>
        </div>
      </div>

      {/* Insufficient stock alert */}
      {insuffisants.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-800">Stock insuffisant — le projet n'a pas été créé</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">Réduisez les quantités ou retirez les composants suivants :</p>
          <div className="space-y-1">
            {insuffisants.map(item => (
              <div key={item.componentId} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-red-100">
                <span className="font-medium text-gray-900">{item.nom}</span>
                <span className="text-red-600">
                  Demandé : <b>{item.quantiteDemandee}</b> · Disponible : <b>{item.qtyDisponible}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Informations générales ── */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4">Informations générales</h2>
          <div className="space-y-4">
            <Input
              label="Titre du projet"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex: Robot suiveur de ligne"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de projet</label>
              <div className="flex gap-3">
                {['PFE', 'MINI_PROJET'].map(t => (
                  <label key={t} className={`flex items-center gap-2 flex-1 px-4 py-3 border-2 rounded-xl cursor-pointer transition-colors ${
                    type === t ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" className="sr-only" value={t} checked={type === t} onChange={() => setType(t)} />
                    <span className={`font-semibold text-sm ${type === t ? 'text-primary-700' : 'text-gray-600'}`}>
                      {t === 'PFE' ? 'PFE' : 'Mini Projet'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Encadrant ── */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary-500" /> Encadrant
          </h2>
          <SearchSelect
            label="Sélectionner l'encadrant (superviseur)"
            options={supervisors}
            value={encadrantId}
            onChange={setEncadrantId}
            placeholder="Rechercher un superviseur..."
            required
          />
          {supervisors.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">⚠ Aucun superviseur approuvé dans ce lab</p>
          )}
        </Card>

        {/* ── Équipe ── */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" /> Équipe
          </h2>

          {/* Chef de groupe — free text */}
          <div className="mb-5">
            <Input
              label="Chef de groupe"
              value={chefGroupeNom}
              onChange={e => setChefGroupeNom(e.target.value)}
              placeholder="Ex: Ali Meziane"
              required
            />
          </div>

          {/* Membres — add by typing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Membres supplémentaires
              <span className="text-gray-400 text-xs ml-2">
                ({membres.length} ajouté{membres.length > 1 ? 's' : ''})
              </span>
            </label>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={membreInput}
                onChange={e => setMembreInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMembre(); } }}
                placeholder="Prénom Nom..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addMembre}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {membres.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun membre supplémentaire ajouté</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {membres.map(name => (
                  <div key={name} className="flex items-center gap-1.5 bg-primary-50 border border-primary-200 text-primary-700 text-sm px-3 py-1.5 rounded-full">
                    <span className="font-medium">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeMembre(name)}
                      className="text-primary-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── Composants ── */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4">Composants requis</h2>

          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={componentSearch}
              onChange={e => setComponentSearch(e.target.value)}
              placeholder="Chercher un composant (nom, code)..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searchLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
          </div>

          {/* Search Results */}
          {componentResults.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              {componentResults.map(comp => {
                const alreadyAdded = !!selectedComposants.find(c => c.componentId === comp.id);
                return (
                  <div key={comp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{comp.nom}</p>
                      <p className="text-xs text-gray-400">
                        {comp.armoire} › C{comp.casier}{comp.banque ? ` › B${comp.banque}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comp.qtyDisponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {comp.qtyDisponible} dispo
                    </span>
                    <button
                      type="button"
                      onClick={() => addComposant(comp)}
                      disabled={alreadyAdded}
                      className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                        alreadyAdded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {alreadyAdded ? 'Ajouté' : <><Plus className="w-3 h-3" /> Ajouter</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected composants table */}
          {selectedComposants.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
              <p className="text-sm">Recherchez et ajoutez des composants ci-dessus</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Composant</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Emplacement</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Dispo</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Qté demandée</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedComposants.map(c => {
                    const isInsuffisant = insuffisants.find(i => i.componentId === c.componentId);
                    return (
                      <tr key={c.componentId} className={isInsuffisant ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{c.nom}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {c.armoire} › C{c.casier}{c.banque ? ` › B${c.banque}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.qtyDisponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {c.qtyDisponible}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={c.quantiteDemandee}
                            onChange={e => updateQty(c.componentId, e.target.value)}
                            className={`w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                              isInsuffisant ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeComposant(c.componentId)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="ghost" onClick={() => navigate(`/${lab}/projects`)}>
            Annuler
          </Button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Création...' : 'Créer le projet et réserver les composants'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProjectPage;
