/**
 * GarnishmentSimulator — Simulador interactivo Art. 607-608 LEC
 * UI pura que delega cálculos al engine determinista.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Calculator, AlertTriangle, Scale } from 'lucide-react';
import { calculateGarnishment, SMI_MENSUAL_2026, type GarnishmentResult } from '@/lib/hr/garnishmentEngine';
import { cn } from '@/lib/utils';

export function GarnishmentSimulator() {
  const [netSalary, setNetSalary] = useState(2200);
  const [hasExtraPay, setHasExtraPay] = useState(false);
  const [isArt608, setIsArt608] = useState(false);
  const [cargas, setCargas] = useState(0);

  const result: GarnishmentResult = useMemo(() =>
    calculateGarnishment({
      netSalary,
      hasExtraPay,
      isArt608Alimentos: isArt608,
      cargasFamiliares: cargas,
      conceptosEmbargables100: false,
    }),
    [netSalary, hasExtraPay, isArt608, cargas]
  );

  const garnishmentPct = netSalary > 0
    ? Math.round((result.totalGarnished / netSalary) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Simulador de Embargo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Salario neto (€)</Label>
              <Input
                type="number"
                value={netSalary}
                onChange={(e) => setNetSalary(Number(e.target.value))}
                min={0}
                step={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cargas familiares</Label>
              <Input
                type="number"
                value={cargas}
                onChange={(e) => setCargas(Number(e.target.value))}
                min={0}
                max={10}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={hasExtraPay} onCheckedChange={setHasExtraPay} />
              <Label className="text-xs">Mes con paga extra</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isArt608} onCheckedChange={setIsArt608} />
              <Label className="text-xs text-amber-600">Art. 608 (Alimentos)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Inembargable</p>
              <p className="text-lg font-bold text-foreground">
                {result.inembargableLimit.toFixed(2)} €
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total embargado</p>
              <p className="text-lg font-bold text-destructive">
                {result.totalGarnished.toFixed(2)} €
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Neto tras embargo</p>
              <p className="text-lg font-bold text-primary">
                {result.netAfterGarnishment.toFixed(2)} €
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Porcentaje embargado</span>
              <span>{garnishmentPct}%</span>
            </div>
            <Progress value={garnishmentPct} className="h-2" />
          </div>

          {/* Art 608 warning */}
          {result.art608Applied && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Art. 608 LEC: El juez puede fijar un porcentaje diferente al 50% de referencia.
              </p>
            </div>
          )}

          {/* Tramos */}
          {!result.art608Applied && result.tranches.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                Desglose por tramos (Art. 607 LEC)
              </p>
              <div className="space-y-1">
                {result.tranches.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                    <span className="text-muted-foreground">{t.label}</span>
                    <div className="flex items-center gap-2">
                      {t.adjustedPercentage !== t.percentage && (
                        <Badge variant="outline" className="text-[9px]">
                          {t.percentage}% → {t.adjustedPercentage}%
                        </Badge>
                      )}
                      <span className="font-mono font-medium w-20 text-right">
                        {t.garnished.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.cargasReduction > 0 && (
            <p className="text-[10px] text-muted-foreground">
              * Reducción de {result.cargasReduction}% aplicada por {cargas} carga(s) familiar(es)
            </p>
          )}

          <p className="text-[10px] text-muted-foreground">
            SMI referencia: {SMI_MENSUAL_2026.toFixed(2)} €/mes (14 pagas, 2026)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default GarnishmentSimulator;
