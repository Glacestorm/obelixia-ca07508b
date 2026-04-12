/**
 * HRLaborCostSimulatorPanel — Simulador de Coste Laboral Total (C2)
 * 
 * Proyección de coste real con variables editables, escenarios,
 * alertas y trazabilidad de supuestos.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Calculator, TrendingUp, AlertTriangle, DollarSign,
  Download, Play, Settings, BarChart3, Info, FileText,
  Users, Clock, Shield, XCircle, ChevronRight,
} from 'lucide-react';
import {
  projectScenario, defaultScenario, compareScenarios, SIMULATOR_DISCLAIMER,
  type ScenarioParams, type ScenarioResult, type EmployeeCostInput, type DataOrigin,
} from '@/engines/erp/hr/laborCostSimulatorEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

// ── Helpers ──

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);

const originBadge = (o: DataOrigin) => {
  switch (o) {
    case 'historical': return <Badge variant="default" className="text-[10px] h-5 bg-green-600">Dato real</Badge>;
    case 'hypothesis': return <Badge variant="secondary" className="text-[10px] h-5">Hipótesis</Badge>;
    case 'projection': return <Badge variant="outline" className="text-[10px] h-5">Proyección</Badge>;
  }
};

// ── Sample employees for demo when no real data ──
const DEMO_EMPLOYEES: EmployeeCostInput[] = [
  { grossMonthly: 2800, extraPayments: 2, ssGroup: 'G1', isTemporary: false, weeklyHours: 40 },
  { grossMonthly: 2200, extraPayments: 2, ssGroup: 'G3', isTemporary: false, weeklyHours: 40 },
  { grossMonthly: 1800, extraPayments: 2, ssGroup: 'G5', isTemporary: false, weeklyHours: 40 },
  { grossMonthly: 1500, extraPayments: 2, ssGroup: 'G7', isTemporary: true, weeklyHours: 40 },
  { grossMonthly: 1600, extraPayments: 2, ssGroup: 'G5', isTemporary: false, weeklyHours: 38 },
];

// ── Component ──

export function HRLaborCostSimulatorPanel() {
  const [activeTab, setActiveTab] = useState('simulator');
  const [scenarioA, setScenarioA] = useState<ScenarioParams>(defaultScenario('Escenario Base', 24));
  const [scenarioB, setScenarioB] = useState<ScenarioParams>({ ...defaultScenario('Escenario Optimista', 24), ipcAnnual: 1.5, salaryGrowthAboveIPC: 0 });
  const [resultA, setResultA] = useState<ScenarioResult | null>(null);
  const [resultB, setResultB] = useState<ScenarioResult | null>(null);
  const [useDemoData, setUseDemoData] = useState(true);

  // Run simulation
  const runSimulation = useCallback(() => {
    const employees = useDemoData ? DEMO_EMPLOYEES : DEMO_EMPLOYEES;
    const rA = projectScenario(employees, scenarioA);
    const rB = projectScenario(employees, scenarioB);
    setResultA(rA);
    setResultB(rB);
    toast.success('Simulación ejecutada');
  }, [scenarioA, scenarioB, useDemoData]);

  // Export PDF
  const exportPDF = useCallback(() => {
    if (!resultA) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Simulador de Coste Laboral Total', 20, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 20, 28);

    doc.setFontSize(8);
    doc.text('AVISO: ' + SIMULATOR_DISCLAIMER, 20, 36, { maxWidth: 170 });

    doc.setFontSize(12);
    doc.text(`Escenario: ${resultA.scenario.name}`, 20, 52);
    doc.setFontSize(10);

    let y = 60;
    doc.text(`Coste base mensual: ${fmt(resultA.baselineCost.totalMonthly)}€`, 20, y); y += 7;
    doc.text(`Coste total proyectado (${resultA.scenario.months}m): ${fmt(resultA.totalProjectedCost)}€`, 20, y); y += 7;
    doc.text(`Variación vs base: ${resultA.costVariation >= 0 ? '+' : ''}${resultA.costVariation}%`, 20, y); y += 10;

    doc.text('Supuestos:', 20, y); y += 6;
    resultA.assumptions.forEach(a => {
      doc.text(`  • ${a.label}: ${a.value} [${a.origin}]`, 20, y); y += 5;
    });

    y += 5;
    if (resultA.alerts.length > 0) {
      doc.text('Alertas:', 20, y); y += 6;
      resultA.alerts.forEach(al => {
        doc.text(`  ⚠ ${al.title}: ${al.description}`, 20, y); y += 5;
      });
    }

    doc.save('simulacion_coste_laboral.pdf');
    toast.success('PDF exportado');
  }, [resultA]);

  // Comparison data
  const comparison = useMemo(() => {
    if (!resultA || !resultB) return null;
    return compareScenarios(resultA, resultB);
  }, [resultA, resultB]);

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Alert variant="default" className="border-blue-300 bg-blue-50/50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 text-sm font-medium">Simulador de proyección</AlertTitle>
        <AlertDescription className="text-xs text-blue-700">{SIMULATOR_DISCLAIMER}</AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="simulator" className="text-xs gap-1"><Calculator className="h-3 w-3" />Simulador</TabsTrigger>
          <TabsTrigger value="projection" className="text-xs gap-1"><TrendingUp className="h-3 w-3" />Proyección</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />Comparar</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs gap-1"><FileText className="h-3 w-3" />Resumen</TabsTrigger>
        </TabsList>

        {/* ── Simulator ── */}
        <TabsContent value="simulator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScenarioEditor
              scenario={scenarioA}
              onChange={setScenarioA}
              label="Escenario A"
              color="primary"
            />
            <ScenarioEditor
              scenario={scenarioB}
              onChange={setScenarioB}
              label="Escenario B"
              color="secondary"
            />
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={runSimulation} className="gap-2">
              <Play className="h-4 w-4" /> Ejecutar simulación
            </Button>
            {resultA && (
              <Button variant="outline" onClick={exportPDF} className="gap-2">
                <Download className="h-4 w-4" /> Exportar PDF
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {DEMO_EMPLOYEES.length} empleados (demo)
            </Badge>
          </div>

          {/* Baseline results */}
          {resultA && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Desglose de coste base mensual — {resultA.scenario.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Concepto</TableHead>
                      <TableHead className="text-xs text-right">Mensual</TableHead>
                      <TableHead className="text-xs text-right">Anual</TableHead>
                      <TableHead className="text-xs text-right">% Total</TableHead>
                      <TableHead className="text-xs">Origen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultA.baselineCost.lines.map(line => (
                      <TableRow key={line.code}>
                        <TableCell className="text-xs font-medium">{line.label}</TableCell>
                        <TableCell className="text-xs text-right">{fmt(line.monthlyAmount)}€</TableCell>
                        <TableCell className="text-xs text-right">{fmt(line.annualAmount)}€</TableCell>
                        <TableCell className="text-xs text-right">{line.percentOfTotal}%</TableCell>
                        <TableCell>{originBadge(line.origin)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell className="text-xs">TOTAL</TableCell>
                      <TableCell className="text-xs text-right">{fmt(resultA.baselineCost.totalMonthly)}€</TableCell>
                      <TableCell className="text-xs text-right">{fmt(resultA.baselineCost.totalAnnual)}€</TableCell>
                      <TableCell className="text-xs text-right">100%</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span><Clock className="h-3 w-3 inline mr-1" />Coste/hora: <strong>{fmt(resultA.baselineCost.costPerHour)}€</strong></span>
                  <span><Users className="h-3 w-3 inline mr-1" />Coste/empleado/mes: <strong>{fmt(resultA.baselineCost.totalMonthly / DEMO_EMPLOYEES.length)}€</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {resultA && resultA.alerts.length > 0 && (
            <div className="mt-3 space-y-2">
              {resultA.alerts.map(al => (
                <Alert key={al.id} variant={al.severity === 'critical' ? 'destructive' : 'default'}
                  className={cn(al.severity === 'warning' && 'border-amber-300 bg-amber-50/50')}>
                  {al.severity === 'critical' ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <AlertTitle className="text-sm">{al.title}</AlertTitle>
                  <AlertDescription className="text-xs">{al.description}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Projection Chart ── */}
        <TabsContent value="projection">
          {!resultA ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Ejecute una simulación para ver las proyecciones.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Proyección de coste laboral total</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={resultA.projections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                      <Tooltip formatter={(v: number) => `${fmt(v)}€`} />
                      <Legend />
                      <Area type="monotone" dataKey="totalLaborCost" name="Coste total" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" />
                      <Area type="monotone" dataKey="ssEmployerTotal" name="SS Empresa" fill="hsl(var(--accent) / 0.2)" stroke="hsl(var(--accent))" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Evolución de plantilla y coste/empleado</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={resultA.projections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                      <Tooltip formatter={(v: number, name: string) => name === 'Plantilla' ? v : `${fmt(v)}€`} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="headcount" name="Plantilla" fill="hsl(var(--primary) / 0.6)" />
                      <Bar yAxisId="right" dataKey="costPerEmployee" name="Coste/empleado" fill="hsl(var(--accent) / 0.6)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Coste total proyectado" value={`${fmt(resultA.totalProjectedCost)}€`} sub={`${resultA.scenario.months} meses`} origin="projection" />
                <KPICard label="Media mensual" value={`${fmt(resultA.avgMonthlyCost)}€`} origin="projection" />
                <KPICard label="Variación vs base" value={`${resultA.costVariation >= 0 ? '+' : ''}${resultA.costVariation}%`} origin="projection" />
                <KPICard label="Coste/hora medio" value={`${fmt(resultA.baselineCost.costPerHour)}€`} origin="historical" />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Compare ── */}
        <TabsContent value="compare">
          {!comparison ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Ejecute una simulación para comparar escenarios.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comparativa: {resultA?.scenario.name} vs {resultB?.scenario.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Métrica</TableHead>
                      <TableHead className="text-xs text-right">{resultA?.scenario.name}</TableHead>
                      <TableHead className="text-xs text-right">{resultB?.scenario.name}</TableHead>
                      <TableHead className="text-xs text-right">Diferencia</TableHead>
                      <TableHead className="text-xs text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.map(row => (
                      <TableRow key={row.label}>
                        <TableCell className="text-xs font-medium">{row.label}</TableCell>
                        <TableCell className="text-xs text-right">{fmt(row.scenarioA)}€</TableCell>
                        <TableCell className="text-xs text-right">{fmt(row.scenarioB)}€</TableCell>
                        <TableCell className={cn("text-xs text-right font-medium", row.difference > 0 ? 'text-destructive' : 'text-green-600')}>
                          {row.difference > 0 ? '+' : ''}{fmt(row.difference)}€
                        </TableCell>
                        <TableCell className={cn("text-xs text-right", row.percentDiff > 0 ? 'text-destructive' : 'text-green-600')}>
                          {row.percentDiff > 0 ? '+' : ''}{row.percentDiff}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Summary ── */}
        <TabsContent value="summary">
          {!resultA ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Ejecute una simulación para ver el resumen ejecutivo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Resumen ejecutivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Coste base mensual</p>
                      <p className="text-xl font-bold">{fmt(resultA.baselineCost.totalMonthly)}€</p>
                      {originBadge('historical')}
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Proyectado ({resultA.scenario.months}m)</p>
                      <p className="text-xl font-bold">{fmt(resultA.totalProjectedCost)}€</p>
                      {originBadge('projection')}
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Variación</p>
                      <p className={cn("text-xl font-bold", resultA.costVariation > 0 ? 'text-destructive' : 'text-green-600')}>
                        {resultA.costVariation >= 0 ? '+' : ''}{resultA.costVariation}%
                      </p>
                      {originBadge('projection')}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Supuestos de la simulación</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {resultA.assumptions.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                          <span className="text-muted-foreground">{a.label}</span>
                          <div className="flex items-center gap-2">
                            <strong>{a.value}</strong>
                            {originBadge(a.origin)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {resultA.alerts.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2">Alertas detectadas</h4>
                        {resultA.alerts.map(al => (
                          <div key={al.id} className="flex items-start gap-2 p-2 rounded border mb-1">
                            {al.severity === 'critical' ? <XCircle className="h-4 w-4 text-destructive mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />}
                            <div>
                              <p className="text-xs font-medium">{al.title}</p>
                              <p className="text-xs text-muted-foreground">{al.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2 text-xs">
                      <Download className="h-3 w-3" /> Exportar resumen PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function ScenarioEditor({ scenario, onChange, label, color }: {
  scenario: ScenarioParams;
  onChange: (s: ScenarioParams) => void;
  label: string;
  color: string;
}) {
  const update = (field: keyof ScenarioParams, value: number | string) => {
    onChange({ ...scenario, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input value={scenario.name} onChange={e => update('name', e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Meses proyección</Label>
            <Input type="number" min={6} max={60} value={scenario.months} onChange={e => update('months', parseInt(e.target.value) || 12)} className="h-8 text-xs" />
          </div>
        </div>

        <SliderField label="IPC anual (%)" value={scenario.ipcAnnual} min={0} max={10} step={0.1} onChange={v => update('ipcAnnual', v)} />
        <SliderField label="Crecimiento salarial s/IPC (%)" value={scenario.salaryGrowthAboveIPC} min={0} max={5} step={0.1} onChange={v => update('salaryGrowthAboveIPC', v)} />
        <SliderField label="Δ Cotización SS (pp)" value={scenario.ssContributionDelta} min={-2} max={3} step={0.1} onChange={v => update('ssContributionDelta', v)} />
        <SliderField label="Absentismo (%)" value={scenario.absenteeismRate} min={0} max={15} step={0.5} onChange={v => update('absenteeismRate', v)} />
        <SliderField label="Crecimiento plantilla (%/año)" value={scenario.headcountGrowthRate} min={-20} max={50} step={1} onChange={v => update('headcountGrowthRate', v)} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">SMI mensual (€)</Label>
            <Input type="number" value={scenario.smiMonthly} onChange={e => update('smiMonthly', parseFloat(e.target.value) || 1184)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Formación/emp/año (€)</Label>
            <Input type="number" value={scenario.trainingCostPerEmployee} onChange={e => update('trainingCostPerEmployee', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderField({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono font-medium">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min} max={max} step={step}
        onValueChange={([v]) => onChange(v)}
        className="h-4"
      />
    </div>
  );
}

function KPICard({ label, value, sub, origin }: { label: string; value: string; sub?: string; origin: DataOrigin }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {originBadge(origin)}
      </CardContent>
    </Card>
  );
}

export default HRLaborCostSimulatorPanel;
