/**
 * CASUISTICA-FECHAS-01 — Fase C3A
 * Panel READ-ONLY que muestra los procesos persistidos del empleado en el
 * periodo y el resultado del adapter `mapIncidenciasToLegacyCasuistica`.
 *
 * INVARIANTES:
 *  - Cero writes (ni insert/update/upsert/delete).
 *  - Cero comunicaciones oficiales (FDI/AFI/DELT@).
 *  - No marca `applied_at`.
 *  - No modifica el motor de nómina ni el payload `casuistica` legacy.
 *  - Sólo consume `useHRPayrollIncidencias` (RLS multi-tenant del cliente
 *    Supabase autenticado; sin service_role).
 *
 * Las acciones CRUD están deshabilitadas con tooltip informando "Disponible
 * en Fase C3B".
 */

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CalendarRange,
  Database,
  Eye,
  Info,
  Loader2,
  Plus,
  ShieldOff,
  Pencil,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHRPayrollIncidencias } from '@/hooks/erp/hr/useHRPayrollIncidencias';
import { IncidentTypeBadge } from './IncidentTypeBadge';
import { IncidentStatusBadge, type IncidentStatusFlags } from './IncidentStatusBadge';
import { HRPayrollIncidentFormDialog } from './HRPayrollIncidentFormDialog';
import { HRPromoteLocalCasuisticaDialog } from './HRPromoteLocalCasuisticaDialog';
import { HRCancelIncidentDialog } from './HRCancelIncidentDialog';
import { buildIncidentsFromLocalCasuistica } from '@/lib/hr/incidenciasPromotion';
import { buildEffectiveCasuistica } from '@/lib/hr/effectiveCasuistica';
import { HRCasuisticaConflictsPanel } from './HRCasuisticaConflictsPanel';
import {
  PAYROLL_EFFECTIVE_CASUISTICA_MODE,
  type PayrollEffectiveCasuisticaMode,
} from '@/lib/hr/payrollEffectiveCasuisticaFlag';
import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from '@/lib/hr/casuisticaTypes';
import type {
  ITProcessRow,
  LeaveRequestRow,
  PayrollIncidentRow,
} from '@/lib/hr/incidenciasTypes';

export interface HRPersistedIncidentsPanelProps {
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  /** Si false, no renderiza nada. Default: true. */
  enabled?: boolean;
  /** Permite inyectar un hook alternativo en tests. Por defecto usa el real. */
  useIncidenciasHook?: typeof useHRPayrollIncidencias;
  /**
   * CASUISTICA-FECHAS-01 — Fase C3B2:
   * casuística local actual (Fase B). Si se informa, habilita el botón
   * "Promover datos actuales" que abre el diálogo de promoción.
   * No se mutará. No altera el payload del motor.
   */
  localCasuistica?: CasuisticaState & Partial<CasuisticaDatesExtension>;
  /**
   * CASUISTICA-FECHAS-01 — Fase C3B3B-paso2.
   * Modo activo del flag de payroll, propagado desde el diálogo. Solo
   * afecta a la visualización del panel de conflictos. NO altera por sí
   * mismo el cálculo del motor (ese wiring vive en HRPayrollEntryDialog).
   */
  effectiveMode?: PayrollEffectiveCasuisticaMode;
  className?: string;
}

