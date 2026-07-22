import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UnitPreferences,
  PressureUnit,
  TemperatureUnit,
  DEFAULT_UNIT_PREFERENCES,
} from '../lib/units';

const STORAGE_KEY = 'unit-preferences';

interface UnitsContextType {
  units: UnitPreferences;
  setPressureUnit: (unit: PressureUnit) => void;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export const useUnits = () => {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
};

function loadInitial(): UnitPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_UNIT_PREFERENCES;
    const parsed = JSON.parse(saved);
    return {
      pressure: parsed.pressure === 'psi' ? 'psi' : 'kPa',
      temperature: parsed.temperature === 'F' ? 'F' : 'C',
    };
  } catch {
    return DEFAULT_UNIT_PREFERENCES;
  }
}

export const UnitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [units, setUnits] = useState<UnitPreferences>(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  }, [units]);

  const setPressureUnit = (unit: PressureUnit) => {
    setUnits((prev) => ({ ...prev, pressure: unit }));
  };

  const setTemperatureUnit = (unit: TemperatureUnit) => {
    setUnits((prev) => ({ ...prev, temperature: unit }));
  };

  return (
    <UnitsContext.Provider value={{ units, setPressureUnit, setTemperatureUnit }}>
      {children}
    </UnitsContext.Provider>
  );
};
