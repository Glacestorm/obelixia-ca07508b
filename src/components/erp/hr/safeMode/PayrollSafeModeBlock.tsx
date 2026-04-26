/**
 * PayrollSafeModeBlock — S9.21o
 *
 * Bloque ámbar de revisión manual mostrado cuando el normalizer entra en
 * `safeMode` (unidad y/o divisor del salario pactado no determinables con
 * confianza ≥ MEDIA). NO renderiza la mejora voluntaria como si se hubiera
 * calculado. Expone CTAs solo si la acción existe realmente.
 */

import { memo } from 'react';
import { AlertTriangle, FileText, Info } from 'lucide-react';
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
}

const unidadLabel: Record<NormalizeResult['unidadDetectada'], string> = {
  mensual: 'Mensual',
  anual: 'Anual',
  ambigua: 'Ambigua',
  no_informada: 'No informada',
};

const divisorSourceLabel: Record<NormalizeResult['divisorSource'], string> = {
  agreement_field: 'agreement.extra_payments',
  table_total: 'tabla salarial (total/mensual)',
  table_annual: 'tabla salarial (anual/mensual)',
  none: 'no determinable',
};

const confianzaLabel: Record<NormalizeResult['confianza'], string> = {
  alta: 'ALTA',
  media: 'MEDIA',
  baja: 'BAJA',
};

export const PayrollSafeModeBlock = memo(function PayrollSafeModeBlock({
  normalizer,
  contractId,
  employeeId,
  onOpenContract,
  className,
  agreementName,
  agreementSource,
  professionalGroup,
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
    >
      {/* S9.21u.1d — Cabecera contextual de convenio. Se muestra ANTES del
          título de safeMode para preservar el contexto operativo aunque el
          normalizer haya bloqueado el cálculo automático. */}
      {hasAgreement && (
        <div className="rounded-md border border-warning/30 bg-background px-3 py-2 text-xs text-foreground">
          <span className="font-semibold">Convenio asignado:</span>{' '}
          <span>{agreementName}</span>
          {agreementSource && agreementSource !== 'none' && (
            <Badge
              variant="outline"
              className="ml-2 text-[10px] border-warning/50 text-foreground"
            >
              Origen:{' '}
              {agreementSource === 'employee_assignment' ? 'Empleado' : 'Contrato'}
            </Badge>
          )}
          {professionalGroup && (
            <Badge
              variant="outline"
              className="ml-2 text-[10px] border-warning/50 text-foreground"
            >
              Grupo: {professionalGroup}
            </Badge>
          )}
        </div>
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
          <p className="font-medium text-foreground truncate" title={divisorSourceLabel[normalizer.divisorSource]}>
            {divisorSourceLabel[normalizer.divisorSource]}
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
        <div className="text-[11px] text-foreground bg-background rounded p-2 border border-warning/30">
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