/**
 * ESLocalizationPlugin — Panel principal del plugin España
 * MVP: Datos laborales | Seg. Social | IRPF | Nómina ES | Fiscal
 * Full: + Contratos | Permisos | Finiquito | Pluriempleo
 */
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, Shield, Calculator, FileText, Calendar, BookOpen, Euro, Clock, Heart, Briefcase } from 'lucide-react';
import { ESEmployeeLaborDataForm } from './ESEmployeeLaborDataForm';
import { ESSocialSecurityPanel } from './ESSocialSecurityPanel';
import { ESIRPFPanel } from './ESIRPFPanel';
import { ESContractTypesPanel } from './ESContractTypesPanel';
import { ESPermisosPanel } from './ESPermisosPanel';
import { ESSettlementCalculator } from './ESSettlementCalculator';
import { ESPayrollBridge } from './ESPayrollBridge';
import { FiscalMonthlyExpedientTab } from './FiscalMonthlyExpedientTab';
import { ESGuardaLegalPanel } from './ESGuardaLegalPanel';
import { ESNacimientoINSSPanel } from './ESNacimientoINSSPanel';
import { usePayrollEngine } from '@/hooks/erp/hr/usePayrollEngine';
import { HRMultiEmploymentPanel } from '@/components/hr/multi-employment/HRMultiEmploymentPanel';
import { BaseDistributionPanel } from '@/components/hr/multi-employment/BaseDistributionPanel';
import { SolidaritySimulator } from '@/components/hr/multi-employment/SolidaritySimulator';

interface Props {
  companyId: string;
  employeeId?: string;
  mvpMode?: boolean;
}

export function ESLocalizationPlugin({ companyId, employeeId, mvpMode = true }: Props) {
  const showFull = !mvpMode;
  const { periods, fetchPeriods } = usePayrollEngine(companyId);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" /> 🇪🇸 Localización España
        </h3>
        <p className="text-sm text-muted-foreground">
          Legislación laboral española: SS, IRPF, contratos RD, permisos ET, nómina, finiquitos, pluriempleo
        </p>
      </div>

      <Tabs defaultValue="labor-data">
        <TabsList className={`grid w-full ${showFull ? 'grid-cols-11' : 'grid-cols-8'}`}>
          <TabsTrigger value="labor-data" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /> Datos</TabsTrigger>
          <TabsTrigger value="ss" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> Seg. Social</TabsTrigger>
          <TabsTrigger value="irpf" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> IRPF</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-1"><Euro className="h-3.5 w-3.5" /> Nómina ES</TabsTrigger>
          <TabsTrigger value="fiscal" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Fiscal</TabsTrigger>
          <TabsTrigger value="guarda-legal" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" /> Guarda Legal</TabsTrigger>
          <TabsTrigger value="nacimiento-inss" className="text-xs gap-1"><Heart className="h-3.5 w-3.5" /> Nacimiento INSS</TabsTrigger>
          <TabsTrigger value="multi-employment" className="text-xs gap-1"><Briefcase className="h-3.5 w-3.5" /> Pluriempleo</TabsTrigger>
          {showFull && <TabsTrigger value="contracts" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Contratos</TabsTrigger>}
          {showFull && <TabsTrigger value="leaves" className="text-xs gap-1"><Calendar className="h-3.5 w-3.5" /> Permisos</TabsTrigger>}
          {showFull && <TabsTrigger value="settlement" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> Finiquito</TabsTrigger>}
        </TabsList>

        <TabsContent value="labor-data" className="mt-4">
          <ESEmployeeLaborDataForm companyId={companyId} employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="ss" className="mt-4">
          <ESSocialSecurityPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="irpf" className="mt-4">
          <ESIRPFPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <ESPayrollBridge companyId={companyId} />
        </TabsContent>
        <TabsContent value="fiscal" className="mt-4">
          <FiscalMonthlyExpedientTab companyId={companyId} periods={periods} />
        </TabsContent>
        <TabsContent value="guarda-legal" className="mt-4">
          <ESGuardaLegalPanel companyId={companyId} employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="nacimiento-inss" className="mt-4">
          <ESNacimientoINSSPanel companyId={companyId} employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="multi-employment" className="mt-4">
          <div className="space-y-4">
            <HRMultiEmploymentPanel companyId={companyId} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BaseDistributionPanel />
              <SolidaritySimulator />
            </div>
          </div>
        </TabsContent>
        {showFull && (
          <TabsContent value="contracts" className="mt-4">
            <ESContractTypesPanel companyId={companyId} />
          </TabsContent>
        )}
        {showFull && (
          <TabsContent value="leaves" className="mt-4">
            <ESPermisosPanel />
          </TabsContent>
        )}
        {showFull && (
          <TabsContent value="settlement" className="mt-4">
            <ESSettlementCalculator companyId={companyId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
