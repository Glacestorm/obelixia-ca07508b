/**
 * MobilityPortfolioPanel.tsx — Mobility Ops Premium
 * Portfolio-level operational view: KPIs, priority queue, alerts, searchable table.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, CheckCircle, Clock, FileWarning, RefreshCw,
  Shield, TrendingUp, Users, Globe, Search, ArrowUpDown, Info
} from 'lucide-react';
import { useMobilityPortfolio, type PortfolioFilters } from '@/hooks/erp/hr/useMobilityPortfolio';
import type { CaseAnalysis, PortfolioAlert } from '@/engines/erp/hr/mobilityPortfolioEngine';

interface Props {
  companyId: string;
  employeeMap: Record<string, string>;
  onSelectAssignment?: (assignmentId: string) => void;
}

// ── Helpers ──

const COVERAGE_COLORS: Record<string, string> = {
  full: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-500/15 text-amber-700 border-amber-200',
  minimal: 'bg-red-500/15 text-red-700 border-red-200',
};

const COVERAGE_LABELS: Record<string, string> = {
  full: 'Completa',
  partial: 'Parcial',
  minimal: 'Mínima',
};

const DOC_LEVEL_COLORS: Record<string, string> = {
  complete: 'bg-emerald-500/15 text-emerald-700',
  partial: 'bg-amber-500/15 text-amber-700',
  critical: 'bg-red-500/15 text-red-700',
  unknown: 'bg-muted text-muted-foreground',
};

const DOC_LEVEL_LABELS: Record<string, string> = {
  complete: 'Completa',
  partial: 'Parcial',
  critical: 'Crítica',
  unknown: 'Sin datos',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  warning: <FileWarning className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

function riskColor(score: number): string {
  if (score >= 60) return 'text-red-600';
  if (score >= 35) return 'text-amber-600';
  return 'text-emerald-600';
}

// ── KPI Card ──

function KPICard({ label, value, icon, detail, variant }: {
  label: string; value: string | number; icon: React.ReactNode; detail?: string;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const bg = variant === 'danger' ? 'border-red-200 bg-red-50/50' : variant === 'warning' ? 'border-amber-200 bg-amber-50/50' : '';
  return (
    <Card className={`${bg}`}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Alert Row ──

function AlertRow({ alert }: { alert: PortfolioAlert }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      {SEVERITY_ICONS[alert.severity]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.affectedCount} caso(s) afectado(s)</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {alert.category === 'expiration' ? 'Expiración' :
         alert.category === 'doc_gap' ? 'Documentos' :
         alert.category === 'dependency' ? 'Dependencia' :
         alert.category === 'coverage' ? 'Cobertura' :
         alert.category === 'tasks_pending' ? 'Tareas' : alert.category}
      </Badge>
    </div>
  );
}

// ── Priority Case Row ──

function PriorityCaseRow({ c, employeeName, onSelect }: {
  c: CaseAnalysis; employeeName: string; onSelect?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
        {c.priorityScore}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{employeeName || c.employeeId.substring(0, 8)}</p>
        <p className="text-xs text-muted-foreground">{c.corridorLabel}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium ${riskColor(c.riskScore)}`}>R:{c.riskScore}</span>
        {c.hasDocGaps && <FileWarning className="h-3.5 w-3.5 text-amber-500" />}
        {c.daysToNearestExpiration !== null && c.daysToNearestExpiration <= 30 && (
          <Clock className="h-3.5 w-3.5 text-red-500" />
        )}
        <Badge variant="outline" className={`text-[10px] ${COVERAGE_COLORS[c.coverageLevel]}`}>
          {COVERAGE_LABELS[c.coverageLevel]}
        </Badge>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MobilityPortfolioPanel({ companyId, employeeMap, onSelectAssignment }: Props) {
  const {
    analysis, filteredCases, filteredPriorityQueue,
    filters, updateFilters, clearFilters, isLoading, refetch,
  } = useMobilityPortfolio(companyId);
  const [subTab, setSubTab] = useState('priority');

  // Available corridors for filter
  const corridorOptions = useMemo(() => {
    if (!analysis) return [];
    return Object.keys(analysis.kpis.byCorridor).sort();
  }, [analysis]);

  // ── Empty State ──
  if (!isLoading && (!analysis || analysis.caseAnalyses.length === 0)) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h4 className="text-sm font-medium text-muted-foreground">Sin asignaciones de movilidad</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Crea asignaciones en la pestaña "Asignaciones" para ver el análisis de cartera.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Loading ──
  if (isLoading && !analysis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Analizando cartera de movilidad…</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;
  const { kpis, alerts } = analysis;

  return (
    <div className="space-y-4">
      {/* Prudence disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Vista operativa interna. Las señales y prioridades son orientativas y no constituyen gestión oficial ante organismos ni asesoramiento legal vinculante.
        </span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard label="Casos Activos" value={kpis.totalActive} icon={<Users className="h-5 w-5" />} detail={`${kpis.totalPlanned} planificados`} />
        <KPICard label="Corredores" value={kpis.corridorCount} icon={<Globe className="h-5 w-5" />} />
        <KPICard label="Cobertura Full" value={kpis.byCoverage.full} icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} detail={`${kpis.byCoverage.partial} parcial`} />
        <KPICard label="Riesgo Medio" value={kpis.avgRiskScore} icon={<TrendingUp className="h-5 w-5" />} variant={kpis.avgRiskScore >= 50 ? 'danger' : kpis.avgRiskScore >= 30 ? 'warning' : 'default'} />
        <KPICard label="Docs Completa" value={kpis.docsComplete} icon={<CheckCircle className="h-5 w-5" />} detail={`${kpis.docsCritical} crítica`} />
        <KPICard label="Expiran ≤30d" value={kpis.expirationsIn30} icon={<Clock className="h-5 w-5" />} variant={kpis.expirationsIn30 > 0 ? 'danger' : 'default'} />
        <KPICard label="Dep. Fiscales" value={kpis.withFiscalDependency} icon={<AlertTriangle className="h-5 w-5" />} variant={kpis.withFiscalDependency > 0 ? 'warning' : 'default'} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado o corredor…"
                className="pl-9 h-9 text-sm"
                value={filters.search ?? ''}
                onChange={e => updateFilters({ search: e.target.value || undefined })}
              />
            </div>
            <Select value={filters.corridor ?? 'all'} onValueChange={v => updateFilters({ corridor: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Corredor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {corridorOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.coverageLevel ?? 'all'} onValueChange={v => updateFilters({ coverageLevel: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Cobertura" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="full">Completa</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="minimal">Mínima</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.docCompleteness ?? 'all'} onValueChange={v => updateFilters({ docCompleteness: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Docs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="complete">Completa</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
            {Object.values(filters).some(v => v !== undefined) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-9">Limpiar</Button>
            )}
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="text-xs h-9">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="priority" className="text-xs">Cola Prioritaria ({filteredPriorityQueue.length})</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alertas ({alerts.length})</TabsTrigger>
          <TabsTrigger value="table" className="text-xs">Cartera ({filteredCases.length})</TabsTrigger>
        </TabsList>

        {/* Priority Queue */}
        <TabsContent value="priority" className="mt-3">
          {filteredPriorityQueue.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                Sin casos prioritarios con los filtros actuales.
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="space-y-2">
                {filteredPriorityQueue.map(c => (
                  <PriorityCaseRow
                    key={c.assignmentId}
                    c={c}
                    employeeName={employeeMap[c.employeeId] ?? ''}
                    onSelect={() => onSelectAssignment?.(c.assignmentId)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
          {/* Priority legend */}
          <div className="mt-3 p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Fórmula de prioridad (0–100):</p>
            <p className="text-[11px] text-muted-foreground">
              Riesgo (0-40) + Gaps doc (0-25) + Expiración (0-20) + Dependencias (0-10) + Cobertura (0-10) + Triggers (0-5)
            </p>
          </div>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="mt-3">
          {alerts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                Sin alertas activas. La cartera está en buen estado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => <AlertRow key={a.id} alert={a} />)}
            </div>
          )}
        </TabsContent>

        {/* Portfolio Table */}
        <TabsContent value="table" className="mt-3">
          {filteredCases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Sin casos con los filtros actuales.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[180px]">Empleado</TableHead>
                      <TableHead className="text-xs">Corredor</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs text-center">Riesgo</TableHead>
                      <TableHead className="text-xs">Cobertura</TableHead>
                      <TableHead className="text-xs">Docs</TableHead>
                      <TableHead className="text-xs text-center">Expira</TableHead>
                      <TableHead className="text-xs text-center">Tareas</TableHead>
                      <TableHead className="text-xs text-center">Prioridad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map(c => (
                      <TableRow
                        key={c.assignmentId}
                        className="cursor-pointer"
                        onClick={() => onSelectAssignment?.(c.assignmentId)}
                      >
                        <TableCell className="text-sm font-medium truncate max-w-[180px]">
                          {employeeMap[c.employeeId] ?? c.employeeId.substring(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">{c.corridorLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${riskColor(c.riskScore)}`}>{c.riskScore}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${COVERAGE_COLORS[c.coverageLevel]}`}>
                            {COVERAGE_LABELS[c.coverageLevel]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${DOC_LEVEL_COLORS[c.docCompletenessLevel]}`}>
                            {DOC_LEVEL_LABELS[c.docCompletenessLevel]} ({c.docPresent}/{c.docRequired})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {c.daysToNearestExpiration !== null ? (
                            <span className={c.daysToNearestExpiration <= 30 ? 'text-red-600 font-medium' : ''}>
                              {c.daysToNearestExpiration}d
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {c.suggestedTasksCount > 0 ? (
                            <span className="text-amber-600">{c.suggestedTasksCount} sug.</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-bold">{c.priorityScore}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
