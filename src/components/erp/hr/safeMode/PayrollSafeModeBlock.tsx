/**
 * PayrollSafeModeBlock — S9.21o
 *
 * Bloque ámbar de revisión manual mostrado cuando el normalizer entra en
 * `safeMode` (unidad y/o divisor del salario pactado no determinables con
 * confianza ≥ MEDIA). NO renderiza la mejora voluntaria como si se hubiera
 * calculado. Expone CTAs solo si la acción existe realmente.
 */

import { memo } from 'react';
import { AlertTriangle, FileText, Info, Scale, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NormalizeResult } from '@/engines/erp/hr/salaryNormalizer';

export interface PayrollSafeModeBlockProps {
  normalizer: NormalizeResult;
  /** Si hay un contrato resuelto (id) → CTA "Revisar contrato" habilitado. */
  contractId: string | null;
  /** Si hay empleado seleccionado → necesario para abrir HRContractFormDialog. */
  employeeId: string | null;
  /** Abre HRContractFormDialog con companyId/contractId/employeeId pre-cargados. */
  onOpenContract: () => void;
  className?: string;
  /**
   * S9.21u.1d — Contexto de convenio mostrado como cabecera del bloque safeMode.
   * Estrictamente informativo: NO altera la lógica de safeMode, NO relaja el
   * bloqueo, NO infiere convenio. Si `agreementName` existe se muestra junto al
   * origen (employee_assignment | contract). Si no existe convenio resuelto
   * (`agreementName` vacío y `agreementSource` null/'none'), se renderiza un
   * mensaje explícito "Sin convenio aplicable".
   */
  agreementName?: string | null;
  agreementSource?: 'employee_assignment' | 'contract' | 'none' | null;
  professionalGroup?: string | null;
  /**
   * S9.21u.1h — Contexto adicional de convenio (estrictamente informativo).
   * Ninguna prop nueva altera la lógica de safeMode ni desbloquea cálculos.
   */
  agreementCode?: string | null;
  agreementResolutionStatus?: string | null;
  /** true=tabla encontrada, false=no encontrada, undefined/null=no determinada. */
  tableFound?: boolean | null;
  agreementConflictDetected?: boolean;
  /** Etiqueta de periodo legible, e.g. "04/2026". */
  periodLabel?: string | null;
}

const unidadLabel: Record<NormalizeResult['unidadDetectada'], string> = {
  mensual: 'Mensual',
  anual: 'Anual',
  ambigua: 'Ambigua',
  no_informada: 'No informada',
};

// S9.21u.1h — Etiquetas humanas. El valor técnico se preserva en `title` (tooltip nativo).
// S9.21u.1i — Mapeo robusto: cualquier valor desconocido cae en "No determinable".
const DIVISOR_SOURCE_HUMAN: Record<string, string> = {
  agreement_field: 'Convenio (pagas extra)',
  'agreement.extra_payments': 'Convenio (pagas extra)',
  table_total: 'Tabla salarial (total/mensual)',
  table_annual: 'Tabla salarial (anual/mensual)',
  contract_explicit: 'Contrato',
  none: 'No determinable',
};

const DIVISOR_SOURCE_TECHNICAL: Record<string, string> = {
  agreement_field: 'agreement.extra_payments',
  'agreement.extra_payments': 'agreement.extra_payments',
  table_total: 'table_total',
  table_annual: 'table_annual',
  contract_explicit: 'contract_explicit',
  none: 'none',
};

function getDivisorSourceLabel(source: string | null | undefined): string {
  if (!source) return 'No determinable';
  return DIVISOR_SOURCE_HUMAN[source] ?? 'No determinable';
}

function getDivisorSourceTechnical(source: string | null | undefined): string {
  if (!source) return 'none';
  return DIVISOR_SOURCE_TECHNICAL[source] ?? source;
}

const confianzaLabel: Record<NormalizeResult['confianza'], string> = {
  alta: 'ALTA',
  media: 'MEDIA',
  baja: 'BAJA',
};

/**
 * S9.21u.1h — Subcomponente interno (no exportado). Renderiza el contexto de
 * convenio identificado dentro del bloque safeMode SIN mostrar importes
 * calculados de convenio (base, plus, mejora, fórmula, mínimo). Estrictamente
 * informativo: no desbloquea cálculos ni relaja safeMode.
 */
