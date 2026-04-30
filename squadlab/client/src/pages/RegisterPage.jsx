import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLab } from '../context/LabContext';
import { authService } from '../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

const RegisterPage = () => {
  const { lab } = useLab();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
    annee: '',
    specialite: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isLab3 = lab === 'lab3';
  const bgClass = isLab3 ? 'bg-accent-600' : 'bg-primary-900';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'STUDENT' && {
          annee: formData.annee,
          specialite: formData.specialite
        })
      };

      await authService.register(lab, payload);
      
      toast.success("Inscription réussie ! En attente d'approbation.");
      
      setTimeout(() => {
        navigate(`/${lab}/login`);
      }, 2000);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: 'STUDENT', label: 'Étudiant' },
    { value: 'SUPERVISOR', label: 'Encadrant' },
    { value: 'LAB_ADMIN', label: 'Administrateur Lab' }
  ];

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-12 ${bgClass}`}>
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inscription</h1>
          <p className="text-gray-500 mt-1 uppercase tracking-wider text-sm font-semibold">
            SquadLab {lab}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              required
            />
            <Input
              label="Nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre.email@univ.dz"
            required
          />
          
          <div className="relative">
            <Input
              label="Mot de passe"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Input
            label="Confirmer le mot de passe"
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <Select
            label="Rôle"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
            required
          />

          {formData.role === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <Input
                label="Année d'étude"
                name="annee"
                placeholder="Ex: L3, M1..."
                value={formData.annee}
                onChange={handleChange}
                required
              />
              <Input
                label="Spécialité"
                name="specialite"
                placeholder="Ex: ISIL, SEI..."
                value={formData.specialite}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? 'Inscription...' : 'S\'inscrire'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to={`/${lab}/login`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Déjà un compte ? Se connecter
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
