/**
 * B13.5C — Permanent banner reminding the UI does NOT apply payroll.
 */
import { ShieldAlert } from 'lucide-react';

export function AgreementImpactNoApplyBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Previews de impacto — no aplican nómina, no crean mapping y no activan convenios.
      </span>
    </div>
  );
}

export default AgreementImpactNoApplyBanner;