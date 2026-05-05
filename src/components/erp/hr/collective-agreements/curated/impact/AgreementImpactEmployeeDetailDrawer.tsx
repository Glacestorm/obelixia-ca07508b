/**
 * B13.5C — Detail drawer for a single impact preview (read-only).
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AgreementImpactRiskFlagsPanel } from './AgreementImpactRiskFlagsPanel';
import type { ImpactPreviewRow } from '@/hooks/erp/hr/useAgreementImpactPreviews';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preview: ImpactPreviewRow | null;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-right">{v ?? '—'}</span>
    </div>
  );
}

export function AgreementImpactEmployeeDetailDrawer({ open, onOpenChange, preview }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de impacto</DialogTitle>
          <DialogDescription>
            Este cálculo es una previsualización. La aplicación real exige mapping, runtime apply y controles humanos posteriores.
          </DialogDescription>
        </DialogHeader>
        {preview ? (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-2">
              <Row k="company_id" v={preview.company_id} />
              <Row k="employee_id" v={preview.employee_id} />
              <Row k="contract_id" v={preview.contract_id ?? '—'} />
              <Row k="affected" v={String(preview.affected)} />
              <Row k="blocked" v={String(preview.blocked)} />
              <Separator className="my-2" />
              <Row k="Salario actual mensual" v={fmt(preview.current_salary_monthly)} />
              <Row
                k="Salario actual anual"
                v={fmt(preview.current_salary_monthly ? preview.current_salary_monthly * 12 : null)}
              />
              <Row k="Salario objetivo mensual" v={fmt(preview.target_salary_monthly)} />
              <Row
                k="Salario objetivo anual"
                v={fmt(preview.target_salary_monthly ? preview.target_salary_monthly * 12 : null)}
              />
              <Row k="Δ mensual" v={fmt(preview.delta_monthly)} />
              <Row k="Δ anual" v={fmt(preview.delta_annual)} />
              <Row k="Atrasos (est.)" v={fmt(preview.arrears_estimate)} />
              <Row k="Coste empresa Δ (est.)" v={fmt(preview.employer_cost_delta)} />
              <Separator className="my-2" />
              <AgreementImpactRiskFlagsPanel
                riskFlags={preview.risk_flags}
                blockers={preview.blockers_json}
                warnings={preview.warnings_json}
              />
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">Sin selección.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AgreementImpactEmployeeDetailDrawer;