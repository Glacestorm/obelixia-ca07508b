/**
 * GALIA - Header del módulo de Justificación
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Printer, FileSpreadsheet, Save } from 'lucide-react';
import { JustificacionTotales } from './types';

interface JustificacionHeaderProps {
  codigoExpediente: string;
  presupuestoAprobado: number;
  totales: JustificacionTotales;
  onPrint: () => void;
  onExport: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function JustificacionHeader({
  codigoExpediente,
  presupuestoAprobado,
  totales,
  onPrint,
  onExport,
}: JustificacionHeaderProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Plantilla de Justificación de Gastos
            </CardTitle>
            <CardDescription className="mt-1">
              Expediente: {codigoExpediente}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Presupuesto</div>
            <div className="text-lg font-bold">{formatCurrency(presupuestoAprobado)}</div>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Justificado</div>
            <div className="text-lg font-bold text-primary">{formatCurrency(totales.totalJustificado)}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Pendiente</div>
            <div className="text-lg font-bold">{formatCurrency(totales.diferencia)}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground">% Ejecución</div>
            <div className="text-lg font-bold">{totales.porcentajeEjecucion.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">Ayuda estimada</div>
            <div className="text-lg font-bold text-emerald-600">{formatCurrency(totales.ayudaCalculada)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
