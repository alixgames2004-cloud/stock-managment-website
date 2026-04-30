import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLab } from '../../context/LabContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PlusCircle, Eye, Pencil, PackagePlus, Trash2, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import ComponentFormModal from './ComponentFormModal';
import AddStockModal from './AddStockModal';

const StockPage = () => {
  const { user } = useAuth();
  const { lab } = useLab();
  const navigate = useNavigate();

  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: '', lab: 'ALL', armoire: '' });
  const [armoires, setArmoires] = useState([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);

  const isAdmin = user?.role === 'LAB_ADMIN';
  const isLab3 = lab === 'lab3';
  const themeHeader = isLab3 ? 'bg-accent-600' : 'bg-primary-800';

  // Derive autocomplete options from already-loaded data (only from user's own lab)
  // This avoids a second API call when the modal opens
  const myComponents = components.filter(c => c.labId === user?.labId);
  const formOptions = {
    armoires: [...new Set(myComponents.map(c => c.armoire).filter(Boolean))].sort(),
    types:    [...new Set(myComponents.map(c => c.type).filter(Boolean))].sort(),
    casiers:  [...new Set(myComponents.map(c => String(c.casier)).filter(Boolean))].sort((a,b) => +a - +b),
    banques:  [...new Set(myComponents.map(c => String(c.banque)).filter(v => v && v !== 'null'))].sort((a,b) => +a - +b),
    nextNumero: myComponents.length > 0 ? Math.max(...myComponents.map(c => c.numero)) + 1 : 1,
  };

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.name) params.name = filters.name;
      if (filters.lab !== 'ALL') params.lab = filters.lab;
      if (filters.armoire) params.armoire = filters.armoire;

      const res = await api.get('/components', { params });
      const data = res.data.data;
      setComponents(data);

      // Build unique armoires list for filter dropdown
      const uniqueArmoires = [...new Set(data.map((c) => c.armoire).filter(Boolean))].sort();
      setArmoires(uniqueArmoires);
    } catch (err) {
      toast.error('Erreur lors du chargement des composants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, [filters.lab, filters.armoire]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComponents();
  };

  const handleDelete = async (component) => {
    if (!window.confirm(`Supprimer "${component.nom}" ?`)) return;
    try {
      await api.delete(`/components/${component.id}`);
      toast.success('Composant supprimé');
      fetchComponents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const openEdit = (component) => {
    setEditingComponent(component);
    setShowFormModal(true);
  };

  const openAddStock = (component) => {
    setSelectedComponent(component);
    setShowAddStockModal(true);
  };

  const headers = ['N°', 'Code Fourn.', 'Nom', 'Type', 'Armoire / Casier / Banque', 'Dispo', 'En Projet', 'Endommagé', 'Perdu', 'Lab', 'Actions'];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des composants électroniques</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingComponent(null); setShowFormModal(true); }}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Ajouter un composant
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6 py-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                placeholder="Nom, code, numéro..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Laboratoire</label>
            <select
              value={filters.lab}
              onChange={(e) => setFilters({ ...filters, lab: e.target.value })}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">Tous les labs</option>
              <option value="LAB1">Lab 1</option>
              <option value="LAB3">Lab 3</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Armoire</label>
            <select
              value={filters.armoire}
              onChange={(e) => setFilters({ ...filters, armoire: e.target.value })}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Toutes</option>
              {armoires.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="secondary">
            <Search className="w-4 h-4 mr-1" />
            Chercher
          </Button>
        </form>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" className="text-primary-500" />
          </div>
        ) : components.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Aucun composant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${themeHeader} text-white`}>
                  {headers.map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {components.map((comp) => {
                  const isMine = comp.labId === user?.labId;
                  const isAvail = comp.qtyDisponible > 0;

                  return (
                    <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{comp.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{comp.codeFournisseur || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{comp.nom}</span>
                          {!isMine && (
                            <span title="Composant d'un autre lab" className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Eye className="w-3 h-3" /> Vue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{comp.type || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{comp.armoire}</span>
                        {comp.casier && <span className="text-gray-400"> › C{comp.casier}</span>}
                        {comp.banque && <span className="text-gray-400"> › B{comp.banque}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isAvail ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {comp.qtyDisponible}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{comp.qtyProjets}</td>
                      <td className="px-4 py-3 text-sm text-orange-600 font-medium">{comp.qtyEndommage}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">{comp.qtyPerdu}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${comp.labNom === 'LAB1' ? 'bg-primary-100 text-primary-700' : 'bg-accent-100 text-accent-600'}`}>
                          {comp.labNom}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/${lab}/stock/${comp.id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {isAdmin && isMine && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => openEdit(comp)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => openAddStock(comp)}>
                                <PackagePlus className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleDelete(comp)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <ComponentFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingComponent(null); }}
        onSuccess={() => { setShowFormModal(false); setEditingComponent(null); fetchComponents(); }}
        component={editingComponent}
        options={formOptions}
      />
      <AddStockModal
        isOpen={showAddStockModal}
        onClose={() => { setShowAddStockModal(false); setSelectedComponent(null); }}
        onSuccess={() => { setShowAddStockModal(false); setSelectedComponent(null); fetchComponents(); }}
        component={selectedComponent}
      />
    </div>
  );
};

export default StockPage;
