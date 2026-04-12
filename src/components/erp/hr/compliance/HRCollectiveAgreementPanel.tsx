/**
 * HRCollectiveAgreementPanel — Motor de Convenios Colectivos con IA (C1)
 * 
 * Vista completa de convenio aplicado: condiciones, tablas salariales,
 * conflictos, trazabilidad y nivel de confianza por dato.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BookOpen, AlertTriangle, CheckCircle2, Clock, Shield,
  FileText, RefreshCw, Info, XCircle, HelpCircle, Scale,
  CalendarDays, Moon, Award, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  resolveAgreement, computeAgreementCompleteness, AGREEMENT_DISCLAIMER,
  type AgreementResolution, type RawCollectiveAgreement, type RawSalaryTableEntry,
  type DataConfidence, type TraceEntry, type AgreementConflict,
} from '@/engines/erp/hr/collectiveAgreementEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Helpers ──

const confidenceBadge = (c: DataConfidence) => {
  switch (c) {
    case 'confirmed':
      return <Badge variant="default" className="bg-green-600 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />Confirmado</Badge>;
    case 'ai_suggested':
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 text-xs gap-1"><HelpCircle className="h-3 w-3" />Sugerido IA</Badge>;
    case 'pending_validation':
      return <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />Pendiente validación</Badge>;
  }
};

const severityIcon = (s: AgreementConflict['severity']) => {
  switch (s) {
    case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'info': return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

// ── Component ──

export function HRCollectiveAgreementPanel() {
  const [resolution, setResolution] = useState<AgreementResolution | null>(null);
  const [completeness, setCompleteness] = useState<{ score: number; missing: string[]; present: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreements, setAgreements] = useState<RawCollectiveAgreement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [traceExpanded, setTraceExpanded] = useState(false);

  // Fetch agreements list
  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_collective_agreements')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      const list = (data || []) as unknown as RawCollectiveAgreement[];
      setAgreements(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      console.error('[C1] fetch agreements error:', err);
      toast.error('Error al cargar convenios');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  // Resolve selected agreement
  const resolveSelected = useCallback(async () => {
    const agreement = agreements.find(a => a.id === selectedId);
    if (!agreement) return;

    setLoading(true);
    try {
      // Fetch salary table rows
      const { data: salaryData } = await supabase
        .from('erp_hr_agreement_salary_tables')
        .select('professional_group, professional_group_description, level, base_salary_monthly, base_salary_annual, plus_convenio_monthly, extra_pay_amount, total_annual_compensation')
        .eq('agreement_code', agreement.code)
        .eq('is_active', true)
        .order('professional_group');

      const salaryRows = (salaryData || []) as unknown as RawSalaryTableEntry[];
      const result = resolveAgreement(agreement, salaryRows);
      const comp = computeAgreementCompleteness(agreement);

      setResolution(result);
      setCompleteness(comp);
    } catch (err) {
      console.error('[C1] resolve error:', err);
      toast.error('Error al resolver convenio');
    } finally {
      setLoading(false);
    }
  }, [agreements, selectedId]);

  useEffect(() => { fetchAgreements(); }, []);
  useEffect(() => { if (selectedId) resolveSelected(); }, [selectedId, resolveSelected]);

  // ── Empty state ──
  if (agreements.length === 0 && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-2">Motor de Convenios Colectivos</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            No hay convenios colectivos activos configurados.
            Añada un convenio desde la ficha de empresa o el selector de convenios.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Alert variant="default" className="border-amber-300 bg-amber-50/50">
        <Scale className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 text-sm font-medium">Aviso legal</AlertTitle>
        <AlertDescription className="text-xs text-amber-700">{AGREEMENT_DISCLAIMER}</AlertDescription>
      </Alert>

      {/* Agreement selector + completeness */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Card className="flex-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium">Convenio aplicado</label>
            </div>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value)}
            >
              {agreements.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {completeness && (
          <Card className="sm:w-64">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Completitud datos</span>
                <span className="text-sm font-bold">{completeness.score}%</span>
              </div>
              <Progress value={completeness.score} className="h-2" />
              {completeness.missing.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Faltan: {completeness.missing.slice(0, 3).join(', ')}{completeness.missing.length > 3 ? ` +${completeness.missing.length - 3}` : ''}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {resolution && (
          <Card className={cn("sm:w-52", resolution.isExpired ? 'border-destructive/50' : 'border-green-300')}>
            <CardContent className="pt-4 pb-3 text-center">
              {resolution.isExpired ? (
                <>
                  <Badge variant="destructive" className="mb-1">Expirado</Badge>
                  <p className="text-xs text-muted-foreground">Ultraactividad (Art. 86.3 ET)</p>
                </>
              ) : (
                <>
                  <Badge className="bg-green-600 mb-1">Vigente</Badge>
                  <p className="text-xs text-muted-foreground">
                    Hasta {resolution.expirationDate ? new Date(resolution.expirationDate).toLocaleDateString('es-ES') : 'indefinido'}
                  </p>
                </>
              )}
              {confidenceBadge(resolution.overallConfidence)}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main tabs */}
      {resolution && (
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {resolution.agreementName}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={resolveSelected} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
                </Button>
              </div>
              <TabsList className="grid w-full grid-cols-5 mt-2">
                <TabsTrigger value="overview" className="text-xs">Condiciones</TabsTrigger>
                <TabsTrigger value="salary" className="text-xs">Tablas salariales</TabsTrigger>
                <TabsTrigger value="conflicts" className="text-xs">
                  Conflictos {resolution.conflicts.length > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{resolution.conflicts.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="trace" className="text-xs">Trazabilidad</TabsTrigger>
                <TabsTrigger value="permits" className="text-xs">Permisos</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* ── Overview ── */}
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ConditionCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Jornada semanal"
                    value={`${resolution.workingConditions.weeklyHours}h`}
                    sub={resolution.workingConditions.annualHours ? `~${resolution.workingConditions.annualHours}h/año` : undefined}
                  />
                  <ConditionCard
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Vacaciones"
                    value={`${resolution.workingConditions.vacationDays} días`}
                  />
                  <ConditionCard
                    icon={<FileText className="h-4 w-4" />}
                    label="Pagas extra"
                    value={`${resolution.workingConditions.extraPayments}`}
                  />
                  <ConditionCard
                    icon={<Moon className="h-4 w-4" />}
                    label="Plus nocturnidad"
                    value={resolution.workingConditions.nightShiftBonus
                      ? `${resolution.workingConditions.nightShiftBonus.percentageIncrease}%`
                      : 'No definido'}
                    sub={resolution.workingConditions.nightShiftBonus
                      ? `${resolution.workingConditions.nightShiftBonus.startHour}h–${resolution.workingConditions.nightShiftBonus.endHour}h`
                      : undefined}
                  />
                </div>

                {resolution.workingConditions.seniorityRules && (
                  <div className="mt-4 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Antigüedad</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {resolution.workingConditions.seniorityRules.type === 'trienios' ? 'Trienios' : 'Quinquenios'}:
                      {' '}{resolution.workingConditions.seniorityRules.amountPerPeriod}
                      {resolution.workingConditions.seniorityRules.isPercentage ? '%' : '€'}
                      {resolution.workingConditions.seniorityRules.maxPeriods
                        ? ` (máx. ${resolution.workingConditions.seniorityRules.maxPeriods})`
                        : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fuente: {resolution.workingConditions.seniorityRules.source}
                    </p>
                  </div>
                )}

                {resolution.workingConditions.unionObligations.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Obligaciones sindicales</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ml-4">
                      {resolution.workingConditions.unionObligations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trial periods */}
                <div className="mt-3 p-3 rounded-lg border bg-muted/30">
                  <span className="text-sm font-medium">Periodos de prueba</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {Object.entries(resolution.workingConditions.trialPeriodDays).map(([k, v]) => (
                      <div key={k} className="text-xs text-muted-foreground">
                        <span className="capitalize">{k.replace(/_/g, ' ')}</span>: <strong>{v} días</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ── Salary Tables ── */}
              <TabsContent value="salary" className="mt-0">
                {resolution.salaryTable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay tablas salariales cargadas para este convenio.</p>
                    <p className="text-xs mt-1">Importe las tablas desde la configuración de nóminas.</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Grupo</TableHead>
                          <TableHead className="text-xs">Descripción</TableHead>
                          <TableHead className="text-xs text-right">Base mensual</TableHead>
                          <TableHead className="text-xs text-right">Plus conv.</TableHead>
                          <TableHead className="text-xs text-right">Paga extra</TableHead>
                          <TableHead className="text-xs text-right">Total anual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resolution.salaryTable.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{row.professionalGroup}</TableCell>
                            <TableCell className="text-xs">{row.groupDescription || '—'}</TableCell>
                            <TableCell className="text-right text-xs font-medium">{fmt(row.baseSalaryMonthly)}€</TableCell>
                            <TableCell className="text-right text-xs">{fmt(row.plusConvenioMonthly)}€</TableCell>
                            <TableCell className="text-right text-xs">{fmt(row.extraPayAmount)}€</TableCell>
                            <TableCell className="text-right text-xs font-medium">{fmt(row.totalAnnual)}€</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* ── Conflicts ── */}
              <TabsContent value="conflicts" className="mt-0">
                {resolution.conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium">Sin conflictos detectados</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Los conflictos se detectan al comparar datos de empleados con el convenio.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resolution.conflicts.map(c => (
                      <div key={c.id} className={cn(
                        "p-3 rounded-lg border",
                        c.severity === 'critical' && 'border-destructive/50 bg-destructive/5',
                        c.severity === 'warning' && 'border-amber-300 bg-amber-50/50',
                        c.severity === 'info' && 'border-blue-200 bg-blue-50/50',
                      )}>
                        <div className="flex items-start gap-2">
                          {severityIcon(c.severity)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{c.area}</p>
                            <p className="text-xs text-muted-foreground">{c.description}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                              <div><span className="text-muted-foreground">Actual:</span> <strong>{c.currentValue}</strong></div>
                              <div><span className="text-muted-foreground">Convenio:</span> <strong>{c.agreementValue}</strong></div>
                            </div>
                            <p className="text-xs mt-1"><strong>Recomendación:</strong> {c.recommendation}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Ref: {c.legalReference}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Traceability ── */}
              <TabsContent value="trace" className="mt-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Trazabilidad de resolución</span>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setTraceExpanded(!traceExpanded)}
                      className="text-xs"
                    >
                      {traceExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      {traceExpanded ? 'Colapsar' : 'Expandir todo'}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    {(traceExpanded ? resolution.trace : resolution.trace.slice(0, 6)).map((t, i) => (
                      <TraceRow key={i} entry={t} />
                    ))}
                    {!traceExpanded && resolution.trace.length > 6 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        +{resolution.trace.length - 6} entradas más
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* ── Permits ── */}
              <TabsContent value="permits" className="mt-0">
                {resolution.workingConditions.additionalPermits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay permisos adicionales registrados en el convenio.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resolution.workingConditions.additionalPermits.map((p, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={p.isPaid ? 'default' : 'secondary'} className="text-xs">
                              {p.isPaid ? 'Retribuido' : 'No retribuido'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{p.days} días</Badge>
                          </div>
                        </div>
                        {p.conditions && <p className="text-xs text-muted-foreground mt-1">{p.conditions}</p>}
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Fuente: {p.source}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}

// ── Sub-components ──

function ConditionCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-lg border bg-card text-center">
      <div className="flex items-center justify-center gap-1 mb-1 text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TraceRow({ entry }: { entry: TraceEntry }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <div className="mt-0.5">{confidenceBadge(entry.confidence)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize">{entry.field.replace(/_/g, ' ')}</p>
        <p className="text-xs text-foreground">{String(entry.value)}</p>
        <p className="text-xs text-muted-foreground">Fuente: {entry.source}</p>
        {entry.notes && <p className="text-xs text-amber-600 mt-0.5">{entry.notes}</p>}
      </div>
    </div>
  );
}

export default HRCollectiveAgreementPanel;
