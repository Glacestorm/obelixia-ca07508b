/**
 * useEnergyTypeFilter - Shared filter state for energy type across the module
 */
import { useState, useCallback } from 'react';

export type EnergyType = 'all' | 'electricity' | 'gas' | 'solar' | 'mixed';

export const ENERGY_TYPE_LABELS: Record<EnergyType, string> = {
  all: 'Todos',
  electricity: 'Electricidad',
  gas: 'Gas',
  solar: 'Solar',
  mixed: 'Mixto',
};

export const ENERGY_TYPE_ICONS: Record<EnergyType, string> = {
  all: '⚡🔥☀️',
  electricity: '⚡',
  gas: '🔥',
  solar: '☀️',
  mixed: '🔄',
};

export const ENERGY_TYPE_COLORS: Record<EnergyType, string> = {
  all: 'text-foreground',
  electricity: 'text-amber-500',
  gas: 'text-blue-500',
  solar: 'text-orange-400',
  mixed: 'text-purple-500',
};

export function useEnergyTypeFilter(defaultType: EnergyType = 'all') {
  const [energyType, setEnergyType] = useState<EnergyType>(defaultType);

  const filterByType = useCallback(<T extends { energy_type?: string }>(items: T[]): T[] => {
    if (energyType === 'all') return items;
    return items.filter(item => item.energy_type === energyType);
  }, [energyType]);

  return { energyType, setEnergyType, filterByType, labels: ENERGY_TYPE_LABELS };
}
