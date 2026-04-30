import React from 'react';
import Badge from './Badge';

const StatusBadge = ({ status }) => {
  const statusMap = {
    'EN_ATTENTE': { variant: 'pending', label: 'En Attente' },
    'APPROUVE': { variant: 'approved', label: 'Approuvé' },
    'EN_COURS': { variant: 'active', label: 'En Cours' },
    'EXPOSE': { variant: 'closed', label: 'Exposé' },
  };

  const config = statusMap[status] || { variant: 'error', label: status || 'Inconnu' };

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
