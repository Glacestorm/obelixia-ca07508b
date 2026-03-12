/**
 * HRAdminPortal — Main portal replacing HRAdminRequestsPanel
 * Views: Dashboard + List, Detail, New Form
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus } from 'lucide-react';
import { useAdminPortal, type AdminRequest, type AdminPortalFilters, type AdminRequestStatus } from '@/hooks/admin/hr/useAdminPortal';
import { HRAdminPortalDashboard } from './HRAdminPortalDashboard';
import { HRAdminRequestsList } from './HRAdminRequestsList';
import { HRAdminRequestDetail } from './HRAdminRequestDetail';
import { HRAdminRequestForm } from './HRAdminRequestForm';

interface Props {
  companyId: string;
}

export function HRAdminPortal({ companyId }: Props) {
  const portal = useAdminPortal(companyId);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showForm, setShowForm] = useState(false);

  const handleSelect = useCallback(async (req: AdminRequest) => {
    await portal.fetchDetail(req.id);
    setView('detail');
  }, [portal]);

  const handleBack = useCallback(() => {
    portal.setDetail(null);
    setView('list');
  }, [portal]);

  const handleFiltersChange = useCallback((filters: AdminPortalFilters) => {
    portal.fetchRequests(filters);
  }, [portal]);

  const handleFilterByStatus = useCallback((status: string) => {
    portal.fetchRequests({ status });
  }, [portal]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portal Administrativo
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestión centralizada de solicitudes, trámites y documentación laboral
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nueva solicitud
        </Button>
      </div>

      {view === 'list' ? (
        <>
          <HRAdminPortalDashboard stats={portal.stats} onFilterByStatus={handleFilterByStatus} />
          <HRAdminRequestsList
            requests={portal.requests}
            loading={portal.loading}
            onSelect={handleSelect}
            onFiltersChange={handleFiltersChange}
          />
        </>
      ) : portal.detail ? (
        <HRAdminRequestDetail
          request={portal.detail}
          comments={portal.comments}
          activity={portal.activity}
          onBack={handleBack}
          onUpdateStatus={(id, s, c) => portal.updateStatus(id, s as AdminRequestStatus, c)}
          onAddComment={portal.addComment}
          onGenerateTasks={portal.generateTasks}
        />
      ) : null}

      {/* Form dialog */}
      <HRAdminRequestForm
        open={showForm}
        onOpenChange={setShowForm}
        companyId={companyId}
        onSubmit={portal.createRequest}
      />
    </div>
  );
}
