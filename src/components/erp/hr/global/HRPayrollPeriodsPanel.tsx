/**
 * HRPayrollPeriodsPanel — Gestión de períodos de nómina
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Lock, Unlock } from 'lucide-react';

interface Props { companyId: string; }

const DEMO_PERIODS = [
  { id: '1', entity: 'Empresa Principal S.L.', period: 'Marzo 2026', type: 'Mensual', status: 'open', employees: 45 },
  { id: '2', entity: 'Empresa Principal S.L.', period: 'Febrero 2026', type: 'Mensual', status: 'closed', employees: 44 },
  { id: '3', entity: 'Filial Portugal Lda.', period: 'Marzo 2026', type: 'Mensual', status: 'open', employees: 12 },
  { id: '4', entity: 'Empresa Principal S.L.', period: 'Enero 2026', type: 'Mensual', status: 'closed', employees: 43 },
];

export function HRPayrollPeriodsPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-500" /> Períodos de Nómina
          </h3>
          <p className="text-sm text-muted-foreground">Gestión de períodos por entidad legal</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo período</Button>
      </div>

      <div className="grid gap-3">
        {DEMO_PERIODS.map(p => (
          <Card key={p.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p.status === 'open' ? (
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Unlock className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-muted">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{p.period} — {p.entity}</p>
                  <p className="text-xs text-muted-foreground">{p.type} · {p.employees} empleados</p>
                </div>
              </div>
              <Badge variant={p.status === 'open' ? 'default' : 'secondary'}>
                {p.status === 'open' ? 'Abierto' : 'Cerrado'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
