/**
 * EmployeePortalBottomNav — Bottom tab bar for mobile portal
 * RRHH-MOBILE.1 Phase 1: 5 tabs with badges
 */
import { cn } from '@/lib/utils';
import { Home, FileText, Send, Clock, User } from 'lucide-react';
import { type PortalSection } from './EmployeePortalNav';

export type MobileTab = 'home' | 'payslips' | 'requests' | 'time' | 'profile';

const MOBILE_TABS: Array<{
  id: MobileTab;
  portalSection: PortalSection;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'home', portalSection: 'home', label: 'Inicio', icon: Home },
  { id: 'payslips', portalSection: 'payslips', label: 'Nóminas', icon: FileText },
  { id: 'requests', portalSection: 'requests', label: 'Solicitudes', icon: Send },
  { id: 'time', portalSection: 'time', label: 'Tiempo', icon: Clock },
  { id: 'profile', portalSection: 'profile', label: 'Perfil', icon: User },
];

// Map portal sections to their parent mobile tab
const SECTION_TO_TAB: Record<PortalSection, MobileTab> = {
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
  };
}

export function EmployeePortalBottomNav({ activeSection, onNavigate, badges }: Props) {
  const activeTab = SECTION_TO_TAB[activeSection] || 'home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-stretch h-16">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = tab.id === 'requests' ? badges?.requests : tab.id === 'time' ? badges?.time : undefined;

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
