/**
 * B10F.5 — Read-only decision log table. No edit, delete or retry CTAs.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PilotDecisionLogRow } from '@/hooks/erp/hr/useRegistryPilotMonitor';

interface Props {
  logs: PilotDecisionLogRow[];
}

export function RegistryPilotDecisionLogTable({ logs }: Props) {
  return (
    <Card data-testid="pilot-log-table">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Decisiones piloto (últimas)</CardTitle>
      </CardHeader>
      <CardContent className="text-xs overflow-x-auto">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">Sin decisiones registradas.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-1 pr-2">decided_at</th>
                <th className="py-1 pr-2">outcome</th>
                <th className="py-1 pr-2">reason</th>
                <th className="py-1 pr-2">company_id</th>
                <th className="py-1 pr-2">employee_id</th>
                <th className="py-1 pr-2">contract_id</th>
                <th className="py-1 pr-2">target_year</th>
                <th className="py-1 pr-2">mapping_id</th>
                <th className="py-1 pr-2">registry_agreement_id</th>
                <th className="py-1 pr-2">registry_version_id</th>
                <th className="py-1 pr-2">comparison</th>
                <th className="py-1 pr-2">blockers</th>
                <th className="py-1 pr-2">warnings</th>
                <th className="py-1 pr-2">signature_hash</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b align-top" data-testid="pilot-log-row">
                  <td className="py-1 pr-2 whitespace-nowrap">{l.decided_at}</td>
                  <td className="py-1 pr-2">{l.decision_outcome}</td>
                  <td className="py-1 pr-2">{l.decision_reason}</td>
                  <td className="py-1 pr-2">{l.company_id}</td>
                  <td className="py-1 pr-2">{l.employee_id}</td>
                  <td className="py-1 pr-2">{l.contract_id}</td>
                  <td className="py-1 pr-2">{l.target_year}</td>
                  <td className="py-1 pr-2">{l.mapping_id ?? '—'}</td>
                  <td className="py-1 pr-2">{l.registry_agreement_id ?? '—'}</td>
                  <td className="py-1 pr-2">{l.registry_version_id ?? '—'}</td>
                  <td className="py-1 pr-2"><pre className="max-w-[180px] overflow-hidden text-[10px]">{JSON.stringify(l.comparison_summary_json)}</pre></td>
                  <td className="py-1 pr-2"><pre className="max-w-[120px] overflow-hidden text-[10px]">{JSON.stringify(l.blockers_json)}</pre></td>
                  <td className="py-1 pr-2"><pre className="max-w-[120px] overflow-hidden text-[10px]">{JSON.stringify(l.warnings_json)}</pre></td>
                  <td className="py-1 pr-2 font-mono text-[10px] break-all">{l.signature_hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export default RegistryPilotDecisionLogTable;