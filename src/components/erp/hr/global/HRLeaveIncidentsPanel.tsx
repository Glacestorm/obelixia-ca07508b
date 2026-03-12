/**
 * HRLeaveIncidentsPanel — Gestión de incidencias de ausencia
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';

interface Props { companyId: string; }

const DEMO_INCIDENTS = [
  { id: '1', employee: 'María López', type: 'Baja médica', start: '2026-03-01', end: '2026-03-15', status: 'in_progress' },
  { id: '2', employee: 'Carlos García', type: 'Accidente laboral', start: '2026-03-05', end: null, status: 'open' },
  { id: '3', employee: 'Ana Martín', type: 'Maternidad', start: '2026-02-01', end: '2026-06-01', status: 'in_progress' },
  { id: '4', employee: 'Pedro Ruiz', type: 'Permiso retribuido', start: '2026-03-10', end: '2026-03-12', status: 'resolved' },
];

export function HRLeaveIncidentsPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Incidencias de Ausencia
          </h3>
          <p className="text-sm text-muted-foreground">Bajas médicas, maternidad, accidentes y permisos</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nueva incidencia</Button>
      </div>

      <div className="grid gap-3">
        {DEMO_INCIDENTS.map(inc => (
          <Card key={inc.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{inc.employee}</p>
                  <p className="text-xs text-muted-foreground">{inc.type} · {inc.start}{inc.end ? ` → ${inc.end}` : ' → en curso'}</p>
                </div>
              </div>
              <HRStatusBadge entity="incident" status={inc.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
