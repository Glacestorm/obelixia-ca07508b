import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Zap, MapPin, GitCompareArrows } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { CaseSupplyTab } from './CaseSupplyTab';
import { CaseConsumptionTab } from './CaseConsumptionTab';
import { CaseInvoicesTab } from './CaseInvoicesTab';
import { CaseContractsTab } from './CaseContractsTab';
import { CaseRecommendationTab } from './CaseRecommendationTab';
import { CaseReportTab } from './CaseReportTab';
import { CaseTrackingTab } from './CaseTrackingTab';
import { CaseWorkflowTab } from './CaseWorkflowTab';
import { CaseChecklistPanel } from './CaseChecklistPanel';
import { CaseProposalTab } from './CaseProposalTab';
import { CaseAuditLog } from './CaseAuditLog';
import { useEnergyCase } from '@/hooks/erp/useEnergyCases';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  caseId: string;
  companyId: string;
  onBack: () => void;
  onOpenSimulator?: (caseId: string) => void;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  analysis: { label: 'En análisis', variant: 'secondary' },
  proposal: { label: 'Propuesta', variant: 'default' },
  implementation: { label: 'Implementación', variant: 'default' },
  completed: { label: 'Completado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-muted-foreground' },
  medium: { label: 'Media', color: 'text-yellow-600' },
  high: { label: 'Alta', color: 'text-orange-600' },
  critical: { label: 'Crítica', color: 'text-destructive' },
};

export function ElectricalCaseDetail({ caseId, companyId, onBack, onOpenSimulator }: Props) {
  const { energyCase, loading } = useEnergyCase(caseId);
  const [activeTab, setActiveTab] = useState('resumen');

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  const formatCurrency = (v: number | null) => {
    if (v == null) return '—';
    return `${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
  };

  if (loading || !energyCase) {
    return (
      <div className="space-y-4">
        <ElectricalBreadcrumb section="Expedientes" subsection="Cargando..." />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <span className="text-muted-foreground">Cargando expediente...</span>
        </div>
      </div>
    );
  }

  const status = STATUS_MAP[energyCase.status] || { label: energyCase.status, variant: 'outline' as const };
  const priority = PRIORITY_MAP[energyCase.priority] || { label: energyCase.priority, color: '' };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Expedientes" subsection={energyCase.title} />

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold">{energyCase.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {energyCase.cups || 'Sin CUPS'}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {energyCase.address || 'Sin dirección'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className={cn("text-sm font-medium", priority.color)}>Prioridad: {priority.label}</span>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Comercializadora', value: energyCase.current_supplier || '—' },
              { label: 'Tarifa', value: energyCase.current_tariff || '—' },
              { label: 'Ahorro mensual est.', value: formatCurrency(energyCase.estimated_monthly_savings), highlight: true },
              { label: 'Ahorro anual est.', value: formatCurrency(energyCase.estimated_annual_savings), highlight: true },
              { label: 'Fin contrato', value: formatDate(energyCase.contract_end_date) },
              { label: 'Creado', value: formatDate(energyCase.created_at) },
            ].map((item) => (
              <Card key={item.label} className="bg-muted/30">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className={cn("text-sm font-medium truncate", item.highlight && "font-semibold text-emerald-600")}>{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs - expanded with new Phase 3 tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs">Checklist</TabsTrigger>
          <TabsTrigger value="propuesta" className="text-xs">Propuesta</TabsTrigger>
          <TabsTrigger value="contrato" className="text-xs">Contrato</TabsTrigger>
          <TabsTrigger value="facturas" className="text-xs">Facturas</TabsTrigger>
          <TabsTrigger value="consumo" className="text-xs">Consumo</TabsTrigger>
          <TabsTrigger value="potencia" className="text-xs">Suministro</TabsTrigger>
          <TabsTrigger value="recomendacion" className="text-xs">Recomendación</TabsTrigger>
          <TabsTrigger value="informe" className="text-xs">Informe</TabsTrigger>
          <TabsTrigger value="seguimiento" className="text-xs">Seguimiento</TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen del expediente</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Título:</span> <span className="font-medium ml-1">{energyCase.title}</span></div>
                <div><span className="text-muted-foreground">CUPS:</span> <span className="font-mono ml-1">{energyCase.cups || '—'}</span></div>
                <div><span className="text-muted-foreground">Dirección:</span> <span className="ml-1">{energyCase.address || '—'}</span></div>
                <div><span className="text-muted-foreground">Comercializadora:</span> <span className="ml-1">{energyCase.current_supplier || '—'}</span></div>
                <div><span className="text-muted-foreground">Tarifa:</span> <span className="ml-1">{energyCase.current_tariff || '—'}</span></div>
                <div><span className="text-muted-foreground">Fin contrato:</span> <span className="ml-1">{formatDate(energyCase.contract_end_date)}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={status.variant} className="ml-1 text-[10px]">{status.label}</Badge></div>
                <div><span className="text-muted-foreground">Prioridad:</span> <span className={cn("ml-1 font-medium", priority.color)}>{priority.label}</span></div>
                <div><span className="text-muted-foreground">Ahorro mensual:</span> <span className="ml-1 font-semibold text-emerald-600">{formatCurrency(energyCase.estimated_monthly_savings)}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="mt-4">
          <CaseWorkflowTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <CaseChecklistPanel caseId={caseId} />
        </TabsContent>

        <TabsContent value="propuesta" className="mt-4">
          <CaseProposalTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="contrato" className="mt-4">
          <CaseContractsTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="facturas" className="mt-4">
          <CaseInvoicesTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="consumo" className="mt-4">
          <CaseConsumptionTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="potencia" className="mt-4">
          <CaseSupplyTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="recomendacion" className="mt-4">
          <div className="space-y-3">
            {onOpenSimulator && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => onOpenSimulator(caseId)} className="gap-1.5">
                  <GitCompareArrows className="h-4 w-4" /> Simular tarifas con datos del expediente
                </Button>
              </div>
            )}
            <CaseRecommendationTab caseId={caseId} />
          </div>
        </TabsContent>

        <TabsContent value="informe" className="mt-4">
          <CaseReportTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="seguimiento" className="mt-4">
          <CaseTrackingTab caseId={caseId} />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <CaseAuditLog companyId={companyId} caseId={caseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ElectricalCaseDetail;
