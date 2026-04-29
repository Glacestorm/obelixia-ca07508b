/**
 * B10C.2B.2C — Append-only history list for a mapping scope.
 * Read-only. No payroll, no bridge, no flag.
 */
import React from 'react';
import { MappingStatusBadge, type MappingStatus } from './MappingStatusBadge';

export interface MappingHistoryEntry {
  id: string;
  mapping_status: MappingStatus;
  registry_agreement_id: string;
  registry_version_id: string;
  source_type: string;
  is_current: boolean;
  created_at: string;
  approved_at?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
}

export function MappingHistoryList({
  entries,
}: {
  entries: MappingHistoryEntry[];
}) {
  if (!entries || entries.length === 0) {
    return (
      <p
        data-testid="mapping-history-empty"
        className="text-sm text-muted-foreground italic"
      >
        Sin mappings registrados para este scope.
      </p>
    );
  }
  return (
    <ul className="space-y-2" data-testid="mapping-history-list">
      {entries.map((e) => (
        <li
          key={e.id}
          data-testid={`mapping-history-entry-${e.id}`}
          className="rounded-md border p-3 bg-card"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MappingStatusBadge status={e.mapping_status} />
              {e.is_current && (
                <span
                  data-testid={`mapping-current-${e.id}`}
                  className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30"
                >
                  Actual
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleString('es-ES')}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            <div>
              <span className="text-muted-foreground">Convenio:</span>{' '}
              <span className="font-mono">{e.registry_agreement_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Versión:</span>{' '}
              <span className="font-mono">{e.registry_version_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Origen:</span> {e.source_type}
            </div>
            {e.approved_at && (
              <div>
                <span className="text-muted-foreground">Aprobado:</span>{' '}
                {new Date(e.approved_at).toLocaleString('es-ES')}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default MappingHistoryList;