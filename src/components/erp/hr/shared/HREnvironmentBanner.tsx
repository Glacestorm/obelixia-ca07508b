/**
 * HREnvironmentBanner — Banner visual de entorno DEMO/PREPROD/PROD
 * Se muestra siempre en la cabecera del módulo RRHH
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useHREnvironment, type HREnvironmentMode } from '@/contexts/HREnvironmentContext';
import { Beaker, Server, ShieldCheck, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODE_ICONS: Record<HREnvironmentMode, React.ElementType> = {
  demo: Beaker,
  preprod: Server,
  prod: ShieldCheck,
};

const MODE_LABELS: Record<HREnvironmentMode, string> = {
  demo: 'DEMO',
  preprod: 'PREPROD',
  prod: 'PRODUCCIÓN',
};

export function HREnvironmentBanner() {
  const { mode, config, setMode } = useHREnvironment();
  const Icon = MODE_ICONS[mode];

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-1.5 rounded-lg border text-sm transition-all',
      config.bgClass,
      config.borderClass,
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: config.color }} />
        <span className="font-semibold text-xs tracking-wider" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground hidden md:inline">
          — {config.description}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs">
            Cambiar
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Entorno RRHH</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(['demo', 'preprod', 'prod'] as HREnvironmentMode[]).map((m) => {
            const MIcon = MODE_ICONS[m];
            return (
              <DropdownMenuItem
                key={m}
                onClick={() => setMode(m)}
                className={cn('cursor-pointer gap-2', mode === m && 'bg-accent')}
              >
                <MIcon className="h-4 w-4" />
                <div>
                  <p className="font-medium text-xs">{MODE_LABELS[m]}</p>
                </div>
                {mode === m && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">Activo</Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
