/**
 * B10D.4 — Read-only display of the comparison report attached to an
 * apply request (current operative resolution vs registry candidate).
 *
 * No payroll execution, no bridge, no flag.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RuntimeApplyComparisonReportCardProps {
  report?: Record<string, unknown> | null;
  criticalDiffsCount?: number | null;
  className?: string;
}

export function RuntimeApplyComparisonReportCard({
  report,
  criticalDiffsCount,
  className,
}: RuntimeApplyComparisonReportCardProps) {
  const count = typeof criticalDiffsCount === 'number' ? criticalDiffsCount : 0;
  const hasReport = !!report && Object.keys(report).length > 0;

  return (
    <Card className={cn(className)} data-testid="runtime-apply-comparison-card">
      <CardHeader className="pb-2 flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Comparación interno → registro</CardTitle>
        <Badge
          variant={count > 0 ? 'destructive' : 'outline'}
          data-testid="runtime-apply-comparison-critical-count"
          className="text-xs"
        >
          {count} diffs críticos
        </Badge>
      </CardHeader>
      <CardContent>
        {!hasReport ? (
          <p className="text-xs text-muted-foreground italic">
            Sin reporte de comparación adjunto a la request.
          </p>
        ) : (
          <pre
            data-testid="runtime-apply-comparison-json"
            className="text-[11px] bg-muted/50 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap break-all"
          >
            {JSON.stringify(report, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default RuntimeApplyComparisonReportCard;