/**
 * B12.3 — Incorporation wizard (read-only safe routing).
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';
import { deriveIncorporationFlow } from '@/lib/hr/agreementIncorporationFlow';
import {
  useAgreementIncorporationActions,
  type WizardActionResult,
  type WizardTargetTab,
} from '@/hooks/erp/hr/useAgreementIncorporationActions';
import AgreementIncorporationStepper from './AgreementIncorporationStepper';
import AgreementOfficialSourceChecklist from './AgreementOfficialSourceChecklist';
import AgreementParserChecklistCard from './AgreementParserChecklistCard';
import AgreementRegistryReadinessCard from './AgreementRegistryReadinessCard';
import AgreementValidationEntryCard from './AgreementValidationEntryCard';
import AgreementMappingEntryCard from './AgreementMappingEntryCard';

interface Props {
  row: UnifiedAgreementRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (target: WizardTargetTab, filters: Record<string, unknown>) => void;
}

export function AgreementIncorporationWizard({ row, open, onOpenChange, onNavigate }: Props) {
  const actions = useAgreementIncorporationActions();
  if (!row) return null;
  const flow = deriveIncorporationFlow(row);

  function navigate(result: WizardActionResult) {
    onNavigate?.(result.targetTab, result.filters);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="agreement-incorporation-wizard"
      >
        <DialogHeader>
          <DialogTitle>Asistente de incorporación</DialogTitle>
          <DialogDescription>
            {row.display_name} · estado: {flow.state}
          </DialogDescription>
        </DialogHeader>

        <div
          className="p-3 rounded-md border bg-muted/30 text-xs text-muted-foreground"
          data-testid="wizard-safety-banner"
        >
          Este asistente solo prepara y enruta. No activa convenios en nómina ni modifica datos
          oficiales.
        </div>

        {flow.ctaLabel && (
          <div className="text-sm">
            <span className="font-medium">Próxima acción sugerida:</span> {flow.ctaLabel}
          </div>
        )}

        <AgreementIncorporationStepper steps={flow.steps} />

        {flow.state === 'LEGACY_ONLY' && (
          <div className="space-y-3">
            <AgreementOfficialSourceChecklist />
            <AgreementParserChecklistCard />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(actions.openInRegistryMaster(row))}>
                Abrir Registro
              </Button>
            </div>
          </div>
        )}

        {flow.state === 'REGISTRY_METADATA_ONLY' && (
          <div className="space-y-3">
            <AgreementOfficialSourceChecklist />
            <AgreementParserChecklistCard />
            <AgreementRegistryReadinessCard row={row} blockers={flow.blockers} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(actions.openInRegistryMaster(row))}>
                Abrir Registro
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(actions.openValidation(row))}>
                Abrir Validación
              </Button>
            </div>
          </div>
        )}

        {flow.state === 'REGISTRY_PARSED_PARTIAL' && (
          <div className="space-y-3">
            <AgreementRegistryReadinessCard row={row} blockers={flow.blockers} />
            <AgreementValidationEntryCard row={row} onOpen={() => navigate(actions.openValidation(row))} />
          </div>
        )}

        {flow.state === 'REGISTRY_READY' && (
          <div className="space-y-3">
            <AgreementRegistryReadinessCard row={row} blockers={flow.blockers} />
            <AgreementMappingEntryCard row={row} onOpen={() => navigate(actions.openMapping(row))} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(actions.openRuntimeApply(row))}>
                Abrir Runtime
              </Button>
            </div>
          </div>
        )}

        {flow.state === 'UNKNOWN' && (
          <div className="text-sm text-muted-foreground">
            No se ha podido derivar un siguiente paso seguro automáticamente. Consulta la guía
            "No encontrado" del Centro de Convenios.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AgreementIncorporationWizard;
