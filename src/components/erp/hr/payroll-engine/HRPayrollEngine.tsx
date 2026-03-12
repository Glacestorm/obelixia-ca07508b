/**
 * HRPayrollEngine — Panel principal del motor de nómina global
 * MVP: Períodos + Nóminas + Conceptos
 * Full: + Simulación + Auditoría
 */
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, BookOpen, FlaskConical, Shield } from 'lucide-react';
import { usePayrollEngine } from '@/hooks/erp/hr/usePayrollEngine';
import { HRPayrollPeriodManager } from './HRPayrollPeriodManager';
import { HRPayrollRecordsList } from './HRPayrollRecordsList';
import { HRPayrollConceptsCatalog } from './HRPayrollConceptsCatalog';
import { HRPayrollSimulator } from './HRPayrollSimulator';
import { HRPayrollAuditTrail } from './HRPayrollAuditTrail';

interface Props {
  companyId: string;
  mvpMode?: boolean;
}

export function HRPayrollEngine({ companyId, mvpMode = true }: Props) {
  const [activeTab, setActiveTab] = useState('periods');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const engine = usePayrollEngine(companyId);
  const showFull = !mvpMode;

  useEffect(() => { engine.fetchPeriods(); }, [engine.fetchPeriods]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Motor de Nómina</h2>
        <p className="text-sm text-muted-foreground">Motor global multi-jurisdicción · Períodos, cálculo, cierre y auditoría</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${showFull ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <TabsTrigger value="periods" className="gap-1.5 text-xs"><Calendar className="h-3.5 w-3.5" />Períodos</TabsTrigger>
          <TabsTrigger value="payslips" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Nóminas</TabsTrigger>
          <TabsTrigger value="concepts" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" />Conceptos</TabsTrigger>
          {showFull && <TabsTrigger value="simulation" className="gap-1.5 text-xs"><FlaskConical className="h-3.5 w-3.5" />Simulación</TabsTrigger>}
          {showFull && <TabsTrigger value="audit" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Auditoría</TabsTrigger>}
        </TabsList>

        <TabsContent value="periods" className="mt-4">
          <HRPayrollPeriodManager
            companyId={companyId}
            periods={engine.periods}
            isLoading={engine.isLoading}
            onOpenPeriod={engine.openPeriod}
            onUpdateStatus={engine.updatePeriodStatus}
            onValidatePreClose={engine.validatePreClose}
            onSelectPeriod={(id) => { setSelectedPeriodId(id); setActiveTab('payslips'); }}
            onRefresh={() => engine.fetchPeriods()}
          />
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <HRPayrollRecordsList
            companyId={companyId}
            periods={engine.periods}
            selectedPeriodId={selectedPeriodId}
            onSelectPeriod={setSelectedPeriodId}
            records={engine.records}
            isLoading={engine.isLoading}
            onFetchRecords={engine.fetchRecords}
            onUpdateStatus={engine.updateRecordStatus}
            onFetchLines={engine.fetchLines}
            lines={engine.lines}
            onAddLine={engine.addLine}
            onUpdateLine={engine.updateLine}
            onDeleteLine={engine.deleteLine}
          />
        </TabsContent>

        <TabsContent value="concepts" className="mt-4">
          <HRPayrollConceptsCatalog
            companyId={companyId}
            concepts={engine.concepts}
            onFetch={engine.fetchConcepts}
            onUpsert={engine.upsertConcept}
          />
        </TabsContent>

        {showFull && (
          <TabsContent value="simulation" className="mt-4">
            <HRPayrollSimulator
              companyId={companyId}
              simulations={engine.simulations}
              onFetch={engine.fetchSimulations}
              onCreate={engine.createSimulation}
            />
          </TabsContent>
        )}

        {showFull && (
          <TabsContent value="audit" className="mt-4">
            <HRPayrollAuditTrail
              companyId={companyId}
              auditLog={engine.auditLog}
              onFetch={engine.fetchAuditLog}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
