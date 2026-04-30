import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLab } from '../context/LabContext';
import { authService } from '../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const LoginPage = () => {
  const { lab } = useLab();
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isLab3 = lab === 'lab3';
  const bgClass = isLab3 ? 'bg-accent-600' : 'bg-primary-900';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login(lab, { email, password });
      const { token, user } = response.data;
      
      login(token, user);
      
      if (!user.isApproved) {
        navigate(`/${lab}/waiting`);
      } else {
        navigate(`/${lab}/dashboard`);
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bgClass}`}>
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4 text-2xl">
            ⚗️
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SquadLab</h1>
          <p className="text-gray-500 mt-1 uppercase tracking-wider text-sm font-semibold">
            {lab}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre.email@univ.dz"
            required
          />
          
          <div className="relative">
            <Input
              label="Mot de passe"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          <Button type="submit" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to={`/${lab}/register`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Pas encore de compte ? S'inscrire
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
