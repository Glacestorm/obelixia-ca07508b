import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, AlertTriangle, ExternalLink } from 'lucide-react';

export interface AgreementSourceHashCardProps {
  source: Record<string, unknown> | null;
  version: Record<string, unknown> | null;
}

export function AgreementSourceHashCard({ source, version }: AgreementSourceHashCardProps) {
  const sourceHash = (source?.document_hash as string | null) ?? null;
  const versionHash = (version?.source_hash as string | null) ?? null;
  const sourceUrl = (source?.document_url as string | null) ?? (source?.source_url as string | null) ?? null;
  const publicationDate = source?.publication_date as string | null | undefined;
  const mismatch = !!sourceHash && !!versionHash && sourceHash !== versionHash;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Fuente y hash</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {sourceUrl && (
          <div className="flex items-center gap-2 text-xs">
            <ExternalLink className="h-3 w-3" />
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline truncate">
              {sourceUrl}
            </a>
          </div>
        )}
        {publicationDate && (
          <div className="text-xs text-muted-foreground">Publicación: {publicationDate}</div>
        )}

        <HashRow label="SHA-256 documento" value={sourceHash} onCopy={(v) => copy(v, 'src')} copied={copied === 'src'} />
        <HashRow label="SHA-256 versión" value={versionHash} onCopy={(v) => copy(v, 'ver')} copied={copied === 'ver'} />

        {mismatch && (
          <Alert variant="destructive" data-testid="sha-mismatch-alert">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Discrepancia SHA-256 entre versión y documento fuente. La aprobación interna queda bloqueada.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function HashRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string | null;
  onCopy: (v: string) => void;
  copied: boolean;
}) {
  if (!value) {
    return (
      <div className="text-xs text-muted-foreground">
        {label}: <span className="italic">no disponible</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <code className="text-xs font-mono break-all flex-1" data-testid={`hash-${label}`}>
        {value}
      </code>
      <Button size="sm" variant="ghost" onClick={() => onCopy(value)} aria-label={`copy-${label}`}>
        <Copy className="h-3 w-3" />
        {copied ? 'Copiado' : ''}
      </Button>
    </div>
  );
}

export default AgreementSourceHashCard;