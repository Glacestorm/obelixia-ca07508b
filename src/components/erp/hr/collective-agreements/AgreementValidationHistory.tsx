import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidationStatusBadge, type ValidationStatus } from './internal/ValidationStatusBadge';

export interface AgreementValidationHistoryProps {
  history: Array<Record<string, unknown>>;
}

export function AgreementValidationHistory({ history }: AgreementValidationHistoryProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Historial de validaciones</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin historial.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li key={(h.id as string) ?? i} className="rounded border p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <ValidationStatusBadge status={(h.validation_status as ValidationStatus) ?? 'draft'} />
                  <span className="text-muted-foreground">{(h.validated_at as string) ?? '—'}</span>
                </div>
                <div className="text-muted-foreground">
                  Validador: {(h.validator_user_id as string) ?? '—'} ({(h.validator_role as string) ?? '—'})
                </div>
                {h.signature_hash ? (
                  <code className="font-mono break-all block">{String(h.signature_hash)}</code>
                ) : null}
                {h.previous_validation_id ? (
                  <div className="text-muted-foreground">
                    Previa: <code>{String(h.previous_validation_id)}</code>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementValidationHistory;
