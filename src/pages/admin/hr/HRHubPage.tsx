/**
 * HRHubPage — Hub principal del dominio RRHH
 * Ruta: /obelixia-admin/hr
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Shield, Calculator, FileText,
  Gavel, Building2, CreditCard, Brain,
  ArrowRight, Lock
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';

interface HRModuleCard {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  route: string;
  phase: string;
  available: boolean;
  badges?: string[];
}

const modules: HRModuleCard[] = [
  {
    id: 'audit',
    title: 'Auditoría & Compliance',
    description: 'Hallazgos ISO 9001/27001/45001, evidencias, informes y retención documental',
    icon: Shield,
    route: '/obelixia-admin/hr/audit',
    phase: 'Fase A',
    available: true,
    badges: ['ISO 9001', 'ISO 27001', 'ISO 45001'],
  },
  {
    id: 'it',
    title: 'Incapacidad Temporal',
    description: 'Procesos IT, partes baja/alta, bases reguladoras, alertas 365/545 días',
    icon: Users,
    route: '/obelixia-admin/hr/it',
    phase: 'Fase 1',
    available: false,
    badges: ['LGSS art. 175'],
  },
  {
    id: 'garnishments',
    title: 'Embargos Judiciales',
    description: 'Motor Art. 607-608 LEC, tramos de embargabilidad, simulador de impacto',
    icon: Gavel,
    route: '/obelixia-admin/hr/garnishments',
    phase: 'Fase C',
    available: true,
    badges: ['Art. 607 LEC', 'Art. 608 LEC'],
  },
  {
    id: 'contracts',
    title: 'Contratos Avanzados',
    description: 'Prórrogas, bonificaciones TGSS, parcialidad, conversiones y observaciones laborales',
    icon: FileText,
    route: '/obelixia-admin/hr/contracts',
    phase: 'Fase D',
    available: true,
    badges: ['TA.2', 'Bonificaciones'],
  },
  {
    id: 'payroll',
    title: 'Motor de Nómina',
    description: 'Cálculo completo de devengos, deducciones, bases y netos',
    icon: Calculator,
    route: '/obelixia-admin/hr/payroll',
    phase: 'Fase F',
    available: true,
    badges: ['SS 2026', 'IRPF'],
  },
  {
    id: 'files',
    title: 'Ficheros TGSS/AEAT',
    description: 'Generación y tramitación de FAN, FDI, AFI, modelos fiscales',
    icon: FileText,
    route: '/obelixia-admin/hr/files',
    phase: 'Fase 6',
    available: false,
    badges: ['SILTRA', 'RED'],
  },
  {
    id: 'multi-employment',
    title: 'Pluriempleo',
    description: 'Distribución de bases entre empleadores, cotización solidaridad 2026',
    icon: Building2,
    route: '/obelixia-admin/hr/multi-employment',
    phase: 'Fase E',
    available: true,
    badges: ['Solidaridad 2026', 'Orden PJC/297'],
  },
  {
    id: 'irpf',
    title: 'Motor IRPF',
    description: 'Regularización fiscal, modelos 111/190, certificados de retenciones',
    icon: CreditCard,
    route: '/obelixia-admin/hr/irpf',
    phase: 'Fase 7',
    available: false,
  },
  {
    id: 'ai-agents',
    title: 'Agentes IA Nómina',
    description: 'Supervisor y 6 especialistas: cálculo, ficheros, IRPF, IT, embargos, bridge',
    icon: Brain,
    route: '/erp/ai-center',
    phase: 'Fase 8',
    available: true,
    badges: ['9 agentes'],
  },
];

export function HRHubPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="RRHH — Hub de Módulos">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recursos Humanos</h1>
          <p className="text-muted-foreground mt-1">
            Plataforma profesional de nómina y compliance laboral
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <Card
              key={mod.id}
              className={`group cursor-pointer transition-all duration-200 hover:shadow-lg ${
                mod.available
                  ? 'hover:border-primary/50'
                  : 'opacity-60'
              }`}
              onClick={() => mod.available && navigate(mod.route)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <mod.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {mod.phase}
                    </Badge>
                    {!mod.available && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <CardTitle className="text-sm mt-2">{mod.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {mod.description}
                </p>
                {mod.badges && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {mod.badges.map((badge) => (
                      <Badge key={badge} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                )}
                {mod.available && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Acceder <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HRHubPage;
