/**
 * GALIA - Plantillas de Justificación de Gastos
 * Formularios y exportación Excel/PDF para beneficiarios
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Euro, 
  Plus, 
  Trash2, 
  Download, 
  FileSpreadsheet,
  FileText,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Info,
  Printer,
  Save,
  Upload,
  Calendar,
  Building2,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Tipos de partidas presupuestarias LEADER
const PARTIDAS_PRESUPUESTARIAS = [
  { id: 'obra_civil', nombre: 'Obra civil y construcción', elegible: true },
  { id: 'instalaciones', nombre: 'Instalaciones técnicas', elegible: true },
  { id: 'maquinaria', nombre: 'Maquinaria y equipamiento', elegible: true },
  { id: 'mobiliario', nombre: 'Mobiliario', elegible: true },
  { id: 'vehiculos', nombre: 'Vehículos (solo uso profesional)', elegible: true },
  { id: 'intangibles', nombre: 'Activos intangibles (software, patentes)', elegible: true },
  { id: 'honorarios', nombre: 'Honorarios profesionales', elegible: true },
  { id: 'publicidad', nombre: 'Publicidad y difusión', elegible: true },
  { id: 'formacion', nombre: 'Formación', elegible: true },
  { id: 'otros', nombre: 'Otros gastos elegibles', elegible: true },
  { id: 'iva', nombre: 'IVA (si no recuperable)', elegible: true },
  { id: 'no_elegible', nombre: 'Gastos no elegibles', elegible: false },
];

interface GastoJustificacion {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  proveedor: string;
  nifProveedor: string;
  concepto: string;
  partida: string;
  baseImponible: number;
  iva: number;
  total: number;
  fechaPago: string;
  medioPago: 'transferencia' | 'domiciliacion' | 'tarjeta' | 'efectivo';
  observaciones?: string;
}

interface ResumenPartida {
  partida: string;
  nombre: string;
  presupuestado: number;
  justificado: number;
  diferencia: number;
  porcentaje: number;
  elegible: boolean;
}

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
  const [gastos, setGastos] = useState<GastoJustificacion[]>([]);
  const [activeTab, setActiveTab] = useState('formulario');
  
  // Estado del formulario de nuevo gasto
  const [nuevoGasto, setNuevoGasto] = useState<Partial<GastoJustificacion>>({
    partida: '',
    medioPago: 'transferencia',
  });

  // Cálculos automáticos
  const totales = useMemo(() => {
    const totalJustificado = gastos.reduce((sum, g) => sum + g.total, 0);
    const baseTotal = gastos.reduce((sum, g) => sum + g.baseImponible, 0);
    const ivaTotal = gastos.reduce((sum, g) => sum + g.iva, 0);
    const elegibleTotal = gastos
      .filter(g => {
        const partida = PARTIDAS_PRESUPUESTARIAS.find(p => p.id === g.partida);
        return partida?.elegible;
      })
      .reduce((sum, g) => sum + g.total, 0);
    
    const ayudaCalculada = Math.min(elegibleTotal * (porcentajeAyuda / 100), presupuestoAprobado * (porcentajeAyuda / 100));
    
    return {
      totalJustificado,
      baseTotal,
      ivaTotal,
      elegibleTotal,
      ayudaCalculada,
      diferencia: presupuestoAprobado - totalJustificado,
      porcentajeEjecucion: (totalJustificado / presupuestoAprobado) * 100,
    };
  }, [gastos, presupuestoAprobado, porcentajeAyuda]);

  // Resumen por partidas
  const resumenPartidas = useMemo((): ResumenPartida[] => {
    return PARTIDAS_PRESUPUESTARIAS.map(partida => {
      const gastosPartida = gastos.filter(g => g.partida === partida.id);
      const justificado = gastosPartida.reduce((sum, g) => sum + g.total, 0);
      const presupuestado = presupuestoAprobado * 0.1; // Simplificado - en real vendría del expediente
      
      return {
        partida: partida.id,
        nombre: partida.nombre,
        presupuestado,
        justificado,
        diferencia: presupuestado - justificado,
        porcentaje: presupuestado > 0 ? (justificado / presupuestado) * 100 : 0,
        elegible: partida.elegible,
      };
    }).filter(r => r.justificado > 0 || r.presupuestado > 0);
  }, [gastos, presupuestoAprobado]);

  // Validaciones
  const validaciones = useMemo(() => {
    const errores: string[] = [];
    const avisos: string[] = [];

    // Validar efectivo > 1000€
    const efectivoTotal = gastos
      .filter(g => g.medioPago === 'efectivo')
      .reduce((sum, g) => sum + g.total, 0);
    if (efectivoTotal > 1000) {
      errores.push(`Pagos en efectivo (${efectivoTotal.toFixed(2)}€) superan el límite de 1.000€`);
    }

    // Validar 3 ofertas para > 18.000€
    const gastosGrandes = gastos.filter(g => g.baseImponible > 18000);
    if (gastosGrandes.length > 0) {
      avisos.push(`${gastosGrandes.length} gasto(s) superan 18.000€ - requieren 3 ofertas comparables`);
    }

    // Validar fechas
    gastos.forEach(g => {
      if (g.fechaPago && g.fechaFactura && new Date(g.fechaPago) < new Date(g.fechaFactura)) {
        errores.push(`Factura ${g.numeroFactura}: fecha de pago anterior a fecha de factura`);
      }
    });

    // Validar ejecución
    if (totales.porcentajeEjecucion < 70) {
      avisos.push(`Ejecución al ${totales.porcentajeEjecucion.toFixed(1)}% - podría reducirse la ayuda proporcionalmente`);
    }

    return { errores, avisos };
  }, [gastos, totales]);

  // Handlers
  const handleAddGasto = useCallback(() => {
    if (!nuevoGasto.numeroFactura || !nuevoGasto.proveedor || !nuevoGasto.partida) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const base = nuevoGasto.baseImponible || 0;
    const iva = nuevoGasto.iva || 0;

    const gasto: GastoJustificacion = {
      id: crypto.randomUUID(),
      numeroFactura: nuevoGasto.numeroFactura || '',
      fechaFactura: nuevoGasto.fechaFactura || new Date().toISOString().split('T')[0],
      proveedor: nuevoGasto.proveedor || '',
      nifProveedor: nuevoGasto.nifProveedor || '',
      concepto: nuevoGasto.concepto || '',
      partida: nuevoGasto.partida,
      baseImponible: base,
      iva: iva,
      total: base + iva,
      fechaPago: nuevoGasto.fechaPago || '',
      medioPago: nuevoGasto.medioPago || 'transferencia',
      observaciones: nuevoGasto.observaciones,
    };

    setGastos(prev => [...prev, gasto]);
    setNuevoGasto({ partida: '', medioPago: 'transferencia' });
    toast.success('Gasto añadido correctamente');
  }, [nuevoGasto]);

  const handleRemoveGasto = useCallback((id: string) => {
    setGastos(prev => prev.filter(g => g.id !== id));
    toast.success('Gasto eliminado');
  }, []);

  const handleExportExcel = useCallback(() => {
    // Simular exportación - en producción usaríamos xlsx library
    toast.success('Exportando a Excel...');
    
    // Crear CSV como fallback
    const headers = ['Nº Factura', 'Fecha', 'Proveedor', 'NIF', 'Concepto', 'Partida', 'Base', 'IVA', 'Total', 'Fecha Pago', 'Medio Pago'];
    const rows = gastos.map(g => [
      g.numeroFactura,
      g.fechaFactura,
      g.proveedor,
      g.nifProveedor,
      g.concepto,
      g.partida,
      g.baseImponible,
      g.iva,
      g.total,
      g.fechaPago,
      g.medioPago,
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `justificacion_${codigoExpediente}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [gastos, codigoExpediente]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
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
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
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
          {/* Resumen rápido */}
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
            <div key={`aviso-${idx}`} className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-amber-800">{aviso}</span>
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

        {/* Formulario de nuevo gasto */}
        <TabsContent value="formulario" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nuevo gasto justificado</CardTitle>
              <CardDescription>
                Introduce los datos de la factura y el pago correspondiente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Datos de factura */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Datos de la factura
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numeroFactura">Nº Factura *</Label>
                    <Input
                      id="numeroFactura"
                      placeholder="F-2026-001"
                      value={nuevoGasto.numeroFactura || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, numeroFactura: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaFactura">Fecha factura *</Label>
                    <Input
                      id="fechaFactura"
                      type="date"
                      value={nuevoGasto.fechaFactura || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, fechaFactura: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partida">Partida presupuestaria *</Label>
                    <Select 
                      value={nuevoGasto.partida}
                      onValueChange={(value) => setNuevoGasto(prev => ({ ...prev, partida: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTIDAS_PRESUPUESTARIAS.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className={!p.elegible ? 'text-muted-foreground' : ''}>
                              {p.nombre}
                              {!p.elegible && ' (no elegible)'}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Datos del proveedor */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Datos del proveedor
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Nombre/Razón social *</Label>
                    <Input
                      id="proveedor"
                      placeholder="Empresa Proveedora S.L."
                      value={nuevoGasto.proveedor || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, proveedor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nifProveedor">NIF/CIF</Label>
                    <Input
                      id="nifProveedor"
                      placeholder="B12345678"
                      value={nuevoGasto.nifProveedor || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, nifProveedor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="concepto">Concepto</Label>
                    <Input
                      id="concepto"
                      placeholder="Descripción del bien/servicio"
                      value={nuevoGasto.concepto || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, concepto: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Importes */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Importes
                </h4>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseImponible">Base imponible (€) *</Label>
                    <Input
                      id="baseImponible"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={nuevoGasto.baseImponible || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, baseImponible: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iva">IVA (€)</Label>
                    <Input
                      id="iva"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={nuevoGasto.iva || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, iva: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                      {formatCurrency((nuevoGasto.baseImponible || 0) + (nuevoGasto.iva || 0))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medioPago">Medio de pago *</Label>
                    <Select 
                      value={nuevoGasto.medioPago}
                      onValueChange={(value: 'transferencia' | 'domiciliacion' | 'tarjeta' | 'efectivo') => 
                        setNuevoGasto(prev => ({ ...prev, medioPago: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                        <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="efectivo">Efectivo (max 1.000€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fechaPago">Fecha de pago</Label>
                    <Input
                      id="fechaPago"
                      type="date"
                      value={nuevoGasto.fechaPago || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, fechaPago: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Input
                      id="observaciones"
                      placeholder="Notas adicionales..."
                      value={nuevoGasto.observaciones || ''}
                      onChange={(e) => setNuevoGasto(prev => ({ ...prev, observaciones: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleAddGasto} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Añadir gasto
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Listado de gastos */}
        <TabsContent value="listado" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relación de gastos ({gastos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {gastos.length === 0 ? (
                <div className="py-12 text-center">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay gastos registrados</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('formulario')}
                  >
                    Añadir primer gasto
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">IVA</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastos.map((gasto) => {
                        const partida = PARTIDAS_PRESUPUESTARIAS.find(p => p.id === gasto.partida);
                        return (
                          <TableRow key={gasto.id}>
                            <TableCell className="font-mono text-sm">{gasto.numeroFactura}</TableCell>
                            <TableCell className="text-sm">{gasto.fechaFactura}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{gasto.proveedor}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{gasto.concepto}</TableCell>
                            <TableCell>
                              <Badge variant={partida?.elegible ? "secondary" : "outline"} className="text-xs">
                                {partida?.nombre.split(' ')[0]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(gasto.baseImponible)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(gasto.iva)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(gasto.total)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {gasto.medioPago}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveGasto(gasto.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resumen por partidas */}
        <TabsContent value="resumen" className="mt-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen por partidas</CardTitle>
              </CardHeader>
              <CardContent>
                {resumenPartidas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Añade gastos para ver el resumen
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-right">Presupuestado</TableHead>
                        <TableHead className="text-right">Justificado</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead className="text-right">% Ejecución</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumenPartidas.map((r) => (
                        <TableRow key={r.partida}>
                          <TableCell>
                            <span className={!r.elegible ? 'text-muted-foreground' : ''}>
                              {r.nombre}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(r.presupuestado)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(r.justificado)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-mono",
                            r.diferencia < 0 ? "text-destructive" : ""
                          )}>
                            {formatCurrency(r.diferencia)}
                          </TableCell>
                          <TableCell className="text-right">{r.porcentaje.toFixed(1)}%</TableCell>
                          <TableCell>
                            {r.porcentaje >= 100 ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : r.porcentaje > 0 ? (
                              <Calendar className="h-4 w-4 text-amber-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Totales */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Total base imponible</div>
                    <div className="text-2xl font-bold">{formatCurrency(totales.baseTotal)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total IVA</div>
                    <div className="text-2xl font-bold">{formatCurrency(totales.ivaTotal)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total justificado</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totales.totalJustificado)}</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Gasto elegible total</div>
                    <div className="text-lg font-bold">{formatCurrency(totales.elegibleTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Ayuda estimada ({porcentajeAyuda}%)</div>
                    <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totales.ayudaCalculada)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaPlantillasJustificacion;
