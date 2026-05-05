/**
 * B13.5C — Aggregated KPI cards over scopes/previews (read-only, in-memory).
 */
import { Card, CardContent } from '@/components/ui/card';
import type { ImpactPreviewRow, ImpactScopeRow } from '@/hooks/erp/hr/useAgreementImpactPreviews';

interface Props {
  scopes: ImpactScopeRow[];
  previews: ImpactPreviewRow[];
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function AgreementImpactSummaryCards({ scopes, previews }: Props) {
  const companies = new Set(scopes.map((s) => s.company_id)).size;
  const affected = previews.filter((p) => p.affected).length;
  const totalDeltaMonthly = previews.reduce((a, p) => a + (p.delta_monthly ?? 0), 0);
  const totalDeltaAnnual = previews.reduce((a, p) => a + (p.delta_annual ?? 0), 0);
  const totalArrears = previews.reduce((a, p) => a + (p.arrears_estimate ?? 0), 0);
  const employerCost = previews.reduce((a, p) => a + (p.employer_cost_delta ?? 0), 0);
  const highRisk = previews.filter((p) => (p.risk_flags?.length ?? 0) > 0 || p.blocked).length;

  const items = [
    { label: 'Empresas escaneadas', value: String(companies) },
    { label: 'Empleados afectados', value: String(affected) },
    { label: 'Δ mensual (est.)', value: fmt(totalDeltaMonthly) },
    { label: 'Δ anual (est.)', value: fmt(totalDeltaAnnual) },
    { label: 'Atrasos (est.)', value: fmt(totalArrears) },
    { label: 'Coste empresa (est.)', value: fmt(employerCost) },
    { label: 'High risk', value: String(highRisk) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {items.map((it) => (
        <Card key={it.label} data-testid={`impact-kpi-${it.label}`}>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="mt-1 text-base font-semibold">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default AgreementImpactSummaryCards;