/**
 * BalanceSheetPanel - Balance de Situación
 * Balance general con datos reales de asientos contables
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Scale, 
  Download, 
  FileSpreadsheet, 
  Building2,
  Coins,
  RefreshCw
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { useERPFinancialStatements } from '@/hooks/erp/useERPFinancialStatements';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function BalanceSheetPanel() {
  const { currentCompany } = useERPContext();
  const { balanceSheet, isLoading, fetchBalanceSheet } = useERPFinancialStatements();
  
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch on mount and when date changes
  useEffect(() => {
    if (currentCompany?.id) {
      fetchBalanceSheet(asOfDate);
    }
  }, [currentCompany?.id, asOfDate, fetchBalanceSheet]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currentCompany?.currency || 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleRefresh = () => {
    fetchBalanceSheet(asOfDate);
  };

  if (!currentCompany) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Selecciona una empresa para ver el balance de situación
        </CardContent>
      </Card>
    );
  }

  const data = balanceSheet;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Balance de Situación</h3>
            <p className="text-sm text-muted-foreground">
              Situación patrimonial
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">A fecha:</span>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-40"
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

      {/* Balance Status */}
      <Card className={cn(
        "border-l-4",
        data?.isBalanced ? "border-l-green-500" : "border-l-destructive"
      )}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data?.isBalanced ? (
                <>
                  <Badge variant="default" className="bg-green-500">Cuadrado</Badge>
                  <span className="text-sm text-muted-foreground">
                    Activo = Patrimonio Neto + Pasivo
                  </span>
                </>
              ) : (
                <>
                  <Badge variant="destructive">Descuadre</Badge>
                  <span className="text-sm text-destructive">
                    Diferencia: {formatCurrency(Math.abs((data?.activo.totalActivo ?? 0) - (data?.totalPatrimonioYPasivo ?? 0)))}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(asOfDate), "dd/MM/yyyy", { locale: es })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <div className="grid grid-cols-2 gap-4">
        {/* ACTIVO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              ACTIVO
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-1">
                  {/* Activo No Corriente */}
                  <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg">
                    <span>A.I) Activo No Corriente</span>
                    <span className="font-mono">{formatCurrency(data?.activo.activoNoCorriente ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Inmovilizado intangible (20)</span>
                    <span className="font-mono">{formatCurrency(data?.activo.inmovilizadoIntangible ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Inmovilizado material (21)</span>
                    <span className="font-mono">{formatCurrency(data?.activo.inmovilizadoMaterial ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Inversiones financieras (25)</span>
                    <span className="font-mono">{formatCurrency(data?.activo.inversionesFinancieras ?? 0)}</span>
                  </div>

                  {/* Activo Corriente */}
                  <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg mt-4">
                    <span>A.II) Activo Corriente</span>
                    <span className="font-mono">{formatCurrency(data?.activo.activoCorriente ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Existencias (3)</span>
                    <span className="font-mono">{formatCurrency(data?.activo.existencias ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Deudores comerciales (43)</span>
                    <span className="font-mono">{formatCurrency(data?.activo.deudoresComerciales ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Tesorería (57)</span>
                    <span className="font-mono">{formatCurrency(data?.activo.tesoreria ?? 0)}</span>
                  </div>
                </div>
              </ScrollArea>
            )}
            <div className="mt-4 pt-4 border-t flex items-center justify-between font-bold">
              <span>TOTAL ACTIVO</span>
              <span className="font-mono text-lg">
                {formatCurrency(data?.activo.totalActivo ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PATRIMONIO NETO Y PASIVO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-green-500" />
              PATRIMONIO NETO Y PASIVO
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-1">
                  {/* Patrimonio Neto */}
                  <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg">
                    <span>P.N) Patrimonio Neto</span>
                    <span className="font-mono">{formatCurrency(data?.patrimonioNeto.totalPatrimonioNeto ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Capital (10)</span>
                    <span className="font-mono">{formatCurrency(data?.patrimonioNeto.capital ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Reservas (11)</span>
                    <span className="font-mono">{formatCurrency(data?.patrimonioNeto.reservas ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Resultados ejercicios anteriores (12)</span>
                    <span className="font-mono">{formatCurrency(data?.patrimonioNeto.resultadosEjerciciosAnteriores ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Resultado del ejercicio (129)</span>
                    <span className={cn(
                      "font-mono",
                      (data?.patrimonioNeto.resultadoEjercicio ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {formatCurrency(data?.patrimonioNeto.resultadoEjercicio ?? 0)}
                    </span>
                  </div>

                  {/* Pasivo No Corriente */}
                  <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg mt-4">
                    <span>P.I) Pasivo No Corriente</span>
                    <span className="font-mono">{formatCurrency(data?.pasivo.pasivoNoCorriente ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Deudas a largo plazo (17)</span>
                    <span className="font-mono">{formatCurrency(data?.pasivo.deudasLargoPlazo ?? 0)}</span>
                  </div>

                  {/* Pasivo Corriente */}
                  <div className="bg-muted/50 font-semibold flex justify-between py-2 px-3 rounded-lg mt-4">
                    <span>P.II) Pasivo Corriente</span>
                    <span className="font-mono">{formatCurrency(data?.pasivo.pasivoCorriente ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Proveedores (40)</span>
                    <span className="font-mono">{formatCurrency(data?.pasivo.proveedores ?? 0)}</span>
                  </div>
                  <div className="ml-4 flex justify-between py-1 px-3 hover:bg-muted/30 rounded text-sm">
                    <span>Otras deudas (41, 46, 47)</span>
                    <span className="font-mono">{formatCurrency(data?.pasivo.otrasDeudas ?? 0)}</span>
                  </div>
                </div>
              </ScrollArea>
            )}
            <div className="mt-4 pt-4 border-t flex items-center justify-between font-bold">
              <span>TOTAL P.N. + PASIVO</span>
              <span className="font-mono text-lg">
                {formatCurrency(data?.totalPatrimonioYPasivo ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ratios Financieros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ratios Financieros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Ratio de Liquidez</p>
              <p className="text-xl font-bold">
                {data && (data.pasivo.pasivoCorriente ?? 0) > 0 
                  ? ((data.activo.activoCorriente ?? 0) / data.pasivo.pasivoCorriente).toFixed(2) 
                  : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Ratio de Endeudamiento</p>
              <p className="text-xl font-bold">
                {data && (data.patrimonioNeto.totalPatrimonioNeto ?? 0) > 0 
                  ? ((data.pasivo.totalPasivo ?? 0) / data.patrimonioNeto.totalPatrimonioNeto * 100).toFixed(1) 
                  : '-'}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Fondo de Maniobra</p>
              <p className="text-xl font-bold">
                {formatCurrency((data?.activo.activoCorriente ?? 0) - (data?.pasivo.pasivoCorriente ?? 0))}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Autonomía Financiera</p>
              <p className="text-xl font-bold">
                {data && (data.activo.totalActivo ?? 0) > 0 
                  ? ((data.patrimonioNeto.totalPatrimonioNeto ?? 0) / data.activo.totalActivo * 100).toFixed(1) 
                  : '-'}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BalanceSheetPanel;
