/**
 * B10F.5 — Read-only gate status card.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  globalFlag: boolean;
  pilotMode: boolean;
  allowlistLength: number;
}

export function RegistryPilotGateStatusCard({ globalFlag, pilotMode, allowlistLength }: Props) {
  return (
    <Card data-testid="pilot-gate-status">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Estado de gates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span>HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL</span>
          <Badge variant={globalFlag ? 'destructive' : 'secondary'}>
            {String(globalFlag)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>HR_REGISTRY_PILOT_MODE</span>
          <Badge variant={pilotMode ? 'destructive' : 'secondary'}>
            {String(pilotMode)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>REGISTRY_PILOT_SCOPE_ALLOWLIST.length</span>
          <Badge variant="outline">{allowlistLength}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default RegistryPilotGateStatusCard;