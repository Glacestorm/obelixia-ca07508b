/**
 * GlobalMobilityModule — Main entry point
 * H1.0: Added edit view, delete/cancel drafts, employee name lookup
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
import { CorridorPackAdminPanel } from './CorridorPackAdminPanel';
import { MobilityPortfolioPanel } from './MobilityPortfolioPanel';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  companyId: string;
}

type View = 'list' | 'create' | 'detail' | 'edit';

interface EmployeeMap {
  [id: string]: string;
}

export function GlobalMobilityModule({ companyId }: Props) {
  const mobility = useGlobalMobility(companyId);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<MobilityAssignment | null>(null);
  const [expiringDocs, setExpiringDocs] = useState<MobilityDocument[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employeeMap, setEmployeeMap] = useState<EmployeeMap>({});

  // Load employee names for display
  useEffect(() => {
    supabase
      .from('erp_hr_employees')
      .select('id, first_name, last_name')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .then(({ data }) => {
        const map: EmployeeMap = {};
        (data || []).forEach((e: any) => { map[e.id] = `${e.last_name}, ${e.first_name}`; });
        setEmployeeMap(map);
      });
  }, [companyId]);

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
  }, [selected, mobility.updateAssignment]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await mobility.deleteAssignment(id);
    if (result) {
      setSelected(null);
      setView('list');
    }
  }, [mobility.deleteAssignment]);

  const handleStatusChange = useCallback(async (id: string, status: AssignmentStatus) => {
    await mobility.updateStatus(id, status);
    if (selected?.id === id) {
      const updated = mobility.assignments.find(a => a.id === id);
      if (updated) setSelected(updated);
    }
  }, [mobility.updateStatus, selected, mobility.assignments]);

  const renderAssignmentView = () => {
    switch (view) {
      case 'create':
        return (
          <MobilityAssignmentForm
            onSubmit={handleCreate}
            onCancel={() => setView('list')}
            companyId={companyId}
          />
        );
      case 'edit':
        return selected ? (
          <MobilityAssignmentForm
            initial={selected}
            onSubmit={handleUpdate}
            onCancel={() => setView('detail')}
            isEditing
            companyId={companyId}
          />
        ) : null;
      case 'detail':
        return selected ? (
          <MobilityAssignmentDetail
            assignment={selected}
            onBack={() => { setView('list'); setSelected(null); }}
            onStatusChange={handleStatusChange}
            onEdit={() => setView('edit')}
            onDelete={handleDelete}
            fetchDocuments={mobility.fetchDocuments}
            addDocument={mobility.addDocument}
            updateDocument={mobility.updateDocument}
            fetchCostProjection={mobility.fetchCostProjection}
            upsertCostProjection={mobility.upsertCostProjection}
            fetchAuditLog={mobility.fetchAuditLog}
            validTransitions={mobility.VALID_TRANSITIONS}
            employeeName={employeeMap[selected.employee_id]}
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
            employeeMap={employeeMap}
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
          <TabsTrigger value="operations" className="text-xs">Operaciones</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">Asignaciones</TabsTrigger>
          <TabsTrigger value="packs" className="text-xs">Knowledge Packs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <MobilityDashboard
            stats={mobility.stats}
            expiringDocs={expiringDocs}
            loading={mobility.loading}
          />
        </TabsContent>

        <TabsContent value="operations">
          <MobilityPortfolioPanel
            companyId={companyId}
            employeeMap={employeeMap}
            onSelectAssignment={(assignmentId) => {
              const assignment = mobility.assignments.find(a => a.id === assignmentId);
              if (assignment) {
                setSelected(assignment);
                setView('detail');
                setActiveTab('assignments');
              }
            }}
          />
        </TabsContent>

        <TabsContent value="assignments">
          {renderAssignmentView()}
        </TabsContent>

        <TabsContent value="packs">
          <CorridorPackAdminPanel companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
