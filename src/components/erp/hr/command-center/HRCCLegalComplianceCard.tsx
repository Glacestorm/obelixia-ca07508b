/**
 * HRCCLegalComplianceCard — Phase 1 placeholder.
 * No legal/compliance data is wired yet — Phase 2.
 * Disclaimer: "sin evidencia oficial archivada".
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LegalSnapshot, ReadinessLevel, LegalBulletStatus } from '@/hooks/erp/hr/useHRCommandCenter';

interface Props {
  snapshot: LegalSnapshot;
  onOpenCompliance?: () => void;
}

const levelToBadge: Record<ReadinessLevel, { variant: 'success' | 'warning' | 'destructive' | 'muted'; label: string }> = {
  green: { variant: 'success', label: 'Sin bloqueos críticos' },
  amber: { variant: 'warning', label: 'Revisión legal' },
  red: { variant: 'destructive', label: 'Riesgo crítico' },
  gray: { variant: 'muted', label: 'Sin datos' },
};

const bulletStatusToClass: Record<LegalBulletStatus, string> = {
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-destructive',
  gray: 'text-muted-foreground',
};

function fmt(n: number | null): string {
  return n === null || n === undefined ? '—' : String(n);
}

export function HRCCLegalComplianceCard({ snapshot, onOpenCompliance }: Props) {
  const badge = levelToBadge[snapshot.level];
  const score = snapshot.score;
  return (
    <Card data-testid="hr-cc-legal">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-primary" />
            Legal · Compliance
          </CardTitle>
          <Badge variant={badge.variant} data-testid="hr-cc-legal-badge">
            {badge.label}
            {score !== null ? ` · ${score}` : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground" data-testid="hr-cc-legal-disclaimer">
          {snapshot.disclaimer}
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span data-testid="hr-cc-legal-critical">Críticas: {fmt(snapshot.criticalAlerts)}</span>
          <span data-testid="hr-cc-legal-urgent">Urgentes: {fmt(snapshot.urgentAlerts)}</span>
          <span data-testid="hr-cc-legal-overdue">Vencidas: {fmt(snapshot.overdueObligations)}</span>
          <span data-testid="hr-cc-legal-pending">Comunic. pend.: {fmt(snapshot.pendingCommunications)}</span>
          <span data-testid="hr-cc-legal-upcoming">Próx. vencim.: {fmt(snapshot.upcomingDeadlinesCount)}</span>
          <span data-testid="hr-cc-legal-risks">Riesgos sanc.: {fmt(snapshot.sanctionRiskCount)}</span>
        </div>
        <ul className="space-y-1 text-xs" data-testid="hr-cc-legal-bullets">
          {snapshot.coverageBullets.map(b => (
            <li key={b.key} data-testid={`hr-cc-legal-bullet-${b.key}`}>
              <span className={cn('mr-1 font-medium', bulletStatusToClass[b.status])}>•</span>
              <span className="text-foreground">{b.label}</span>
              <span className="text-muted-foreground"> — {b.detail}</span>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenCompliance}
          disabled={!onOpenCompliance}
          title={onOpenCompliance ? undefined : 'Navegación no disponible en esta vista'}
          data-testid="hr-cc-legal-open"
        >
          Abrir compliance
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCLegalComplianceCard;