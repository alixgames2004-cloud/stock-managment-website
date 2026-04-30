import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Loader2,
  RefreshCw, CheckSquare,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

const STATUTS = ['RENDU', 'ENDOMMAGE', 'PERDU'];

const statutStyle = {
  RENDU:    { border: 'border-green-400',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'Rendu' },
  ENDOMMAGE:{ border: 'border-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', label: 'Endommagé' },
  PERDU:    { border: 'border-red-400',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'Perdu' },
};

// ── Confirmation modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ summary, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      <div className="bg-red-50 border-b border-red-100 px-6 py-5">
        <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" /> Confirmer la clôture du projet ?
        </h2>
        <p className="text-sm text-red-700 mt-1">Cette action est <b>irréversible</b>.</p>
      </div>
      <div className="px-6 py-5 space-y-2">
        <p className="text-sm text-gray-600 mb-3">Récapitulatif des statuts finaux :</p>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm"><b className="text-green-700">{summary.rendu}</b> composant(s) rendu(s) — <b>{summary.renduQty}</b> unité(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span className="text-sm"><b className="text-orange-700">{summary.endommage}</b> composant(s) endommagé(s) — <b>{summary.endommagéQty}</b> unité(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm"><b className="text-red-700">{summary.perdu}</b> composant(s) perdu(s) — <b>{summary.perduQty}</b> unité(s)</span>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
        <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Retour
        </button>
        <button onClick={onConfirm} disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Confirmer définitivement
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const CloseProjectPage = () => {
  const { id } = useParams();
  const { lab } = useLab();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statuts, setStatuts] = useState({}); // { dischargeItemId: 'RENDU' | 'ENDOMMAGE' | 'PERDU' }
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/projects/${id}`);
        const p = res.data.data;
        if (p.statut !== 'EN_COURS') {
          navigate(`/${lab}/projects/${id}`);
          return;
        }
        setProject(p);
        // Initialise all DANS_PROJET items to RENDU
        const init = {};
        (p.dischargeSheets || []).forEach(s =>
          (s.items || []).forEach(i => {
            if (i.statutRetour === 'DANS_PROJET') init[i.id] = 'RENDU';
          })
        );
        setStatuts(init);
      } catch {
        toast.error('Projet introuvable');
        navigate(`/${lab}/projects`);
      } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  // Group sheets with DANS_PROJET items only
  const sheetsWithItems = useMemo(() => {
    if (!project) return [];
    return (project.dischargeSheets || [])
      .map(s => ({ ...s, items: (s.items || []).filter(i => i.statutRetour === 'DANS_PROJET' && i.quantiteAccordee > 0) }))
      .filter(s => s.items.length > 0);
  }, [project]);

  const markAll = (s) => {
    const next = {};
    Object.keys(statuts).forEach(k => { next[k] = s; });
    setStatuts(next);
  };

  // Live summary
  const summary = useMemo(() => {
    const allItems = sheetsWithItems.flatMap(s => s.items);
    const byStatut = (s) => allItems.filter(i => statuts[i.id] === s);
    const sumQty = (items) => items.reduce((a, i) => a + i.quantiteAccordee, 0);
    const renduItems = byStatut('RENDU');
    const endItems = byStatut('ENDOMMAGE');
    const perduItems = byStatut('PERDU');
    return {
      rendu: renduItems.length, renduQty: sumQty(renduItems),
      endommage: endItems.length, endommagéQty: sumQty(endItems),
      perdu: perduItems.length, perduQty: sumQty(perduItems),
    };
  }, [statuts, sheetsWithItems]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const composants = Object.entries(statuts).map(([dischargeItemId, statutRetour]) => {
        const item = sheetsWithItems.flatMap(s => s.items).find(i => i.id === dischargeItemId);
        return { dischargeItemId, statutRetour, quantite: parseInt(item.quantiteAccordee) };
      });
      await api.patch(`/projects/${id}/close`, { composants });
      toast.success('Projet clôturé avec succès. Statut : EXPOSÉ.');
      navigate(`/${lab}/projects/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la clôture');
      setShowModal(false);
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  if (!project) return null;

  return (
    <>
      {showModal && (
        <ConfirmModal
          summary={summary}
          onConfirm={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(`/${lab}/projects/${id}`)} className="mt-1 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clôturer le projet — <span className="text-primary-700">{project.titre}</span></h1>
            <p className="text-sm text-gray-500 mt-1">Définissez le statut final de chaque composant avant de clôturer.</p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <b>⚠️ Cette action est irréversible.</b> Le projet passera en état <b>EXPOSÉ</b> et aucune modification ne sera possible.
          </p>
        </div>

        {/* Quick action */}
        <div className="flex justify-end">
          <button onClick={() => markAll('RENDU')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 border border-green-300 bg-green-50 rounded-lg hover:bg-green-100">
            <CheckSquare className="w-4 h-4" /> Tout marquer comme RENDU
          </button>
        </div>

        {/* Sheets + items */}
        {sheetsWithItems.length === 0 ? (
          <Card><p className="text-center py-8 text-gray-400">Aucun composant en cours de projet.</p></Card>
        ) : sheetsWithItems.map(sheet => (
          <Card key={sheet.id} className="p-0 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-gray-700">{sheet.numeroFiche}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sheet.isRefresh ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {sheet.isRefresh ? 'Rafraîchissement' : 'Initiale'}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{sheet.items.length} composant(s)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Composant</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qté accordée</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sheet.items.map(item => {
                  const s = statuts[item.id] || 'RENDU';
                  const style = statutStyle[s];
                  return (
                    <tr key={item.id} className={`${style.bg} transition-colors`}>
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {item.componentNom}
                        <span className="text-xs text-gray-400 ml-2">{item.componentArmoire} › C{item.componentCasier}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">{item.quantiteAccordee}</td>
                      <td className="px-4 py-3">
                        <select
                          value={s}
                          onChange={e => setStatuts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className={`border-2 ${style.border} ${style.text} rounded-lg px-3 py-1.5 text-sm font-semibold bg-white focus:outline-none cursor-pointer`}
                        >
                          <option value="RENDU">✅ Rendu</option>
                          <option value="ENDOMMAGE">🟠 Endommagé</option>
                          <option value="PERDU">🔴 Perdu</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ))}

        {/* Live summary */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider text-primary-600">Récapitulatif</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Rendus</p>
                <p className="font-bold text-green-800 text-lg">{summary.rendu} <span className="text-sm font-normal">types</span></p>
                <p className="text-xs text-green-700">{summary.renduQty} unités</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
              <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Endommagés</p>
                <p className="font-bold text-orange-800 text-lg">{summary.endommage} <span className="text-sm font-normal">types</span></p>
                <p className="text-xs text-orange-700">{summary.endommagéQty} unités</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Perdus</p>
                <p className="font-bold text-red-800 text-lg">{summary.perdu} <span className="text-sm font-normal">types</span></p>
                <p className="text-xs text-red-700">{summary.perduQty} unités</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="flex justify-end gap-3 pb-8">
          <button onClick={() => navigate(`/${lab}/projects/${id}`)} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={Object.keys(statuts).length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> Confirmer la clôture
          </button>
        </div>
      </div>
    </>
  );
};

export default CloseProjectPage;
