import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { StagingRowSummary, StagingAuditEntry } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { StagingStatusBadge } from './StagingStatusBadge';
import { StagingBlockersWarningsPanel } from './StagingBlockersWarningsPanel';
import { StagingAuditTrail } from './StagingAuditTrail';

export interface StagingRowDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StagingRowSummary | null;
  audit: StagingAuditEntry[];
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="col-span-2 break-words font-mono text-xs">{v ?? '—'}</span>
    </div>
  );
}

export function StagingRowDetailDrawer({
  open,
  onOpenChange,
  row,
  audit,
}: StagingRowDetailDrawerProps) {
  if (!row) return null;
  const r = row as any;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalle de fila staging <StagingStatusBadge status={row.validation_status} />
          </SheetTitle>
          <SheetDescription>
            TIC-NAC · año {row.year} · grupo {row.professional_group}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-3 h-[calc(100vh-160px)] pr-3">
          <div className="space-y-4">
            <StagingBlockersWarningsPanel row={row} />

            <section className="space-y-1">
              <h4 className="text-sm font-semibold">Fuente</h4>
              <KV k="Página" v={<span data-testid="detail-source-page">{row.source_page}</span>} />
              <KV k="Artículo" v={r.source_article} />
              <KV k="Anexo" v={r.source_annex} />
              <KV
                k="Extracto"
                v={<span data-testid="detail-source-excerpt">{row.source_excerpt}</span>}
              />
              <KV
                k="OCR raw"
                v={
                  <span data-testid="detail-ocr-raw" className="whitespace-pre-wrap">
                    {r.ocr_raw_text ?? '—'}
                  </span>
                }
              />
            </section>

            <Separator />

            <section className="space-y-1">
              <h4 className="text-sm font-semibold">Concepto</h4>
              <KV k="Literal convenio" v={row.concept_literal_from_agreement} />
              <KV k="Clave normalizada" v={row.normalized_concept_key} />
              <KV k="Etiqueta nómina" v={r.payroll_label} />
              <KV k="Etiqueta payslip" v={row.payslip_label} />
            </section>

            <Separator />

            <section className="space-y-1">
              <h4 className="text-sm font-semibold">Importes</h4>
              <KV k="Salario base anual" v={r.salary_base_annual} />
              <KV k="Salario base mensual" v={r.salary_base_monthly} />
              <KV k="Plus convenio anual" v={r.plus_convenio_annual} />
              <KV k="Plus convenio mensual" v={r.plus_convenio_monthly} />
              <KV k="Plus transporte" v={r.plus_transport} />
              <KV k="Plus antigüedad" v={r.plus_antiguedad} />
              <KV k="Otros" v={r.other_amount} />
            </section>

            <Separator />

            <section className="space-y-1">
              <h4 className="text-sm font-semibold">Trazabilidad</h4>
              <KV k="Confianza fila" v={row.row_confidence} />
              <KV k="Hash contenido" v={row.content_hash} />
              <KV k="Hash aprobación" v={r.approval_hash} />
              <KV k="1ª revisión" v={`${row.first_reviewed_by ?? '—'} · ${row.first_reviewed_at ?? '—'}`} />
              <KV k="2ª revisión" v={`${row.second_reviewed_by ?? '—'} · ${row.second_reviewed_at ?? '—'}`} />
              <KV k="Notas" v={r.review_notes} />
            </section>

            <Separator />

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Auditoría de la fila</h4>
              <StagingAuditTrail entries={audit} rowId={row.id} />
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default StagingRowDetailDrawer;