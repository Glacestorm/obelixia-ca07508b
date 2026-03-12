/**
 * ExpedientTiempoTab — Time tracking, absences, generic leave
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientTiempoTab({ employeeId, companyId, onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('time-clock')}>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Fichajes</p>
            <p className="text-xs text-muted-foreground mt-1">Control horario diario</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('vacations')}>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-sm">Vacaciones y Ausencias</p>
            <p className="text-xs text-muted-foreground mt-1">Solicitudes y saldo</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('leave-incidents')}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="font-medium text-sm">Incidencias</p>
            <p className="text-xs text-muted-foreground mt-1">Bajas e incidencias de ausencia</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
