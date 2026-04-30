import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Hourglass } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const WaitingApprovalPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary-50">
      <Card className="w-full max-w-md text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary-100 rounded-full">
            <Hourglass className="w-12 h-12 text-primary-500 animate-pulse" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Compte en attente d'approbation
        </h1>
        
        <p className="text-gray-600 mb-6 px-4 leading-relaxed">
          Votre compte a été créé avec succès. Un administrateur doit approuver 
          votre inscription avant que vous puissiez accéder à l'application.
        </p>

        {user && (
          <div className="bg-gray-50 rounded-lg p-4 mb-8 inline-block text-left w-full max-w-xs border border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-1">Informations du compte</p>
            <p className="font-semibold text-gray-900">{user.prenom} {user.nom}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
              {user.role}
            </div>
          </div>
        )}

        <Button variant="ghost" onClick={logout} className="w-full max-w-xs">
          Se déconnecter
        </Button>
      </Card>
    </div>
  );
};

export default WaitingApprovalPage;
