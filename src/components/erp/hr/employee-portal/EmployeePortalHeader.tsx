/**
 * EmployeePortalHeader — Desktop header (modernized)
 * RRHH-PORTAL.2 Block A: Visual redesign
 */
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface Props {
  employeeName?: string;
  onSignOut: () => void;
}

export function EmployeePortalHeader({ employeeName, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border/50 bg-card/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
          <span className="text-xs font-bold text-primary-foreground">MP</span>
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">Mi Portal</p>
          <p className="text-[11px] text-muted-foreground hidden sm:block">Portal del Empleado</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {employeeName && (
          <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[200px]">{employeeName}</span>
        )}
        <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
