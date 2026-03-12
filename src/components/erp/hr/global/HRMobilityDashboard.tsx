/**
 * HRMobilityDashboard — Global Mobility overview
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Plane, FileText, DollarSign, Users } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';

interface Props { companyId: string; }

const DEMO_ASSIGNMENTS = [
  { id: '1', employee: 'James Wilson', home: 'ES', host: 'DE', type: 'Long-term', start: '2025-09', end: '2027-09', status: 'active' },
  { id: '2', employee: 'María García', home: 'ES', host: 'FR', type: 'Short-term', start: '2026-01', end: '2026-06', status: 'active' },
  { id: '3', employee: 'Chen Wei', home: 'CN', host: 'ES', type: 'Commuter', start: '2026-03', end: '2026-12', status: 'planned' },
  { id: '4', employee: 'Anna Müller', home: 'DE', host: 'ES', type: 'Permanent transfer', start: '2024-06', end: null, status: 'active' },
];

const STATS = [
  { label: 'Asignaciones activas', value: 3, icon: Users, color: 'text-emerald-600' },
  { label: 'Países involucrados', value: 4, icon: Globe, color: 'text-blue-600' },
  { label: 'Visados por renovar', value: 2, icon: FileText, color: 'text-amber-600' },
  { label: 'Coste mensual', value: '€24.5K', icon: DollarSign, color: 'text-violet-600' },
];

export function HRMobilityDashboard({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-500" /> Global Mobility Dashboard
        </h3>
        <p className="text-sm text-muted-foreground">Asignaciones internacionales, expatriados y movilidad</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map(s => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" /> Asignaciones Internacionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEMO_ASSIGNMENTS.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-medium">{a.employee}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.home} → {a.host} · {a.type} · {a.start}{a.end ? ` → ${a.end}` : ' → indefinido'}
                  </p>
                </div>
                <HRStatusBadge entity="mobility" status={a.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
