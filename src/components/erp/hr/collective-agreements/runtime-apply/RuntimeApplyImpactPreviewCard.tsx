/**
 * B10D.4 — Read-only display of the payroll impact preview attached
 * to an apply request. PREVIEW only — does NOT execute payroll, does
 * NOT touch the bridge, does NOT activate the global flag.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RuntimeApplyImpactPreviewCardProps {
  impact?: Record<string, unknown> | null;
  className?: string;
}

export function RuntimeApplyImpactPreviewCard({
  impact,
  className,
}: RuntimeApplyImpactPreviewCardProps) {
  const has = !!impact && Object.keys(impact).length > 0;
  return (
    <Card className={cn(className)} data-testid="runtime-apply-impact-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          Vista previa de impacto en nómina (no ejecuta)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!has ? (
          <p className="text-xs text-muted-foreground italic">
            Sin vista previa de impacto adjunta.
          </p>
        ) : (
          <pre
            data-testid="runtime-apply-impact-json"
            className="text-[11px] bg-muted/50 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap break-all"
          >
            {JSON.stringify(impact, null, 2)}
          </pre>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          La vista previa es informativa. La nómina sigue resolviéndose con
          la lógica operativa actual hasta una fase posterior.
        </p>
      </CardContent>
    </Card>
  );
}

export default RuntimeApplyImpactPreviewCard;