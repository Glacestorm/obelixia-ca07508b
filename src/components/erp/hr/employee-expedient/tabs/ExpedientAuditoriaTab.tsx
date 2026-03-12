/**
 * ExpedientAuditoriaTab — Immutable audit timeline for the employee
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientAuditoriaTab({ employeeId, companyId, onNavigate }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Auditoría del Expediente</span>
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('audit-trail')}>
              Auditoría completa
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Timeline inmutable de todos los cambios en el expediente de este empleado</p>
        </div>
      </CardContent>
    </Card>
  );
}