type Row = {
  key: string;
  source: 'payroll_incidents' | 'it_processes' | 'leave_requests';
  type: string | null;
  from: string | null;
  to: string | null;
  flags: IncidentStatusFlags;
  /** Sólo presente si source==='payroll_incidents'. */
  payrollIncident?: PayrollIncidentRow;
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  // Formato compacto YYYY-MM-DD → DD/MM/YYYY sin Date para evitar TZ.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

function rowsFrom(
  payroll: PayrollIncidentRow[],
  it: ITProcessRow[],
  leave: LeaveRequestRow[],
): Row[] {
  const a: Row[] = payroll.map((r) => ({
    key: `p:${r.id}`,
    source: 'payroll_incidents',
    type: r.incident_type ?? null,
    from: r.applies_from ?? null,
    to: r.applies_to ?? null,
    flags: {
      status: r.status ?? null,
      applied_at: r.applied_at ?? null,
      deleted_at: r.deleted_at ?? null,
      version: r.version ?? null,
      legal_review_required: r.legal_review_required ?? null,
      requires_external_filing: r.requires_external_filing ?? null,
      requires_ss_action: r.requires_ss_action ?? null,
      requires_tax_adjustment: r.requires_tax_adjustment ?? null,
      official_communication_type: r.official_communication_type ?? null,
    },
    payrollIncident: r,
  }));
  const b: Row[] = it.map((r) => ({
    key: `i:${r.id}`,
    source: 'it_processes',
    type: r.process_type ?? null,
    from: r.start_date ?? null,
    to: r.end_date ?? null,
    flags: { status: r.status ?? null },
  }));
  const c: Row[] = leave.map((r) => ({
    key: `l:${r.id}`,
    source: 'leave_requests',
    type: r.leave_type_code ?? null,
    from: r.start_date ?? null,
    to: r.end_date ?? null,
    flags: {
      status: r.workflow_status ?? r.status ?? null,
    },
  }));
  return [...a, ...b, ...c];
}

export function HRPersistedIncidentsPanel({
  companyId,
  employeeId,
  periodYear,
  periodMonth,
  enabled = true,
  useIncidenciasHook,
  localCasuistica,
  effectiveMode = PAYROLL_EFFECTIVE_CASUISTICA_MODE,
  className,
}: HRPersistedIncidentsPanelProps) {
  const hook = useIncidenciasHook ?? useHRPayrollIncidencias;
  const result = hook({ companyId, employeeId, periodYear, periodMonth });
  const [createOpen, setCreateOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<PayrollIncidentRow | null>(null);
  const [cancelIncident, setCancelIncident] = useState<PayrollIncidentRow | null>(null);

  const {
    payrollIncidents,
    itProcesses,
    leaveRequests,
    mapping,
    isLoading,
    error,
    refetch,
  } = result;

  const rows = useMemo(
    () => rowsFrom(payrollIncidents, itProcesses, leaveRequests),
    [payrollIncidents, itProcesses, leaveRequests],
  );

  if (!enabled) return null;
  if (!companyId || !employeeId) return null;

  const legacy = mapping.legacy ?? {};
  const unmapped = mapping.unmapped ?? [];
  const traces = mapping.traces ?? [];
  const legalReview = Boolean(mapping.legalReviewRequired);

  const externalFilingPending = payrollIncidents.some(
    (r) => r.requires_external_filing || r.official_communication_type,
  );

  // Pre-evaluación de promoción para habilitar/deshabilitar el botón.
  const promotionPreview = useMemo(() => {
    if (!localCasuistica) return null;
    return buildIncidentsFromLocalCasuistica({
      casuistica: localCasuistica,
      context: { companyId, employeeId, periodYear, periodMonth },
      existingIncidents: payrollIncidents,
    });
  }, [localCasuistica, companyId, employeeId, periodYear, periodMonth, payrollIncidents]);
  const canPromote = (promotionPreview?.toCreate.length ?? 0) > 0;

  // C3B3A: cálculo del effective preview SOLO para visualización.
  // No se pasa al motor de nómina ni se usa para guardar.
  const effectivePreview = useMemo(() => {
    if (!localCasuistica) return null;
    return buildEffectiveCasuistica({
      localCasuistica,
      persistedLegacy: legacy,
      mappingTraces: traces,
      unmapped,
      legalReviewRequired: legalReview,
      mode: 'persisted_priority',
    });
  }, [localCasuistica, legacy, traces, unmapped, legalReview]);

  return (
    <Card className={cn('mb-4 border-info/30', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Database className="h-4 w-4 text-info mt-0.5" />
            <div>
              <CardTitle className="text-xs font-medium flex items-center gap-2">
                Procesos entre fechas persistidos
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 border-info/40 text-info bg-info/5"
                >
                  <Eye className="h-2.5 w-2.5 mr-0.5" />
                  Read-only
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 border-muted-foreground/30 text-muted-foreground"
                >
                  <ShieldOff className="h-2.5 w-2.5 mr-0.5" />
                  Sin envíos oficiales
                </Badge>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Estos procesos alimentarán la casuística de nómina. En esta fase son
                sólo lectura y no generan comunicaciones oficiales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {localCasuistica && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPromoteOpen(true)}
                disabled={!canPromote}
                title={
                  canPromote
                    ? 'Convertir datos locales en incidencias persistidas'
                    : 'No hay datos locales promovibles.'
                }
                className="h-7 text-[11px] gap-1"
              >
                <Plus className="h-3 w-3" />
                Promover datos actuales
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="h-7 text-[11px] gap-1"
            >
              <Plus className="h-3 w-3" />
              Añadir proceso
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* C3B3A: panel de conflictos local vs persistido (vista informativa) */}
        {effectivePreview && (
          <HRCasuisticaConflictsPanel
            result={effectivePreview}
            mode="persisted_priority"
            effectiveMode={effectiveMode}
          />
        )}

        {/* Estado: error / loading / empty */}
        {error && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-[11px] text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
            <span>
              Error al cargar procesos persistidos:{' '}
              {error instanceof Error ? error.message : String(error)}
            </span>
          </div>
        )}

        {isLoading && !error && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Cargando procesos persistidos…
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/20 text-[11px] text-muted-foreground italic">
            <Info className="h-3.5 w-3.5" />
            Sin procesos persistidos para este empleado en el periodo.
          </div>
        )}

        {/* Tabla de procesos */}
        {!isLoading && !error && rows.length > 0 && (
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-2 py-1.5">Tipo</th>
                  <th className="text-left font-medium px-2 py-1.5">Origen</th>
                  <th className="text-left font-medium px-2 py-1.5">Inicio</th>
                  <th className="text-left font-medium px-2 py-1.5">Fin</th>
                  <th className="text-left font-medium px-2 py-1.5">Estado / Flags</th>
                  <th className="text-right font-medium px-2 py-1.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <IncidentRow
                    key={r.key}
                    row={r}
                    onEdit={(inc) => setEditIncident(inc)}
                    onCancel={(inc) => setCancelIncident(inc)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumen de impacto sobre el motor legacy (informativo, no aplica) */}
        {!isLoading && !error && rows.length > 0 && (
          <>
            <Separator />
            <div className="text-[10px] space-y-1">
              <p className="font-medium text-muted-foreground uppercase">
                Impacto derivado del persistido (informativo)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ImpactItem label="PNR" value={legacy.pnrDias} unit="día(s)" />
                <ImpactItem label="IT/AT" value={legacy.itAtDias} unit="día(s)" />
                <ImpactItem
                  label="Reducción"
                  value={legacy.reduccionJornadaPct}
                  unit="%"
                />
                <ImpactItem
                  label="Atrasos"
                  value={legacy.atrasosITImporte}
                  unit="€"
                />
                <ImpactItem
                  label="Nacimiento"
                  value={legacy.nacimientoDias}
                  unit="día(s)"
                />
                <ImpactItem
                  label="Tipo IT"
                  value={mapping.flags?.itAtTipo}
                />
                <ImpactItem
                  label="Trazas"
                  value={traces.length}
                />
                <ImpactItem
                  label="No mapeadas"
                  value={unmapped.length}
                />
              </div>
              <p className="text-muted-foreground italic pt-1">
                <Info className="h-2.5 w-2.5 inline mr-0.5" />
                Estos valores se calculan a partir de los procesos persistidos. En esta
                fase no sustituyen al payload manual del motor.
              </p>
            </div>
          </>
        )}

        {/* Avisos globales */}
        {!isLoading && !error && (legalReview || unmapped.length > 0 || externalFilingPending) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {legalReview && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-warning/40 text-warning bg-warning/5"
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                Revisión legal requerida
              </Badge>
            )}
            {unmapped.length > 0 && (
              <Badge
                variant="destructive"
                className="text-[10px] gap-1"
                title="Hay procesos persistidos cuyo tipo no se traslada al motor legacy."
              >
                {unmapped.length} no mapeado(s) al motor
              </Badge>
            )}
            {externalFilingPending && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 border-warning/40 text-warning bg-warning/5"
              >
                Comunicación oficial pendiente
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      {createOpen && (
        <HRPayrollIncidentFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          companyId={companyId}
          employeeId={employeeId}
          periodYear={periodYear}
          periodMonth={periodMonth}
          onCreated={() => {
            void refetch?.();
          }}
        />
      )}
      {promoteOpen && localCasuistica && (
        <HRPromoteLocalCasuisticaDialog
          open={promoteOpen}
          onOpenChange={setPromoteOpen}
          casuistica={localCasuistica}
          existingIncidents={payrollIncidents}
          companyId={companyId}
          employeeId={employeeId}
          periodYear={periodYear}
          periodMonth={periodMonth}
          onPromoted={() => {
            void refetch?.();
          }}
        />
      )}
      {editIncident && (
        <HRPayrollIncidentFormDialog
          open={!!editIncident}
          onOpenChange={(o) => {
            if (!o) setEditIncident(null);
          }}
          companyId={companyId}
          employeeId={employeeId}
          periodYear={periodYear}
          periodMonth={periodMonth}
          mode="edit"
          initialIncident={editIncident}
          onUpdated={() => {
            setEditIncident(null);
            void refetch?.();
          }}
        />
      )}
      {cancelIncident && (
        <HRCancelIncidentDialog
          open={!!cancelIncident}
          onOpenChange={(o) => {
            if (!o) setCancelIncident(null);
          }}
          incident={cancelIncident}
          companyId={companyId}
          employeeId={employeeId}
          periodYear={periodYear}
          periodMonth={periodMonth}
          onCancelled={() => {
            setCancelIncident(null);
            void refetch?.();
          }}
        />
      )}
    </Card>
  );
}

/**
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Fila de incidencia con columna de acciones. Reglas:
 *  - Sólo `payroll_incidents` admite editar/cancelar (las otras fuentes
 *    se gestionan desde sus módulos especializados).
 *  - Si `applied_at`: botones disabled, badge "Aplicado a nómina".
 *  - Si `deleted_at`: fila tachada/muted, badge "Cancelada", sin acciones.
 */
function IncidentRow({
  row,
  onEdit,
  onCancel,
}: {
  row: Row;
  onEdit: (inc: PayrollIncidentRow) => void;
  onCancel: (inc: PayrollIncidentRow) => void;
}) {
  const inc = row.payrollIncident ?? null;
  const isApplied = Boolean(inc?.applied_at);
  const isCancelled = Boolean(inc?.deleted_at);
  const canActOnRow =
    row.source === 'payroll_incidents' && !!inc && !isApplied && !isCancelled;

  return (
    <tr
      className={cn(
        'border-t border-border/60',
        isCancelled && 'opacity-60 line-through',
      )}
    >
      <td className="px-2 py-1.5">
        <IncidentTypeBadge type={row.type} source={row.source} />
      </td>
      <td className="px-2 py-1.5 text-muted-foreground text-[10px]">
        {row.source === 'payroll_incidents' && 'payroll_incidents'}
        {row.source === 'it_processes' && 'it_processes'}
        {row.source === 'leave_requests' && 'leave_requests'}
      </td>
      <td className="px-2 py-1.5">
        <span className="inline-flex items-center gap-1">
          <CalendarRange className="h-3 w-3 text-muted-foreground" />
          {fmtDate(row.from)}
        </span>
      </td>
      <td className="px-2 py-1.5">{fmtDate(row.to)}</td>
      <td className="px-2 py-1.5">
        <IncidentStatusBadge flags={row.flags} />
        {isCancelled && (
          <Badge
            variant="outline"
            className="ml-1 text-[9px] h-4 border-muted-foreground/30 text-muted-foreground"
          >
            Cancelada
          </Badge>
        )}
        {isApplied && (
          <Badge
            variant="outline"
            className="ml-1 text-[9px] h-4 border-info/40 text-info bg-info/5"
          >
            Aplicado a nómina
          </Badge>
        )}
      </td>
      <td className="px-2 py-1.5 text-right">
        {row.source === 'payroll_incidents' && !isCancelled && (
          <div className="inline-flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] gap-1"
              disabled={!canActOnRow}
              onClick={() => inc && onEdit(inc)}
              title={
                isApplied
                  ? 'Aplicado a nómina. Requiere recálculo en fase C4.'
                  : 'Editar incidencia'
              }
              aria-label="Editar incidencia"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              disabled={!canActOnRow}
              onClick={() => inc && onCancel(inc)}
              title={
                isApplied
                  ? 'Aplicado a nómina. Requiere recálculo en fase C4.'
                  : 'Cancelar incidencia'
              }
              aria-label="Cancelar incidencia"
            >
              <Ban className="h-3 w-3" />
              Cancelar
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

function ImpactItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
}) {
  const display =
    value === null || value === undefined || value === '' ? '—' : `${value}${unit ? ` ${unit}` : ''}`;
  return (
    <div className="flex items-center justify-between rounded border border-border/60 bg-muted/10 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{display}</span>
    </div>
  );
}

export default HRPersistedIncidentsPanel;