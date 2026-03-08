import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, FolderOpen, TrendingDown, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalDashboard({ companyId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Dashboard — Consultoría Eléctrica
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vista ejecutiva de expedientes, ahorros y estado de optimizaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expedientes en curso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <FolderOpen className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">3 nuevos esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ahorro total estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingDown className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">€15.420</p>
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12% vs mes anterior
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informes completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">27</p>
                <p className="text-xs text-muted-foreground">5 pendientes de entrega</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expedientes recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes recientes</CardTitle>
          <CardDescription>Últimos expedientes creados o actualizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { ref: 'EXP-2026-001', cliente: 'Empresa ABC S.L.', cups: 3, estado: 'En análisis', ahorro: '€2.340' },
              { ref: 'EXP-2026-002', cliente: 'García Martínez, Juan', cups: 1, estado: 'Informe generado', ahorro: '€180' },
              { ref: 'EXP-2026-003', cliente: 'Industrial Norte S.A.', cups: 8, estado: 'Pendiente docs', ahorro: '-' },
              { ref: 'EXP-2026-004', cliente: 'Hotel Costa Brava', cups: 2, estado: 'Seguimiento', ahorro: '€4.100' },
            ].map((exp) => (
              <div key={exp.ref} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-yellow-500/10">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{exp.ref}</p>
                    <p className="text-xs text-muted-foreground">{exp.cliente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">{exp.cups} CUPS</Badge>
                  <Badge 
                    variant={exp.estado === 'Pendiente docs' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {exp.estado}
                  </Badge>
                  <span className="text-sm font-medium text-emerald-600 min-w-[60px] text-right">{exp.ahorro}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalDashboard;
