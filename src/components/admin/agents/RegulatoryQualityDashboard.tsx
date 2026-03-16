/**
 * RegulatoryQualityDashboard - Quality metrics, trends, and weak spots
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle,
  Target, BarChart3, Shield, Users, Scale, Building2
} from 'lucide-react';
import type { FeedbackStats } from '@/hooks/admin/useRegulatoryFeedback';
import { cn } from '@/lib/utils';

interface RegulatoryQualityDashboardProps {
  stats: FeedbackStats;
  compact?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  summary: 'Resumen',
  impact_level: 'Nivel impacto',
  impact_domains: 'Dominios',
  impact_summary: 'Resumen impacto',
  classification: 'Clasificación',
  general: 'General',
};

const DOMAIN_CONFIG: Record<string, { label: string; icon: typeof Users }> = {
  hr: { label: 'RRHH', icon: Users },
  legal: { label: 'Jurídico', icon: Scale },
  compliance: { label: 'Compliance', icon: Shield },
  fiscal: { label: 'Fiscal', icon: Building2 },
  general: { label: 'General', icon: Target },
};

export function RegulatoryQualityDashboard({ stats, compact = false }: RegulatoryQualityDashboardProps) {
  const globalAccuracy = stats.total > 0 ? Math.round(stats.acceptanceRate * 100) : 0;
  const correctionRate = stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0;

  const fieldMetrics = useMemo(() => {
    return Object.entries(stats.byField)
      .map(([field, data]) => ({
        field,
        label: FIELD_LABELS[field] || field,
        ...data,
        accuracy: data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0,
        isWeak: stats.weakFields.includes(field),
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [stats]);

  const domainMetrics = useMemo(() => {
    return Object.entries(stats.byDomain)
      .map(([domain, data]) => ({
        domain,
        config: DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.general,
        ...data,
        accuracy: data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0,
        isWeak: stats.weakDomains.includes(domain),
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [stats]);

  if (stats.total === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin datos de feedback aún</p>
          <p className="text-xs mt-1">Los métricas aparecerán cuando se validen documentos</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              {globalAccuracy >= 70 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <div>
                <p className="text-base font-bold">{globalAccuracy}%</p>
                <p className="text-[9px] text-muted-foreground">Acierto IA</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-amber-500" />
              <div>
                <p className="text-base font-bold">{correctionRate}%</p>
                <p className="text-[9px] text-muted-foreground">Correcciones</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <div>
                <p className="text-base font-bold">{stats.weakFields.length}</p>
                <p className="text-[9px] text-muted-foreground">Puntos débiles</p>
              </div>
            </div>
          </Card>
        </div>
        {/* Weak spots alert */}
        {stats.weakFields.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[11px] font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" /> Campos con baja precisión
            </p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {stats.weakFields.map(f => (
                <Badge key={f} variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700">
                  {FIELD_LABELS[f] || f}
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
      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg",
              globalAccuracy >= 70 ? "bg-emerald-500/10" : "bg-destructive/10")}>
              {globalAccuracy >= 70 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold">{globalAccuracy}%</p>
              <p className="text-[10px] text-muted-foreground">Acierto global</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xl font-bold">{stats.accepted}</p>
              <p className="text-[10px] text-muted-foreground">Validados</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xl font-bold">{stats.rejected}</p>
              <p className="text-[10px] text-muted-foreground">Corregidos</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total feedback</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4",
              stats.weakFields.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
            <div>
              <p className="text-xl font-bold">{stats.weakFields.length + stats.weakDomains.length}</p>
              <p className="text-[10px] text-muted-foreground">Puntos débiles</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weak spots alerts */}
      {(stats.weakFields.length > 0 || stats.weakDomains.length > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Puntos débiles detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              {stats.weakFields.map(f => {
                const data = stats.byField[f];
                const acc = data ? Math.round((data.accepted / data.total) * 100) : 0;
                return (
                  <div key={f} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{FIELD_LABELS[f] || f}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={acc} className="w-24 h-1.5" />
                      <span className="text-destructive font-medium w-8 text-right">{acc}%</span>
                      <span className="text-muted-foreground">({data?.total} muestras)</span>
                    </div>
                  </div>
                );
              })}
              {stats.weakDomains.map(d => {
                const data = stats.byDomain[d];
                const acc = data ? Math.round((data.accepted / data.total) * 100) : 0;
                const cfg = DOMAIN_CONFIG[d] || DOMAIN_CONFIG.general;
                return (
                  <div key={d} className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1">
                      <cfg.icon className="h-3 w-3" /> {cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress value={acc} className="w-24 h-1.5" />
                      <span className="text-destructive font-medium w-8 text-right">{acc}%</span>
                      <span className="text-muted-foreground">({data?.total})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accuracy by field */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Precisión por campo</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {fieldMetrics.map(m => (
                  <div key={m.field} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium", m.isWeak && "text-amber-600")}>
                        {m.label}
                        {m.isWeak && <AlertTriangle className="h-2.5 w-2.5 inline ml-1" />}
                      </span>
                      <span className={cn("font-medium",
                        m.accuracy >= 70 ? "text-emerald-600" : m.accuracy >= 50 ? "text-amber-600" : "text-destructive"
                      )}>{m.accuracy}%</span>
                    </div>
                    <Progress value={m.accuracy} className="h-1.5" />
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>✓ {m.accepted}</span>
                      <span>✗ {m.rejected}</span>
                      <span>Total: {m.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Accuracy by domain */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Precisión por dominio</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {domainMetrics.map(m => (
                  <div key={m.domain} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium flex items-center gap-1", m.isWeak && "text-amber-600")}>
                        <m.config.icon className="h-3 w-3" />
                        {m.config.label}
                        {m.isWeak && <AlertTriangle className="h-2.5 w-2.5 ml-1" />}
                      </span>
                      <span className={cn("font-medium",
                        m.accuracy >= 70 ? "text-emerald-600" : m.accuracy >= 50 ? "text-amber-600" : "text-destructive"
                      )}>{m.accuracy}%</span>
                    </div>
                    <Progress value={m.accuracy} className="h-1.5" />
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>✓ {m.accepted}</span>
                      <span>✗ {m.rejected}</span>
                      <span>Total: {m.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RegulatoryQualityDashboard;
