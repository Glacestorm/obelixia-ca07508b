import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface AgreementParserWarningsPanelProps {
  unresolved: unknown[];
  resolved: unknown[];
}

function isCritical(w: unknown): boolean {
  const sev = (w as { severity?: string })?.severity;
  return sev === 'critical' || sev === 'CRITICAL';
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items: unknown[];
  tone: 'destructive' | 'warning' | 'muted';
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-1">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ninguno.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((w, i) => {
            const code = (w as { code?: string })?.code ?? 'WARN';
            return (
              <li key={i} className="text-xs flex items-start gap-2">
                <Badge
                  variant={
                    tone === 'destructive'
                      ? 'destructive'
                      : tone === 'warning'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {code}
                </Badge>
                <span className="break-all">{JSON.stringify(w)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AgreementParserWarningsPanel({
  unresolved,
  resolved,
}: AgreementParserWarningsPanelProps) {
  const critical = unresolved.filter(isCritical);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Warnings del parser</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Section title={`Críticos no resueltos (${critical.length})`} items={critical} tone="destructive" />
        <Section
          title={`No resueltos (${unresolved.length - critical.length})`}
          items={unresolved.filter((w) => !isCritical(w))}
          tone="warning"
        />
        <Section title={`Resueltos (${resolved.length})`} items={resolved} tone="muted" />
      </CardContent>
    </Card>
  );
}

export default AgreementParserWarningsPanel;
