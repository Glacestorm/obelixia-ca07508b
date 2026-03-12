/**
 * ExpedientMovilidadTab — International mobility assignments
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientMovilidadTab({ employeeId, companyId, onNavigate }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Movilidad Internacional</span>
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('mobility-dashboard')}>
              Ver movilidad
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Asignaciones internacionales, immigration y tax equalization</p>
        </div>
      </CardContent>
    </Card>
  );
}
