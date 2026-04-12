/**
 * S9VPTWorkspace — Valoración de Puestos de Trabajo
 * Directiva UE 2023/970, Art. 4
 *
 * Status semantics (aligned with useHRVersionRegistry):
 *   draft → review → approved (vigente) → closed / superseded
 *
 * S9.10: Includes version history panel for traceability.
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Scale,
  BarChart3,
  AlertTriangle,
  Plus,
  ChevronRight,
  CheckCircle,
  Clock,
  Eye,
  FileCheck,
  XCircle,
  Info,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useS9VPT, type VPTRow } from '@/hooks/erp/hr/useS9VPT';
import { S9ReadinessBadge } from '../shared/S9ReadinessBadge';
import {
  computeVPTScore,
  suggestEquivalentBand,
  DEFAULT_VPT_METHODOLOGY,
  VPT_SUBFACTOR_LABELS,
  VPT_FACTOR_LABELS,
} from '@/engines/erp/hr/s9ComplianceEngine';
import { VersionHistoryPanel } from '../ledger/VersionHistoryPanel';
import type { VPTFactorScores, VPTFactor, VPTValuationStatus } from '@/types/s9-compliance';

interface S9VPTWorkspaceProps {
  companyId: string;
}

const STATUS_CONFIG: Record<VPTValuationStatus, { label: string; icon: any; color: string }> = {
  draft: { label: 'Borrador', icon: Clock, color: 'bg-muted text-muted-foreground' },
  review: { label: 'En revisión', icon: Eye, color: 'bg-accent text-accent-foreground' },
  approved: { label: 'Vigente', icon: CheckCircle, color: 'bg-primary/10 text-primary' },
  closed: { label: 'Cerrado', icon: FileCheck, color: 'bg-secondary text-secondary-foreground' },
  superseded: { label: 'Superada', icon: XCircle, color: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status }: { status: VPTValuationStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// ─── Dashboard View ─────────────────────────────────────────

function VPTDashboard({ companyId }: { companyId: string }) {
  const { analytics, incoherences } = useS9VPT(companyId);

  const kpis = [
    { label: 'Cobertura VPT', value: `${analytics.coverage}%`, sub: `${analytics.valuatedPositions}/${analytics.totalPositions} puestos` },
    { label: 'Score medio', value: analytics.avgScore.toFixed(1), sub: 'Escala 0-100' },
    { label: 'Valoraciones vigentes', value: analytics.byStatus.approved, sub: `${analytics.totalValuations} total` },
    { label: 'Incoherencias', value: incoherences.length, sub: incoherences.length > 0 ? 'Requieren revisión' : 'Sin alertas' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {incoherences.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Incoherencias detectadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incoherences.map((inc, i) => (
              <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-destructive/5">
                <Badge variant="outline" className={inc.level === 'critical' ? 'border-destructive text-destructive' : 'border-muted-foreground text-muted-foreground'}>
                  {inc.level}
                </Badge>
                <span>{inc.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Info className="h-3 w-3" />
            <span>La VPT es una herramienta de soporte a la toma de decisiones, no una certificación oficial. Metodología basada en Directiva UE 2023/970.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Valuation List ─────────────────────────────────────────

function VPTList({ companyId, onSelect }: { companyId: string; onSelect: (v: VPTRow) => void }) {
  const { valuations, positions, createValuation, isCreating } = useS9VPT(companyId);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const unvaluatedPositions = useMemo(() => {
    const valuatedIds = new Set(valuations.map(v => v.position_id));
    return positions.filter(p => !valuatedIds.has(p.id));
  }, [valuations, positions]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return valuations;
    return valuations.filter(v => v.status === statusFilter);
  }, [valuations, statusFilter]);

  const handleCreate = useCallback(async () => {
    if (!selectedPositionId) return;
    try {
      await createValuation({ positionId: selectedPositionId });
      toast.success('Valoración creada en borrador');
      setShowCreate(false);
      setSelectedPositionId('');
    } catch {
      toast.error('Error al crear valoración');
    }
  }, [selectedPositionId, createValuation]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} disabled={unvaluatedPositions.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Nueva valoración
        </Button>
      </div>

      {showCreate && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar puesto sin valorar..." />
              </SelectTrigger>
              <SelectContent>
                {unvaluatedPositions.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title} ({p.job_level})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!selectedPositionId || isCreating}>
                Crear borrador
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Scale className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay valoraciones {statusFilter !== 'all' ? `en estado "${STATUS_CONFIG[statusFilter as VPTValuationStatus]?.label}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => (
            <Card key={v.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect(v)}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{v.position_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{v.job_level ?? 'Sin nivel'}</span>
                    <span>·</span>
                    <span>v{v.methodology_version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold">{v.total_score}</p>
                    <p className="text-xs text-muted-foreground">/ 100</p>
                  </div>
                  <StatusBadge status={v.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Valuation Detail ───────────────────────────────────────

function VPTDetail({ valuation, companyId, onBack }: { valuation: VPTRow; companyId: string; onBack: () => void }) {
  const { updateScores, transitionStatus, setEquivalentBand, isUpdating } = useS9VPT(companyId);
  const [scores, setScores] = useState<VPTFactorScores>(valuation.factor_scores);
  const [notes, setNotes] = useState(valuation.notes ?? '');
  const [showHistory, setShowHistory] = useState(false);

  const methodology = valuation.methodology_snapshot ?? DEFAULT_VPT_METHODOLOGY;
  const breakdown = useMemo(() => computeVPTScore(scores, methodology), [scores, methodology]);

  // Band suggestion — separate from score, derived only
  const bandSuggestion = useMemo(() => {
    const allApproved = []; // Would need more context; show suggestion button instead
    return valuation.equivalent_band_min != null
      ? { min: valuation.equivalent_band_min, max: valuation.equivalent_band_max }
      : null;
  }, [valuation]);

  const handleSubfactorChange = useCallback((factor: VPTFactor, subfactor: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [factor]: { ...prev[factor], [subfactor]: value },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateScores({
        valuationId: valuation.id,
        factorScores: scores,
        methodology,
        notes,
      });
      toast.success('Puntuaciones guardadas');
    } catch {
      toast.error('Error al guardar');
    }
  }, [updateScores, valuation.id, scores, notes, methodology]);

  const handleTransition = useCallback(async (newStatus: VPTValuationStatus) => {
    try {
      await transitionStatus({ valuationId: valuation.id, newStatus, positionId: valuation.position_id });
      toast.success(`Estado cambiado a ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error('Error al cambiar estado');
    }
  }, [transitionStatus, valuation.id, valuation.position_id]);

  const isEditable = valuation.status === 'draft';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Volver</Button>
        <div className="flex items-center gap-2">
          {/* S9.10: Version history button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-1"
          >
            <History className="h-3.5 w-3.5" />
            Historial
          </Button>
          <StatusBadge status={valuation.status} />
          {valuation.version_id && (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              VPT-REF: {valuation.version_id.slice(0, 8)}
            </Badge>
          )}
          {isEditable && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleTransition('review')}>Enviar a revisión</Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>Guardar</Button>
            </>
          )}
          {valuation.status === 'review' && (
            <Button size="sm" onClick={() => handleTransition('approved')}>Aprobar (vigente)</Button>
          )}
          {valuation.status === 'approved' && (
            <Button size="sm" variant="outline" onClick={() => handleTransition('closed')}>Cerrar</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{valuation.position_name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Nivel: {valuation.job_level ?? '—'} · Banda actual: {valuation.salary_band_min ?? '—'}€ – {valuation.salary_band_max ?? '—'}€ · Metodología: v{valuation.methodology_version}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{breakdown.totalScore}</p>
              <p className="text-xs text-muted-foreground">Score total</p>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2">
              {(Object.keys(VPT_FACTOR_LABELS) as VPTFactor[]).map(factor => (
                <div key={factor} className="text-center">
                  <p className="text-sm font-semibold">{breakdown.factorScores[factor]}</p>
                  <p className="text-xs text-muted-foreground truncate">{VPT_FACTOR_LABELS[factor]}</p>
                  <Progress value={breakdown.factorScores[factor]} className="h-1 mt-1" />
                </div>
              ))}
            </div>
          </div>

          {bandSuggestion && (
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Banda equivalente sugerida: {bandSuggestion.min}€ – {bandSuggestion.max}€
              <span className="italic ml-1">(recomendación derivada, no parte del score)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subfactor scoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEFAULT_VPT_METHODOLOGY.map(fc => (
          <Card key={fc.factor}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{VPT_FACTOR_LABELS[fc.factor]} ({(fc.weight * 100).toFixed(0)}%)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fc.subfactors.map(sf => {
                const currentVal = scores[fc.factor]?.[sf.subfactor] ?? 1;
                return (
                  <div key={sf.subfactor} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{VPT_SUBFACTOR_LABELS[sf.subfactor]}</span>
                      <span className="font-mono font-bold">{currentVal}/5</span>
                    </div>
                    <Slider
                      value={[currentVal]}
                      min={1}
                      max={5}
                      step={1}
                      disabled={!isEditable}
                      onValueChange={([v]) => handleSubfactorChange(fc.factor, sf.subfactor, v)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notas y justificación</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!isEditable}
            placeholder="Justificación de la puntuación, observaciones relevantes..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* S9.10: Version history panel */}
      {showHistory && (
        <VersionHistoryPanel
          companyId={companyId}
          entityType="vpt_valuation"
          entityId={valuation.position_id}
          title="Historial de versiones VPT"
        />
      )}
    </div>
  );
}

