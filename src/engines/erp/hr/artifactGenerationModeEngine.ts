/**
 * artifactGenerationModeEngine.ts — Selector Automático/Manual de generación de ficheros
 * 
 * Gestiona el modo de generación de artefactos oficiales (TA.2, Contrat@, FDI, etc.):
 * - automatic: genera ficheros automáticamente al guardar empleado
 * - manual: genera bajo demanda con botón explícito
 * 
 * Persistencia MVP: localStorage por empresa
 * Futuro: tabla en BD para configuración por empresa
 */

// ── Types ──

export type GenerationMode = 'automatic' | 'manual';

export interface GenerationModeConfig {
  mode: GenerationMode;
  autoGenerateOnHire: boolean;      // TA.2 Alta + Contrat@ al crear empleado
  autoGenerateOnTermination: boolean; // TA.2 Baja al informar fecha de baja
  autoGenerateOnExtension: boolean;  // TA.2 Variación (V01) al prorrogar
  allowPostEditBeforeSubmit: boolean; // Siempre true — edición post-generación
}

export const DEFAULT_CONFIG: GenerationModeConfig = {
  mode: 'automatic',
  autoGenerateOnHire: true,
  autoGenerateOnTermination: true,
  autoGenerateOnExtension: true,
  allowPostEditBeforeSubmit: true,
};

const STORAGE_KEY_PREFIX = 'hr_artifact_gen_mode_';

// ── Functions ──

/**
 * Get the generation mode configuration for a company.
 */
export function getGenerationModeConfig(companyId: string): GenerationModeConfig {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${companyId}`);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save the generation mode configuration for a company.
 */
export function setGenerationModeConfig(companyId: string, config: Partial<GenerationModeConfig>): void {
  try {
    const current = getGenerationModeConfig(companyId);
    const merged = { ...current, ...config };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${companyId}`, JSON.stringify(merged));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if automatic generation is enabled for a specific trigger.
 */
export function shouldAutoGenerate(
  companyId: string,
  trigger: 'hire' | 'termination' | 'extension',
): boolean {
  const config = getGenerationModeConfig(companyId);
  if (config.mode !== 'automatic') return false;

  switch (trigger) {
    case 'hire': return config.autoGenerateOnHire;
    case 'termination': return config.autoGenerateOnTermination;
    case 'extension': return config.autoGenerateOnExtension;
    default: return false;
  }
}

/**
 * Mode labels for UI display.
 */
export const GENERATION_MODE_LABELS: Record<GenerationMode, { label: string; description: string; icon: string }> = {
  automatic: {
    label: 'Automático',
    description: 'Genera TA.2, Contrat@ y demás ficheros automáticamente al guardar. Puede editar antes de enviar.',
    icon: '⚡',
  },
  manual: {
    label: 'Manual',
    description: 'Genera ficheros bajo demanda con botones explícitos.',
    icon: '🔧',
  },
};
