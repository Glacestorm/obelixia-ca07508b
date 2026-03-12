/**
 * ExpedientDesempenoTab — Performance evaluations, OKRs, feedback
 */
import { Card, CardContent } from '@/components/ui/card';
import { Target, MessageSquare, BarChart3 } from 'lucide-react';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientDesempenoTab({ employeeId, companyId, onNavigate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="cursor-pointer hover:border-primary/50" onClick={() => onNavigate?.('performance')}>
        <CardContent className="p-4 text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="font-medium text-sm">Evaluaciones</p>
          <p className="text-xs text-muted-foreground mt-1">Ciclos de revisión</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-medium text-sm">OKRs / Objetivos</p>
          <p className="text-xs text-muted-foreground mt-1">Seguimiento de metas</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-medium text-sm">Feedback 360°</p>
          <p className="text-xs text-muted-foreground mt-1">Evaluaciones multidireccionales</p>
        </CardContent>
      </Card>
    </div>
  );
}
