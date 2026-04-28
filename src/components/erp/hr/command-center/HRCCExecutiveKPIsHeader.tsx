/**
 * HRCCExecutiveKPIsHeader — Phase 1
 * Top-of-panel KPIs: global readiness + per-section mini-scores + risk hint.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HRCommandCenterData, ReadinessLevel } from '@/hooks/erp/hr/useHRCommandCenter';

const levelToVariant: Record<ReadinessLevel, 'success' | 'warning' | 'destructive' | 'muted'> = {
  green: 'success',
  amber: 'warning',
  red: 'destructive',
  gray: 'muted',
};

const levelToLabel: Record<ReadinessLevel, string> = {
  green: 'Listo',
  amber: 'Revisión',
  red: 'Bloqueado',
  gray: 'Sin datos',
};

interface MiniKPIProps {
  label: string;
  level: ReadinessLevel;
  score: number | null;
}

function MiniKPI({ label, level, score }: MiniKPIProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Badge variant={levelToVariant[level]} className="text-[10px]">
          {score === null ? '—' : `${score}`}
        </Badge>
        <span className="text-xs text-muted-foreground">{levelToLabel[level]}</span>
      </div>
    </div>
  );
}

interface Props {
  data: HRCommandCenterData;
}

export function HRCCExecutiveKPIsHeader({ data }: Props) {
  const { globalReadiness, payroll, documentary, legal, officialIntegrations } = data;
  const score = globalReadiness.score;

  return (
    <Card aria-label="Executive readiness header" data-testid="hr-cc-header">
      <CardContent className="py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              globalReadiness.level === 'green' && 'bg-success/15 text-success',
              globalReadiness.level === 'amber' && 'bg-warning/15 text-warning',
              globalReadiness.level === 'red' && 'bg-destructive/15 text-destructive',
              globalReadiness.level === 'gray' && 'bg-muted text-muted-foreground',
            )}>
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Readiness global RRHH</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {score === null ? '—' : score}
                </span>
                <Badge variant={levelToVariant[globalReadiness.level]}>
                  {levelToLabel[globalReadiness.level]}
                </Badge>
              </div>
              <Progress
                value={score ?? 0}
                className="mt-2 h-1.5 w-48"
                aria-label="Readiness score"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniKPI label="Nómina" level={payroll.level} score={payroll.score} />
            <MiniKPI label="Documental" level={documentary.level} score={documentary.score} />
            <MiniKPI label="Legal" level={legal.level} score={legal.score} />
            <MiniKPI label="Oficiales" level={officialIntegrations.level} score={officialIntegrations.score} />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>
              {globalReadiness.blockers} bloqueos · {globalReadiness.warnings} avisos
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HRCCExecutiveKPIsHeader;