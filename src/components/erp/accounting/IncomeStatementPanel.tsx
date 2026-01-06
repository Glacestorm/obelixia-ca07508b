/**
 * IncomeStatementPanel - Cuenta de Pérdidas y Ganancias
 * Estado de resultados con datos reales de asientos contables
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown,
  Download, 
  FileSpreadsheet, 
  RefreshCw
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { useERPFinancialStatements } from '@/hooks/erp/useERPFinancialStatements';
import { cn } from '@/lib/utils';
import { format, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

export function IncomeStatementPanel() {
  const { currentCompany } = useERPContext();
  const { incomeStatement, isLoading, fetchIncomeStatement } = useERPFinancialStatements();
  
  const [dateRange, setDateRange] = useState({ 
    from: format(startOfYear(new Date()), 'yyyy-MM-dd'), 
    to: format(endOfYear(new Date()), 'yyyy-MM-dd') 
  });

  // Fetch on mount and when dates change
  useEffect(() => {
    if (currentCompany?.id) {
      fetchIncomeStatement(dateRange.from, dateRange.to);
    }
  }, [currentCompany?.id, dateRange.from, dateRange.to, fetchIncomeStatement]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currentCompany?.currency || 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleRefresh = () => {
    fetchIncomeStatement(dateRange.from, dateRange.to);
  };

  if (!currentCompany) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Selecciona una empresa para ver la cuenta de resultados
        </CardContent>
      </Card>
    );
  }

  const data = incomeStatement;
  const resultadoNeto = data?.resultados.resultadoNeto ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Cuenta de Pérdidas y Ganancias</h3>
            <p className="text-sm text-muted-foreground">
              Estado de resultados del ejercicio
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-36"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-36"
          />
          
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Result Summary */}
      <Card className={cn(
        "border-l-4",
        resultadoNeto >= 0 ? "border-l-green-500" : "border-l-destructive"
      )}>
        <CardContent className="py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Ingresos totales</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(data?.ingresos.totalIngresos ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gastos totales</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(data?.gastos.totalGastos ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resultado del ejercicio</p>
              <p className={cn(
                "text-xl font-bold",
                resultadoNeto >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {formatCurrency(resultadoNeto)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margen neto</p>
              <div className="flex items-center gap-2">
                {(data?.ratios.margenNeto ?? 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <p className={cn(
                  "text-xl font-bold",
                  (data?.ratios.margenNeto ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                )}>
                  {(data?.ratios.margenNeto ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Statement Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Detalle de la Cuenta de Resultados</span>
            <div className="text-xs text-muted-foreground">
              {dateRange.from} - {dateRange.to}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {/* INGRESOS */}
                <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg">
                  <span>1. INGRESOS DE EXPLOTACIÓN</span>
                  <span className="font-mono text-green-600">{formatCurrency((data?.ingresos.ventas ?? 0) + (data?.ingresos.otrosIngresos ?? 0))}</span>
                </div>
                <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Ventas netas (70)</span>
                  <span className="font-mono text-sm">{formatCurrency(data?.ingresos.ventas ?? 0)}</span>
                </div>
                <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Otros ingresos de explotación (73-75)</span>
                  <span className="font-mono text-sm">{formatCurrency(data?.ingresos.otrosIngresos ?? 0)}</span>
                </div>

                {/* GASTOS */}
                <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg mt-4">
                  <span>2. GASTOS DE EXPLOTACIÓN</span>
                  <span className="font-mono text-destructive">{formatCurrency(data?.gastos.totalGastos - (data?.gastos.gastosFinancieros ?? 0))}</span>
                </div>
                <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Aprovisionamientos (60)</span>
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(data?.gastos.aprovisionamientos ?? 0)}</span>
                </div>
                <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Gastos de personal (64)</span>
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(data?.gastos.gastosPersonal ?? 0)}</span>
                </div>
                <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Otros gastos de explotación (62-65)</span>
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(data?.gastos.otrosGastos ?? 0)}</span>
                </div>
                <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Amortizaciones (68)</span>
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(data?.gastos.amortizaciones ?? 0)}</span>
                </div>

                {/* RESULTADO EXPLOTACIÓN */}
                <div className="bg-primary/10 font-bold flex justify-between py-2 px-3 rounded-lg mt-4">
                  <span>A) RESULTADO DE EXPLOTACIÓN (1-2)</span>
                  <span className={cn(
                    "font-mono",
                    (data?.resultados.resultadoExplotacion ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                  )}>
                    {formatCurrency(data?.resultados.resultadoExplotacion ?? 0)}
                  </span>
                </div>

                {/* FINANCIERO */}
                <div className="flex justify-between py-1 px-3 hover:bg-muted/30 rounded mt-4">
                  <span className="text-sm">Ingresos financieros (76)</span>
                  <span className="font-mono text-sm text-green-600">{formatCurrency(data?.ingresos.ingresosFinancieros ?? 0)}</span>
                </div>
                <div className="flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Gastos financieros (66)</span>
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(data?.gastos.gastosFinancieros ?? 0)}</span>
                </div>

                <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg">
                  <span>B) RESULTADO FINANCIERO</span>
                  <span className={cn(
                    "font-mono",
                    (data?.resultados.resultadoFinanciero ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                  )}>
                    {formatCurrency(data?.resultados.resultadoFinanciero ?? 0)}
                  </span>
                </div>

                {/* ANTES DE IMPUESTOS */}
                <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg mt-4">
                  <span>C) RESULTADO ANTES DE IMPUESTOS (A+B)</span>
                  <span className={cn(
                    "font-mono",
                    (data?.resultados.resultadoAntesImpuestos ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                  )}>
                    {formatCurrency(data?.resultados.resultadoAntesImpuestos ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between py-1 px-3 hover:bg-muted/30 rounded">
                  <span className="text-sm">Impuesto sobre beneficios (25%)</span>
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(data?.resultados.impuestos ?? 0)}</span>
                </div>

                {/* RESULTADO NETO */}
                <div className="bg-primary/10 font-bold flex justify-between py-3 px-3 rounded-lg mt-4 text-lg">
                  <span>D) RESULTADO DEL EJERCICIO</span>
                  <span className={cn(
                    "font-mono",
                    resultadoNeto >= 0 ? "text-green-600" : "text-destructive"
                  )}>
                    {formatCurrency(resultadoNeto)}
                  </span>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Ratios */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ratios de Rentabilidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Margen Bruto</p>
              <p className="text-xl font-bold">{(data?.ratios.margenBruto ?? 0).toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Margen Operativo</p>
              <p className="text-xl font-bold">{(data?.ratios.margenOperativo ?? 0).toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Margen Neto</p>
              <p className="text-xl font-bold">{(data?.ratios.margenNeto ?? 0).toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Cobertura Financiera</p>
              <p className="text-xl font-bold">
                {data && data.gastos.gastosFinancieros > 0
                  ? Math.abs(data.resultados.resultadoExplotacion / data.gastos.gastosFinancieros).toFixed(2)
                  : '-'}x
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IncomeStatementPanel;
