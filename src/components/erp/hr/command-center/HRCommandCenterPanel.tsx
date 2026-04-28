/**
 * HRCommandCenterPanel — Phase 1
 *
 * Single-tenant executive HR Command Center. Composes 7 cards + KPI header
 * over `useHRCommandCenter(companyId)`. Read-only, no operational actions.
 *
 * INVARIANTES:
 *  - Does NOT modify HRNavigationMenu nor HRModule.
 *  - Optional mount must stay behind flag `hr.commandCenter.enabled === false`
 *    by default (not enforced here — the host decides).
 *  - VPT/S9 stays internal_ready. Official integrations stay not_configured
 *    until evidence is archived (Phase 2+).
 *  - persisted_priority_apply OFF · C3B3C2 BLOCKED.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { useHRCommandCenter } from '@/hooks/erp/hr/useHRCommandCenter';
import { HRCCExecutiveKPIsHeader } from './HRCCExecutiveKPIsHeader';
import { HRCCGlobalStateCard } from './HRCCGlobalStateCard';
import { HRCCPayrollReadinessCard } from './HRCCPayrollReadinessCard';
import { HRCCDocumentaryCard } from './HRCCDocumentaryCard';
import { HRCCLegalComplianceCard } from './HRCCLegalComplianceCard';
import { HRCCVPTReadinessCard } from './HRCCVPTReadinessCard';
import { HRCCOfficialIntegrationsCard } from './HRCCOfficialIntegrationsCard';
import { HRCCAlertsAndBlockersCard } from './HRCCAlertsAndBlockersCard';

export interface HRCommandCenterPanelProps {
  companyId: string;
  onOpenEmployees?: () => void;
  onOpenPayroll?: () => void;
  onOpenExpedient?: () => void;
  onOpenCompliance?: () => void;
  onOpenVPT?: () => void;
  onOpenIntegrations?: () => void;
  onOpenAlerts?: () => void;
  className?: string;
}

export function HRCommandCenterPanel(props: HRCommandCenterPanelProps) {
  const { companyId, className } = props;
  const data = useHRCommandCenter(companyId);

  if (!companyId) {
    return (
      <div className="space-y-4" data-testid="hr-command-center">
        <Skeleton className="h-24 w-full" />
        <p className="text-sm text-muted-foreground">
          Selecciona una empresa para visualizar el Command Center.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="hr-command-center"
      className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}
      aria-label="HR Command Center"
    >
      <HRCCExecutiveKPIsHeader data={data} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HRCCGlobalStateCard
          snapshot={data.global}
          onOpenEmployees={props.onOpenEmployees}
        />
        <HRCCPayrollReadinessCard
          snapshot={data.payroll}
          onOpenPayroll={props.onOpenPayroll}
        />
        <HRCCDocumentaryCard
          snapshot={data.documentary}
          onOpenExpedient={props.onOpenExpedient}
        />
        <HRCCLegalComplianceCard
          snapshot={data.legal}
          onOpenCompliance={props.onOpenCompliance}
        />
        <HRCCVPTReadinessCard
          snapshot={data.vpt}
          onOpenVPT={props.onOpenVPT}
        />
        <HRCCOfficialIntegrationsCard
          snapshot={data.officialIntegrations}
          onOpenIntegrations={props.onOpenIntegrations}
        />
      </div>

      <HRCCAlertsAndBlockersCard data={data} onOpenAlerts={props.onOpenAlerts} />
    </div>
  );
}

export default HRCommandCenterPanel;