// ─── Comparator View ────────────────────────────────────────

function VPTComparator({ companyId }: { companyId: string }) {
  const { valuations } = useS9VPT(companyId);
  const approvedVals = useMemo(() => valuations.filter(v => v.status === 'approved'), [valuations]);

  if (approvedVals.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Se necesitan al menos 2 valoraciones vigentes para comparar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Puesto</th>
              <th className="text-left py-2 px-3">Nivel</th>
              {(Object.keys(VPT_FACTOR_LABELS) as VPTFactor[]).map(f => (
                <th key={f} className="text-center py-2 px-2 text-xs">{VPT_FACTOR_LABELS[f]}</th>
              ))}
              <th className="text-center py-2 px-3 font-bold">Total</th>
              <th className="text-right py-2 px-3">Banda máx.</th>
            </tr>
          </thead>
          <tbody>
            {approvedVals.map(v => {
              const bd = computeVPTScore(v.factor_scores, v.methodology_snapshot ?? DEFAULT_VPT_METHODOLOGY);
              return (
                <tr key={v.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium">{v.position_name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{v.job_level ?? '—'}</td>
                  {(Object.keys(VPT_FACTOR_LABELS) as VPTFactor[]).map(f => (
                    <td key={f} className="text-center py-2 px-2">
                      <span className="font-mono">{bd.factorScores[f]}</span>
                    </td>
                  ))}
                  <td className="text-center py-2 px-3 font-bold text-lg">{bd.totalScore}</td>
                  <td className="text-right py-2 px-3 text-muted-foreground">{v.salary_band_max ? `${v.salary_band_max}€` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Workspace ─────────────────────────────────────────

export const S9VPTWorkspace = memo(function S9VPTWorkspace({ companyId }: S9VPTWorkspaceProps) {
  const [selectedValuation, setSelectedValuation] = useState<VPTRow | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (selectedValuation) {
    return (
      <div className="space-y-4 p-1">
        <VPTDetail
          valuation={selectedValuation}
          companyId={companyId}
          onBack={() => setSelectedValuation(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Valoración de Puestos de Trabajo</h2>
            <p className="text-xs text-muted-foreground">Directiva UE 2023/970 — Metodología neutral en género</p>
          </div>
        </div>
        <S9ReadinessBadge readiness="internal_ready" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="valuations">Valoraciones</TabsTrigger>
          <TabsTrigger value="comparator">Comparador</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-3">
          <VPTDashboard companyId={companyId} />
        </TabsContent>
        <TabsContent value="valuations" className="mt-3">
          <VPTList companyId={companyId} onSelect={(v) => { setSelectedValuation(v); }} />
        </TabsContent>
        <TabsContent value="comparator" className="mt-3">
          <VPTComparator companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default S9VPTWorkspace;
