import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const AddStockModal = ({ isOpen, onClose, onSuccess, component }) => {
  const [quantite, setQuantite] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setQuantite(''); setNotes(''); }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantite || parseInt(quantite) <= 0) {
      toast.error('Quantité doit être un entier positif');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/components/${component.id}/add-stock`, {
        quantite: parseInt(quantite),
        notes: notes || undefined,
      });
      toast.success(`${quantite} unité(s) ajoutée(s) au stock`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'ajout de stock');
    } finally {
      setLoading(false);
    }
  };

  if (!component) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter au stock"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Ajout...' : 'Confirmer'}
          </Button>
        </>
      }
    >
      <div className="mb-5 p-4 bg-primary-50 rounded-lg border border-primary-100">
        <p className="font-semibold text-gray-900">{component.nom}</p>
        <p className="text-sm text-gray-500 mt-1">
          Stock actuel: <span className="font-bold text-primary-600">{component.qtyStock}</span> unités
        </p>
        <p className="text-sm text-gray-500">
          Disponible: <span className="font-bold text-green-600">{component.qtyDisponible}</span> unités
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Quantité à ajouter *"
          type="number"
          min="1"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          required
        />
        <Input
          label="Notes (optionnel)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Livraison fournisseur..."
        />
      </form>
    </Modal>
  );
};

export default AddStockModal;
