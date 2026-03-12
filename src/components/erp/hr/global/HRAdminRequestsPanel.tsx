/**
 * HRAdminRequestsPanel — Solicitudes administrativas genéricas
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';

interface Props { companyId: string; }

const DEMO_REQUESTS = [
  { id: '1', employee: 'Laura Fernández', type: 'Certificado empresa', status: 'pending', date: '2026-03-10' },
  { id: '2', employee: 'Javier Moreno', type: 'Cambio datos bancarios', status: 'approved', date: '2026-03-08' },
  { id: '3', employee: 'Sara Díaz', type: 'Vida laboral', status: 'reviewing', date: '2026-03-09' },
  { id: '4', employee: 'Miguel Torres', type: 'Permiso especial', status: 'denied', date: '2026-03-07' },
];

export function HRAdminRequestsPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-500" /> Solicitudes Administrativas
          </h3>
          <p className="text-sm text-muted-foreground">Certificados, cambios de datos, permisos especiales</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nueva solicitud</Button>
      </div>

      <div className="grid gap-3">
        {DEMO_REQUESTS.map(req => (
          <Card key={req.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{req.employee}</p>
                  <p className="text-xs text-muted-foreground">{req.type} · {req.date}</p>
                </div>
              </div>
              <HRStatusBadge entity="request" status={req.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
