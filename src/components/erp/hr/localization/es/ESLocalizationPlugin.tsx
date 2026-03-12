/**
 * ESLocalizationPlugin — Panel principal del plugin España
 * MVP: Datos laborales | Seg. Social | IRPF | Nómina ES
 * Full: + Contratos | Permisos | Finiquito
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, Shield, Calculator, FileText, Calendar, BookOpen, Euro } from 'lucide-react';
import { ESEmployeeLaborDataForm } from './ESEmployeeLaborDataForm';
import { ESSocialSecurityPanel } from './ESSocialSecurityPanel';
import { ESIRPFPanel } from './ESIRPFPanel';
import { ESContractTypesPanel } from './ESContractTypesPanel';
import { ESPermisosPanel } from './ESPermisosPanel';
import { ESSettlementCalculator } from './ESSettlementCalculator';
import { ESPayrollBridge } from './ESPayrollBridge';

interface Props {
  companyId: string;
  employeeId?: string;
  mvpMode?: boolean;
}

export function ESLocalizationPlugin({ companyId, employeeId, mvpMode = true }: Props) {
  const showFull = !mvpMode;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" /> 🇪🇸 Localización España
        </h3>
        <p className="text-sm text-muted-foreground">
          Legislación laboral española: SS, IRPF, contratos RD, permisos ET, nómina, finiquitos
        </p>
      </div>

      <Tabs defaultValue="labor-data">
        <TabsList className={`grid w-full ${showFull ? 'grid-cols-7' : 'grid-cols-4'}`}>
          <TabsTrigger value="labor-data" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /> Datos</TabsTrigger>
          <TabsTrigger value="ss" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> Seg. Social</TabsTrigger>
          <TabsTrigger value="irpf" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> IRPF</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-1"><Euro className="h-3.5 w-3.5" /> Nómina ES</TabsTrigger>
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
