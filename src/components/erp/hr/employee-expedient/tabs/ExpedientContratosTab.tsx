/**
 * ExpedientContratosTab — Employee contracts (global, no ES-specific logic)
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

interface Contract {
  id: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  workday_type?: string;
  working_hours?: number;
  annual_salary?: number;
  country_code?: string;
}

export function ExpedientContratosTab({ employeeId, companyId, onNavigate }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await (supabase
          .from('erp_hr_contracts')
          .select('id, contract_type, start_date, end_date, is_active, workday_type, working_hours, annual_salary, country_code')
          .eq('employee_id', employeeId)
          .order('start_date', { ascending: false }) as any);
        if (data) setContracts(data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [employeeId]);

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando contratos...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Historial Contractual</span>
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('contracts')}>
              Ver todos
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sin contratos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <div key={c.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.contract_type}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.start_date).toLocaleDateString()}
                      <ArrowRight className="h-3 w-3" />
                      {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Indefinido'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.country_code && (
                      <Badge variant="outline" className="text-xs">{c.country_code}</Badge>
                    )}
                    <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs">
                      {c.is_active ? 'Vigente' : 'Finalizado'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  {c.workday_type && <span>Jornada: {c.workday_type}</span>}
                  {c.working_hours && <span>{c.working_hours}h/semana</span>}
                  {c.annual_salary && <span>{c.annual_salary.toLocaleString()} €/año</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
