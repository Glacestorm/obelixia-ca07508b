/**
 * B10D.4 — Append-only history list for runtime-apply requests of a
 * given scope. Read-only. No payroll, no bridge, no flag.
 */
import React from 'react';
import {
  RuntimeApplyStatusBadge,
  type RuntimeApplyStatus,
} from './RuntimeApplyStatusBadge';

export interface RuntimeApplyHistoryEntry {
  id: string;
  request_status: RuntimeApplyStatus;
  mapping_id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  requested_by?: string | null;
  requested_at?: string | null;
  second_approved_by?: string | null;
  second_approved_at?: string | null;
  comparison_critical_diffs_count?: number | null;
  activation_run_id?: string | null;
  rollback_run_id?: string | null;
}

export function RuntimeApplyHistoryList({
  entries,
  selectedId,
  onSelect,
}: {
  entries: RuntimeApplyHistoryEntry[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (!entries || entries.length === 0) {
    return (
      <p
        data-testid="runtime-apply-history-empty"
        className="text-sm text-muted-foreground italic"
      >
        Sin requests de runtime apply para este scope.
      </p>
    );
  }
  return (
    <ul className="space-y-2" data-testid="runtime-apply-history-list">
      {entries.map((e) => {
        const isSelected = selectedId === e.id;
        return (
          <li
            key={e.id}
            data-testid={`runtime-apply-history-item-${e.id}`}
            className={`rounded border p-2 text-sm cursor-pointer transition-colors ${
              isSelected ? 'bg-muted/60 border-primary/50' : 'hover:bg-muted/40'
            }`}
            onClick={() => onSelect?.(e.id)}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <RuntimeApplyStatusBadge status={e.request_status} />
              <span className="text-xs text-muted-foreground font-mono">
                {e.id.slice(0, 8)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
              <div>
                Mapping: <span className="font-mono">{e.mapping_id.slice(0, 8)}</span>
              </div>
              {e.requested_by && (
                <div>
                  Solicitante: <span className="font-mono">{e.requested_by.slice(0, 8)}</span>
                </div>
              )}
              {e.second_approved_by && (
                <div>
                  2ª aprob.: <span className="font-mono">{e.second_approved_by.slice(0, 8)}</span>
                </div>
              )}
              {typeof e.comparison_critical_diffs_count === 'number' && (
                <div>Diffs críticos: {e.comparison_critical_diffs_count}</div>
              )}
              {e.activation_run_id && (
                <div>
                  Activation run: <span className="font-mono">{e.activation_run_id.slice(0, 8)}</span>
                </div>
              )}
              {e.rollback_run_id && (
                <div>
                  Rollback run: <span className="font-mono">{e.rollback_run_id.slice(0, 8)}</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default RuntimeApplyHistoryList;