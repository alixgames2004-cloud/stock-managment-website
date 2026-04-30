import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const LabContext = createContext();

export const LabProvider = ({ children }) => {
  const [lab, setLab] = useState('lab1');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/lab3')) {
      setLab('lab3');
    } else if (location.pathname.startsWith('/lab1')) {
      setLab('lab1');
    }
  }, [location]);

  return (
    <LabContext.Provider value={{ lab, setLab }}>
      {children}
    </LabContext.Provider>
  );
};

export const useLab = () => useContext(LabContext);
