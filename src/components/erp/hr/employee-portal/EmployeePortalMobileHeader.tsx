/**
 * EmployeePortalMobileHeader — Modern compact mobile header
 * RRHH-PORTAL.2 Block A: Rediseño visual premium
 */
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, HelpCircle, LogOut, Smartphone, FolderOpen } from 'lucide-react';
import { type PortalSection } from './EmployeePortalNav';
import { type DashboardSummary } from '@/hooks/erp/hr/useEmployeePortal';
import { ActivitySheet } from './ActivitySheet';

interface Props {
  employeeName?: string;
  dashboard?: DashboardSummary | null;
  onSignOut: () => void;
  onNavigate: (section: PortalSection) => void;
}

export function EmployeePortalMobileHeader({ employeeName, dashboard, onSignOut, onNavigate }: Props) {
  const initials = employeeName
    ? employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <header className="sticky top-0 z-40 h-13 border-b border-border/50 bg-card/95 backdrop-blur-xl px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
          <span className="text-[10px] font-bold text-primary-foreground">MP</span>
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight">Mi Portal</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <ActivitySheet dashboard={dashboard ?? null} onNavigate={onNavigate} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{initials}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            {employeeName && (
              <>
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold truncate">{employeeName}</p>
                  <p className="text-[11px] text-muted-foreground">Portal del Empleado</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onNavigate('profile')} className="gap-2.5 py-2.5">
              <User className="h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('documents')} className="gap-2.5 py-2.5">
              <FolderOpen className="h-4 w-4" />
              Mis documentos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('help')} className="gap-2.5 py-2.5">
              <HelpCircle className="h-4 w-4" />
              Ayuda RRHH
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="gap-2.5 py-2.5 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
