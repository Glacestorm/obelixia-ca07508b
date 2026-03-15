/**
 * HREnvironmentContext — Gestión de entornos DEMO / PREPROD / PROD
 * Controla visibilidad de herramientas, seeds y guardrails por modo.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type HREnvironmentMode = 'demo' | 'preprod' | 'prod';

interface HREnvironmentConfig {
  mode: HREnvironmentMode;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  seedsAllowed: boolean;
  purgeAllowed: boolean;
  demoToolsVisible: boolean;
  requireDoubleConfirm: boolean;
  description: string;
}

const ENV_CONFIGS: Record<HREnvironmentMode, HREnvironmentConfig> = {
  demo: {
    mode: 'demo',
    label: 'DEMO',
    color: 'hsl(40, 96%, 53%)',
    bgClass: 'bg-amber-500/15 dark:bg-amber-500/10',
    borderClass: 'border-amber-500/40',
    seedsAllowed: true,
    purgeAllowed: true,
    demoToolsVisible: true,
    requireDoubleConfirm: false,
    description: 'Entorno de demostración comercial con datos ficticios',
  },
  preprod: {
    mode: 'preprod',
    label: 'PREPROD',
    color: 'hsl(210, 90%, 55%)',
    bgClass: 'bg-blue-500/15 dark:bg-blue-500/10',
    borderClass: 'border-blue-500/40',
    seedsAllowed: false,
    purgeAllowed: false,
    demoToolsVisible: false,
    requireDoubleConfirm: true,
    description: 'Entorno de preproducción para validación controlada',
  },
  prod: {
    mode: 'prod',
    label: 'PRODUCCIÓN',
    color: 'hsl(142, 72%, 40%)',
    bgClass: 'bg-green-500/15 dark:bg-green-500/10',
    borderClass: 'border-green-500/40',
    seedsAllowed: false,
    purgeAllowed: false,
    demoToolsVisible: false,
    requireDoubleConfirm: true,
    description: 'Entorno de producción con datos reales',
  },
};

interface HREnvironmentContextType {
  mode: HREnvironmentMode;
  config: HREnvironmentConfig;
  setMode: (mode: HREnvironmentMode) => void;
  canSeed: boolean;
  canPurge: boolean;
  showDemoTools: boolean;
  needsDoubleConfirm: boolean;
}

const HREnvironmentContext = createContext<HREnvironmentContextType | null>(null);

const STORAGE_KEY = 'obelixia_hr_env_mode';

export function HREnvironmentProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<HREnvironmentMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'demo' || saved === 'preprod' || saved === 'prod')) {
        return saved;
      }
    } catch {}
    return 'demo';
  });

  const setMode = useCallback((newMode: HREnvironmentMode) => {
    setModeState(newMode);
    try { localStorage.setItem(STORAGE_KEY, newMode); } catch {}
  }, []);

  const config = ENV_CONFIGS[mode];

  return (
    <HREnvironmentContext.Provider
      value={{
        mode,
        config,
        setMode,
        canSeed: config.seedsAllowed,
        canPurge: config.purgeAllowed,
        showDemoTools: config.demoToolsVisible,
        needsDoubleConfirm: config.requireDoubleConfirm,
      }}
    >
      {children}
    </HREnvironmentContext.Provider>
  );
}

export function useHREnvironment(): HREnvironmentContextType {
  const ctx = useContext(HREnvironmentContext);
  if (!ctx) {
    // Fallback for components outside provider — default to demo
    return {
      mode: 'demo',
      config: ENV_CONFIGS.demo,
      setMode: () => {},
      canSeed: true,
      canPurge: true,
      showDemoTools: true,
      needsDoubleConfirm: false,
    };
  }
  return ctx;
}

export { ENV_CONFIGS };
