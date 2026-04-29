/**
 * B10F.5 — Read-only registry pilot monitor panel.
 *
 * Hard rules:
 *  - Read-only. No buttons execute pilot activation, registry
 *    application, payroll runs, allow-list mutation, or rollback.
 *  - The rollback information card is text-only and references B10D.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useRegistryPilotMonitor,
  type RegistryPilotMonitorFilters,
} from '@/hooks/erp/hr/useRegistryPilotMonitor';
import { RegistryPilotGateStatusCard } from './RegistryPilotGateStatusCard';
import { RegistryPilotScopeCard } from './RegistryPilotScopeCard';
import { RegistryPilotSummaryCard } from './RegistryPilotSummaryCard';
import { RegistryPilotDecisionLogTable } from './RegistryPilotDecisionLogTable';
import { RegistryPilotRollbackInfoCard } from './RegistryPilotRollbackInfoCard';
import { AuthRequiredCard } from '../_shared/AuthRequiredCard';

interface Props {
  filters?: RegistryPilotMonitorFilters;
}

export function RegistryPilotMonitorPanel({ filters }: Props) {
  const { globalFlag, pilotMode, allowlist, logs, summary, loading, error, authRequired } =
    useRegistryPilotMonitor(filters);

  if (authRequired) {
    return (
      <div className="space-y-4" data-testid="registry-pilot-monitor-panel">
        <AuthRequiredCard />
      </div>
    );
  }

  const mostRecent = useMemo(() => (logs.length > 0 ? logs[0] : null), [logs]);

  return (
    <div className="space-y-4" data-testid="registry-pilot-monitor-panel">
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Modo piloto Registry — solo lectura
            <Badge variant="outline">read-only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          La activación global sigue desactivada. El rollback funcional se gestiona desde B10D Runtime Apply.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RegistryPilotGateStatusCard
          globalFlag={globalFlag}
          pilotMode={pilotMode}
          allowlistLength={allowlist.length}
        />
        <RegistryPilotSummaryCard summary={summary} mostRecent={mostRecent} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Scopes en allow-list</CardTitle>
        </CardHeader>
        <CardContent>
          {allowlist.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="empty-allowlist">
              No hay scopes piloto activos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allowlist.map((s) => (
                <RegistryPilotScopeCard
                  key={`${s.company_id}|${s.employee_id}|${s.contract_id}|${s.target_year}`}
                  scope={s}
                  globalFlag={globalFlag}
                  pilotMode={pilotMode}
                  allowlist={allowlist}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RegistryPilotDecisionLogTable logs={logs} />

      <RegistryPilotRollbackInfoCard />

      {loading && (
        <p className="text-xs text-muted-foreground" data-testid="loading">Cargando…</p>
      )}
      {error && (
        <p className="text-xs text-destructive" data-testid="error">{error}</p>
      )}
    </div>
  );
}

export default RegistryPilotMonitorPanel;