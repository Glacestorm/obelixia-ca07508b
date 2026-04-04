/**
 * SolidaritySimulator — Simulador de cotización de solidaridad 2026
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingUp } from 'lucide-react';
import {
  calculateSolidarityContribution,
  BASE_MAX_MENSUAL_2026,
  type SolidarityResult,
} from '@/lib/hr/multiEmploymentEngine';

export function SolidaritySimulator() {
  const [grossSalary, setGrossSalary] = useState(6500);

  const result: SolidarityResult = useMemo(
    () => calculateSolidarityContribution({ totalGrossSalary: grossSalary }),
    [grossSalary]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Simulador Cotización de Solidaridad 2026
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Salario bruto mensual total (€)</Label>
          <Input
            type="number"
            value={grossSalary}
            onChange={(e) => setGrossSalary(Number(e.target.value))}
            min={0}
            step={100}
          />
          <p className="text-[10px] text-muted-foreground">
            Base máxima 2026: {BASE_MAX_MENSUAL_2026.toFixed(2)} €/mes
          </p>
        </div>

        {!result.applies ? (
          <div className="p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
            No aplica cotización de solidaridad (bruto ≤ base máxima)
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Exceso</p>
                <p className="text-lg font-bold text-foreground">{result.excess.toFixed(2)} €</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Empresa</p>
                <p className="text-lg font-bold text-destructive">{result.employerTotal.toFixed(2)} €</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Trabajador</p>
                <p className="text-lg font-bold text-primary">{result.employeeTotal.toFixed(2)} €</p>
              </div>
            </div>

            {/* Tramos */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Desglose por tramos
              </p>
              {result.brackets.map((b) => (
                <div key={b.bracket} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                  <span className="text-muted-foreground">{b.label}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[9px]">{b.rate}%</Badge>
                    <span className="font-mono font-medium w-20 text-right">
                      {b.totalAmount.toFixed(2)} €
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total solidaridad</span>
                <span>{result.totalAmount.toFixed(2)} €</span>
              </div>
              <Progress
                value={Math.min((result.totalAmount / grossSalary) * 100 * 10, 100)}
                className="h-2"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SolidaritySimulator;
