import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface AgreementSignatureCardProps {
  signatures: Array<Record<string, unknown>>;
}

export function AgreementSignatureCard({ signatures }: AgreementSignatureCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Firmas internas (append-only)</CardTitle>
      </CardHeader>
      <CardContent>
        {signatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin firmas registradas.</p>
        ) : (
          <ul className="space-y-2">
            {signatures.map((s, i) => (
              <li key={(s.id as string) ?? i} className="rounded border p-2 text-xs space-y-1">
                <code className="font-mono break-all block" data-testid="signature-hash">
                  {(s.signature_hash as string) ?? '—'}
                </code>
                <div className="text-muted-foreground">
                  Firmado por <strong>{(s.signed_by as string) ?? '—'}</strong>{' '}
                  ({(s.signed_by_role as string) ?? '—'})
                </div>
                <div className="text-muted-foreground">{(s.signed_at as string) ?? '—'}</div>
                <div className="text-muted-foreground">Algoritmo: {(s.algorithm as string) ?? 'sha256'}</div>
                {s.previous_signature_id ? (
                  <div className="text-muted-foreground">
                    Firma previa: <code>{String(s.previous_signature_id)}</code>
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

export default AgreementSignatureCard;
