/**
 * ObelixIALearningDashboard - Quality & learning metrics for ObelixIA cross-domain
 * Phase 2D: enriched supervised learning visualization
 */

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle,
  Target, BarChart3, Brain, RefreshCw, Database, Star
} from 'lucide-react';
import { useObelixIALearning, type LearningStats } from '@/hooks/admin/useObelixIALearning';
import { cn } from '@/lib/utils';

interface ObelixIALearningDashboardProps {
  compact?: boolean;
  domainFilter?: 'hr' | 'legal' | null;
}

const METRIC_LABELS: Record<string, string> = {
  escalation: 'Escalado correcto',
  conflict_resolution: 'Resolución conflictos',
  severity: 'Severidad correcta',
  actions: 'Acciones útiles',
  deadline: 'Plazo razonable',
  recommendation: 'Recomendación útil',
  hr_impact: 'Impacto RRHH correcto',
  legal_impact: 'Impacto Jurídico correcto',
  human_review: 'Rev. humana correcta',
};

function MetricBar({ label, value, icon }: { label: string; value: number; icon?: string }) {
  if (value < 0) return null; // Not enough data
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", value < 60 && "text-amber-600")}>
          {icon} {label}
          {value < 60 && <AlertTriangle className="h-2.5 w-2.5 inline ml-1" />}
        </span>
        <span className={cn("font-medium",
          value >= 80 ? "text-emerald-600" : value >= 60 ? "text-amber-600" : "text-destructive"
        )}>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

export function ObelixIALearningDashboard({ compact = false, domainFilter }: ObelixIALearningDashboardProps) {
  const { stats, loading, refresh, validatedCases } = useObelixIALearning();

  useEffect(() => { refresh(); }, [refresh]);

  if (stats.totalFeedback === 0 && stats.validatedCases === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin datos de aprendizaje aún</p>
          <p className="text-xs mt-1">Las métricas aparecerán cuando se validen casos cross-domain</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-base font-bold">{stats.totalFeedback}</p>
                <p className="text-[9px] text-muted-foreground">Feedback</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <div>
                <p className="text-base font-bold">{stats.avgOverallRating}/5</p>
                <p className="text-[9px] text-muted-foreground">Valoración</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-3.5 w-3.5", stats.weakAreas.length > 0 ? "text-destructive" : "text-muted-foreground")} />
              <div>
                <p className="text-base font-bold">{stats.weakAreas.length}</p>
                <p className="text-[9px] text-muted-foreground">Áreas débiles</p>
              </div>
            </div>
          </Card>
        </div>
        {stats.weakAreas.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[11px] font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" /> Áreas con baja precisión ObelixIA
            </p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {stats.weakAreas.map(a => (
                <Badge key={a} variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700">
                  {METRIC_LABELS[a] || a}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full dashboard
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Aprendizaje ObelixIA</h3>
          <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Fase 2D</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <div><p className="text-xl font-bold">{stats.totalFeedback}</p><p className="text-[10px] text-muted-foreground">Total feedback</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <div><p className="text-xl font-bold">{stats.avgOverallRating}/5</p><p className="text-[10px] text-muted-foreground">Valoración media</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-violet-500" />
            <div><p className="text-xl font-bold">{stats.validatedCases}</p><p className="text-[10px] text-muted-foreground">Casos validados</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            {stats.avgQualityScore >= 0.7 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-amber-500" />}
            <div><p className="text-xl font-bold">{Math.round(stats.avgQualityScore * 100)}%</p><p className="text-[10px] text-muted-foreground">Calidad media</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", stats.weakAreas.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
            <div><p className="text-xl font-bold">{stats.weakAreas.length}</p><p className="text-[10px] text-muted-foreground">Áreas débiles</p></div>
          </div>
        </Card>
      </div>

      {/* Weak areas alert */}
      {stats.weakAreas.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <p className="text-sm font-medium flex items-center gap-1 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Áreas que necesitan mejora
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {stats.weakAreas.map(a => (
                <Badge key={a} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700">
                  {METRIC_LABELS[a] || a}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Precisión por dimensión</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="h-[260px]">
              <div className="space-y-3">
                <MetricBar label="Escalado correcto" value={stats.escalationAccuracy} icon="🎯" />
                <MetricBar label="Resolución conflictos" value={stats.conflictResolutionAccuracy} icon="⚖️" />
                <MetricBar label="Severidad correcta" value={stats.severityAccuracy} icon="🔴" />
                <MetricBar label="Acciones útiles" value={stats.actionsUsefulness} icon="✅" />
                <MetricBar label="Plazo razonable" value={stats.deadlineReasonableness} icon="⏱" />
                <MetricBar label="Recomendación útil" value={stats.recommendationUsefulness} icon="💡" />
                <MetricBar label="Impacto RRHH" value={stats.hrImpactAccuracy} icon="👥" />
                <MetricBar label="Impacto Jurídico" value={stats.legalImpactAccuracy} icon="⚖️" />
                <MetricBar label="Revisión humana" value={stats.humanReviewAccuracy} icon="🧑‍💼" />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Validated cases summary */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" /> Memoria de casos validados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="h-[260px]">
              {validatedCases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin casos validados aún</p>
                  <p className="text-xs mt-1">Los casos se validan desde el feedback cross-domain</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validatedCases.slice(0, 15).map(vc => (
                    <div key={vc.id} className="p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate max-w-[200px]">{vc.input_summary || vc.case_type}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={cn("text-[9px]",
                            vc.validated_severity === 'critical' ? 'bg-destructive/10 text-destructive' :
                            vc.validated_severity === 'high' ? 'bg-amber-500/10 text-amber-700' : 'bg-muted'
                          )}>{vc.validated_severity}</Badge>
                          {vc.validated_has_conflict && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {vc.impact_domains?.map(d => (
                          <Badge key={d} variant="outline" className="text-[8px]">{d}</Badge>
                        ))}
                        <span>Q: {Math.round(Number(vc.quality_score) * 100)}%</span>
                        <span>{vc.feedback_count} fb</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* By case type */}
      {Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Calidad por tipo de caso</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="p-2.5 rounded-lg border bg-muted/30">
                  <p className="text-xs font-medium truncate">{type.replace(/_/g, ' ')}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold">{data.count}</span>
                    <Badge variant="outline" className="text-[9px]">
                      <Star className="h-2.5 w-2.5 mr-0.5" /> {Math.round(data.avgRating * 10) / 10}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ObelixIALearningDashboard;
