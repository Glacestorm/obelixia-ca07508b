/**
 * EmployeePortalMobileHeader — Compact mobile header
 * RRHH-MOBILE.1 Phase 1: Logo + title + avatar dropdown
 * RRHH-MOBILE.1 Phase 4: Activity bell with badge
 */
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, User, HelpCircle, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-40 h-12 border-b bg-card/90 backdrop-blur-md px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold">Mi Portal</span>
      </div>

      <div className="flex items-center gap-1">
        <ActivitySheet dashboard={dashboard ?? null} onNavigate={onNavigate} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {employeeName && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{employeeName}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onNavigate('documents')}>
              <User className="h-4 w-4 mr-2" />
              Mis documentos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('help')}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Ayuda RRHH
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
