import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

interface Props {
  row: UnifiedAgreementRow;
  blockers?: string[];
}

export function AgreementRegistryReadinessCard({ row, blockers = [] }: Props) {
  const r = row.registry;
  return (
    <Card data-testid="agreement-registry-readiness-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Readiness Registry</CardTitle>
      </CardHeader>
      <CardContent>
        {r ? (
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>data_completeness: {r.data_completeness ?? '—'}</li>
            <li>salary_tables_loaded: {String(r.salary_tables_loaded ?? false)}</li>
            <li>requires_human_review: {String(r.requires_human_review ?? false)}</li>
            <li>ready_for_payroll: {String(r.ready_for_payroll ?? false)}</li>
            <li>source_quality: {r.source_quality ?? '—'}</li>
            <li>status: {r.status ?? '—'}</li>
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin entrada en Registry.</p>
        )}
        {blockers.length > 0 && (
          <div className="mt-3 text-xs text-destructive">
            <div className="font-medium mb-1">Blockers:</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementRegistryReadinessCard;
