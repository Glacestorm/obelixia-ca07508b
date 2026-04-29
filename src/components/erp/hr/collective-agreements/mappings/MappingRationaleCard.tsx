/**
 * B10C.2B.2C — Renders rationale_json + evidence URLs for a mapping.
 * Read-only. No payroll, no bridge, no flag.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText } from 'lucide-react';

export interface MappingRationaleCardProps {
  rationaleJson?: Record<string, unknown> | null;
  evidenceUrls?: string[] | null;
  blockers?: string[] | null;
  warnings?: string[] | null;
}

export function MappingRationaleCard({
  rationaleJson,
  evidenceUrls,
  blockers,
  warnings,
}: MappingRationaleCardProps) {
  return (
    <Card data-testid="mapping-rationale-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Rationale y evidencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {blockers && blockers.length > 0 && (
          <div data-testid="mapping-blockers" className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
            <p className="font-medium text-destructive">Bloqueos</p>
            <ul className="list-disc list-inside text-destructive/90">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {warnings && warnings.length > 0 && (
          <div data-testid="mapping-warnings" className="rounded-md border border-amber-300 bg-amber-50 p-2 dark:bg-amber-900/20">
            <p className="font-medium text-amber-800 dark:text-amber-300">Avisos</p>
            <ul className="list-disc list-inside text-amber-800/90 dark:text-amber-300/90">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {rationaleJson && Object.keys(rationaleJson).length > 0 && (
          <pre
            data-testid="mapping-rationale-json"
            className="text-xs bg-muted rounded-md p-2 overflow-auto max-h-48"
          >
            {JSON.stringify(rationaleJson, null, 2)}
          </pre>
        )}
        {evidenceUrls && evidenceUrls.length > 0 && (
          <div data-testid="mapping-evidence-urls" className="space-y-1">
            <p className="font-medium">Evidencia</p>
            <ul className="space-y-1">
              {evidenceUrls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!rationaleJson && (!evidenceUrls || evidenceUrls.length === 0) && (
          <p className="text-muted-foreground italic">Sin rationale ni evidencia adjunta.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default MappingRationaleCard;