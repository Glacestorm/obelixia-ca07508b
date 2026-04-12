/**
 * HREqualityPanel — Complete Equality Plan Module (B1)
 * RD 901/2020, RD 902/2020, LO 3/2007
 * 
 * Features:
 *  - Dashboard with 9 mandatory diagnostic areas
 *  - Negotiation timeline with RLT
 *  - Measures tracking by state
 *  - Document evidence per area/measure
 *  - REGCON readiness (honest, never "registered" without proof)
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Scale,
  FileText,
  Users,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  BarChart3,
  Shield,
  Clock,
  Target,
  ClipboardList,
  ArrowRight,
  Paperclip,
  X,
  Circle,
  XCircle,
  Loader2,
  Info,
  CalendarDays,
  Building2,
} from 'lucide-react';
import { useHREquality } from '@/hooks/admin/hr/useHREquality';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DIAGNOSTIC_AREAS,
  MEASURE_STATUS_CONFIG,
  NEGOTIATION_PHASES,
  canTransitionMeasure,
  computeDiagnosticProgress,
  computeMeasuresSummary,
  parseDiagnosisData,
  parseMeasuresData,
  parseNegotiationTimeline,
  type DiagnosticAreaCode,
  type DiagnosticAreaScore,
  type DiagnosticStatus,
  type EqualityMeasure,
  type MeasureStatus,
  type NegotiationEvent,
  type NegotiationPhase,
} from '@/engines/erp/hr/equalityPlanEngine';
import type { EqualityPlan } from '@/hooks/admin/hr/useHREquality';

interface HREqualityPanelProps {
  companyId?: string;
  className?: string;
}

export function HREqualityPanel({ companyId, className }: HREqualityPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showNewMeasure, setShowNewMeasure] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);

  // New plan form
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanStart, setNewPlanStart] = useState('');
  const [newPlanEnd, setNewPlanEnd] = useState('');

  // New measure form
  const [newMeasureArea, setNewMeasureArea] = useState<DiagnosticAreaCode>('hiring_selection');
  const [newMeasureTitle, setNewMeasureTitle] = useState('');
  const [newMeasureDesc, setNewMeasureDesc] = useState('');

  // New timeline event
  const [newEventPhase, setNewEventPhase] = useState<NegotiationPhase>('constitution');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const {
    plans,
    audits,
    protocols,
    stats,
    loading,
    fetchEqualityData,
    createPlan,
    updatePlan,
    saveDiagnosis,
    saveMeasures,
    saveTimeline,
    getRegconReadiness,
  } = useHREquality(companyId);

  const selectedPlan = useMemo(
    () => plans.find(p => p.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );

  const diagAreas = useMemo(() => parseDiagnosisData(selectedPlan?.diagnosis_data ?? null), [selectedPlan]);
  const measures = useMemo(() => parseMeasuresData(selectedPlan?.measures ?? null), [selectedPlan]);
  const timeline = useMemo(() => parseNegotiationTimeline(selectedPlan?.objectives ?? null), [selectedPlan]);
  const diagProgress = useMemo(() => computeDiagnosticProgress(diagAreas), [diagAreas]);
  const measuresSummary = useMemo(() => computeMeasuresSummary(measures), [measures]);
  const regconReadiness = useMemo(() => getRegconReadiness(selectedPlan), [getRegconReadiness, selectedPlan]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleCreatePlan = useCallback(async () => {
    if (!newPlanName || !newPlanStart || !newPlanEnd) return;
    await createPlan({ plan_name: newPlanName, start_date: newPlanStart, end_date: newPlanEnd });
    setNewPlanName('');
    setNewPlanStart('');
    setNewPlanEnd('');
    setShowNewPlan(false);
  }, [createPlan, newPlanName, newPlanStart, newPlanEnd]);

  const handleUpdateDiagArea = useCallback(async (areaCode: DiagnosticAreaCode, status: DiagnosticStatus, findings?: string) => {
    if (!selectedPlan) return;
    const existing = [...diagAreas];
    const idx = existing.findIndex(a => a.areaCode === areaCode);
    const updated: DiagnosticAreaScore = { areaCode, status, findings };
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updated };
    } else {
      existing.push(updated);
    }
    await saveDiagnosis(selectedPlan.id, existing);
  }, [selectedPlan, diagAreas, saveDiagnosis]);

  const handleAddMeasure = useCallback(async () => {
    if (!selectedPlan || !newMeasureTitle) return;
    const newItem: EqualityMeasure = {
      id: crypto.randomUUID(),
      areaCode: newMeasureArea,
      title: newMeasureTitle,
      description: newMeasureDesc,
      status: 'proposed',
      createdAt: new Date().toISOString(),
    };
    await saveMeasures(selectedPlan.id, [...measures, newItem]);
    setNewMeasureTitle('');
    setNewMeasureDesc('');
    setShowNewMeasure(false);
  }, [selectedPlan, measures, saveMeasures, newMeasureArea, newMeasureTitle, newMeasureDesc]);

  const handleTransitionMeasure = useCallback(async (measureId: string, newStatus: MeasureStatus) => {
    if (!selectedPlan) return;
    const updated = measures.map(m => {
      if (m.id === measureId && canTransitionMeasure(m.status, newStatus)) {
        return {
          ...m,
          status: newStatus,
          ...(newStatus === 'completed' ? { completedDate: new Date().toISOString() } : {}),
        };
      }
      return m;
    });
    await saveMeasures(selectedPlan.id, updated);
  }, [selectedPlan, measures, saveMeasures]);

  const handleUpdateEvidence = useCallback(async (measureId: string, evidence: string[]) => {
    if (!selectedPlan) return;
    const updated = measures.map(m => m.id === measureId ? { ...m, evidence } : m);
    await saveMeasures(selectedPlan.id, updated);
  }, [selectedPlan, measures, saveMeasures]);

  const handleAddTimelineEvent = useCallback(async () => {
    if (!selectedPlan || !newEventTitle || !newEventDate) return;
    const newEvent: NegotiationEvent = {
      id: crypto.randomUUID(),
      phase: newEventPhase,
      title: newEventTitle,
      date: newEventDate,
    };
    await saveTimeline(selectedPlan.id, [...timeline, newEvent].sort((a, b) => a.date.localeCompare(b.date)));
    setNewEventTitle('');
    setNewEventDate('');
    setShowNewEvent(false);
  }, [selectedPlan, timeline, saveTimeline, newEventPhase, newEventTitle, newEventDate]);

  // ── Status config ─────────────────────────────────────────────────────

  const planStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Borrador', variant: 'outline' },
    in_progress: { label: 'En progreso', variant: 'secondary' },
    approved: { label: 'Aprobado', variant: 'default' },
    expired: { label: 'Expirado', variant: 'destructive' },
    under_review: { label: 'En revisión', variant: 'secondary' },
  };

  const regconBadge = regconReadiness.status === 'official_handoff_ready'
    ? { label: 'Preparado internamente', variant: 'default' as const, icon: CheckCircle }
    : regconReadiness.status === 'internal_ready'
      ? { label: 'En preparación', variant: 'secondary' as const, icon: Clock }
      : { label: 'No preparado', variant: 'outline' as const, icon: AlertTriangle };

  // ── Render ─────────────────────────────────────────────────────────────

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-12 text-center">
          <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para gestionar planes de igualdad</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Header with plan selector ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Plan de Igualdad</CardTitle>
                <p className="text-xs text-muted-foreground">RD 901/2020 · LO 3/2007 · RD 902/2020</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {plans.length > 1 && (
                <Select value={selectedPlanId ?? plans[0]?.id ?? ''} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="w-[220px] h-8 text-xs">
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Badge variant={regconBadge.variant} className="gap-1 text-xs">
                <regconBadge.icon className="h-3 w-3" />
                REGCON: {regconBadge.label}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => fetchEqualityData()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo Plan</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Crear Plan de Igualdad</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Nombre del plan" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Inicio</label>
                        <Input type="date" value={newPlanStart} onChange={e => setNewPlanStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Fin</label>
                        <Input type="date" value={newPlanEnd} onChange={e => setNewPlanEnd(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleCreatePlan} disabled={!newPlanName || !newPlanStart || !newPlanEnd}>Crear</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div><p className="text-xl font-bold">{stats.totalPlans}</p><p className="text-[10px] text-muted-foreground">Planes</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div><p className="text-xl font-bold">{stats.activePlans}</p><p className="text-[10px] text-muted-foreground">Aprobados</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" />
            <div><p className="text-xl font-bold">{diagProgress.percentage}%</p><p className="text-[10px] text-muted-foreground">Diagnóstico</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-500" />
            <div><p className="text-xl font-bold">{measuresSummary.completionRate}%</p><p className="text-[10px] text-muted-foreground">Medidas cerradas</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-violet-500" />
            <div><p className="text-xl font-bold">{stats.avgGenderGap !== null ? `${stats.avgGenderGap.toFixed(1)}%` : 'N/A'}</p><p className="text-[10px] text-muted-foreground">Brecha salarial</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* ── Main Tabs ── */}
      <Card>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="text-xs gap-1"><Scale className="h-3.5 w-3.5" />Resumen</TabsTrigger>
              <TabsTrigger value="diagnosis" className="text-xs gap-1"><Target className="h-3.5 w-3.5" />Diagnóstico</TabsTrigger>
              <TabsTrigger value="measures" className="text-xs gap-1"><ClipboardList className="h-3.5 w-3.5" />Medidas</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" />Negociación RLT</TabsTrigger>
              <TabsTrigger value="audits" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" />Auditoría</TabsTrigger>
              <TabsTrigger value="protocols" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" />Protocolos</TabsTrigger>
              <TabsTrigger value="regcon" className="text-xs gap-1"><Building2 className="h-3.5 w-3.5" />REGCON</TabsTrigger>
            </TabsList>

            {/* ── Overview ── */}
            <TabsContent value="overview">
              {!selectedPlan ? (
                <EmptyState icon={FileText} text="No hay planes de igualdad. Crea uno para comenzar." subtext="Obligatorio para empresas de +50 empleados (RD 901/2020)" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{selectedPlan.plan_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Vigencia: {format(new Date(selectedPlan.start_date), 'dd/MM/yyyy')} - {format(new Date(selectedPlan.end_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <Badge variant={planStatusConfig[selectedPlan.status || 'draft']?.variant || 'outline'}>
                      {planStatusConfig[selectedPlan.status || 'draft']?.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-dashed">
                      <CardContent className="pt-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Target className="h-4 w-4" /> Diagnóstico ({diagProgress.completed}/{diagProgress.total})
                        </h4>
                        <Progress value={diagProgress.percentage} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground">{diagProgress.percentage}% completado</p>
                      </CardContent>
                    </Card>
                    <Card className="border-dashed">
                      <CardContent className="pt-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <ClipboardList className="h-4 w-4" /> Medidas ({measuresSummary.total})
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(measuresSummary.byStatus).filter(([, v]) => v > 0).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[10px]">
                              {MEASURE_STATUS_CONFIG[k as MeasureStatus].label}: {v}
                            </Badge>
                          ))}
                          {measuresSummary.total === 0 && <p className="text-xs text-muted-foreground">Sin medidas registradas</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Building2 className="h-4 w-4" /> Estado REGCON
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={regconBadge.variant} className="gap-1">
                          <regconBadge.icon className="h-3 w-3" />
                          {regconReadiness.label}
                        </Badge>
                      </div>
                      {regconReadiness.blockers.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {regconReadiness.blockers.map((b, i) => (
                            <p key={i} className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" />{b}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2 italic">
                        Este sistema no sustituye la inscripción oficial en REGCON. El estado refleja la preparación interna.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ── Diagnosis: 9 Mandatory Areas ── */}
            <TabsContent value="diagnosis">
              <ScrollArea className="h-[450px]">
                <div className="space-y-2">
                  {DIAGNOSTIC_AREAS.map(area => {
                    const score = diagAreas.find(d => d.areaCode === area.code);
                    const status = score?.status ?? 'not_started';
                    return (
                      <Card key={area.code} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <DiagnosticStatusIcon status={status} />
                              <h4 className="text-sm font-medium truncate">{area.label}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{area.description}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{area.legalRef}</p>
                            {score?.findings && (
                              <p className="text-xs mt-1 bg-muted/50 rounded px-2 py-1">{score.findings}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Select
                              value={status}
                              onValueChange={(v) => handleUpdateDiagArea(area.code, v as DiagnosticStatus, score?.findings)}
                              disabled={!selectedPlan}
                            >
                              <SelectTrigger className="h-7 text-[10px] w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">No iniciado</SelectItem>
                                <SelectItem value="in_progress">En progreso</SelectItem>
                                <SelectItem value="completed">Completado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                {!selectedPlan && (
                  <p className="text-xs text-muted-foreground text-center mt-4">Crea un plan para gestionar el diagnóstico</p>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Measures ── */}
            <TabsContent value="measures">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Medidas correctoras ({measuresSummary.total})</h4>
                <Dialog open={showNewMeasure} onOpenChange={setShowNewMeasure}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!selectedPlan}><Plus className="h-4 w-4 mr-1" />Añadir medida</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nueva medida</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Select value={newMeasureArea} onValueChange={(v) => setNewMeasureArea(v as DiagnosticAreaCode)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DIAGNOSTIC_AREAS.map(a => (
                            <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Título de la medida" value={newMeasureTitle} onChange={e => setNewMeasureTitle(e.target.value)} />
                      <Textarea placeholder="Descripción" value={newMeasureDesc} onChange={e => setNewMeasureDesc(e.target.value)} rows={2} />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                      <Button onClick={handleAddMeasure} disabled={!newMeasureTitle}>Añadir</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[400px]">
                {measures.length === 0 ? (
                  <EmptyState icon={ClipboardList} text="Sin medidas registradas" subtext="Añade medidas correctoras vinculadas a cada materia del diagnóstico" />
                ) : (
                  <div className="space-y-2">
                    {measures.map(m => {
                      const cfg = MEASURE_STATUS_CONFIG[m.status];
                      const areaLabel = DIAGNOSTIC_AREAS.find(a => a.code === m.areaCode)?.label ?? m.areaCode;
                      const transitions = Object.entries(MEASURE_STATUS_CONFIG)
                        .filter(([k]) => canTransitionMeasure(m.status, k as MeasureStatus));
                      return (
                        <Card key={m.id} className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="text-sm font-medium">{m.title}</h4>
                                <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                                <Badge variant="outline" className="text-[10px]">{areaLabel}</Badge>
                              </div>
                              {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
                              {/* Evidence management */}
                              <MeasureEvidenceEditor
                                evidence={m.evidence || []}
                                onChange={(ev) => handleUpdateEvidence(m.id, ev)}
                              />
                            </div>
                            {transitions.length > 0 && (
                              <div className="flex gap-1 shrink-0">
                                {transitions.map(([k, v]) => (
                                  <Button
                                    key={k}
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] h-7 px-2"
                                    onClick={() => handleTransitionMeasure(m.id, k as MeasureStatus)}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />{v.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Negotiation Timeline ── */}
            <TabsContent value="timeline">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Timeline de negociación con RLT</h4>
                <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!selectedPlan}><Plus className="h-4 w-4 mr-1" />Añadir evento</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo evento de negociación</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Select value={newEventPhase} onValueChange={(v) => setNewEventPhase(v as NegotiationPhase)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NEGOTIATION_PHASES.map(p => (
                            <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Título del evento" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                      <Input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                      <Button onClick={handleAddTimelineEvent} disabled={!newEventTitle || !newEventDate}>Añadir</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[400px]">
                {/* Phase guide */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium mb-2">Fases del proceso (Art. 4-8 RD 901/2020)</p>
                  <div className="flex flex-wrap gap-1">
                    {NEGOTIATION_PHASES.map((ph, i) => {
                      const hasEvents = timeline.some(e => e.phase === ph.code);
                      return (
                        <Badge key={ph.code} variant={hasEvents ? 'default' : 'outline'} className="text-[10px] gap-1">
                          <span className="font-mono">{i + 1}</span> {ph.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                {timeline.length === 0 ? (
                  <EmptyState icon={Clock} text="Sin eventos de negociación" subtext="Registra las reuniones y acuerdos con la representación legal de los trabajadores" />
                ) : (
                  <div className="relative pl-6 space-y-3">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                    {timeline.map(ev => {
                      const phaseLabel = NEGOTIATION_PHASES.find(p => p.code === ev.phase)?.label ?? ev.phase;
                      return (
                        <div key={ev.id} className="relative">
                          <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                          <Card className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium">{ev.title}</h4>
                                  <Badge variant="outline" className="text-[10px]">{phaseLabel}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(new Date(ev.date), "dd 'de' MMMM yyyy", { locale: es })}
                                </p>
                                {ev.description && <p className="text-xs mt-1">{ev.description}</p>}
                              </div>
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Salary Audits ── */}
            <TabsContent value="audits">
              <ScrollArea className="h-[400px]">
                {audits.length === 0 ? (
                  <EmptyState icon={BarChart3} text="No hay auditorías salariales registradas" subtext="Obligatorio para empresas de +50 empleados (RD 902/2020)" />
                ) : (
                  <div className="space-y-3">
                    {audits.map(audit => (
                      <Card key={audit.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">Auditoría {audit.audit_year}</h4>
                              {audit.overall_gap_percentage !== null && (
                                <Badge variant={audit.overall_gap_percentage > 25 ? 'destructive' : 'secondary'}>
                                  Brecha: {audit.overall_gap_percentage.toFixed(1)}%
                                </Badge>
                              )}
                              {audit.status && <Badge variant="outline" className="text-[10px]">{audit.status}</Badge>}
                            </div>
                            {audit.audit_period && <p className="text-sm text-muted-foreground">Período: {audit.audit_period}</p>}
                            {audit.legal_justification && <p className="text-sm text-muted-foreground line-clamp-2">{audit.legal_justification}</p>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── Protocols ── */}
            <TabsContent value="protocols">
              <ScrollArea className="h-[400px]">
                {protocols.length === 0 ? (
                  <EmptyState icon={Shield} text="No hay protocolos de acoso registrados" subtext="Obligatorio para todas las empresas (LO 3/2007)" />
                ) : (
                  <div className="space-y-3">
                    {protocols.map(protocol => (
                      <Card key={protocol.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{protocol.protocol_name}</h4>
                              <Badge variant={protocol.is_active ? 'default' : 'outline'}>
                                {protocol.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Badge variant="secondary">v{protocol.version}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Vigente desde: {format(new Date(protocol.effective_date), 'dd/MM/yyyy')}
                            </p>
                            {protocol.contact_person && (
                              <p className="text-xs text-muted-foreground">
                                Contacto: {protocol.contact_person} ({protocol.contact_email})
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ── REGCON Readiness ── */}
            <TabsContent value="regcon">
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Estado de preparación para la inscripción del Plan de Igualdad en el Registro de Convenios y Acuerdos Colectivos (REGCON).
                    Este sistema <strong>no realiza la inscripción oficial</strong>. El estado refleja únicamente la completitud interna del plan.
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <regconBadge.icon className={cn("h-6 w-6",
                        regconReadiness.status === 'official_handoff_ready' ? 'text-green-500' :
                        regconReadiness.status === 'internal_ready' ? 'text-amber-500' : 'text-muted-foreground'
                      )} />
                      <div>
                        <p className="font-semibold">{regconReadiness.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {regconReadiness.checks.filter(c => c.passed).length}/{regconReadiness.checks.length} requisitos cumplidos
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <div className="space-y-2">
                      {regconReadiness.checks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {check.passed
                              ? <CheckCircle className="h-4 w-4 text-green-500" />
                              : <XCircle className="h-4 w-4 text-destructive" />
                            }
                            <div>
                              <p className="text-sm font-medium">{check.check}</p>
                              {check.detail && <p className="text-[10px] text-muted-foreground">{check.detail}</p>}
                            </div>
                          </div>
                          <Badge variant={check.passed ? 'default' : 'destructive'} className="text-[10px]">
                            {check.passed ? 'Cumple' : 'Pendiente'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DiagnosticStatusIcon({ status }: { status: DiagnosticStatus }) {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    case 'in_progress': return <Loader2 className="h-4 w-4 text-amber-500 shrink-0" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}

function EmptyState({ icon: Icon, text, subtext }: { icon: React.ElementType; text: string; subtext?: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{text}</p>
      {subtext && <p className="text-sm mt-2">{subtext}</p>}
    </div>
  );
}

function MeasureEvidenceEditor({ evidence, onChange }: { evidence: string[]; onChange: (ev: string[]) => void }) {
  const [input, setInput] = useState('');
  const handleAdd = () => {
    const val = input.trim();
    if (val && !evidence.includes(val)) {
      onChange([...evidence, val]);
      setInput('');
    }
  };
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 mb-1">
        <Paperclip className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">Evidencias ({evidence.length})</span>
      </div>
      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {evidence.map((ev, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
              {ev}
              <button onClick={() => onChange(evidence.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder="Acta, documento, URL..."
          className="h-6 text-[10px] flex-1"
        />
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleAdd} disabled={!input.trim()}>
          +
        </Button>
      </div>
    </div>
  );
}

export default HREqualityPanel;
