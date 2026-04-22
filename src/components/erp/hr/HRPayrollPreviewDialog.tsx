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
import { Download } from 'lucide-react';
import { buildPayslipRenderModel, computeSourceHash } from '@/engines/erp/hr/payslipRenderModel';
import { downloadPayslipPDF } from '@/engines/erp/hr/payslipPdfGenerator';
import { PAYROLL_LEGAL_NOTICES } from '@/lib/hr/payroll/legalNotices';
import { useState } from 'react';

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
  const [downloading, setDownloading] = useState(false);
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!calculation) return;
    setDownloading(true);
    try {
      const [firstName, ...rest] = (employeeName || 'Empleado').split(' ');
      const model = buildPayslipRenderModel({
        calculation,
        employee: {
          first_name: firstName,
          last_name: rest.join(' '),
          naf: employeeNAF,
          category: categoria,
          grupo_cotizacion: grupo ?? null,
        },
        company: { name: companyName, cif: companyCIF, ccc: companyCCC },
        period: { period_name: periodo },
        currency: 'EUR',
      });
      const hash = await computeSourceHash(calculation);
      downloadPayslipPDF(
        model,
        `nomina-preview-${(employeeName || 'empleado').replace(/\s+/g, '_')}.pdf`,
        'system_generated',
        hash,
      );
    } finally {
      setDownloading(false);
    }
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
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!calculation || downloading}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar PDF
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
                  <p>{PAYROLL_LEGAL_NOTICES.RECEIPT_DELIVERY}</p>
                  <p>{PAYROLL_LEGAL_NOTICES.ACK_MEANING}</p>
                  <p className="italic">{PAYROLL_LEGAL_NOTICES.RETENTION}</p>
                  <p className="pt-1">
                    Esta es una <strong>vista previa interna RRHH</strong>. El acuse persistido por el empleado
                    se gestiona desde el Portal del Empleado, en su sección de nóminas.
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
