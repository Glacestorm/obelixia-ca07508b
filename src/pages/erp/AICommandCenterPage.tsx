import { DashboardLayout } from '@/layouts';
import { AICommandCenterModule } from '@/components/erp/ai-center';

export default function AICommandCenterPage() {
  return (
    <DashboardLayout title="AI Command Center">
      <AICommandCenterModule />
    </DashboardLayout>
  );
}
