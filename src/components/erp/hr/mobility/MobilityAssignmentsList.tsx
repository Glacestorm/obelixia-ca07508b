/**
 * MobilityAssignmentsList — Filterable list of mobility assignments
 * H1.0: Show employee names instead of truncated UUIDs
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plane, Plus, ChevronRight } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import type { MobilityAssignment, AssignmentFilters, AssignmentStatus, AssignmentType } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  assignments: MobilityAssignment[];
  loading: boolean;
  onSelect: (assignment: MobilityAssignment) => void;
  onCreate: () => void;
  onFilter: (filters: AssignmentFilters) => void;
}

const TYPE_LABELS: Record<string, string> = {
  long_term: 'Largo plazo',
  short_term: 'Corto plazo',
  commuter: 'Commuter',
  permanent_transfer: 'Traslado permanente',
  business_travel_extended: 'Viaje negocio ext.',
  rotational: 'Rotacional',
};

const APPROACH_LABELS: Record<string, string> = {
  tax_equalization: 'Tax Eq.',
  tax_protection: 'Tax Prot.',
  laissez_faire: 'Laissez-faire',
  ad_hoc: 'Ad hoc',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-700',
  medium: 'bg-amber-500/15 text-amber-700',
  high: 'bg-orange-500/15 text-orange-700',
  critical: 'bg-red-500/15 text-red-700',
};

export function MobilityAssignmentsList({ assignments, loading, onSelect, onCreate, onFilter }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  // Load employee names for all assignments
  useEffect(() => {
    const employeeIds = [...new Set(assignments.map(a => a.employee_id))];
    if (employeeIds.length === 0) return;

    const loadNames = async () => {
      try {
        const { data } = await supabase
          .from('erp_hr_employees' as any)
          .select('id, first_name, last_name')
          .in('id', employeeIds);
        if (data) {
          const map: Record<string, string> = {};
          (data as any[]).forEach(e => { map[e.id] = `${e.first_name} ${e.last_name}`; });
          setEmployeeNames(map);
        }
      } catch { /* ignore */ }
    };
    loadNames();
  }, [assignments]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    onFilter({
      status: val === 'all' ? undefined : val as AssignmentStatus,
      assignment_type: typeFilter === 'all' ? undefined : typeFilter as AssignmentType,
    });
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    onFilter({
      status: statusFilter === 'all' ? undefined : statusFilter as AssignmentStatus,
      assignment_type: val === 'all' ? undefined : val as AssignmentType,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" /> Asignaciones Internacionales
          </CardTitle>
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nueva asignación
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="planned">Planificada</SelectItem>
              <SelectItem value="pre_assignment">Pre-asignación</SelectItem>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="extending">Extensión</SelectItem>
              <SelectItem value="repatriating">Repatriación</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Cargando...</p>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8">
            <Plane className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay asignaciones</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => (
              <div
                key={a.id}
                onClick={() => onSelect(a)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {employeeNames[a.employee_id] || a.employee_id.slice(0, 8) + '...'}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0 rounded border ${RISK_COLORS[a.risk_level]}`}>
                      {a.risk_level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.home_country_code} → {a.host_country_code} · {TYPE_LABELS[a.assignment_type] || a.assignment_type} · {APPROACH_LABELS[a.compensation_approach] || ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.start_date}{a.end_date ? ` → ${a.end_date}` : ' → indefinido'}
                    {a.split_payroll && ' · Split payroll'}
                    {a.shadow_payroll && ' · Shadow'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <HRStatusBadge entity="mobility" status={a.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
