/**
 * PayrollSafeModeSaveDialog — S9.21o
 *
 * AlertDialog NO bloqueante mostrado antes de persistir una nómina cuyo
 * `agreement_resolution_status === 'manual_review_required'`. Obliga al
 * usuario a confirmar conscientemente que se guardará SIN mejora voluntaria
 * calculada. Cancelar mantiene el dialog principal abierto sin persistir.
 */

import { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NormalizeResult } from '@/engines/erp/hr/salaryNormalizer';

export interface PayrollSafeModeSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  normalizer: NormalizeResult | null;
  isSaving?: boolean;
  onConfirm: () => void;
}

const unidadLabel: Record<NonNullable<NormalizeResult['unidadDetectada']>, string> = {
  mensual: 'Mensual',
  anual: 'Anual',
  ambigua: 'Ambigua',
  no_informada: 'No informada',
};

const divisorSourceLabel: Record<NonNullable<NormalizeResult['divisorSource']>, string> = {
  agreement_field: 'agreement.extra_payments',
  table_total: 'tabla (total/mensual)',
  table_annual: 'tabla (anual/mensual)',
  none: 'no determinable',
};

export const PayrollSafeModeSaveDialog = memo(function PayrollSafeModeSaveDialog({
  open,
  onOpenChange,
  normalizer,
  isSaving = false,
  onConfirm,
}: PayrollSafeModeSaveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-warning/15 text-warning">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle className="text-left">
                Nómina sin mejora voluntaria calculada
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-2 text-sm">
                Esta nómina se guardará en <span className="font-medium">modo seguro</span>: la
                mejora voluntaria no se ha podido calcular automáticamente porque la unidad o el
                régimen de pagas del salario no son determinables con confianza suficiente.
                Requiere revisión manual del contrato del empleado o del convenio aplicable.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {normalizer && (
          <div className="mt-2 rounded-md border border-warning/30 bg-warning/5 p-3 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block">Unidad detectada</span>
                <p className="font-medium">{unidadLabel[normalizer.unidadDetectada]}</p>
              </div>
              <div>
                <span className="text-muted-foreground block">Divisor (pagas/año)</span>
                <p className="font-medium">{normalizer.divisor ?? 'no determinable'}</p>
              </div>
              <div>
                <span className="text-muted-foreground block">Fuente</span>
                <p className="font-medium truncate" title={divisorSourceLabel[normalizer.divisorSource]}>
                  {divisorSourceLabel[normalizer.divisorSource]}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground block">Confianza</span>
                <p className="font-medium uppercase">{normalizer.confianza}</p>
              </div>
            </div>
            {normalizer.safeModeReason && (
              <div className="pt-1 border-t border-warning/20 text-[11px] text-warning-foreground/90 dark:text-warning">
                <span className="font-medium">Motivo: </span>
                {normalizer.safeModeReason}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
          La traza quedará marcada como
          <code className="text-[10px] mx-1">manual_review_required</code>
          para auditoría. ¿Deseas continuar y guardar la nómina sin mejora voluntaria?
        </p>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isSaving}>Cancelar y revisar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSaving}
            className={cn('bg-warning text-warning-foreground hover:bg-warning/90')}
          >
            {isSaving ? 'Guardando…' : 'Guardar de todos modos'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

export default PayrollSafeModeSaveDialog;