import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary-50">
      <Card className="w-full max-w-md text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 rounded-full">
            <ShieldAlert className="w-12 h-12 text-status-error" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Accès refusé
        </h1>
        
        <p className="text-gray-600 mb-8 px-4">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>

        <Button onClick={() => navigate(-1)} className="w-full max-w-xs">
          Retour
        </Button>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