function SafeModeAgreementContextCard({
  agreementName,
  agreementSource,
  professionalGroup,
  agreementCode,
  tableFound,
  agreementConflictDetected,
  periodLabel,
}: {
  agreementName: string;
  agreementSource?: 'employee_assignment' | 'contract' | 'none' | null;
  professionalGroup?: string | null;
  agreementCode?: string | null;
  tableFound?: boolean | null;
  agreementConflictDetected?: boolean;
  periodLabel?: string | null;
}) {
  const originLabel =
    agreementSource === 'employee_assignment'
      ? 'Empleado'
      : agreementSource === 'contract'
        ? 'Contrato'
        : null;

  // S9.21u.1i — Estados con tooltip explicativo accesible.
  const tableState =
    tableFound === true
      ? {
          label: 'Encontrada',
          Icon: CheckCircle2,
          tone: 'text-success' as const,
          tooltip:
            'Se ha encontrado una tabla salarial compatible con el convenio, grupo y periodo. No se usan importes porque SafeMode mantiene bloqueado el cálculo automático.',
        }
      : tableFound === false
        ? {
            label: 'No encontrada',
            Icon: XCircle,
            tone: 'text-destructive' as const,
            tooltip:
              'No se ha encontrado una tabla salarial compatible para el convenio, grupo o periodo actual.',
          }
        : {
            label: 'Desconocida',
            Icon: HelpCircle,
            tone: 'text-muted-foreground' as const,
            tooltip:
              'No se ha podido determinar el estado de la tabla salarial en este contexto.',
          };

  const TableIcon = tableState.Icon;

  const conflictTooltip = agreementConflictDetected
    ? 'Se ha detectado una diferencia entre fuentes de convenio. Se aplica la prioridad configurada por el flujo de nómina.'
    : undefined;

  return (
    <div
      className="rounded-md border border-warning/40 bg-background p-3 space-y-2"
      aria-label="Convenio identificado en modo seguro de nómina"
    >
      {/* Cabecera */}
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <Scale className="h-4 w-4 text-warning shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            Convenio identificado
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {originLabel && (
            <Badge
              variant="outline"
              className="text-[10px] border-warning/50 text-foreground"
              title={`Origen: ${originLabel}`}
            >
              Origen: {originLabel}
            </Badge>
          )}
          {agreementConflictDetected && (
            <Badge
              variant="outline"
              className="text-[10px] border-destructive/50 text-destructive whitespace-normal"
              title={conflictTooltip}
            >
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Conflicto detectado
            </Badge>
          )}
        </div>
      </div>

      {/* Nombre del convenio */}
      <p
        className="text-sm font-medium text-foreground break-words leading-snug"
        title={agreementName}
      >
        {agreementName}
      </p>

      {/* Grid informativo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
        <div className="p-1.5 rounded border border-warning/20 bg-warning/5">
          <span className="block text-muted-foreground">Grupo profesional</span>
          <p
            className="font-medium text-foreground break-words"
            title={professionalGroup || 'No informado'}
          >
            {professionalGroup || 'No informado'}
          </p>
        </div>
        <div className="p-1.5 rounded border border-warning/20 bg-warning/5">
          <span className="block text-muted-foreground">Periodo</span>
          <p
            className="font-medium text-foreground"
            title={periodLabel || 'Periodo no determinado'}
          >
            {periodLabel || 'Periodo no determinado'}
          </p>
        </div>
        <div className="p-1.5 rounded border border-warning/20 bg-warning/5">
          <span className="block text-muted-foreground">Tabla salarial</span>
          <p
            className={cn('font-medium inline-flex items-center gap-1', tableState.tone)}
            title={tableState.tooltip}
          >
            <TableIcon className="h-3 w-3 shrink-0" />
            {tableState.label}
          </p>
        </div>
      </div>

      {agreementCode && (
        <p className="text-[10px] text-muted-foreground break-words" title={agreementCode}>
          Código: <span className="font-mono text-foreground break-all">{agreementCode}</span>
        </p>
      )}

      {/* Mensaje legal/operativo */}
      <div className="flex items-start gap-1.5 text-[11px] text-foreground/80 bg-warning/5 border border-warning/20 rounded p-2">
        <Info className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
        <p className="break-words">
          El convenio se ha identificado, pero el cálculo automático permanece
          bloqueado porque la parametrización salarial del contrato es
          incoherente o incompleta.
        </p>
      </div>
    </div>
  );
}

