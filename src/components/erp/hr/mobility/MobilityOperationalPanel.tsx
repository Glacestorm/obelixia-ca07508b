/**
 * MobilityOperationalPanel.tsx — G2.2 Phase 2
 * Operational corridor view with executive summary, timeline/phases,
 * document gaps, fiscal/payroll dependencies, coverage, and task generation.
 *
 * Coexists with MobilityCorridorPanel (pack base view) via sub-tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, Shield, AlertTriangle, CheckCircle, XCircle, Info,
  Clock, FileText, Scale, ChevronDown, ChevronRight,
  ClipboardList, Eye, Plus, Building2, ArrowRight,
} from 'lucide-react';
import { useCorridorOperationalPlan } from '@/hooks/erp/hr/useCorridorOperationalPlan';
import type { MobilityAssignment, MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';
import type {
  CorridorPhase, CheckItem, ContextualAlert, DocRequirement,
  FiscalPayrollDependency, SuggestedTask, CoverageLevel, PhaseId, Provenance,
} from '@/engines/erp/hr/corridorOperationalEngine';

interface Props {
  assignment: MobilityAssignment;
  documents: MobilityDocument[];
  companyId?: string;
}

// ── Provenance Badge ──

const PROVENANCE_LABELS: Record<Provenance, string> = {
  pack: 'Pack',
  supervisor: 'Supervisor',
  assignment: 'Asignación',
  document: 'Documento',
  engine: 'Motor',
  fiscal_module: 'Fiscal',
  payroll_module: 'Payroll',
};

function ProvenanceBadge({ source }: { source: Provenance }) {
  return (
    <Badge variant="outline" className="text-[8px] px-1 py-0 font-normal text-muted-foreground">
      {PROVENANCE_LABELS[source]}
    </Badge>
  );
}

// ── Coverage Badge ──

const COVERAGE_CONFIG: Record<CoverageLevel, { label: string; className: string }> = {
  full: { label: 'Cobertura completa', className: 'bg-success/12 text-success border-success/30' },
  partial: { label: 'Cobertura parcial', className: 'bg-warning/12 text-warning border-warning/30' },
  minimal: { label: 'Cobertura mínima', className: 'bg-destructive/12 text-destructive border-destructive/30' },
};

// ── Phase Status ──

const PHASE_STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  completed: { className: 'bg-success/12 text-success', label: 'Completada' },
  active: { className: 'bg-info/12 text-info', label: 'Activa' },
  future: { className: 'bg-muted text-muted-foreground', label: 'Pendiente' },
};

// ── Severity Icons ──

function SeverityIcon({ severity, className }: { severity: string; className?: string }) {
  if (severity === 'critical') return <XCircle className={`${className} text-destructive`} />;
  if (severity === 'warning') return <AlertTriangle className={`${className} text-warning`} />;
  return <Info className={`${className} text-muted-foreground`} />;
}

// ── Sub-Components ──

function ExecutiveSummaryCard({ plan }: { plan: NonNullable<ReturnType<typeof useCorridorOperationalPlan>['plan']> }) {
  const { executiveSummary: es, coverageAssessment: cov } = plan;
  const coverageCfg = COVERAGE_CONFIG[es.coverageLevel];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-info" />
            Resumen ejecutivo — {es.corridorLabel}
          </CardTitle>
          <Badge className={`text-[10px] ${coverageCfg.className}`}>{coverageCfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Soporte</p>
            <p className="text-xs font-semibold">{es.supportLevelLabel}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Riesgo</p>
            <p className="text-xs font-bold">{es.riskScore}/100</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Pack</p>
            <p className="text-xs font-bold">{es.packAvailable ? `v${es.packVersion}` : 'N/A'}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Señales</p>
            <p className="text-xs font-bold">{es.activatedSignals}/{es.totalSignals}</p>
          </div>
        </div>

        {es.prudenceNotes.length > 0 && (
          <div className="p-2 rounded-lg bg-warning/8 border border-warning/15">
            <p className="text-[10px] font-medium text-warning mb-1">⚠️ Notas de prudencia</p>
            {es.prudenceNotes.map((note, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">• {note}</p>
            ))}
          </div>
        )}

        {/* Coverage rule explanation */}
        <p className="text-[9px] text-muted-foreground italic">{cov.rule}</p>
      </CardContent>
    </Card>
  );
}

