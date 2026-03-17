/**
 * EmployeePortalNav — Navegación del portal del empleado
 * Mobile-first con sidebar colapsable
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  FileText,
  FolderOpen,
  Send,
  Clock,
  Palmtree,
  User,
  HelpCircle,
  Menu,
  ChevronLeft,
  Bell,
} from 'lucide-react';

export type PortalSection =
  | 'home'
  | 'payslips'
  | 'documents'
  | 'requests'
  | 'time'
  | 'leave'
  | 'notifications'
  | 'profile'
  | 'help';

interface NavItem {
  id: PortalSection;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: Home, description: 'Panel principal' },
  { id: 'payslips', label: 'Mis nóminas', icon: FileText, description: 'Recibos de nómina' },
  { id: 'documents', label: 'Mis documentos', icon: FolderOpen, description: 'Expediente personal' },
  { id: 'requests', label: 'Mis solicitudes', icon: Send, description: 'Solicitudes y trámites' },
  { id: 'time', label: 'Mi tiempo', icon: Clock, description: 'Fichaje y horario' },
  { id: 'leave', label: 'Vacaciones y permisos', icon: Palmtree, description: 'Ausencias y licencias' },
  { id: 'notifications', label: 'Alertas', icon: Bell, description: 'Pendientes y avisos' },
  { id: 'profile', label: 'Mi perfil', icon: User, description: 'Datos personales' },
  { id: 'help', label: 'Ayuda RRHH', icon: HelpCircle, description: 'Preguntas frecuentes' },
];

interface Props {
  activeSection: PortalSection;
  onNavigate: (section: PortalSection) => void;
  employeeName?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function NavContent({ activeSection, onNavigate, collapsed, onClose }: Props & { onClose?: () => void }) {
  return (
    <ScrollArea className="h-full">
      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'justify-start gap-3 h-auto py-2.5 px-3 text-left transition-colors',
                isActive && 'bg-primary/10 text-primary font-medium border border-primary/20',
                collapsed && 'justify-center px-2'
              )}
              onClick={() => {
                onNavigate(item.id);
                onClose?.();
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm truncate">{item.label}</span>
                  <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                </div>
              )}
            </Button>
          );
        })}
      </nav>
    </ScrollArea>
  );
}

export function EmployeePortalNav({ activeSection, onNavigate, employeeName, collapsed = false, onToggleCollapse }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet trigger */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 pt-10">
            <div className="px-4 pb-3 border-b">
              <p className="font-semibold text-sm">Portal del Empleado</p>
              {employeeName && (
                <p className="text-xs text-muted-foreground truncate">{employeeName}</p>
              )}
            </div>
            <NavContent
              activeSection={activeSection}
              onNavigate={onNavigate}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r bg-card/50 backdrop-blur-sm transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center border-b px-3 h-14 shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">Portal del Empleado</p>
              {employeeName && (
                <p className="text-xs text-muted-foreground truncate">{employeeName}</p>
              )}
            </div>
          )}
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggleCollapse}>
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </Button>
          )}
        </div>

        <NavContent
          activeSection={activeSection}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </aside>
    </>
  );
}
