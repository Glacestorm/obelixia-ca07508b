/**
 * useHRPremiumSettings — P9.10 Premium Settings Manager
 * Manages configuration for all 8 Premium HR modules.
 * Settings are persisted in localStorage per company.
 */

import { useState, useCallback, useEffect } from 'react';

export type PremiumModuleKey =
  | 'security' | 'ai_governance' | 'workforce' | 'fairness'
  | 'twin' | 'legal' | 'cnae' | 'role_experience';

export interface ModuleSettings {
  enabled: boolean;
  autoRefreshSeconds: number;
  alertThreshold: 'low' | 'medium' | 'high';
  description: string;
}

export interface PremiumSettings {
  modules: Record<PremiumModuleKey, ModuleSettings>;
  globalAutoRefresh: boolean;
  globalRefreshInterval: number;
  dashboardLayout: 'compact' | 'expanded';
  notificationsEnabled: boolean;
}

const MODULE_META: Record<PremiumModuleKey, { label: string; description: string }> = {
  security: { label: 'Security & Data Masking', description: 'Enmascaramiento de datos, SoD y auditoría de accesos.' },
  ai_governance: { label: 'AI Governance', description: 'Gobernanza de modelos IA, auditorías de sesgo y decisiones.' },
  workforce: { label: 'Workforce Planning', description: 'Planificación estratégica de fuerza laboral y escenarios.' },
  fairness: { label: 'Fairness Engine', description: 'Motor de equidad, análisis salarial y casos de justicia.' },
  twin: { label: 'Digital Twin', description: 'Gemelo digital organizacional, snapshots y alertas de divergencia.' },
  legal: { label: 'Legal Engine', description: 'Generación de contratos, biblioteca de cláusulas y compliance.' },
  cnae: { label: 'CNAE Intelligence', description: 'Inteligencia sectorial, perfiles CNAE y evaluación de riesgos.' },
  role_experience: { label: 'Role Experience', description: 'Experiencia personalizada por rol y dashboards dinámicos.' },
};

const DEFAULT_SETTINGS: PremiumSettings = {
  modules: Object.fromEntries(
    (Object.keys(MODULE_META) as PremiumModuleKey[]).map(key => [
      key,
      { enabled: true, autoRefreshSeconds: 120, alertThreshold: 'medium' as const, description: MODULE_META[key].description },
    ])
  ) as Record<PremiumModuleKey, ModuleSettings>,
  globalAutoRefresh: true,
  globalRefreshInterval: 120,
  dashboardLayout: 'compact',
  notificationsEnabled: true,
};

const STORAGE_KEY = 'hr_premium_settings';

function getStorageKey(companyId: string) {
  return `${STORAGE_KEY}_${companyId}`;
}

export function useHRPremiumSettings(companyId?: string) {
  const [settings, setSettings] = useState<PremiumSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (!companyId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(companyId));
      if (stored) {
        const parsed = JSON.parse(stored) as PremiumSettings;
        // Merge with defaults to handle new keys
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, modules: { ...DEFAULT_SETTINGS.modules, ...parsed.modules } });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
    setIsDirty(false);
  }, [companyId]);

  const updateModuleSetting = useCallback(<K extends keyof ModuleSettings>(
    moduleKey: PremiumModuleKey,
    field: K,
    value: ModuleSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: { ...prev.modules[moduleKey], [field]: value },
      },
    }));
    setIsDirty(true);
  }, []);

  const updateGlobalSetting = useCallback(<K extends keyof PremiumSettings>(
    field: K,
    value: PremiumSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const toggleModule = useCallback((moduleKey: PremiumModuleKey) => {
    setSettings(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: { ...prev.modules[moduleKey], enabled: !prev.modules[moduleKey].enabled },
      },
    }));
    setIsDirty(true);
  }, []);

  const saveSettings = useCallback(() => {
    if (!companyId) return;
    localStorage.setItem(getStorageKey(companyId), JSON.stringify(settings));
    setIsDirty(false);
  }, [companyId, settings]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setIsDirty(true);
  }, []);

  const enabledCount = Object.values(settings.modules).filter(m => m.enabled).length;

  return {
    settings,
    isDirty,
    enabledCount,
    totalModules: 8,
    moduleMeta: MODULE_META,
    updateModuleSetting,
    updateGlobalSetting,
    toggleModule,
    saveSettings,
    resetToDefaults,
  };
}

export default useHRPremiumSettings;
