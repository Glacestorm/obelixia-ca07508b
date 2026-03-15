/**
 * EmployeePortalMobileShell — Mobile-first layout for employee portal
 * RRHH-MOBILE.1 Phase 1: Header + content + bottom tabs
 * RRHH-MOBILE.1 Phase 3: PWA install prompt + offline indicator
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeePortal } from '@/hooks/erp/hr/useEmployeePortal';
import { EmployeePortalMobileHeader } from './EmployeePortalMobileHeader';
import { EmployeePortalBottomNav } from './EmployeePortalBottomNav';
import { EmployeePortalHome } from './EmployeePortalHome';
import { EmployeeDocumentsSection } from './EmployeeDocumentsSection';
import { EmployeePayslipsSection } from './EmployeePayslipsSection';
import { EmployeeRequestsSection } from './EmployeeRequestsSection';
import { EmployeeTimeSection } from './EmployeeTimeSection';
import { EmployeeLeaveSection } from './EmployeeLeaveSection';
import { EmployeeProfileSection } from './EmployeeProfileSection';
import { EmployeeHelpSection } from './EmployeeHelpSection';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';
import { type PortalSection } from './EmployeePortalNav';

export function EmployeePortalMobileShell() {
  const { signOut } = useAuth();
  const { employee, dashboard, isDashboardLoading, refresh } = useEmployeePortal();
  const [activeSection, setActiveSection] = useState<PortalSection>('home');

  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : undefined;

  const handleNavigate = useCallback((section: PortalSection) => {
    setActiveSection(section);
    // Scroll to top on section change
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const badges = {
    requests: dashboard?.pendingRequests || 0,
    time: dashboard?.activeIncidents || 0,
  };

  const renderContent = () => {
    if (!employee) return null;

    switch (activeSection) {
      case 'home':
        return (
          <EmployeePortalHome
            employee={employee}
            dashboard={dashboard}
            isDashboardLoading={isDashboardLoading}
            onNavigate={handleNavigate}
          />
        );
      case 'documents':
        return <EmployeeDocumentsSection employee={employee} />;
      case 'payslips':
        return <EmployeePayslipsSection employee={employee} onNavigate={handleNavigate} />;
      case 'requests':
        return <EmployeeRequestsSection employee={employee} onNavigate={handleNavigate} />;
      case 'time':
        return <EmployeeTimeSection employee={employee} onNavigate={handleNavigate} />;
      case 'leave':
        return <EmployeeLeaveSection employee={employee} onNavigate={handleNavigate} />;
      case 'profile':
        return <EmployeeProfileSection employee={employee} onNavigate={handleNavigate} onRefresh={refresh} />;
      case 'help':
        return <EmployeeHelpSection employee={employee} dashboard={dashboard} onNavigate={handleNavigate} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EmployeePortalMobileHeader
        employeeName={employeeName}
        onSignOut={signOut}
        onNavigate={handleNavigate}
      />
      <OfflineIndicator />
      <main className="flex-1 overflow-auto pb-20">
        <div className="px-3 py-3">
          {renderContent()}
        </div>
      </main>
      <EmployeePortalBottomNav
        activeSection={activeSection}
        onNavigate={handleNavigate}
        badges={badges}
      />
      <PWAInstallPrompt />
    </div>
  );
}
