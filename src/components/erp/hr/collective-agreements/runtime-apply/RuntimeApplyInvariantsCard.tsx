/**
 * B10D.4 — Read-only display of the 14 runtime-apply invariants
 * (mirrors the gates evaluated server-side by B10D.2 / B10D.3).
 *
 * Pure presentational — does NOT activate, does NOT mutate anything.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RuntimeApplyInvariantsState {
  mapping_exists?: boolean;
  mapping_status_approved_internal?: boolean;
  mapping_is_current?: boolean;
  mapping_approved_by_present?: boolean;
  mapping_approved_at_present?: boolean;
  registry_ready_for_payroll?: boolean;
  registry_no_human_review_pending?: boolean;
  registry_data_completeness_human_validated?: boolean;
  registry_source_quality_official?: boolean;
  registry_version_is_current?: boolean;
  comparison_no_critical_diffs?: boolean;
  second_approver_distinct_from_requester?: boolean;
  second_approver_role_allowed?: boolean;
  four_acknowledgements_present?: boolean;
}

const ROWS: Array<{ key: keyof RuntimeApplyInvariantsState; label: string }> = [
  { key: 'mapping_exists', label: 'Mapping existe' },
  { key: 'mapping_status_approved_internal', label: 'Mapping aprobado interno' },
  { key: 'mapping_is_current', label: 'Mapping is_current' },
  { key: 'mapping_approved_by_present', label: 'Mapping approved_by presente' },
  { key: 'mapping_approved_at_present', label: 'Mapping approved_at presente' },
  { key: 'registry_ready_for_payroll', label: 'Registro elegible para runtime' },
  { key: 'registry_no_human_review_pending', label: 'Registro sin revisión humana pendiente' },
  { key: 'registry_data_completeness_human_validated', label: 'Registro completitud validada por humano' },
  { key: 'registry_source_quality_official', label: 'Registro fuente oficial' },
  { key: 'registry_version_is_current', label: 'Versión del registro vigente' },
  { key: 'comparison_no_critical_diffs', label: 'Comparación sin diffs críticos' },
  { key: 'second_approver_distinct_from_requester', label: 'Solicitante ≠ segundo aprobador' },
  { key: 'second_approver_role_allowed', label: 'Rol del segundo aprobador permitido' },
  { key: 'four_acknowledgements_present', label: '4 acknowledgements confirmadas' },
];

function Icon({ value }: { value: boolean | undefined }) {
  if (value === true)
    return <Check className="h-4 w-4 text-emerald-600" aria-label="ok" />;
  if (value === false) return <X className="h-4 w-4 text-destructive" aria-label="ko" />;
  return <Minus className="h-4 w-4 text-muted-foreground" aria-label="n/a" />;
}

export function RuntimeApplyInvariantsCard({
  invariants,
  className,
}: {
  invariants?: RuntimeApplyInvariantsState | null;
  className?: string;
}) {
  return (
    <Card className={cn(className)} data-testid="runtime-apply-invariants-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">14 invariantes (server-side)</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {ROWS.map((row) => {
            const v = invariants?.[row.key];
            return (
              <li
                key={row.key as string}
                data-testid={`runtime-apply-invariant-${String(row.key)}`}
                className="flex items-center gap-2 text-sm"
              >
                <Icon value={v} />
                <span
                  className={cn(
                    v === false && 'text-destructive',
                    v === undefined && 'text-muted-foreground',
                  )}
                >
                  {row.label}
                </span>
              </li>
            );
          })}
          <li className="pt-2 mt-2 border-t text-xs text-muted-foreground">
            Activar aquí no toca el flag global ni ejecuta nómina con el
            registro. El cambio efectivo en nómina queda reservado a una
            fase posterior.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

export default RuntimeApplyInvariantsCard;