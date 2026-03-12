/**
 * ESPayrollBridge — Motor de Nómina España
 * 4 tabs: Cálculo | Simulador ES | Revisión Pre-cierre | Reporting
 */
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calculator, FlaskConical, ClipboardCheck, BarChart3, Play, CheckCircle, XCircle, AlertTriangle, Euro, Users, FileText } from 'lucide-react';
import { useESPayrollBridge, type ESPayrollCalculation, type ESPreCloseValidation, type ESReportData } from '@/hooks/erp/hr/useESPayrollBridge';
import { ESPayrollSlipDetail } from './ESPayrollSlipDetail';

interface Props {
  companyId: string;
}

export function ESPayrollBridge({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('simulator');
  const bridge = useESPayrollBridge(companyId);

  // Simulator state
  const [simSalario, setSimSalario] = useState(2000);
  const [simGrupo, setSimGrupo] = useState(5);
  const [simSituacion, setSimSituacion] = useState(1);
  const [simHijos, setSimHijos] = useState(0);
  const [simPlusConvenio, setSimPlusConvenio] = useState(0);
  const [simHorasExtra, setSimHorasExtra] = useState(0);
  const [simPagaExtra, setSimPagaExtra] = useState(0);
  const [simIsTemp, setSimIsTemp] = useState(false);
  const [simResult, setSimResult] = useState<ESPayrollCalculation | null>(null);

  // Validation state
  const [valPeriodId, setValPeriodId] = useState('');

  // Report state
  const [rptPeriodId, setRptPeriodId] = useState('');
  const [rptType, setRptType] = useState<'tc1' | 'coste_empresa' | 'irpf_summary'>('tc1');

  // Load SS bases + IRPF tables on mount
  useEffect(() => {
    const year = new Date().getFullYear();
    bridge.esLocalization.fetchSSBases(year);
    bridge.esLocalization.fetchIRPFTables(year);
  }, []);

  const handleSimulate = () => {
    const complementos: Record<string, number> = {};
    if (simPlusConvenio > 0) complementos['ES_COMP_CONVENIO'] = simPlusConvenio;

    const result = bridge.simulateES({
      salarioBase: simSalario,
      grupoCotizacion: simGrupo,
      situacionFamiliar: simSituacion,
      hijosmenores25: simHijos,
      complementos: Object.keys(complementos).length > 0 ? complementos : undefined,
      horasExtraImporte: simHorasExtra || undefined,
      pagaExtra: simPagaExtra || undefined,
      isTemporary: simIsTemp,
    });
    setSimResult(result);
  };

  const handleValidate = async () => {
    if (!valPeriodId.trim()) return;
    await bridge.validateESPreClose(valPeriodId);
  };

  const handleReport = async () => {
    if (!rptPeriodId.trim()) return;
    await bridge.generateESReport(rptPeriodId, rptType);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Euro className="h-5 w-5 text-primary" /> Motor de Nómina España
        </h3>
        <p className="text-sm text-muted-foreground">
          Cálculo completo: devengos, SS, IRPF, costes empresa, bases cotización
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="simulator" className="text-xs gap-1"><FlaskConical className="h-3.5 w-3.5" /> Simulador</TabsTrigger>
          <TabsTrigger value="catalog" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Conceptos</TabsTrigger>
          <TabsTrigger value="validation" className="text-xs gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> Pre-cierre</TabsTrigger>
          <TabsTrigger value="reporting" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> Reporting</TabsTrigger>
        </TabsList>

        {/* ── Simulador ES ── */}
        <TabsContent value="simulator" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Simulador de Nómina España</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Salario base mensual</Label>
                  <Input type="number" value={simSalario} onChange={e => setSimSalario(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Grupo cotización</Label>
                  <Select value={String(simGrupo)} onValueChange={v => setSimGrupo(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11].map(g => (
                        <SelectItem key={g} value={String(g)}>Grupo {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Situación familiar</Label>
                  <Select value={String(simSituacion)} onValueChange={v => setSimSituacion(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 – General</SelectItem>
                      <SelectItem value="2">2 – Cónyuge a cargo</SelectItem>
                      <SelectItem value="3">3 – Monoparental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Hijos &lt; 25</Label>
                  <Input type="number" min={0} value={simHijos} onChange={e => setSimHijos(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Plus convenio</Label>
                  <Input type="number" value={simPlusConvenio} onChange={e => setSimPlusConvenio(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Horas extra (€)</Label>
                  <Input type="number" value={simHorasExtra} onChange={e => setSimHorasExtra(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Paga extra</Label>
                  <Input type="number" value={simPagaExtra} onChange={e => setSimPagaExtra(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={simIsTemp} onChange={e => setSimIsTemp(e.target.checked)} className="rounded" />
                    Contrato temporal
                  </label>
                </div>
              </div>
              <Button onClick={handleSimulate} className="gap-1.5">
                <Play className="h-4 w-4" /> Simular nómina
              </Button>
            </CardContent>
          </Card>

          {simResult && (
            <ESPayrollSlipDetail
              calculation={simResult}
              employeeName="Empleado Simulación"
              periodo="Simulación"
              grupo={simGrupo}
            />
          )}
        </TabsContent>

        {/* ── Catálogo Conceptos ── */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">44 conceptos salariales españoles configurados</p>
            <Button variant="outline" size="sm" onClick={bridge.seedConceptTemplates} className="gap-1.5">
              <Calculator className="h-4 w-4" /> Seed a BD
            </Button>
          </div>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Código</TableHead>
                  <TableHead className="text-xs">Concepto</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Categoría</TableHead>
                  <TableHead className="text-xs text-center">IRPF</TableHead>
                  <TableHead className="text-xs text-center">SS</TableHead>
                  <TableHead className="text-xs">Ref. Legal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bridge.getConceptCatalog().map(c => (
                  <TableRow key={c.code}>
                    <TableCell className="text-xs font-mono">{c.code}</TableCell>
                    <TableCell className="text-xs">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.line_type === 'earning' ? 'default' : c.line_type === 'deduction' ? 'destructive' : c.line_type === 'employer_cost' ? 'secondary' : 'outline'} className="text-[10px]">
                        {c.line_type === 'earning' ? 'Devengo' : c.line_type === 'deduction' ? 'Deducción' : c.line_type === 'employer_cost' ? 'Coste emp.' : 'Info'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.category}</TableCell>
                    <TableCell className="text-center">{c.taxable ? '✓' : '—'}</TableCell>
                    <TableCell className="text-center">{c.contributable ? '✓' : '—'}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{c.legal_reference || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        {/* ── Revisión Pre-cierre ── */}
        <TabsContent value="validation" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Validación Pre-cierre España</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input placeholder="ID del período" value={valPeriodId} onChange={e => setValPeriodId(e.target.value)} className="max-w-xs" />
                <Button onClick={handleValidate} disabled={bridge.isCalculating} className="gap-1.5">
                  <ClipboardCheck className="h-4 w-4" /> Validar
                </Button>
              </div>
              {bridge.validations.length > 0 && (
                <div className="space-y-2">
                  {bridge.validations.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      {v.passed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : v.severity === 'error' ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{v.label}</p>
                        <p className="text-xs text-muted-foreground">{v.detail}</p>
                      </div>
                      <Badge variant={v.passed ? 'default' : v.severity === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {v.passed ? 'OK' : v.severity === 'error' ? 'Error' : 'Aviso'}
                      </Badge>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Badge variant={bridge.validations.every(v => v.passed) ? 'default' : 'destructive'}>
                      {bridge.validations.filter(v => v.passed).length}/{bridge.validations.length} validaciones OK
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reporting ── */}
        <TabsContent value="reporting" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informes de Nómina España</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Input placeholder="ID del período" value={rptPeriodId} onChange={e => setRptPeriodId(e.target.value)} className="max-w-xs" />
                <Select value={rptType} onValueChange={v => setRptType(v as any)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tc1">TC1 — Seg. Social</SelectItem>
                    <SelectItem value="coste_empresa">Coste empresa</SelectItem>
                    <SelectItem value="irpf_summary">Resumen IRPF</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleReport} className="gap-1.5">
                  <BarChart3 className="h-4 w-4" /> Generar
                </Button>
              </div>

              {bridge.reportData && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{bridge.reportData.periodName}</Badge>
                    <Badge variant="secondary">
                      {bridge.reportData.type === 'tc1' ? 'TC1 Seg. Social' : bridge.reportData.type === 'coste_empresa' ? 'Coste Empresa' : 'Resumen IRPF'}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Concepto</TableHead>
                        <TableHead className="text-xs text-right">Importe (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bridge.reportData.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{String(row.concepto)}</TableCell>
                          <TableCell className="text-sm text-right font-mono">
                            {Number(row.importe).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(bridge.reportData.totals).map(([key, val]) => (
                      <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-[10px] text-muted-foreground uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-sm font-bold font-mono">
                          {typeof val === 'number' && key !== 'numEmpleados'
                            ? `${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                            : val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
