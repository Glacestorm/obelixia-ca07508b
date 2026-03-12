/**
 * ExpedientTrayectoriaTab — Job assignment history timeline
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  employeeId: string;
  companyId: string;
}

interface JobAssignment {
  id: string;
  position_title: string;
  department_name?: string;
  start_date: string;
  end_date?: string;
  assignment_type: string;
  is_current: boolean;
}

export function ExpedientTrayectoriaTab({ employeeId, companyId }: Props) {
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await (supabase
          .from('hr_job_assignments')
          .select('*')
          .eq('employee_id', employeeId)
          .order('start_date', { ascending: false }) as any);
        if (data) setAssignments(data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [employeeId]);

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando trayectoria...</CardContent></Card>;
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sin historial de asignaciones registrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" /> Trayectoria Profesional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {assignments.map((a, i) => (
              <div key={a.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 ${a.is_current ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'}`} />

                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.position_title || 'Sin puesto'}</p>
                      {a.department_name && (
                        <p className="text-xs text-muted-foreground">{a.department_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.is_current ? 'default' : 'outline'} className="text-xs">
                        {a.assignment_type || 'assignment'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(a.start_date).toLocaleDateString()}
                    <ArrowRight className="h-3 w-3" />
                    {a.end_date ? new Date(a.end_date).toLocaleDateString() : 'Actual'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
