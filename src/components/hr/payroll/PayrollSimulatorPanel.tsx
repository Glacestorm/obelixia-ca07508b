/**
 * PayrollSimulatorPanel — Simulador interactivo de nómina
 * Delega cálculos al engine determinista puro.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Calculator, AlertTriangle, CheckCircle, Euro,
  TrendingDown, TrendingUp, Building2,
} from 'lucide-react';
import { calculatePayroll, type PayrollResult } from '@/lib/hr/payroll';
import { cn } from '@/lib/utils';

export function PayrollSimulatorPanel() {
  const [baseSalary, setBaseSalary] = useState(2200);
  const [ssGroup, setSSGroup] = useState(5);
  const [irpfRate, setIrpfRate] = useState(15);
  const [partTime, setPartTime] = useState(1.0);
  const [isTemporary, setIsTemporary] = useState(false);
  const [isExtraPay, setIsExtraPay] = useState(false);

  const result: PayrollResult = useMemo(() =>
    calculatePayroll({
      employeeId: 'simulator',
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      baseSalary,
      workingDays: 30,
      workedDays: 30,
      ssGroup,
      contractType: isTemporary ? '402' : '100',
      partTimeCoefficient: partTime,
      customConcepts: [],
      companyConcepts: [],
      isExtraPayPeriod: isExtraPay,
      extraPaysPerYear: 2,
      itDays: 0,
      garnishmentAmount: 0,
      irpfRate,
    }),
    [baseSalary, ssGroup, irpfRate, partTime, isTemporary, isExtraPay]
  );

  const earnings = result.lines.filter(l => l.type === 'earning');
  const deductions = result.lines.filter(l => l.type === 'deduction');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Simulador de Nómina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px]">Salario base (€)</Label>
            <Input type="number" value={baseSalary} onChange={e => setBaseSalary(Number(e.target.value))} min={0} step={50} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Grupo SS</Label>
            <Input type="number" value={ssGroup} onChange={e => setSSGroup(Number(e.target.value))} min={1} max={11} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">IRPF (%)</Label>
            <Input type="number" value={irpfRate} onChange={e => setIrpfRate(Number(e.target.value))} min={0} max={47} step={0.5} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Parcialidad</Label>
            <Input type="number" value={partTime} onChange={e => setPartTime(Number(e.target.value))} min={0.1} max={1} step={0.05} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={isTemporary} onCheckedChange={setIsTemporary} />
            <Label className="text-xs">Temporal</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isExtraPay} onCheckedChange={setIsExtraPay} />
            <Label className="text-xs">Paga extra</Label>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Bruto</p>
            <p className="text-sm font-bold text-primary">{result.grossSalary.toFixed(2)} €</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Deducciones</p>
            <p className="text-sm font-bold text-destructive">{result.totalDeductions.toFixed(2)} €</p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Neto</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-400">{result.netSalary.toFixed(2)} €</p>
          </div>
          <div className="p-2 rounded-lg bg-muted text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Coste empresa</p>
            <p className="text-sm font-bold">{result.employerCost.toFixed(2)} €</p>
          </div>
        </div>

        {/* Lines */}
        <ScrollArea className="h-[260px]">
          <div className="space-y-3">
            {/* Earnings */}
            <div>
              <p className="text-xs font-medium flex items-center gap-1 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Devengos
              </p>
              <div className="space-y-1">
                {earnings.map(l => (
                  <div key={l.code} className="flex justify-between items-center p-1.5 rounded bg-primary/5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{l.name}</span>
                      {l.ssComputable && <Badge variant="outline" className="text-[8px] px-1">SS</Badge>}
                    </div>
                    <span className="font-mono font-medium">{l.amount.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div>
              <p className="text-xs font-medium flex items-center gap-1 mb-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" /> Deducciones
              </p>
              <div className="space-y-1">
                {deductions.map(l => (
                  <div key={l.code} className="flex justify-between items-center p-1.5 rounded bg-destructive/5 text-xs">
                    <span>{l.name}</span>
                    <span className="font-mono font-medium">-{l.amount.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SS detail */}
            <div>
              <p className="text-xs font-medium flex items-center gap-1 mb-1.5">
                <Building2 className="h-3.5 w-3.5" /> Bases SS
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-1.5 rounded bg-muted/50">
                  <span className="text-muted-foreground">Base CC:</span>{' '}
                  <span className="font-mono">{result.ss.appliedBaseCC.toFixed(2)} €</span>
                </div>
                <div className="p-1.5 rounded bg-muted/50">
                  <span className="text-muted-foreground">Base CP:</span>{' '}
                  <span className="font-mono">{result.ss.appliedBaseCP.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Validation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium flex items-center gap-1">
                  {result.validation.valid
                    ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  Validación
                </p>
                <Badge variant={result.validation.valid ? 'secondary' : 'destructive'} className="text-[9px]">
                  {result.validation.score}/100
                </Badge>
              </div>
              {result.validation.issues.length > 0 && (
                <div className="space-y-1">
                  {result.validation.issues.map(i => (
                    <div key={i.code} className={cn(
                      'text-[10px] p-1.5 rounded',
                      i.severity === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    )}>
                      [{i.code}] {i.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PayrollSimulatorPanel;
