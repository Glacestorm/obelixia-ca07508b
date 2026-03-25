import { DashboardLayout } from '@/layouts';
import { AuditCenterModule } from '@/components/erp/audit-center';

export default function AuditCenterPage() {
  return (
    <DashboardLayout title="Centro de Auditoría">
      <AuditCenterModule />
    </DashboardLayout>
  );
}
