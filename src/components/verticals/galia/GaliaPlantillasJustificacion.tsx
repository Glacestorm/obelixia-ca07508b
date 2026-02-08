/**
 * GALIA - Plantillas de Justificación de Gastos (Refactorizado)
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Calculator, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useJustificacionState,
  JustificacionHeader,
  GastoForm,
  GastosTable,
  ResumenPartidas,
} from './justificacion';

interface GaliaPlantillasJustificacionProps {
  codigoExpediente?: string;
  presupuestoAprobado?: number;
  porcentajeAyuda?: number;
  className?: string;
}

export function GaliaPlantillasJustificacion({
  codigoExpediente = 'LEADER-2026-XXXX',
  presupuestoAprobado = 50000,
  porcentajeAyuda = 50,
  className,
}: GaliaPlantillasJustificacionProps) {
  const {
    gastos,
    activeTab,
    setActiveTab,
    nuevoGasto,
    setNuevoGasto,
    totales,
    resumenPartidas,
    validaciones,
    handleAddGasto,
    handleRemoveGasto,
    handleExportExcel,
  } = useJustificacionState({ presupuestoAprobado, porcentajeAyuda, codigoExpediente });

  const handlePrint = () => window.print();

  return (
    <div className={cn("space-y-6", className)}>
      <JustificacionHeader
        codigoExpediente={codigoExpediente}
        presupuestoAprobado={presupuestoAprobado}
        totales={totales}
        onPrint={handlePrint}
        onExport={handleExportExcel}
      />

      {/* Validaciones */}
      {(validaciones.errores.length > 0 || validaciones.avisos.length > 0) && (
        <div className="space-y-2">
          {validaciones.errores.map((error, idx) => (
            <div key={`error-${idx}`} className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive">{error}</span>
            </div>
          ))}
          {validaciones.avisos.map((aviso, idx) => (
            <div key={`aviso-${idx}`} className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
              <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span className="text-warning-foreground">{aviso}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formulario" className="gap-2">
            <Plus className="h-4 w-4" />
            Añadir gasto
          </TabsTrigger>
          <TabsTrigger value="listado" className="gap-2">
            <FileText className="h-4 w-4" />
            Listado ({gastos.length})
          </TabsTrigger>
          <TabsTrigger value="resumen" className="gap-2">
            <Calculator className="h-4 w-4" />
            Resumen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulario" className="mt-4">
          <GastoForm
            nuevoGasto={nuevoGasto}
            setNuevoGasto={setNuevoGasto}
            onAdd={handleAddGasto}
          />
        </TabsContent>

        <TabsContent value="listado" className="mt-4">
          <GastosTable gastos={gastos} onRemove={handleRemoveGasto} />
        </TabsContent>

        <TabsContent value="resumen" className="mt-4">
          <ResumenPartidas resumenPartidas={resumenPartidas} totales={totales} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaPlantillasJustificacion;
