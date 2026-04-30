import React from 'react';

const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-primary-100 text-primary-800',
    pending: 'bg-status-pending/10 text-status-pending',
    approved: 'bg-status-approved/10 text-status-approved',
    active: 'bg-status-active/10 text-status-active',
    closed: 'bg-status-closed/10 text-status-closed',
    error: 'bg-status-error/10 text-status-error',
  };

  const classes = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`;

  return (
    <span className={classes}>
      {children}
    </span>
  );
};

export default Badge;
