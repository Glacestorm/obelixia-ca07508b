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
  const { employee } = useEmployeePortal();
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
        return <EmployeePortalHome employee={employee} onNavigate={handleNavigate} />;
      case 'payslips':
        return <PlaceholderSection title="Mis Nóminas" description="Consulta y descarga tus recibos de nómina. Módulo en preparación para V2-ES.9.2." />;
      case 'documents':
        return <PlaceholderSection title="Mis Documentos" description="Accede a tu expediente documental personal. Módulo en preparación para V2-ES.9.3." />;
      case 'requests':
        return <PlaceholderSection title="Mis Solicitudes" description="Envía y consulta solicitudes administrativas. Módulo en preparación para V2-ES.9.4." />;
      case 'time':
        return <PlaceholderSection title="Mi Tiempo" description="Fichaje, horarios y registro de jornada. Módulo en preparación para V2-ES.9.5." />;
      case 'leave':
        return <PlaceholderSection title="Vacaciones y Permisos" description="Solicita vacaciones, permisos y consulta tu saldo. Módulo en preparación para V2-ES.9.6." />;
      case 'profile':
        return <PlaceholderSection title="Mi Perfil" description="Consulta y actualiza tus datos personales. Módulo en preparación para V2-ES.9.7." />;
      case 'help':
        return <PlaceholderSection title="Ayuda RRHH" description="Preguntas frecuentes y contacto con RRHH. Módulo en preparación para V2-ES.9.8." />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <EmployeePortalHeader
        employeeName={employeeName}
        onSignOut={signOut}
      />

      {/* Main area: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <EmployeePortalNav
          activeSection={activeSection}
          onNavigate={handleNavigate}
          employeeName={employeeName}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
