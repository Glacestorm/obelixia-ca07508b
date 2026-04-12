/**
 * EmployeePortalShell — Shell principal del portal del empleado
 * RRHH-MOBILE.1: Branch mobile/desktop using useIsMobile()
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeePortal } from '@/hooks/erp/hr/useEmployeePortal';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmployeePortalMobileShell } from './EmployeePortalMobileShell';
import { EmployeePortalNav, type PortalSection } from './EmployeePortalNav';
import { EmployeePortalHome } from './EmployeePortalHome';
import { EmployeePortalHeader } from './EmployeePortalHeader';
import { EmployeeDocumentsSection } from './EmployeeDocumentsSection';
import { EmployeeCertificatesSection } from './EmployeeCertificatesSection';
import { EmployeePayslipsSection } from './EmployeePayslipsSection';
import { EmployeeRequestsSection } from './EmployeeRequestsSection';
import { EmployeeTimeSection } from './EmployeeTimeSection';
import { EmployeeProfileSection } from './EmployeeProfileSection';
import { EmployeeHelpSection } from './EmployeeHelpSection';
import { EmployeeLeaveSection } from './EmployeeLeaveSection';
import { EmployeeNotificationsSection } from './EmployeeNotificationsSection';

export function EmployeePortalShell() {
  const isMobile = useIsMobile();

  // On mobile, render the dedicated mobile shell
  if (isMobile) {
    return <EmployeePortalMobileShell />;
  }

  // Desktop: original layout
  return <EmployeePortalDesktopShell />;
}

function EmployeePortalDesktopShell() {
  const { signOut } = useAuth();
  const { employee, dashboard, isDashboardLoading, refresh } = useEmployeePortal();
  const [activeSection, setActiveSection] = useState<PortalSection>('home');
  const [collapsed, setCollapsed] = useState(false);

  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : undefined;

  const handleNavigate = useCallback((section: PortalSection) => {
    setActiveSection(section);
  }, []);

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
      case 'certificates':
        return <EmployeeCertificatesSection employee={employee} />;
      case 'payslips':
        return <EmployeePayslipsSection employee={employee} onNavigate={handleNavigate} />;
      case 'requests':
        return <EmployeeRequestsSection employee={employee} onNavigate={handleNavigate} />;
      case 'time':
        return <EmployeeTimeSection employee={employee} onNavigate={handleNavigate} />;
      case 'leave':
        return <EmployeeLeaveSection employee={employee} onNavigate={handleNavigate} />;
      case 'notifications':
        return <EmployeeNotificationsSection employee={employee} onNavigate={handleNavigate} />;
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
      <EmployeePortalHeader employeeName={employeeName} onSignOut={signOut} />
      <div className="flex flex-1 overflow-hidden">
        <EmployeePortalNav
          activeSection={activeSection}
          onNavigate={handleNavigate}
          employeeName={employeeName}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
