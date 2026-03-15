/**
 * EmployeePortalBottomNav — Bottom tab bar for mobile portal
 * RRHH-MOBILE.1 Phase 1: 5 tabs with badges
 * RRHH-MOBILE.1 Phase 5: Role-aware extensible tab system
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Home, FileText, Send, Clock, User, Users, Settings } from 'lucide-react';
import { type PortalSection } from './EmployeePortalNav';
import { type PortalRole } from '@/hooks/erp/hr/usePortalRole';

export type MobileTab = 'home' | 'payslips' | 'requests' | 'time' | 'profile' | 'team' | 'management';

interface TabDef {
  id: MobileTab;
  portalSection: PortalSection;
  label: string;
  icon: React.ElementType;
  /** Roles that can see this tab */
  roles: PortalRole[];
}

/**
 * Full tab registry — tabs are filtered by role at render time.
 * Adding a new tab for manager/hr_light only requires adding an entry here
 * and its corresponding PortalSection + content in the shell.
 */
const TAB_REGISTRY: TabDef[] = [
  { id: 'home', portalSection: 'home', label: 'Inicio', icon: Home, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'payslips', portalSection: 'payslips', label: 'Nóminas', icon: FileText, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'requests', portalSection: 'requests', label: 'Solicitudes', icon: Send, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'time', portalSection: 'time', label: 'Tiempo', icon: Clock, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'profile', portalSection: 'profile', label: 'Perfil', icon: User, roles: ['employee', 'manager', 'hr_light'] },
  // ── Future Phase 2: Manager ──
  // { id: 'team', portalSection: 'team' as PortalSection, label: 'Equipo', icon: Users, roles: ['manager'] },
  // ── Future Phase 3: HR Light ──
  // { id: 'management', portalSection: 'management' as PortalSection, label: 'Gestión', icon: Settings, roles: ['hr_light'] },
];

// Map portal sections to their parent mobile tab
const SECTION_TO_TAB: Record<string, MobileTab> = {
  home: 'home',
  payslips: 'payslips',
  documents: 'home',
  requests: 'requests',
  time: 'time',
  leave: 'time',
  profile: 'profile',
  help: 'profile',
  // Future:
  // team: 'team',
  // management: 'management',
};

interface Props {
  activeSection: PortalSection;
  onNavigate: (section: PortalSection) => void;
  badges?: {
    requests?: number;
    time?: number;
    team?: number;
  };
  /** Current portal role — defaults to 'employee' */
  role?: PortalRole;
}

export function EmployeePortalBottomNav({ activeSection, onNavigate, badges, role = 'employee' }: Props) {
  const activeTab = SECTION_TO_TAB[activeSection] || 'home';

  const visibleTabs = useMemo(
    () => TAB_REGISTRY.filter(tab => tab.roles.includes(role)),
    [role]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-stretch h-16">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount =
            tab.id === 'requests' ? badges?.requests :
            tab.id === 'time' ? badges?.time :
            tab.id === 'team' ? badges?.team :
            undefined;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.portalSection)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors min-h-[48px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                {!!badgeCount && badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
