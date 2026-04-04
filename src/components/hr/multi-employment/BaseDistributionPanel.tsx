/**
 * BaseDistributionPanel — Simulador de distribución de bases en pluriempleo
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowLeftRight } from 'lucide-react';
import {
  distributeContributionBases,
  checkReimbursementRight,
  BASE_MAX_MENSUAL_2026,
} from '@/lib/hr/multiEmploymentEngine';

export function BaseDistributionPanel() {
  const [ownHours, setOwnHours] = useState(25);
  const [otherHours, setOtherHours] = useState(15);

  const distribution = useMemo(
    () => distributeContributionBases({ ownWeeklyHours: ownHours, otherWeeklyHours: otherHours }),
    [ownHours, otherHours]
  );

  const reimbursement = useMemo(
    () => checkReimbursementRight(distribution.ownMaxBase, distribution.otherMaxBase),
    [distribution]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          Distribución de Bases (Pluriempleo)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Horas/semana propias</Label>
            <Input
              type="number"
              value={ownHours}
              onChange={(e) => setOwnHours(Number(e.target.value))}
              min={0}
              max={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Horas/semana otro empleador</Label>
            <Input
              type="number"
              value={otherHours}
              onChange={(e) => setOtherHours(Number(e.target.value))}
              min={0}
              max={40}
            />
          </div>
        </div>

        {/* Distribution result */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Empresa propia</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Coeficiente</span>
                <span className="font-mono font-medium text-foreground">
                  {(distribution.ownCoefficient * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base máx.</span>
                <span className="font-mono font-medium text-foreground">
                  {distribution.ownMaxBase.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base mín.</span>
                <span className="font-mono font-medium text-foreground">
                  {distribution.ownMinBase.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Otro empleador</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Coeficiente</span>
                <span className="font-mono font-medium text-foreground">
                  {(distribution.otherCoefficient * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base máx.</span>
                <span className="font-mono font-medium text-foreground">
                  {distribution.otherMaxBase.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base mín.</span>
                <span className="font-mono font-medium text-foreground">
                  {distribution.otherMinBase.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        {reimbursement.eligible && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
            Derecho a reintegro: exceso de {reimbursement.excessAmount.toFixed(2)} € sobre base máxima
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Base máx. referencia: {BASE_MAX_MENSUAL_2026.toFixed(2)} €/mes · Orden PJC/297/2026 art. 10
        </p>
      </CardContent>
    </Card>
  );
}

export default BaseDistributionPanel;
