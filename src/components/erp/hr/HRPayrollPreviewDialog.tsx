/**
 * HRPayrollPreviewDialog — S9.21e
 * Vista previa del recibo de nómina tal como lo verá el empleado.
 * Usa el motor real (simulateES) y el componente oficial ESPayrollSlipDetail.
 *
 * - Imprime / exporta usando la lógica existente del recibo.
 * - Respeta la regla "ocultar conceptos a 0" del slip.
 * - Sin maquetas: la vista es exactamente la que se entregará/imprimirá.
 */
import { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Printer, Info } from 'lucide-react';
import { ESPayrollSlipDetail } from './localization/es/ESPayrollSlipDetail';
import type { ESPayrollCalculation } from '@/hooks/erp/hr/useESPayrollBridge';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculation: ESPayrollCalculation | null;
  loading?: boolean;
  employeeName?: string;
  employeeNAF?: string;
  companyName?: string;
  companyCIF?: string;
  companyCCC?: string;
  periodo?: string;
  grupo?: number;
  categoria?: string;
}

export function HRPayrollPreviewDialog({
  open,
  onOpenChange,
  calculation,
  loading,
  employeeName,
  employeeNAF,
  companyName,
  companyCIF,
  companyCCC,
  periodo,
  grupo,
  categoria,
}: Props) {
  const handlePrint = () => {
    window.print();
  };

  const summary = useMemo(() => {
    if (!calculation) return null;
    const s = calculation.summary;
    return {
      devengos: s.totalDevengos,
      deducciones: s.totalDeducciones,
      liquido: s.liquidoPercibir,
      coste: s.totalDevengos + s.totalCosteEmpresa,
    };
  }, [calculation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Vista previa del recibo de nómina
            {periodo && <Badge variant="outline">{periodo}</Badge>}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Esta es la nómina exacta que recibirá el empleado. Conceptos a 0 o no aplicables se ocultan automáticamente.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!calculation}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-2 px-2">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Calculando recibo con el motor oficial...
            </div>
          ) : !calculation ? (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <Info className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p>No se pudo generar la vista previa.</p>
              <p className="text-xs">
                Asegúrate de tener un empleado seleccionado, salario base &gt; 0 y bases de cotización SS cargadas para el año.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              <ESPayrollSlipDetail
                calculation={calculation}
                employeeName={employeeName}
                employeeNAF={employeeNAF}
                companyName={companyName}
                companyCIF={companyCIF}
                companyCCC={companyCCC}
                periodo={periodo}
                grupo={grupo}
                categoria={categoria}
              />

              {summary && (
                <div className="rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground text-xs flex items-center gap-1">
                    <Info className="h-3 w-3" /> Aclaración legal
                  </p>
                  <p>
                    La firma o acuse del trabajador acredita la <strong>recepción</strong> del recibo, no su conformidad
                    con los conceptos liquidados. La empresa debe entregar copia (física o digital) y conservarla
                    durante al menos 4 años (LGSS Art. 21 / LGT Art. 66).
                  </p>
                  <p className="pt-1 italic">
                    Bloque informativo · El registro persistente del acuse de recibo del empleado
                    <strong> aún no está conectado</strong> (preparado para iteración futura).
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default HRPayrollPreviewDialog;
