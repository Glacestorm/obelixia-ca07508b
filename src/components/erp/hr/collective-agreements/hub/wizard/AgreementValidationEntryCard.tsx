import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

interface Props {
  row: UnifiedAgreementRow;
  onOpen?: () => void;
}

export function AgreementValidationEntryCard({ row, onOpen }: Props) {
  const agreementId = row.registry?.id;
  const blockers: string[] = [];
  if (!agreementId) blockers.push('Falta agreement_id');
  return (
    <Card data-testid="agreement-validation-entry-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Validación humana</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>agreement_id: {agreementId ?? '—'}</li>
          <li>version_id: pendiente de verificar en panel B8A</li>
          <li>source_id: pendiente de verificar en panel B8A</li>
        </ul>
        {blockers.length > 0 && (
          <div className="text-xs text-destructive">
            <div className="font-medium mb-1">Blockers:</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpen}
          disabled={blockers.length > 0}
        >
          Abrir validación humana
        </Button>
      </CardContent>
    </Card>
  );
}

export default AgreementValidationEntryCard;
