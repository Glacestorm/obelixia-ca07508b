/**
 * EmployeePortalHeader — Header del portal del empleado
 */
import { Button } from '@/components/ui/button';
import { LogOut, Building2 } from 'lucide-react';

interface Props {
  employeeName?: string;
  onSignOut: () => void;
}

export function EmployeePortalHeader({ employeeName, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold leading-none">Portal del Empleado</p>
          <p className="text-xs text-muted-foreground">Autoservicio RRHH</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {employeeName && (
          <span className="text-sm text-muted-foreground hidden md:inline">{employeeName}</span>
        )}
        <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-1.5 text-xs">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
