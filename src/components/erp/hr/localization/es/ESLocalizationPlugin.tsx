/**
 * ESLocalizationPlugin — Panel principal del plugin España
 * Tabs: Datos laborales | Seg. Social | IRPF | Contratos | Permisos | Documentos
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, Shield, Calculator, FileText, Calendar, BookOpen } from 'lucide-react';
import { ESEmployeeLaborDataForm } from './ESEmployeeLaborDataForm';
import { ESSocialSecurityPanel } from './ESSocialSecurityPanel';
import { ESIRPFPanel } from './ESIRPFPanel';
import { ESContractTypesPanel } from './ESContractTypesPanel';
import { ESPermisosPanel } from './ESPermisosPanel';
import { ESSettlementCalculator } from './ESSettlementCalculator';

interface Props {
  companyId: string;
  employeeId?: string;
}

export function ESLocalizationPlugin({ companyId, employeeId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" /> 🇪🇸 Localización España
        </h3>
        <p className="text-sm text-muted-foreground">
          Legislación laboral española: SS, IRPF, contratos RD, permisos ET, finiquitos
        </p>
      </div>

      <Tabs defaultValue="labor-data">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="labor-data" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /> Datos</TabsTrigger>
          <TabsTrigger value="ss" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> Seg. Social</TabsTrigger>
          <TabsTrigger value="irpf" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> IRPF</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Contratos</TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs gap-1"><Calendar className="h-3.5 w-3.5" /> Permisos</TabsTrigger>
          <TabsTrigger value="settlement" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> Finiquito</TabsTrigger>
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
        <TabsContent value="contracts" className="mt-4">
          <ESContractTypesPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="leaves" className="mt-4">
          <ESPermisosPanel />
        </TabsContent>
        <TabsContent value="settlement" className="mt-4">
          <ESSettlementCalculator companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
