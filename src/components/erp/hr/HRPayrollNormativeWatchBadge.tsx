/**
 * HRPayrollNormativeWatchBadge — S9.21d Bloque D
 * Indicador compacto de vigilancia normativa para la cabecera del diálogo de nómina.
 *
 * Muestra:
 *  - última revisión normativa (relativa)
 *  - nº de cambios pendientes de aprobación
 *  - botón "Verificar ahora" (modo manual)
 *  - estado de auto-check
 *
 * NUNCA autoaplica cambios normativos. Solo informa y permite disparar verificación manual.
 * Política: cambios en SMI / IRPF / SS / MEI / CRA / límites flex requieren aprobación humana.
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { useRegulatoryWatch } from '@/hooks/admin/useRegulatoryWatch';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HRNormativeWatchModal } from './HRNormativeWatchModal';

interface HRPayrollNormativeWatchBadgeProps {
  companyId?: string;
  /** Si true, muestra una versión más compacta (sólo icono + nº pendientes). */
  compact?: boolean;
  className?: string;
}

export function HRPayrollNormativeWatchBadge({
  companyId,
  compact = false,
  className,
}: HRPayrollNormativeWatchBadgeProps) {
  const {
    items,
    config,
    isChecking,
    runManualCheck,
  } = useRegulatoryWatch(companyId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'overview' | 'pending' | 'verified'>('overview');

  // Cambios pendientes con impacto directo en cálculo de nómina
  const pendingPayrollImpact = useMemo(
    () =>
      items.filter(
        (i) =>
          i.approval_status === 'pending' &&
          (i.requires_payroll_recalc || i.impact_level === 'high' || i.impact_level === 'critical'),
      ),
    [items],
  );

  const lastCheck = config?.last_check_at;
  const lastCheckLabel = lastCheck
    ? formatDistanceToNow(new Date(lastCheck), { locale: es, addSuffix: true })
    : 'sin verificar';

  const autoEnabled = config?.auto_check_enabled ?? false;
  const hasPending = pendingPayrollImpact.length > 0;

  if (!companyId) return null;

  return (
    <>
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex items-center gap-1.5', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                setModalTab(hasPending ? 'pending' : 'overview');
                setModalOpen(true);
              }}
              aria-label={hasPending ? `Vigilancia normativa: ${pendingPayrollImpact.length} pendientes` : 'Vigilancia normativa al día'}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Badge
                variant={hasPending ? 'destructive' : 'secondary'}
                className={cn(
                  'h-6 gap-1 px-2 text-[11px] font-medium cursor-pointer hover:opacity-90 transition-opacity',
                  hasPending ? '' : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/30',
                )}
              >
              {hasPending ? (
                <ShieldAlert className="h-3 w-3" />
              ) : (
                <ShieldCheck className="h-3 w-3" />
              )}
              {compact ? (
                <span>{pendingPayrollImpact.length || '✓'}</span>
              ) : (
                <span>
                  Normativa{' '}
                  {hasPending
                    ? `· ${pendingPayrollImpact.length} pdte.`
                    : '· al día'}
                </span>
              )}
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs space-y-1.5">
            <p className="font-semibold text-xs">Vigilancia normativa</p>
            <p className="text-[11px] text-muted-foreground">
              Última revisión: <strong>{lastCheckLabel}</strong>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Modo: <strong>{autoEnabled ? `automático (${config?.check_frequency ?? 'diario'})` : 'manual'}</strong>
            </p>
            {hasPending ? (
              <p className="text-[11px] text-destructive font-medium">
                {pendingPayrollImpact.length} cambio(s) con impacto en nómina pendientes de aprobación.
              </p>
            ) : (
              <p className="text-[11px] text-primary">
                Sin cambios pendientes con impacto en nómina.
              </p>
            )}
            <p className="text-[10px] text-primary italic pt-1 border-t">
              Click para abrir el panel de normativa.
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isChecking}
              onClick={() => runManualCheck()}
              aria-label="Verificar normativa ahora"
            >
              <RefreshCw className={cn('h-3 w-3', isChecking && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-[11px]">Verificar normativa ahora</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>

      <HRNormativeWatchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={companyId}
        initialTab={modalTab}
      />
    </>
  );
}

export default HRPayrollNormativeWatchBadge;