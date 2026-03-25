import { cn } from '@/lib/utils';
import type { SemaphoreColor } from './PriorityCalculator';

interface SemaphoreIndicatorProps {
  color: SemaphoreColor;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
};

const colorMap: Record<SemaphoreColor, string> = {
  red: 'bg-red-500 shadow-red-500/50',
  yellow: 'bg-yellow-500 shadow-yellow-500/50',
  green: 'bg-emerald-500 shadow-emerald-500/50',
};

const labelMap: Record<SemaphoreColor, string> = {
  red: 'Crítico',
  yellow: 'Moderado',
  green: 'Normal',
};

const textColorMap: Record<SemaphoreColor, string> = {
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  green: 'text-emerald-600 dark:text-emerald-400',
};

export function SemaphoreIndicator({ color, size = 'md', showLabel = false, className }: SemaphoreIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full shadow-lg inline-block',
          sizeMap[size],
          colorMap[color],
          color === 'red' && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={cn('text-xs font-medium', textColorMap[color])}>
          {labelMap[color]}
        </span>
      )}
    </div>
  );
}

export default SemaphoreIndicator;
