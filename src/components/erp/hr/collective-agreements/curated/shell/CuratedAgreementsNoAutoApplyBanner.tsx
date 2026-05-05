/**
 * B13.6 — Permanent banner reminding that the curated shell never
 * applies payroll, never creates mappings/runtime settings and
 * never activates agreements.
 */
import { ShieldAlert } from 'lucide-react';

export function CuratedAgreementsNoAutoApplyBanner() {
  return (
    <div
      role="note"
      aria-label="curated-no-auto-apply-banner"
      className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="leading-snug text-foreground">
        Ningún cambio se aplica a nómina sin B8A/B8B/B9 + Mapping + Runtime Apply.
        Esta vista es de detección, revisión, impacto y enrutado controlado.
        No crea mapping, no crea runtime, no activa convenios.
      </p>
    </div>
  );
}

export default CuratedAgreementsNoAutoApplyBanner;