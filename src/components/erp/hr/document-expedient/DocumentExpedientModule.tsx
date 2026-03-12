/**
 * DocumentExpedientModule — Panel principal del expediente documental
 * Tabs: Empleado | Nómina | Movilidad | Integraciones | Consentimientos | Retención | Auditoría
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, FileText, Plane, Send, ShieldCheck, Clock, Eye } from 'lucide-react';
import { EmployeeDocumentExpedient } from './EmployeeDocumentExpedient';
import { PayrollDocumentExpedient } from './PayrollDocumentExpedient';
import { ConsentsPanel } from './ConsentsPanel';
import { RetentionPoliciesPanel } from './RetentionPoliciesPanel';
import { DocumentAuditPanel } from './DocumentAuditPanel';

interface Props {
  companyId: string;
}

export function DocumentExpedientModule({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('employee');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Expediente Documental
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestión centralizada de documentos, evidencias, consentimientos y compliance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="employee" className="gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" /> Empleado
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Nómina
          </TabsTrigger>
          <TabsTrigger value="consents" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Consentimientos
          </TabsTrigger>
          <TabsTrigger value="retention" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Retención
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" /> Auditoría
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employee">
          <EmployeeDocumentExpedient companyId={companyId} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollDocumentExpedient companyId={companyId} />
        </TabsContent>

        <TabsContent value="consents">
          <ConsentsPanel companyId={companyId} />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionPoliciesPanel companyId={companyId} />
        </TabsContent>

        <TabsContent value="audit">
          <DocumentAuditPanel companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
