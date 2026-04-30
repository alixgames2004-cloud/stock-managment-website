import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLab } from '../../context/LabContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, PackagePlus, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import AddStockModal from './AddStockModal';
import ComponentFormModal from './ComponentFormModal';

const movementTypeColors = {
  ENTREE: 'bg-green-100 text-green-700',
  SORTIE: 'bg-blue-100 text-blue-700',
  RETOUR: 'bg-purple-100 text-purple-700',
  ENDOMMAGE: 'bg-orange-100 text-orange-700',
  PERDU: 'bg-red-100 text-red-700',
};

const ComponentDetailPage = () => {
  const { id } = useParams();
  const { lab } = useLab();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isAdmin = user?.role === 'LAB_ADMIN';
  const isLab3 = lab === 'lab3';

  const fetchComponent = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/components/${id}`);
      setComponent(res.data.data);
    } catch (err) {
      toast.error('Composant introuvable');
      navigate(`/${lab}/stock`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComponent(); }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Spinner size="lg" className="text-primary-500" />
    </div>
  );

  if (!component) return null;

  const isMine = component.labId === user?.labId;
  const themeColor = isLab3 ? 'text-accent-600' : 'text-primary-600';

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900 font-semibold">{value ?? '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/${lab}/stock`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{component.nom}</h1>
            <p className="text-sm text-gray-500">N° {component.numero} · {component.labNom}</p>
          </div>
        </div>
        {isAdmin && isMine && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Pencil className="w-4 h-4 mr-1.5" />
              Modifier
            </Button>
            <Button onClick={() => setShowAddStockModal(true)}>
              <PackagePlus className="w-4 h-4 mr-1.5" />
              Ajouter stock
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <Card className="lg:col-span-1">
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${themeColor}`}>Informations</h2>
          <InfoRow label="Nom" value={component.nom} />
          <InfoRow label="Code fournisseur" value={component.codeFournisseur} />
          <InfoRow label="Type" value={component.type} />
          <InfoRow label="Prix" value={component.prix ? `${component.prix} DA` : null} />
          <InfoRow label="Armoire" value={component.armoire} />
          <InfoRow label="Casier" value={component.casier} />
          <InfoRow label="Banque" value={component.banque ?? '—'} />
          <InfoRow label="Laboratoire" value={component.labNom} />
        </Card>

        {/* Stock Quantities */}
        <Card className="lg:col-span-2">
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${themeColor}`}>État du Stock</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Stock', value: component.qtyStock, color: 'bg-gray-100 text-gray-800' },
              { label: 'Réservé', value: component.qtyReservee, color: 'bg-amber-100 text-amber-700' },
              { label: 'Disponible', value: component.qtyDisponible, color: component.qtyDisponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' },
              { label: 'En Projet', value: component.qtyProjets, color: 'bg-blue-100 text-blue-700' },
              { label: 'Endommagé', value: component.qtyEndommage, color: 'bg-orange-100 text-orange-700' },
              { label: 'Perdu', value: component.qtyPerdu, color: 'bg-red-100 text-red-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-xs font-semibold mt-1 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stock Movement History */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Historique des mouvements</h2>
        </div>
        {component.stockMovements?.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">Aucun mouvement enregistré</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Date', 'Type', 'Quantité', 'Projet lié', 'Effectué par', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {component.stockMovements?.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(m.dateMouvement).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${movementTypeColors[m.typeMouvement] || 'bg-gray-100 text-gray-700'}`}>
                        {m.typeMouvement}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{m.quantite}</td>
                    <td className="px-4 py-3 text-gray-500">{m.project?.titre || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.user ? `${m.user.prenom} ${m.user.nom}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 italic">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddStockModal
        isOpen={showAddStockModal}
        onClose={() => setShowAddStockModal(false)}
        onSuccess={() => { setShowAddStockModal(false); fetchComponent(); }}
        component={component}
      />
      <ComponentFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => { setShowEditModal(false); fetchComponent(); }}
        component={component}
      />
    </div>
  );
};

export default ComponentDetailPage;