export const PayrollSafeModeBlock = memo(function PayrollSafeModeBlock({
  normalizer,
  contractId,
  employeeId,
  onOpenContract,
  className,
  agreementName,
  agreementSource,
  professionalGroup,
  agreementCode,
  agreementResolutionStatus: _agreementResolutionStatus,
  tableFound,
  agreementConflictDetected,
  periodLabel,
}: PayrollSafeModeBlockProps) {
  const canOpenContract = !!contractId && !!employeeId;
  const hasAgreement = !!(agreementName && agreementName.trim().length > 0);
  const noAgreementResolved =
    !hasAgreement && (!agreementSource || agreementSource === 'none');

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-3',
        className,
      )}
      role="alert"
      aria-live="polite"
      aria-label={
        hasAgreement
          ? 'Convenio identificado en modo seguro de nómina'
          : 'Sin convenio aplicable en modo seguro de nómina'
      }
    >
      {/* S9.21u.1h — Tarjeta detallada de contexto de convenio. Se muestra ANTES
          del título de safeMode. Estrictamente informativa: no muestra importes
          calculados ni desbloquea el cálculo automático. */}
      {hasAgreement && (
        <SafeModeAgreementContextCard
          agreementName={agreementName as string}
          agreementSource={agreementSource}
          professionalGroup={professionalGroup}
          agreementCode={agreementCode}
          tableFound={tableFound}
          agreementConflictDetected={agreementConflictDetected}
          periodLabel={periodLabel}
        />
      )}
      {noAgreementResolved && (
        <div className="rounded-md border border-warning/30 bg-background px-3 py-2 text-xs text-foreground">
          <span className="font-semibold">Sin convenio aplicable.</span>
          <span className="ml-1 text-foreground/70">
            No se ha encontrado convenio en los datos laborales del empleado ni
            en el contrato vigente.
          </span>
        </div>
      )}

      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            Mejora voluntaria en modo seguro — pendiente de revisión manual
          </p>
          <p className="text-[11px] text-foreground/80 mt-0.5">
            La unidad o el régimen de pagas del salario no son determinables con
            confianza suficiente. No se calcula automáticamente la mejora voluntaria
            para evitar reinterpretaciones erróneas del contrato.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="p-1.5 bg-background rounded border border-warning/30">
          <span className="text-muted-foreground block">Unidad detectada</span>
          <p className="font-medium text-foreground">{unidadLabel[normalizer.unidadDetectada]}</p>
        </div>
        <div className="p-1.5 bg-background rounded border border-warning/30">
          <span className="text-muted-foreground block">Divisor (pagas/año)</span>
          <p className="font-medium text-foreground">
            {normalizer.divisor ?? 'no determinable'}
          </p>
        </div>
        <div className="p-1.5 bg-background rounded border border-warning/30">
          <span className="text-muted-foreground block">Fuente divisor</span>
          <p
            className="font-medium text-foreground break-words"
            title={getDivisorSourceTechnical(normalizer.divisorSource)}
          >
            {getDivisorSourceLabel(normalizer.divisorSource)}
          </p>
        </div>
        <div className="p-1.5 bg-background rounded border border-warning/30">
          <span className="text-muted-foreground block">Confianza</span>
          <Badge
            variant="outline"
            className="text-[10px] border-warning/60 text-warning bg-warning/5"
          >
            {confianzaLabel[normalizer.confianza]}
          </Badge>
        </div>
      </div>

      {normalizer.safeModeReason && (
        <div
          className="text-[11px] text-foreground bg-background rounded p-2 border border-warning/30 break-words whitespace-normal"
          title={normalizer.safeModeReason}
        >
          <span className="font-semibold text-foreground">Motivo del bloqueo: </span>
          {normalizer.safeModeReason}
        </div>
      )}

      <div className="text-[11px] text-foreground/80">
        <span className="font-semibold text-foreground">Acción requerida: </span>
        corrige el contrato del empleado (informa <code className="text-[10px]">base_salary</code> o
        <code className="text-[10px]"> annual_salary</code> de forma coherente) o configura
        <code className="text-[10px]"> extra_payments</code> en el convenio aplicable.
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
        {canOpenContract ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenContract}
            className="gap-1.5 border-warning/60 bg-background text-foreground hover:bg-warning/15 hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            Revisar contrato del empleado
          </Button>
        ) : (
          <p className="text-[11px] italic text-foreground/70 inline-flex items-center gap-1 px-2 py-1 rounded border border-warning/30 bg-background">
            <Info className="h-3 w-3 shrink-0" />
            No hay contrato activo localizable; revisar expediente.
          </p>
        )}
        <p className="text-[11px] italic text-foreground/70 inline-flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0" />
          El convenio aplicable se gestiona en <span className="font-medium text-foreground">HR → Compliance → Convenios Colectivos</span>.
        </p>
      </div>
    </div>
  );
});

export default PayrollSafeModeBlock;