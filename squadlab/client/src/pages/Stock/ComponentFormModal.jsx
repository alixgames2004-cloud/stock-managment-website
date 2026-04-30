import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ComboInput from '../../components/ui/ComboInput';
import Button from '../../components/ui/Button';

/**
 * ComponentFormModal — Add or Edit a component.
 * 
 * Options (armoires, types, casiers, banques, nextNumero) are passed in as props
 * from StockPage which already has the data loaded — no extra API call, instant open.
 * 
 * N° inventaire is always auto-generated server-side; it is shown read-only.
 */
const ComponentFormModal = ({ isOpen, onClose, onSuccess, component, options = {} }) => {
  const { user } = useAuth();
  const isEditing = !!component;

  const emptyForm = {
    nom: '', codeFournisseur: '', prix: '', type: '',
    armoire: '', casier: '', banque: '', qtyStock: '',
  };

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Populate form from component prop when editing, or reset on add
  useEffect(() => {
    if (!isOpen) return;
    if (component) {
      setFormData({
        nom: component.nom || '',
        codeFournisseur: component.codeFournisseur || '',
        prix: component.prix != null ? String(component.prix) : '',
        type: component.type || '',
        armoire: component.armoire || '',
        casier: component.casier != null ? String(component.casier) : '',
        banque: component.banque != null ? String(component.banque) : '',
        qtyStock: '',
      });
    } else {
      setFormData(emptyForm);
    }
    setErrors({});
  }, [isOpen, component?.id]); // Only re-run when the modal opens or switches component

  const validate = () => {
    const errs = {};
    if (!formData.nom.trim()) errs.nom = 'Nom requis';
    if (!formData.armoire.trim()) errs.armoire = 'Armoire requise';
    if (!formData.casier) errs.casier = 'Casier requis';
    if (!isEditing && !formData.qtyStock) errs.qtyStock = 'Quantité initiale requise';
    if (!isEditing && formData.qtyStock && parseInt(formData.qtyStock) < 0) errs.qtyStock = 'Doit être ≥ 0';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        nom: formData.nom,
        codeFournisseur: formData.codeFournisseur || null,
        prix: formData.prix ? parseFloat(formData.prix) : null,
        type: formData.type || null,
        armoire: formData.armoire,
        casier: parseInt(formData.casier),
        banque: formData.banque ? parseInt(formData.banque) : null,
      };

      if (isEditing) {
        await api.put(`/components/${component.id}`, payload);
        toast.success('Composant mis à jour');
      } else {
        await api.post('/components', {
          ...payload,
          // numero is intentionally omitted — server auto-increments it
          qtyStock: parseInt(formData.qtyStock),
          labId: user.labId,
        });
        toast.success('Composant créé avec succès');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Modifier — ${component?.nom}` : 'Ajouter un composant'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* N° inventaire — read-only, auto-assigned */}
        {!isEditing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-100 rounded-lg">
            <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">N° inventaire</span>
            <span className="ml-auto text-sm font-bold text-primary-700">
              #{options.nextNumero ?? '—'}
            </span>
            <span className="text-xs text-primary-400">(auto-assigné)</span>
          </div>
        )}

        {/* Nom */}
        <Input
          label="Nom du composant"
          name="nom"
          value={formData.nom}
          onChange={onChange}
          placeholder="Ex: Arduino Uno R3"
          error={errors.nom}
          required
        />

        {/* Code fournisseur + Prix */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Code fournisseur"
            name="codeFournisseur"
            value={formData.codeFournisseur}
            onChange={onChange}
            placeholder="Ex: ARD-UNO-R3"
          />
          <Input
            label="Prix (DA)"
            name="prix"
            type="number"
            step="0.01"
            min="0"
            value={formData.prix}
            onChange={onChange}
            placeholder="0.00"
          />
        </div>

        {/* Type */}
        <ComboInput
          label="Type"
          value={formData.type}
          onChange={set('type')}
          options={options.types || []}
          placeholder="Ex: Module, Capteur, Carte..."
          error={errors.type}
        />

        {/* Location group */}
        <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">📍 Emplacement physique</p>

          <ComboInput
            label="Armoire"
            value={formData.armoire}
            onChange={set('armoire')}
            options={options.armoires || []}
            placeholder="Ex: LAB01-A, LAB01-B..."
            error={errors.armoire}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <ComboInput
              label="Casier (tiroir)"
              value={formData.casier}
              onChange={set('casier')}
              options={options.casiers || []}
              placeholder="Ex: 1, 2, 3..."
              error={errors.casier}
              required
              type="number"
            />
            <ComboInput
              label="Banque (emplacement)"
              value={formData.banque}
              onChange={set('banque')}
              options={options.banques || []}
              placeholder="Ex: 1, 2, 3..."
              error={errors.banque}
              type="number"
            />
          </div>
          <p className="text-xs text-gray-400 italic">
            Armoire → Casier → Banque : chaque composant occupe une banque unique dans son casier.
          </p>
        </div>

        {/* Quantité initiale (create only) */}
        {!isEditing && (
          <div className="pt-1 border-t border-gray-100">
            <Input
              label="Quantité initiale"
              name="qtyStock"
              type="number"
              min="0"
              value={formData.qtyStock}
              onChange={onChange}
              placeholder="Ex: 10"
              error={errors.qtyStock}
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Enregistré dans l'historique comme "Arrivage initial"
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ComponentFormModal;
