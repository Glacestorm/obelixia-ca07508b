/**
 * ERPFiscalReconciliationPanel - Conciliación Fiscal
 * IVA, retenciones y modelos fiscales
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Scale,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  Receipt,
  Loader2,
  RefreshCw,
  Download,
  Euro
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ERPFiscalReconciliationPanelProps {
  sessionId?: string;
  companyId?: string;
}

interface ReconciliationItem {
  id: string;
  concept: string;
  originAmount: number;
  targetAmount: number;
  difference: number;
  status: 'matched' | 'mismatch' | 'pending';
  details?: string;
}

interface TaxSummary {
  period: string;
  ivaRepercutido: number;
  ivaSoportado: number;
  retencionesPracticadas: number;
  retencionesSuportadas: number;
  netBalance: number;
}

export function ERPFiscalReconciliationPanel({ sessionId, companyId }: ERPFiscalReconciliationPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-Q1');
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationComplete, setReconciliationComplete] = useState(false);

  // Mock data
  const [taxSummary] = useState<TaxSummary>({
    period: '2026-Q1',
    ivaRepercutido: 125430.50,
    ivaSoportado: 89234.75,
    retencionesPracticadas: 12500.00,
    retencionesSuportadas: 8750.25,
    netBalance: 36195.75
  });

  const [ivaReconciliation] = useState<ReconciliationItem[]>([
    { id: '1', concept: 'IVA Repercutido 21%', originAmount: 98500.00, targetAmount: 98500.00, difference: 0, status: 'matched' },
    { id: '2', concept: 'IVA Repercutido 10%', originAmount: 26930.50, targetAmount: 26930.50, difference: 0, status: 'matched' },
    { id: '3', concept: 'IVA Soportado 21%', originAmount: 72450.25, targetAmount: 72450.25, difference: 0, status: 'matched' },
    { id: '4', concept: 'IVA Soportado 10%', originAmount: 16784.50, targetAmount: 16750.00, difference: 34.50, status: 'mismatch', details: 'Diferencia en facturas de suministros' },
    { id: '5', concept: 'IVA Intracomunitario', originAmount: 0, targetAmount: 0, difference: 0, status: 'matched' },
  ]);

  const [retencionesReconciliation] = useState<ReconciliationItem[]>([
    { id: '1', concept: 'Ret. Profesionales 15%', originAmount: 8500.00, targetAmount: 8500.00, difference: 0, status: 'matched' },
    { id: '2', concept: 'Ret. Alquileres 19%', originAmount: 4000.00, targetAmount: 4000.00, difference: 0, status: 'matched' },
    { id: '3', concept: 'Ret. Trabajo 15%', originAmount: 6250.25, targetAmount: 6250.25, difference: 0, status: 'matched' },
    { id: '4', concept: 'Ret. Capital 19%', originAmount: 2500.00, targetAmount: 2500.00, difference: 0, status: 'matched' },
  ]);

  const handleReconcile = useCallback(async () => {
    setIsReconciling(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsReconciling(false);
    setReconciliationComplete(true);
    toast.success('Conciliación fiscal completada');
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getStatusIcon = (status: ReconciliationItem['status']) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'mismatch':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const totalMismatchIVA = ivaReconciliation.filter(r => r.status === 'mismatch').reduce((acc, r) => acc + Math.abs(r.difference), 0);
  const totalMismatchRet = retencionesReconciliation.filter(r => r.status === 'mismatch').reduce((acc, r) => acc + Math.abs(r.difference), 0);

  return (
    <div className="space-y-4">
      {/* Header con resumen */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Scale className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Conciliación Fiscal</CardTitle>
                <CardDescription>
                  Verificación de IVA, retenciones y modelos fiscales
                </CardDescription>
              </div>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-Q1">2026 - T1</SelectItem>
                <SelectItem value="2025-Q4">2025 - T4</SelectItem>
                <SelectItem value="2025-Q3">2025 - T3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IVA Repercutido</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(taxSummary.ivaRepercutido)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IVA Soportado</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(taxSummary.ivaSoportado)}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retenciones Netas</p>
                <p className="text-xl font-bold">{formatCurrency(taxSummary.retencionesPracticadas - taxSummary.retencionesSuportadas)}</p>
              </div>
              <Receipt className="h-6 w-6 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          taxSummary.netBalance >= 0 
            ? "border-green-500/20 bg-green-500/5" 
            : "border-red-500/20 bg-red-500/5"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Neto IVA</p>
                <p className={cn(
                  "text-xl font-bold",
                  taxSummary.netBalance >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(taxSummary.netBalance)}
                </p>
              </div>
              <Euro className="h-6 w-6" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {taxSummary.netBalance >= 0 ? 'A ingresar' : 'A compensar'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="iva" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="iva">IVA ({totalMismatchIVA > 0 ? '⚠️' : '✓'})</TabsTrigger>
          <TabsTrigger value="retenciones">Retenciones ({totalMismatchRet > 0 ? '⚠️' : '✓'})</TabsTrigger>
          <TabsTrigger value="modelos">Modelos Fiscales</TabsTrigger>
        </TabsList>

        {/* IVA */}
        <TabsContent value="iva">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Conciliación de IVA
                </CardTitle>
                <Button onClick={handleReconcile} disabled={isReconciling}>
                  {isReconciling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conciliando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconciliar
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                  <span>Concepto</span>
                  <span className="text-right">Origen</span>
                  <span className="text-right">Destino</span>
                  <span className="text-right">Diferencia</span>
                  <span className="text-center">Estado</span>
                </div>
                <ScrollArea className="h-[250px]">
                  {ivaReconciliation.map((item) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "grid grid-cols-5 gap-4 px-3 py-3 rounded-lg",
                        item.status === 'mismatch' && "bg-red-500/5"
                      )}
                    >
                      <span className="font-medium">{item.concept}</span>
                      <span className="text-right">{formatCurrency(item.originAmount)}</span>
                      <span className="text-right">{formatCurrency(item.targetAmount)}</span>
                      <span className={cn(
                        "text-right font-medium",
                        item.difference !== 0 && "text-red-600"
                      )}>
                        {item.difference !== 0 ? formatCurrency(item.difference) : '-'}
                      </span>
                      <div className="flex justify-center">
                        {getStatusIcon(item.status)}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {totalMismatchIVA > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">
                      Diferencia detectada: {formatCurrency(totalMismatchIVA)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revisa las partidas marcadas antes de continuar con la migración
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retenciones */}
        <TabsContent value="retenciones">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Conciliación de Retenciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                  <span>Concepto</span>
                  <span className="text-right">Origen</span>
                  <span className="text-right">Destino</span>
                  <span className="text-right">Diferencia</span>
                  <span className="text-center">Estado</span>
                </div>
                <ScrollArea className="h-[250px]">
                  {retencionesReconciliation.map((item) => (
                    <div 
                      key={item.id} 
                      className="grid grid-cols-5 gap-4 px-3 py-3 rounded-lg hover:bg-muted/50"
                    >
                      <span className="font-medium">{item.concept}</span>
                      <span className="text-right">{formatCurrency(item.originAmount)}</span>
                      <span className="text-right">{formatCurrency(item.targetAmount)}</span>
                      <span className="text-right">{item.difference !== 0 ? formatCurrency(item.difference) : '-'}</span>
                      <div className="flex justify-center">
                        {getStatusIcon(item.status)}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="font-medium text-green-700 dark:text-green-400">
                  Todas las retenciones cuadran correctamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modelos Fiscales */}
        <TabsContent value="modelos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Preparación de Modelos Fiscales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  { modelo: 'Modelo 303', desc: 'IVA Autoliquidación', status: 'ready', amount: 36195.75 },
                  { modelo: 'Modelo 111', desc: 'Retenciones Trabajo/Profesionales', status: 'ready', amount: 12500.00 },
                  { modelo: 'Modelo 115', desc: 'Retenciones Alquileres', status: 'ready', amount: 4000.00 },
                  { modelo: 'Modelo 349', desc: 'Operaciones Intracomunitarias', status: 'not_applicable', amount: 0 },
                  { modelo: 'Modelo 347', desc: 'Operaciones con Terceros', status: 'pending', amount: 0 },
                ].map((item) => (
                  <div 
                    key={item.modelo}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.modelo}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.amount > 0 && (
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      )}
                      <Badge variant={
                        item.status === 'ready' ? 'default' :
                        item.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {item.status === 'ready' && 'Preparado'}
                        {item.status === 'pending' && 'Pendiente'}
                        {item.status === 'not_applicable' && 'No aplica'}
                      </Badge>
                      {item.status === 'ready' && (
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3 mr-1" />
                          Exportar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPFiscalReconciliationPanel;
