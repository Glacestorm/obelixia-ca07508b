import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistItemRow, type ChecklistItemStatus } from './internal/ChecklistItemRow';

const CHECKLIST_KEYS_V1 = [
  'official_source_verified',
  'sha256_reviewed',
  'publication_date_reviewed',
  'effective_period_reviewed',
  'territorial_scope_reviewed',
  'functional_scope_reviewed',
  'cnae_codes_reviewed',
  'professional_groups_reviewed',
  'categories_reviewed',
  'salary_base_reviewed',
  'pluses_reviewed',
  'working_hours_reviewed',
  'extra_payments_reviewed',
  'seniority_reviewed_or_pending',
  'it_complement_reviewed_or_pending',
  'parser_warnings_reviewed',
  'discarded_rows_reviewed',
  'no_payroll_use_acknowledged',
] as const;

export interface AgreementValidationChecklistProps {
  items: Array<Record<string, unknown>>;
  disabled?: boolean;
  onSaveItem: (data: {
    itemKey: string;
    itemStatus: ChecklistItemStatus;
    comment?: string;
    evidenceUrl?: string;
    evidenceExcerpt?: string;
  }) => Promise<void> | void;
}

export function AgreementValidationChecklist({
  items,
  disabled,
  onSaveItem,
}: AgreementValidationChecklistProps) {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const it of items) byKey.set(it.item_key as string, it);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Checklist de validación interna (18 items)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHECKLIST_KEYS_V1.map((key) => {
          const it = byKey.get(key);
          return (
            <ChecklistItemRow
              key={key}
              itemKey={key}
              initialStatus={(it?.item_status as ChecklistItemStatus) ?? 'pending'}
              initialComment={(it?.comment as string) ?? ''}
              initialEvidenceUrl={(it?.evidence_url as string) ?? ''}
              initialEvidenceExcerpt={(it?.evidence_excerpt as string) ?? ''}
              disabled={disabled}
              onSave={onSaveItem}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

export default AgreementValidationChecklist;