function PhaseCard({ phase }: { phase: CorridorPhase }) {
  const [expanded, setExpanded] = useState(phase.status === 'active');
  const statusCfg = PHASE_STATUS_CONFIG[phase.status];
  const completedItems = phase.checklist.filter(c => c.completed).length;

  return (
    <Card className={phase.status === 'active' ? 'border-info/30' : ''}>
      <CardContent className="py-3">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span className="text-xs font-semibold">{phase.label}</span>
            <Badge className={`text-[9px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
            {phase.alerts.length > 0 && (
              <Badge variant="outline" className="text-[8px] text-warning">
                {phase.alerts.length} alerta(s)
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {completedItems}/{phase.checklist.length} items
          </span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {/* Timeline */}
            {(phase.estimatedStart || phase.estimatedEnd) && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {phase.estimatedStart ?? '?'} → {phase.estimatedEnd ?? 'indefinido'}
              </p>
            )}

            {/* Checklist */}
            {phase.checklist.length > 0 && (
              <div className="space-y-1">
                {phase.checklist.map(item => (
                  <div key={item.id} className="flex items-start gap-2 text-[11px] py-1">
                    {item.completed
                      ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0 mt-0.5" />
                    }
                    <span className={item.completed ? 'text-muted-foreground line-through' : ''}>
                      {item.label}
                    </span>
                    <ProvenanceBadge source={item.provenance} />
                  </div>
                ))}
              </div>
            )}

            {/* Alerts */}
            {phase.alerts.length > 0 && (
              <div className="space-y-1 mt-2">
                {phase.alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 text-[11px] p-2 rounded-lg border bg-card">
                    <SeverityIcon severity={alert.severity} className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p>{alert.message}</p>
                      {alert.suggestedAction && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">→ {alert.suggestedAction}</p>
                      )}
                      <ProvenanceBadge source={alert.provenance} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ requirements, gaps }: { requirements: DocRequirement[]; gaps: ReturnType<typeof useCorridorOperationalPlan>['plan'] extends null ? never : NonNullable<ReturnType<typeof useCorridorOperationalPlan>['plan']>['documentGaps'] }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Documentación requerida ({requirements.filter(r => r.present).length}/{requirements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  {req.present
                    ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  }
                  <span>{req.label}</span>
                  <ProvenanceBadge source={req.provenance} />
                </div>
                {req.present && req.presentDocName && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{req.presentDocName}</span>
                )}
                {!req.present && req.mappedTypes.length > 0 && (
                  <span className="text-[9px] text-muted-foreground">espera: {req.mappedTypes.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {gaps.length > 0 && (
        <div className="p-2 rounded-lg bg-destructive/8 border border-destructive/15">
          <p className="text-[10px] font-medium text-destructive mb-1">Documentos faltantes ({gaps.length})</p>
          {gaps.map((gap, i) => (
            <p key={i} className="text-[10px] text-muted-foreground">
              • {gap.label} <ProvenanceBadge source={gap.provenance} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DependenciesSection({ dependencies }: { dependencies: FiscalPayrollDependency[] }) {
  if (dependencies.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Sin dependencias fiscal/payroll/legal detectadas
        </CardContent>
      </Card>
    );
  }

  const MODULE_ICONS_MAP: Record<string, typeof Globe> = {
    fiscal: Scale,
    payroll: Building2,
    legal: Shield,
  };

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    action_needed: { label: 'Acción necesaria', className: 'bg-warning/12 text-warning border-warning/30' },
    pending_review: { label: 'Pendiente revisión', className: 'bg-info/12 text-info border-info/30' },
    informational: { label: 'Informativo', className: 'bg-muted text-muted-foreground' },
  };

  return (
    <div className="space-y-2">
      {dependencies.map(dep => {
        const Icon = MODULE_ICONS_MAP[dep.module] ?? Globe;
        const statusCfg = STATUS_LABELS[dep.status] ?? STATUS_LABELS.informational;
        return (
          <Card key={dep.id}>
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{dep.label}</span>
                    <Badge className={`text-[9px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
                    <ProvenanceBadge source={dep.provenance} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <ArrowRight className="h-3 w-3 inline mr-1" />
                    {dep.suggestedAction}
                  </p>
                  {dep.context && (
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5 italic">{dep.context}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CoverageSection({ coverage }: { coverage: NonNullable<ReturnType<typeof useCorridorOperationalPlan>['plan']>['coverageAssessment'] }) {
  const cfg = COVERAGE_CONFIG[coverage.level];
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Cobertura del corredor
          </CardTitle>
          <Badge className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[10px] text-muted-foreground italic">{coverage.rule}</p>

        {coverage.gaps.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Gaps detectados:</p>
            {coverage.gaps.map((gap, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">• {gap}</p>
            ))}
          </div>
        )}

        {coverage.prudenceNotes.length > 0 && (
          <div className="p-2 rounded-lg bg-warning/8 border border-warning/15">
            <p className="text-[10px] font-medium text-warning mb-1">Notas de prudencia</p>
            {coverage.prudenceNotes.map((note, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">• {note}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TasksSection({
  pendingTasks,
  existingTaskTypes,
  allTasks,
  onCheckDuplicates,
  onCreateTasks,
  isChecking,
  companyId,
}: {
  pendingTasks: SuggestedTask[];
  existingTaskTypes: Set<string>;
  allTasks: SuggestedTask[];
  onCheckDuplicates: () => void;
  onCreateTasks: (ids: string[], companyId: string) => Promise<number>;
  isChecking: boolean;
  companyId: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const toggleTask = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(pendingTasks.map(t => t.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleCreate = async () => {
    if (selectedIds.size === 0) return;
    setCreating(true);
    await onCreateTasks(Array.from(selectedIds), companyId);
    setSelectedIds(new Set());
    setCreating(false);
  };

  const alreadyExistingCount = allTasks.length - pendingTasks.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" /> Tareas sugeridas ({pendingTasks.length} nuevas)
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={onCheckDuplicates} disabled={isChecking}>
              <Eye className="h-3 w-3 mr-1" /> {isChecking ? 'Comprobando…' : 'Comprobar duplicados'}
            </Button>
            {!previewing && pendingTasks.length > 0 && (
              <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => { setPreviewing(true); selectAll(); }}>
                Preview
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alreadyExistingCount > 0 && (
          <p className="text-[10px] text-muted-foreground mb-2">
            {alreadyExistingCount} tarea(s) ya existente(s) para esta asignación (no se duplicarán)
          </p>
        )}

        {pendingTasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            {allTasks.length === 0 ? 'Sin tareas sugeridas para este caso' : 'Todas las tareas sugeridas ya existen'}
          </p>
        )}

        {pendingTasks.length > 0 && previewing && (
          <div className="space-y-1 mb-3">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={selectedIds.size === pendingTasks.length ? deselectAll : selectAll}>
                {selectedIds.size === pendingTasks.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </Button>
            </div>

            {pendingTasks.map(task => (
              <label
                key={task.id}
                className="flex items-start gap-2 text-[11px] p-2 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(task.id)}
                  onChange={() => toggleTask(task.id)}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium">{task.title}</span>
                    <Badge variant="outline" className="text-[8px] px-1">{task.phase}</Badge>
                    <Badge variant="outline" className="text-[8px] px-1">{task.priority}</Badge>
                    <ProvenanceBadge source={task.provenance} />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{task.condition}</p>
                </div>
              </label>
            ))}

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="text-xs"
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || creating}
              >
                <Plus className="h-3 w-3 mr-1" />
                {creating ? 'Creando…' : `Crear ${selectedIds.size} tarea(s)`}
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setPreviewing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {pendingTasks.length > 0 && !previewing && (
          <div className="space-y-1">
            {pendingTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-2 text-[11px] py-1">
                <ClipboardList className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>{task.title}</span>
                <Badge variant="outline" className="text-[8px] px-1">{task.priority}</Badge>
              </div>
            ))}
            {pendingTasks.length > 5 && (
              <p className="text-[10px] text-muted-foreground">+{pendingTasks.length - 5} más</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Panel ──

export function MobilityOperationalPanel({ assignment, documents, companyId }: Props) {
  const {
    plan,
    isLoading,
    pendingTasks,
    existingTaskTypes,
    checkExistingTasks,
    createTasks,
    isCheckingDuplicates,
  } = useCorridorOperationalPlan(assignment, documents, companyId);

  // Check duplicates on mount
  useEffect(() => {
    checkExistingTasks();
  }, [checkExistingTasks]);

  if (isLoading || !plan) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Construyendo plan operativo del corredor…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs defaultValue="summary">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="summary" className="text-[10px]">Resumen</TabsTrigger>
          <TabsTrigger value="timeline" className="text-[10px]">Fases</TabsTrigger>
          <TabsTrigger value="documents" className="text-[10px]">Documentos</TabsTrigger>
          <TabsTrigger value="dependencies" className="text-[10px]">Dependencias</TabsTrigger>
          <TabsTrigger value="tasks" className="text-[10px]">Tareas</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-3 mt-3">
          <ExecutiveSummaryCard plan={plan} />
          <CoverageSection coverage={plan.coverageAssessment} />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-2 mt-3">
          {plan.phases.map(phase => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-3">
          <DocumentsSection
            requirements={plan.documentRequirements}
            gaps={plan.documentGaps}
          />
        </TabsContent>

        <TabsContent value="dependencies" className="mt-3">
          <DependenciesSection dependencies={plan.fiscalPayrollDependencies} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-3">
          <TasksSection
            pendingTasks={pendingTasks}
            existingTaskTypes={existingTaskTypes}
            allTasks={plan.suggestedTasks}
            onCheckDuplicates={checkExistingTasks}
            onCreateTasks={createTasks}
            isChecking={isCheckingDuplicates}
            companyId={companyId ?? assignment.company_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
