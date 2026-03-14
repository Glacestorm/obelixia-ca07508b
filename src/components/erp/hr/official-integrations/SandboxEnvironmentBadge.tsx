/**
 * SandboxEnvironmentBadge — Widget reutilizable de visibilidad de entorno sandbox
 * V2-ES.8 T8 P5: Indicador compacto para embeberse en paneles existentes
 * Muestra: entorno activo, estado sandbox, gates, última ejecución, prod_blocked
 */
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FlaskConical, TestTube, ServerCog, Ban, Lock,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from 'lucide-react';
import type { ConnectorEnvironment, EnvironmentStatus, SandboxDomain } from '@/components/erp/hr/shared/sandboxEnvironmentEngine';
import { ENVIRONMENT_STATUS_LABELS, SANDBOX_DISCLAIMERS } from '@/components/erp/hr/shared/sandboxEnvironmentEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  /** Current active environment */
  environment?: ConnectorEnvironment;
  /** Domain-level status */
  status?: EnvironmentStatus;
  /** Domain label */
  domain?: SandboxDomain;
  /** Number of gates passed / total */
  gatesPassed?: number;
  gatesTotal?: number;
  /** Last sandbox execution timestamp */
  lastExecution?: string | null;
  /** Show prod_blocked badge */
  showProdBlocked?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

const ENV_ICONS: Record<ConnectorEnvironment, React.ReactNode> = {
  sandbox: <FlaskConical className="h-2.5 w-2.5" />,
  test: <TestTube className="h-2.5 w-2.5" />,
  preprod: <ServerCog className="h-2.5 w-2.5" />,
  production: <Ban className="h-2.5 w-2.5" />,
};

const ENV_STYLES: Record<ConnectorEnvironment, string> = {
  sandbox: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  test: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preprod: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  production: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function SandboxEnvironmentBadge({
  environment = 'sandbox',
  status,
  domain,
  gatesPassed,
  gatesTotal,
  lastExecution,
  showProdBlocked = true,
  compact = false,
}: Props) {
  const statusMeta = status ? ENVIRONMENT_STATUS_LABELS[status] : null;
  const disclaimer = SANDBOX_DISCLAIMERS[environment];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Environment badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`text-[9px] h-4 px-1.5 flex items-center gap-0.5 ${ENV_STYLES[environment]}`}
            >
              {ENV_ICONS[environment]}
              {!compact && (
                <span>{environment === 'sandbox' ? 'Sandbox' : environment === 'test' ? 'Test' : environment === 'preprod' ? 'Pre-prod' : 'BLOQ'}</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-60 text-[10px]">
            <p className="font-medium mb-0.5">Entorno: {environment}</p>
            <p className="text-muted-foreground">{disclaimer}</p>
          </TooltipContent>
        </Tooltip>

        {/* Status badge */}
        {statusMeta && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${statusMeta.color}`}>
                {status === 'sandbox_enabled' && <CheckCircle2 className="h-2 w-2 mr-0.5" />}
                {status === 'sandbox_ready' && <CheckCircle2 className="h-2 w-2 mr-0.5" />}
                {status === 'gated' && <AlertTriangle className="h-2 w-2 mr-0.5" />}
                {status === 'prod_blocked' && <Lock className="h-2 w-2 mr-0.5" />}
                {!compact && statusMeta.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              Estado: {statusMeta.label}
              {gatesPassed !== undefined && gatesTotal !== undefined && (
                <span className="ml-1">— Gates: {gatesPassed}/{gatesTotal}</span>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Gates indicator */}
        {gatesPassed !== undefined && gatesTotal !== undefined && !compact && (
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            {gatesPassed === gatesTotal ? (
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <XCircle className="h-2.5 w-2.5 text-amber-500" />
            )}
            {gatesPassed}/{gatesTotal}
          </span>
        )}

        {/* Last execution */}
        {lastExecution && !compact && (
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatDistanceToNow(new Date(lastExecution), { locale: es, addSuffix: true })}
          </span>
        )}

        {/* Prod blocked */}
        {showProdBlocked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-destructive/5 text-destructive/70 border-destructive/10 flex items-center gap-0.5">
                <Lock className="h-2 w-2" />
                {!compact && 'Prod bloq.'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              {SANDBOX_DISCLAIMERS.production}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
