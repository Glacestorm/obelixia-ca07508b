/**
 * ImprovementsTracker — Seguimiento de mejoras y plan de acción
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const SAMPLE_IMPROVEMENTS = [
  { id: '1', title: 'Implementar segregación de funciones en módulo financiero', priority: 'high', status: 'in_progress', progress: 65, dueDate: '2026-04-15' },
  { id: '2', title: 'Reforzar auditoría de accesos a datos sensibles RGPD', priority: 'critical', status: 'pending', progress: 20, dueDate: '2026-04-01' },
  { id: '3', title: 'Actualizar políticas de retención de logs a 2+ años', priority: 'medium', status: 'completed', progress: 100, dueDate: '2026-03-20' },
  { id: '4', title: 'Integrar continuous auditing en transacciones bancarias', priority: 'high', status: 'planned', progress: 0, dueDate: '2026-05-01' },
  { id: '5', title: 'Calibrar umbrales de confianza de agentes IA de auditoría', priority: 'medium', status: 'in_progress', progress: 40, dueDate: '2026-04-10' },
];

export function ImprovementsTracker() {
  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Plan de Mejoras de Auditoría</h3>
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 bg-amber-500/10">Datos de ejemplo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Hallazgos, acciones correctoras y seguimiento generados por AUDIT-AGT-005
          </p>
        </div>
        <Badge variant="outline">
          {SAMPLE_IMPROVEMENTS.filter(i => i.status === 'completed').length}/{SAMPLE_IMPROVEMENTS.length} completadas
        </Badge>
      </div>

      <div className="space-y-3">
        {SAMPLE_IMPROVEMENTS.map(item => (
          <Card key={item.id} className="border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  {statusIcon(item.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={priorityColor(item.priority) as any} className="text-[10px] h-5">{item.priority}</Badge>
                      <span className="text-[10px] text-muted-foreground">Vence: {item.dueDate}</span>
                    </div>
                    <Progress value={item.progress} className="h-1.5 mt-2" />
                  </div>
                </div>
                <span className="text-sm font-medium">{item.progress}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
