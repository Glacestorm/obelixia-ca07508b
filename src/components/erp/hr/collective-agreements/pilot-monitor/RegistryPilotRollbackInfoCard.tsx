/**
 * B10F.5 — Read-only rollback information card.
 * Informative text only. No buttons, no actions.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RegistryPilotRollbackInfoCard() {
  return (
    <Card data-testid="pilot-rollback-info">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Rollback (informativo)</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2 text-muted-foreground">
        <p>Rollback instantáneo: HR_REGISTRY_PILOT_MODE=false (vía PR de código).</p>
        <p>Rollback por scope: quitar el scope de REGISTRY_PILOT_SCOPE_ALLOWLIST vía PR.</p>
        <p>El rollback funcional se gestiona desde B10D Runtime Apply.</p>
      </CardContent>
    </Card>
  );
}

export default RegistryPilotRollbackInfoCard;