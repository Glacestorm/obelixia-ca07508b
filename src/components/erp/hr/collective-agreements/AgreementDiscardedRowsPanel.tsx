import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface AgreementDiscardedRowsPanelProps {
  rows: Array<Record<string, unknown>>;
}

export function AgreementDiscardedRowsPanel({ rows }: AgreementDiscardedRowsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Filas descartadas</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay filas descartadas.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={(r.id as string) ?? i} className="rounded border p-2 text-xs">
                <div className="font-medium">
                  {(r.discard_reason as string) ?? (r.reason as string) ?? 'Motivo no especificado'}
                </div>
                {typeof r.row_confidence === 'number' && (
                  <div className="text-muted-foreground">
                    Confianza: {Math.round((r.row_confidence as number) * 100)}%
                  </div>
                )}
                {r.source_page != null && (
                  <div className="text-muted-foreground">Página: {String(r.source_page)}</div>
                )}
                {r.source_excerpt && (
                  <div className="text-muted-foreground italic mt-1 break-all">
                    {String(r.source_excerpt)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementDiscardedRowsPanel;
