import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';

export interface OcrVsManualComparatorProps {
  rows: StagingRowSummary[];
}

function key(r: StagingRowSummary) {
  return [r.year, r.professional_group, r.level ?? '', r.normalized_concept_key].join('::');
}

export function OcrVsManualComparator({ rows }: OcrVsManualComparatorProps) {
  const ocr = new Map(rows.filter((r) => r.extraction_method === 'ocr').map((r) => [key(r), r]));
  const manual = new Map(
    rows
      .filter((r) => r.extraction_method === 'manual_csv' || r.extraction_method === 'manual_form')
      .map((r) => [key(r), r]),
  );
  const sharedKeys = Array.from(ocr.keys()).filter((k) => manual.has(k));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Comparador OCR vs Manual</CardTitle>
      </CardHeader>
      <CardContent>
        {sharedKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay coincidencias de clave entre OCR y manual todavía.
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {sharedKeys.map((k) => {
              const o = ocr.get(k)!;
              const m = manual.get(k)!;
              const oa = (o as any).salary_base_annual;
              const ma = (m as any).salary_base_annual;
              const diverges = String(oa) !== String(ma);
              return (
                <li
                  key={k}
                  className={`rounded border p-2 ${diverges ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
                >
                  <p className="font-mono">{k}</p>
                  <p>
                    OCR base anual: <span className="font-mono">{String(oa ?? '—')}</span> ·
                    Manual base anual: <span className="font-mono">{String(ma ?? '—')}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default OcrVsManualComparator;