/**
 * HRPremiumHealthCheckPanel — P9.11
 * Diagnostic panel showing integrity checks across all Premium HR modules.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HeartPulse, Play, CheckCircle, AlertTriangle, XCircle,
  Loader2, Shield, Brain, Users, Scale, Layers, FileText,
  BarChart3, UserCog, Inbox
} from 'lucide-react';
import { useHRPremiumHealthCheck, type PremiumModule, type CheckStatus } from '@/hooks/admin/hr/useHRPremiumHealthCheck';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

interface Props {
  companyId?: string;
  className?: string;
}

const STATUS_CONFIG: Record<CheckStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pass: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-emerald-500', label: 'OK' },
  warn: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-500', label: 'Advertencia' },
  fail: { icon: <XCircle className="h-4 w-4" />, color: 'text-destructive', label: 'Error' },
  pending: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-muted-foreground', label: 'Pendiente' },
};

const MODULE_ICONS: Record<PremiumModule, React.ReactNode> = {
  security: <Shield className="h-3.5 w-3.5" />,
  ai_governance: <Brain className="h-3.5 w-3.5" />,
  workforce: <Users className="h-3.5 w-3.5" />,
  fairness: <Scale className="h-3.5 w-3.5" />,
  twin: <Layers className="h-3.5 w-3.5" />,
  legal: <FileText className="h-3.5 w-3.5" />,
  cnae: <BarChart3 className="h-3.5 w-3.5" />,
  role_experience: <UserCog className="h-3.5 w-3.5" />,
};

export function HRPremiumHealthCheckPanel({ companyId, className }: Props) {
  const { checks, summary, isRunning, lastRun, runHealthCheck, moduleLabels } = useHRPremiumHealthCheck(companyId);

  const groupedChecks = useMemo(() => {
    const groups: Record<string, typeof checks> = {};
    for (const c of checks) {
      if (!groups[c.module]) groups[c.module] = [];
      groups[c.module].push(c);
    }
    return groups;
  }, [checks]);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para ejecutar diagnóstico</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            Health Check Premium
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastRun
              ? `Último diagnóstico ${formatDistanceToNow(lastRun, { locale: es, addSuffix: true })}`
              : 'Sin ejecutar aún'}
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={isRunning} className="gap-2">
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
        </Button>
      </div>

      {/* Summary */}
      {summary.totalChecks > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-2xl font-bold">{summary.score}%</div>
              <p className="text-xs text-muted-foreground">Score</p>
              <Progress value={summary.score} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-2xl font-bold">{summary.totalChecks}</div>
              <p className="text-xs text-muted-foreground">Total Checks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-2xl font-bold text-emerald-500">{summary.passed}</div>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{summary.warnings}</div>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card className={summary.failures > 0 ? 'border-destructive/40' : ''}>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <div className={cn("text-2xl font-bold", summary.failures > 0 && "text-destructive")}>{summary.failures}</div>
              <p className="text-xs text-muted-foreground">Failures</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results by Module */}
      {checks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resultados por Módulo</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px]">
              <div className="space-y-4">
                {(Object.keys(groupedChecks) as PremiumModule[]).map(mod => {
                  const items = groupedChecks[mod];
                  const modPassed = items.filter(i => i.status === 'pass').length;
                  return (
                    <div key={mod} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">{MODULE_ICONS[mod]}</span>
                        <span className="font-medium text-sm">{moduleLabels[mod]}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {modPassed}/{items.length} OK
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-6">
                        {items.map(item => {
                          const cfg = STATUS_CONFIG[item.status];
                          return (
                            <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                              <span className={cfg.color}>{cfg.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm">{item.label}</span>
                                {item.recordCount !== undefined && (
                                  <span className="text-xs text-muted-foreground ml-2">({item.recordCount})</span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.detail}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HRPremiumHealthCheckPanel;
