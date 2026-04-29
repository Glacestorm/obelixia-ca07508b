import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';
import AgreementStatusBadges from './AgreementStatusBadges';
import { deriveIncorporationFlow } from '@/lib/hr/agreementIncorporationFlow';

interface Props {
  row: UnifiedAgreementRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartWizard?: (row: UnifiedAgreementRow) => void;
}

function buildContextMessage(row: UnifiedAgreementRow): string | null {
  if (row.registry?.ready_for_payroll === true) {
    return 'Este convenio está listo en el Registro Maestro, pero su uso efectivo por empresa/contrato requiere mapping y runtime apply.';
  }
  if (row.origin === 'registry' && row.registry?.data_completeness === 'metadata_only') {
    return 'Este convenio está en Registry, pero no puede usarse para nómina hasta completar validación.';
  }
  if (row.origin === 'operative') {
    return 'Este convenio existe en la fuente operativa actual, pero todavía no está incorporado al Registro Maestro.';
  }
  return null;
}

export function AgreementUnifiedDetailDrawer({ row, open, onOpenChange, onStartWizard }: Props) {
  if (!row) return null;
  const contextMessage = buildContextMessage(row);
  const flow = deriveIncorporationFlow(row);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="agreement-detail-drawer">
        <SheetHeader>
          <SheetTitle>{row.display_name}</SheetTitle>
          <SheetDescription>
            {row.key} · <Badge variant="secondary">{row.origin}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <AgreementStatusBadges badges={row.badges} />

          {contextMessage && (
            <div className="p-3 rounded-md border bg-muted/30 text-muted-foreground">
              {contextMessage}
            </div>
          )}

          {flow.ctaLabel && (
            <div>
              <Button
                type="button"
                size="sm"
                onClick={() => onStartWizard?.(row)}
                data-testid="agreement-wizard-cta"
              >
                {flow.ctaLabel}
              </Button>
            </div>
          )}

          <section>
            <h4 className="font-semibold mb-1">Resumen</h4>
            <ul className="text-muted-foreground space-y-1">
              <li>Origen: {row.origin}</li>
              <li>Mappings: {row.mappings_count}</li>
              <li>Runtime settings: {row.runtime_settings_count}</li>
            </ul>
          </section>

          {row.operative && (
            <section>
              <h4 className="font-semibold mb-1">Fuente operativa</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>ID: {row.operative.id}</li>
                {row.operative.status && <li>Estado: {row.operative.status}</li>}
                {row.operative.updated_at && <li>Actualizado: {row.operative.updated_at}</li>}
              </ul>
            </section>
          )}

          {row.registry && (
            <section>
              <h4 className="font-semibold mb-1">Registro Maestro</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>Status: {row.registry.status ?? '—'}</li>
                <li>Source quality: {row.registry.source_quality ?? '—'}</li>
                <li>Data completeness: {row.registry.data_completeness ?? '—'}</li>
                <li>Salary tables loaded: {String(row.registry.salary_tables_loaded ?? false)}</li>
                <li>Ready for payroll: {String(row.registry.ready_for_payroll ?? false)}</li>
                <li>Requires human review: {String(row.registry.requires_human_review ?? false)}</li>
              </ul>
            </section>
          )}

          <section className="text-xs text-muted-foreground">
            Vista de solo lectura. Las acciones de mapping, runtime y piloto se gestionan en sus
            respectivas pestañas.
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AgreementUnifiedDetailDrawer;