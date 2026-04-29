import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

interface Props {
  row: UnifiedAgreementRow;
  onOpen?: () => void;
}

export function AgreementMappingEntryCard({ row, onOpen }: Props) {
  const id = row.registry?.id;
  return (
    <Card data-testid="agreement-mapping-entry-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Mapping empresa / contrato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>registry_agreement_id: {id ?? '—'}</li>
          <li>readiness: {row.registry?.ready_for_payroll ? 'ready' : 'no ready'}</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          El mapping no activa nómina por sí mismo.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onOpen} disabled={!id}>
          Preparar mapping
        </Button>
      </CardContent>
    </Card>
  );
}

export default AgreementMappingEntryCard;
