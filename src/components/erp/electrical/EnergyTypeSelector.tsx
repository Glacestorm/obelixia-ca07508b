/**
 * EnergyTypeSelector - Reusable filter component for energy type
 */
import { Button } from '@/components/ui/button';
import { Zap, Flame, Sun, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnergyType, ENERGY_TYPE_LABELS } from '@/hooks/erp/useEnergyTypeFilter';

interface Props {
  value: EnergyType;
  onChange: (value: EnergyType) => void;
  showAll?: boolean;
  showMixed?: boolean;
  size?: 'sm' | 'default';
}

const TYPE_CONFIG: Record<EnergyType, { icon: React.ElementType; color: string }> = {
  all: { icon: Layers, color: '' },
  electricity: { icon: Zap, color: 'text-amber-500' },
  gas: { icon: Flame, color: 'text-blue-500' },
  solar: { icon: Sun, color: 'text-orange-400' },
  mixed: { icon: Layers, color: 'text-purple-500' },
};

export function EnergyTypeSelector({ value, onChange, showAll = true, showMixed = false, size = 'sm' }: Props) {
  const types: EnergyType[] = [
    ...(showAll ? ['all' as const] : []),
    'electricity', 'gas', 'solar',
    ...(showMixed ? ['mixed' as const] : []),
  ];

  return (
    <div className="flex items-center gap-1">
      {types.map(type => {
        const config = TYPE_CONFIG[type];
        const Icon = config.icon;
        const isActive = value === type;
        return (
          <Button
            key={type}
            variant={isActive ? 'default' : 'ghost'}
            size={size === 'sm' ? 'sm' : 'default'}
            className={cn("gap-1 text-xs h-7 px-2", isActive && "shadow-sm")}
            onClick={() => onChange(type)}
          >
            <Icon className={cn("h-3.5 w-3.5", !isActive && config.color)} />
            {ENERGY_TYPE_LABELS[type]}
          </Button>
        );
      })}
    </div>
  );
}

export default EnergyTypeSelector;
