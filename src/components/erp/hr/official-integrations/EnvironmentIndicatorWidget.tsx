/**
 * EnvironmentIndicatorWidget — Indicador compacto del entorno activo
 * V2-ES.8 T8: Visibilidad del entorno en cabecera de paneles
 */
import { Badge } from '@/components/ui/badge';
import { FlaskConical, TestTube, ServerCog, Ban, Lock } from 'lucide-react';
import type { ConnectorEnvironment } from '@/components/erp/hr/shared/sandboxEnvironmentEngine';

interface Props {
  activeEnvironment: ConnectorEnvironment;
  productionBlocked: boolean;
  compact?: boolean;
}

const ENV_CONFIG: Record<ConnectorEnvironment, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  sandbox: {
    label: 'Sandbox',
    icon: <FlaskConical className="h-3 w-3" />,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  test: {
    label: 'Test',
    icon: <TestTube className="h-3 w-3" />,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  preprod: {
    label: 'Pre-prod',
    icon: <ServerCog className="h-3 w-3" />,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  production: {
    label: 'BLOQUEADO',
    icon: <Ban className="h-3 w-3" />,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function EnvironmentIndicatorWidget({ activeEnvironment, productionBlocked, compact = false }: Props) {
  const config = ENV_CONFIG[activeEnvironment];

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={`text-[10px] ${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
      {productionBlocked && !compact && (
        <Badge variant="outline" className="text-[9px] bg-destructive/5 text-destructive/70 border-destructive/10 flex items-center gap-0.5">
          <Lock className="h-2.5 w-2.5" />
          Prod bloqueada
        </Badge>
      )}
    </div>
  );
}
