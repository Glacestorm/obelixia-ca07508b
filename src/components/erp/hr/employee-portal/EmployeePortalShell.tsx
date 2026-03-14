/**
 * EmployeePortalShell — Shell principal del portal del empleado
 * Layout responsive con sidebar + content area
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeePortal } from '@/hooks/erp/hr/useEmployeePortal';
import { EmployeePortalNav, type PortalSection } from './EmployeePortalNav';
import { EmployeePortalHome } from './EmployeePortalHome';
import { EmployeePortalHeader } from './EmployeePortalHeader';
import { EmployeeDocumentsSection } from './EmployeeDocumentsSection';
import { EmployeePayslipsSection } from './EmployeePayslipsSection';
import { EmployeeRequestsSection } from './EmployeeRequestsSection';
import { EmployeeTimeSection } from './EmployeeTimeSection';
import { EmployeeProfileSection } from './EmployeeProfileSection';
import { EmployeeHelpSection } from './EmployeeHelpSection';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Construction className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </CardContent>
    </Card>
  );
}

export function EmployeePortalShell() {
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
      case 'payslips':
        return <EmployeePayslipsSection employee={employee} onNavigate={handleNavigate} />;
      case 'requests':
        return <EmployeeRequestsSection employee={employee} onNavigate={handleNavigate} />;
      case 'time':
        return <EmployeeTimeSection employee={employee} onNavigate={handleNavigate} />;
      case 'leave':
        return <PlaceholderSection title="Vacaciones y Permisos" description="Solicita vacaciones y consulta tu saldo. Módulo en preparación." />;
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
          <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
