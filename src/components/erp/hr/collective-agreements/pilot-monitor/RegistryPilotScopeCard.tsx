/**
 * B10F.5 — Read-only scope card. Computes gate state via pure helper.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  isPilotEnabledForScope,
  type RegistryPilotScope,
} from '@/engines/erp/hr/registryPilotGate';

interface Props {
  scope: RegistryPilotScope;
  globalFlag: boolean;
  pilotMode: boolean;
  allowlist: readonly RegistryPilotScope[];
}

export function RegistryPilotScopeCard({ scope, globalFlag, pilotMode, allowlist }: Props) {
  const gate = isPilotEnabledForScope({
    companyId: scope.company_id,
    employeeId: scope.employee_id,
    contractId: scope.contract_id,
    targetYear: scope.target_year,
    globalRegistryFlag: globalFlag,
    pilotMode,
    allowlist,
  });

  return (
    <Card data-testid="pilot-scope-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Scope</span>
          <Badge variant={gate.enabled ? 'default' : 'secondary'}>{gate.reason}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">
        <div><span className="text-muted-foreground">company_id: </span>{scope.company_id}</div>
        <div><span className="text-muted-foreground">employee_id: </span>{scope.employee_id}</div>
        <div><span className="text-muted-foreground">contract_id: </span>{scope.contract_id}</div>
        <div><span className="text-muted-foreground">target_year: </span>{scope.target_year}</div>
        <div><span className="text-muted-foreground">owner: </span>{scope.owner}</div>
        <div><span className="text-muted-foreground">rollback_contact: </span>{scope.rollback_contact}</div>
        <div><span className="text-muted-foreground">pilot_started_at: </span>{scope.pilot_started_at}</div>
      </CardContent>
    </Card>
  );
}

export default RegistryPilotScopeCard;