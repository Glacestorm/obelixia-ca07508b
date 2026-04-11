/**
 * GlobalMobilityModule — Main entry point
 * H1.0: Added edit flow, delete for drafts
 */
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe } from 'lucide-react';
import { useGlobalMobility } from '@/hooks/erp/hr/useGlobalMobility';
import type { MobilityAssignment, MobilityDocument, AssignmentFilters, AssignmentStatus } from '@/hooks/erp/hr/useGlobalMobility';
import { MobilityDashboard } from './MobilityDashboard';
import { MobilityAssignmentsList } from './MobilityAssignmentsList';
import { MobilityAssignmentForm } from './MobilityAssignmentForm';
import { MobilityAssignmentDetail } from './MobilityAssignmentDetail';

interface Props {
  companyId: string;
}

type View = 'list' | 'create' | 'detail' | 'edit';

export function GlobalMobilityModule({ companyId }: Props) {
  const mobility = useGlobalMobility(companyId);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<MobilityAssignment | null>(null);
  const [expiringDocs, setExpiringDocs] = useState<MobilityDocument[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    mobility.getStats();
    mobility.getExpiringDocuments(60).then(setExpiringDocs);
  }, [mobility.assignments.length]);

  const handleFilter = useCallback((filters: AssignmentFilters) => {
    mobility.fetchAssignments(filters);
  }, [mobility.fetchAssignments]);

  const handleCreate = useCallback(async (data: Partial<MobilityAssignment>) => {
    const result = await mobility.createAssignment(data);
    if (result) setView('list');
  }, [mobility.createAssignment]);

  const handleUpdate = useCallback(async (data: Partial<MobilityAssignment>) => {
    if (!selected) return;
    const result = await mobility.updateAssignment(selected.id, data);
    if (result) {
      setSelected(result);
      setView('detail');
    }
  }, [mobility.updateAssignment, selected]);

  const handleStatusChange = useCallback(async (id: string, status: AssignmentStatus) => {
    await mobility.updateStatus(id, status);
    if (selected?.id === id) {
      const updated = mobility.assignments.find(a => a.id === id);
      if (updated) setSelected(updated);
    }
  }, [mobility.updateStatus, selected, mobility.assignments]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await mobility.deleteAssignment(id);
    if (result) {
      setView('list');
      setSelected(null);
    }
  }, [mobility.deleteAssignment]);

  const handleEdit = useCallback(() => {
    if (selected) setView('edit');
  }, [selected]);

  const renderAssignmentView = () => {
    switch (view) {
      case 'create':
        return (
          <MobilityAssignmentForm
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
          />
        );
      case 'edit':
        return selected ? (
          <MobilityAssignmentForm
            initial={selected}
            isEditing
            onSubmit={handleUpdate}
            onCancel={() => setView('detail')}
          />
        ) : null;
      case 'detail':
        return selected ? (
          <MobilityAssignmentDetail
            assignment={selected}
            onBack={() => { setView('list'); setSelected(null); }}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            fetchDocuments={mobility.fetchDocuments}
            addDocument={mobility.addDocument}
            updateDocument={mobility.updateDocument}
            fetchCostProjection={mobility.fetchCostProjection}
            upsertCostProjection={mobility.upsertCostProjection}
            fetchAuditLog={mobility.fetchAuditLog}
            validTransitions={mobility.VALID_TRANSITIONS}
          />
        ) : null;
      default:
        return (
          <MobilityAssignmentsList
            assignments={mobility.assignments}
            loading={mobility.loading}
            onSelect={(a) => { setSelected(a); setView('detail'); }}
            onCreate={() => setView('create')}
            onFilter={handleFilter}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-500" /> Global Mobility
        </h3>
        <p className="text-sm text-muted-foreground">
          Asignaciones internacionales, expatriados, compliance y costes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'assignments') setView('list'); }}>
        <TabsList>
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">Asignaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <MobilityDashboard
            stats={mobility.stats}
            expiringDocs={expiringDocs}
            loading={mobility.loading}
          />
        </TabsContent>

        <TabsContent value="assignments">
          {renderAssignmentView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
