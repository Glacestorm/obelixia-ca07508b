/**
 * ExpedientMovilidadTab — International mobility assignments for an employee
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Plane, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HRStatusBadge } from '../../shared/HRStatusBadge';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

interface AssignmentSummary {
  id: string;
  home_country_code: string;
  host_country_code: string;
  assignment_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  compensation_approach: string;
  split_payroll: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  long_term: 'Largo plazo',
  short_term: 'Corto plazo',
  commuter: 'Commuter',
  permanent_transfer: 'Traslado permanente',
  business_travel_extended: 'Viaje negocio ext.',
  rotational: 'Rotacional',
};

export function ExpedientMovilidadTab({ employeeId, companyId, onNavigate }: Props) {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('hr_mobility_assignments')
        .select('id, home_country_code, host_country_code, assignment_type, status, start_date, end_date, compensation_approach, split_payroll')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });
      setAssignments((data || []) as unknown as AssignmentSummary[]);
      setLoading(false);
    };
    load();
  }, [employeeId, companyId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Movilidad Internacional</span>
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('mobility-dashboard')}>
              Ver movilidad global
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Cargando...</p>
        ) : assignments.length === 0 ? (
          <div className="text-center py-6">
            <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sin asignaciones internacionales</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onNavigate?.('mobility-assignments')}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{a.home_country_code} → {a.host_country_code}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABELS[a.assignment_type] || a.assignment_type} · {a.start_date}{a.end_date ? ` → ${a.end_date}` : ''}
                    {a.split_payroll && ' · Split payroll'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
