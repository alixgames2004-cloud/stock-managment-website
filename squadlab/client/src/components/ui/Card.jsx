import React from 'react';

const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-sm rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
