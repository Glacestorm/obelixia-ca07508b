/**
 * B10F.5C — Read-only UI panel for the registry pilot candidate
 * discovery. Displays the grouped candidates and the IDs that the
 * human operator will need to resume B10F.6.a.
 *
 * Hard rules:
 *  - READ-ONLY. NO mutating CTAs whatsoever. No buttons that activate
 *    pilot, add to allow-list, apply registry, run payroll, change
 *    flags or "activate now".
 *  - No imports from payroll bridge, salary resolver, normalizer,
 *    payroll engine, payslip engine, agreement safety gate, shadow
 *    flag module, registry pilot gate, registry runtime/pilot bridge
 *    decisions.
 *  - No DB writes, no service_role.
 *  - Banner explicitly labels the panel as Discovery read-only.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRegistryPilotCandidateDiscovery } from '@/hooks/erp/hr/useRegistryPilotCandidateDiscovery';
import { AuthRequiredCard } from '../_shared/AuthRequiredCard';
import type { RegistryPilotCandidate } from '@/engines/erp/hr/registryPilotCandidatePreflight';

function CandidateRow({ c }: { c: RegistryPilotCandidate }) {
  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs">
          company: <span className="font-semibold">{c.company_id || '—'}</span>
        </div>
        <Badge variant="outline">score {c.readiness_score}</Badge>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        mapping: {c.mapping_id ?? '—'} · runtime_setting: {c.runtime_setting_id ?? '—'}
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        registry_agreement: {c.registry_agreement_id ?? '—'} · version: {c.registry_version_id ?? '—'}
      </div>
      {c.blockers.length > 0 && (
        <div className="text-xs text-destructive">
          blockers: {c.blockers.join(', ')}
        </div>
      )}
      {c.warnings.length > 0 && (
        <div className="text-xs text-amber-600">
          warnings: {c.warnings.join(', ')}
        </div>
      )}
    </div>
  );
}

export function RegistryPilotCandidateDiscoveryPanel() {
  const [companyId, setCompanyId] = useState('');
  const [targetYear, setTargetYear] = useState<number>(2026);
  const { loading, error, warnings, report, run, authRequired } = useRegistryPilotCandidateDiscovery();

  if (authRequired) {
    return <AuthRequiredCard />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Registry Pilot — Candidate Discovery
          </CardTitle>
          <Badge variant="secondary">read-only</Badge>
        </div>
        <div className="rounded-md border border-dashed bg-muted/40 p-2 text-xs text-muted-foreground">
          Discovery read-only — no activa piloto.
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="company-id" className="text-xs">company_id</Label>
            <Input
              id="company-id"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="uuid"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="target-year" className="text-xs">target_year</Label>
            <Input
              id="target-year"
              type="number"
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="text-xs underline text-muted-foreground hover:text-foreground"
              disabled={loading || !companyId}
              onClick={() => run({ companyId, targetYear })}
              aria-label="Inspect candidates (read-only)"
            >
              Inspect (read-only)
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            error: {error}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 p-2 text-xs text-amber-700">
            warnings: {warnings.join(', ')}
          </div>
        )}

        {report && (
          <>
            <Separator />
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-md border p-2">
                <div className="font-semibold text-base">{report.summary.total}</div>
                <div className="text-muted-foreground">total</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-semibold text-base text-emerald-600">
                  {report.summary.ready}
                </div>
                <div className="text-muted-foreground">ready</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-semibold text-base text-amber-600">
                  {report.summary.needsReview}
                </div>
                <div className="text-muted-foreground">needs review</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-semibold text-base text-destructive">
                  {report.summary.blocked}
                </div>
                <div className="text-muted-foreground">blocked</div>
              </div>
            </div>

            {report.recommendedCandidate && (
              <div className="rounded-md border border-emerald-300/60 bg-emerald-50 p-2 text-xs text-emerald-800">
                Recommended candidate (informational): mapping{' '}
                <span className="font-mono">{report.recommendedCandidate.mapping_id ?? '—'}</span>
                {' · '}runtime_setting{' '}
                <span className="font-mono">
                  {report.recommendedCandidate.runtime_setting_id ?? '—'}
                </span>
                {' · '}reason: {report.recommendationReason}
              </div>
            )}

            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-3">
                <section className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Ready ({report.ready.length})
                  </div>
                  {report.ready.map((c, i) => (
                    <CandidateRow key={`ready-${i}`} c={c} />
                  ))}
                </section>
                <section className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Needs review ({report.needsReview.length})
                  </div>
                  {report.needsReview.map((c, i) => (
                    <CandidateRow key={`nr-${i}`} c={c} />
                  ))}
                </section>
                <section className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Blocked ({report.blocked.length})
                  </div>
                  {report.blocked.map((c, i) => (
                    <CandidateRow key={`bl-${i}`} c={c} />
                  ))}
                </section>
              </div>
            </ScrollArea>
          </>
        )}

        <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          B10F.6.a permanece detenido hasta seleccionar un candidato READY y
          confirmar manualmente owner + rollback_contact + comparador B10B
          (critical = 0).
        </div>
      </CardContent>
    </Card>
  );
}

export default RegistryPilotCandidateDiscoveryPanel;