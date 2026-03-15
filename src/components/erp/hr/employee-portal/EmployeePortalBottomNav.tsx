/**
 * EmployeePortalBottomNav — Modern bottom tab bar
 * RRHH-PORTAL.2 Block F: Navegación moderna mobile-first
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
  roles: PortalRole[];
}

const TAB_REGISTRY: TabDef[] = [
  { id: 'home', portalSection: 'home', label: 'Inicio', icon: Home, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'payslips', portalSection: 'payslips', label: 'Nóminas', icon: FileText, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'requests', portalSection: 'requests', label: 'Solicitudes', icon: Send, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'time', portalSection: 'time', label: 'Tiempo', icon: Clock, roles: ['employee', 'manager', 'hr_light'] },
  { id: 'profile', portalSection: 'profile', label: 'Perfil', icon: User, roles: ['employee', 'manager', 'hr_light'] },
];

const SECTION_TO_TAB: Record<string, MobileTab> = {
  home: 'home',
  payslips: 'payslips',
  documents: 'home',
  requests: 'requests',
  time: 'time',
  leave: 'time',
  profile: 'profile',
  help: 'profile',
};

interface Props {
  activeSection: PortalSection;
  onNavigate: (section: PortalSection) => void;
  badges?: {
    requests?: number;
    time?: number;
    team?: number;
  };
  role?: PortalRole;
}

export function EmployeePortalBottomNav({ activeSection, onNavigate, badges, role = 'employee' }: Props) {
  const activeTab = SECTION_TO_TAB[activeSection] || 'home';

  const visibleTabs = useMemo(
    () => TAB_REGISTRY.filter(tab => tab.roles.includes(role)),
    [role]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/98 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-stretch h-[60px]">
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
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 min-h-[48px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/60 active:text-foreground'
              )}
            >
              <div className="relative">
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200',
                  isActive && 'bg-primary/10'
                )}>
                  <Icon className={cn('h-[18px] w-[18px] transition-all', isActive && 'stroke-[2.5]')} />
                </div>
                {!!badgeCount && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] leading-tight transition-all',
                isActive ? 'font-bold' : 'font-medium'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
