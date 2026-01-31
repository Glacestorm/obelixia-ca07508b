/**
 * Módulo de Recursos Humanos - HRModule
 * Gestión integral: nóminas, vacaciones, contratos, finiquitos, departamentos
 * Base de conocimiento laboral + Agente IA + Noticias RRHH
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Building2, 
  Brain,
  Newspaper,
  BookOpen,
  HelpCircle,
  Rocket,
  Shield,
  Calculator,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  HeartHandshake
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp';
import { HRDashboardPanel } from './HRDashboardPanel';
import { HRPayrollPanel } from './HRPayrollPanel';
import { HRVacationsPanel } from './HRVacationsPanel';
import { HRContractsPanel } from './HRContractsPanel';
import { HRDepartmentsPanel } from './HRDepartmentsPanel';
import { HRAIAgentPanel } from './HRAIAgentPanel';
import { HRNewsPanel } from './HRNewsPanel';
import { HRKnowledgeUploader } from './HRKnowledgeUploader';
import { HRHelpPanel } from './HRHelpPanel';
import { HRTrends2026Panel } from './HRTrends2026Panel';
import { HRSafetyPanel } from './HRSafetyPanel';
import { cn } from '@/lib/utils';

export function HRModule() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { currentCompany } = useERPContext();
  const demoCompanyId = currentCompany?.id || 'demo-company-id';

  // Stats simuladas - en producción vendrían de hooks
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeContracts: 0,
    pendingVacations: 0,
    pendingPayrolls: 0,
    expiringContracts: 0,
    safetyAlerts: 0
  });

  useEffect(() => {
    // Simular carga de estadísticas
    setStats({
      totalEmployees: 47,
      activeContracts: 45,
      pendingVacations: 8,
      pendingPayrolls: 3,
      expiringContracts: 2,
      safetyAlerts: 1
    });
  }, [demoCompanyId]);

  return (
    <div className="space-y-4">
      {/* Header con estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Empleados</p>
                <p className="text-lg font-bold">{stats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Contratos</p>
                <p className="text-lg font-bold">{stats.activeContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vacaciones</p>
                <p className="text-lg font-bold">{stats.pendingVacations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Nóminas</p>
                <p className="text-lg font-bold">{stats.pendingPayrolls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vencimientos</p>
                <p className="text-lg font-bold">{stats.expiringContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Seguridad</p>
                <p className="text-lg font-bold">{stats.safetyAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegación por tabs */}
      <Tabs value={activeModule} onValueChange={setActiveModule}>
        <TabsList className="grid w-full max-w-7xl grid-cols-11">
          <TabsTrigger value="dashboard" className="gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            Nóminas
            {stats.pendingPayrolls > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {stats.pendingPayrolls}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vacations" className="gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            Vacaciones
            {stats.pendingVacations > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {stats.pendingVacations}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1 text-xs">
            <FileText className="h-3 w-3" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1 text-xs">
            <Building2 className="h-3 w-3" />
            Organización
          </TabsTrigger>
          <TabsTrigger value="safety" className="gap-1 text-xs">
            <Shield className="h-3 w-3" />
            Seguridad
            {stats.safetyAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {stats.safetyAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-1 text-xs">
            <Brain className="h-3 w-3" />
            Agente IA
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1 text-xs">
            <Newspaper className="h-3 w-3" />
            Noticias
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1 text-xs">
            <BookOpen className="h-3 w-3" />
            Normativa
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-1 text-xs">
            <HelpCircle className="h-3 w-3" />
            Ayuda
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1 text-xs">
            <Rocket className="h-3 w-3" />
            2026+
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="dashboard" className="m-0">
            <HRDashboardPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="payroll" className="m-0">
            <HRPayrollPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="vacations" className="m-0">
            <HRVacationsPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="contracts" className="m-0">
            <HRContractsPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="departments" className="m-0">
            <HRDepartmentsPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="safety" className="m-0">
            <HRSafetyPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="agent" className="m-0">
            <HRAIAgentPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="news" className="m-0">
            <HRNewsPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="knowledge" className="m-0">
            <HRKnowledgeUploader companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="help" className="m-0">
            <HRHelpPanel companyId={demoCompanyId} />
          </TabsContent>

          <TabsContent value="trends" className="m-0">
            <HRTrends2026Panel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default HRModule;
