/**
 * HRLegalOnboardingPanel.tsx — Panel de Onboarding Legal Automatizado (C4)
 *
 * Workflow legal al alta con checklist, evidencias y trazabilidad.
 * Integra con expediente documental existente sin duplicar fuente de verdad.
 *
 * DISCLAIMER: Este checklist es una herramienta interna de gestión.
 * No sustituye asesoramiento jurídico profesional.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardCheck, Shield, FileCheck, AlertTriangle, CheckCircle2,
  Clock, RotateCcw, Eye, FileText, Download, UserCheck, Info,
  CircleDot, Ban, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  createOnboardingWorkflow,
  calculateOnboardingProgress,
  recordItemEvidence,
  getItemDeadline,
  getCategoryLabel,
  generateOnboardingSummary,
  type OnboardingWorkflow,
  type OnboardingChecklistItem,
  type OnboardingItemStatus,
  type EmployeeContext,
} from '@/engines/erp/hr/legalOnboardingEngine';

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OnboardingItemStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  generated: { label: 'Generado', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: FileText },
  sent: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: CircleDot },
  accepted: { label: 'Aceptado', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
  not_applicable: { label: 'No aplica', color: 'bg-muted text-muted-foreground border-muted', icon: Ban },
  blocked: { label: 'Bloqueado', color: 'bg-red-100 text-red-800 border-red-300', icon: Lock },
};

// ─── Demo Context ────────────────────────────────────────────────────────────

const DEMO_CONTEXT: EmployeeContext = {
  employeeId: 'demo-001',
  employeeName: 'María Fernández García',
  hireDate: format(new Date(), 'yyyy-MM-dd'),
  headcount: 120,
  hasWhistleblowerChannel: true,
  hasEqualityPlan: true,
  hasHarassmentProtocol: true,
  hasDigitalDisconnectionProtocol: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function HRLegalOnboardingPanel() {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow>(() =>
    createOnboardingWorkflow(DEMO_CONTEXT)
  );
  const [activeTab, setActiveTab] = useState('checklist');
  const [selectedItem, setSelectedItem] = useState<OnboardingChecklistItem | null>(null);

  const progress = useMemo(() => calculateOnboardingProgress(workflow), [workflow]);

  const handleAcceptItem = useCallback((itemId: string) => {
    setWorkflow(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        return recordItemEvidence(item, {
          type: 'digital_acceptance',
          acceptedBy: prev.employeeId,
          method: 'Aceptación digital vía portal ERP',
          timestamp: new Date().toISOString(),
        });
      }),
    }));
    toast.success('Ítem aceptado con evidencia digital');
  }, []);

  const handleGenerateItem = useCallback((itemId: string) => {
    setWorkflow(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        return recordItemEvidence(item, {
          type: 'system_generated',
          method: 'Generado automáticamente por el sistema',
          timestamp: new Date().toISOString(),
        });
      }),
    }));
    toast.success('Documento generado');
  }, []);

  const handleReset = useCallback(() => {
    setWorkflow(createOnboardingWorkflow(DEMO_CONTEXT));
    setSelectedItem(null);
    toast.info('Workflow reiniciado');
  }, []);

  const handleExportSummary = useCallback(() => {
    const text = generateOnboardingSummary(workflow);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-legal-${workflow.employeeName.replace(/\s/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Resumen exportado');
  }, [workflow]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, OnboardingChecklistItem[]>();
    workflow.items.forEach(item => {
      const key = item.category;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return groups;
  }, [workflow.items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Onboarding Legal Automatizado</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {workflow.employeeName} — Alta: {format(new Date(workflow.hireDate), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportSummary} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Progress */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{progress.percentage}%</p>
              <p className="text-xs text-muted-foreground">Completado</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-600">{progress.completed}</p>
              <p className="text-xs text-muted-foreground">Aceptados</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-yellow-600">{progress.pending}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-red-600">{progress.overdue.length}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-muted-foreground">{progress.notApplicable}</p>
              <p className="text-xs text-muted-foreground">No aplica</p>
            </div>
          </div>
          <Progress value={progress.percentage} className="h-2.5" />
          {progress.isComplete && (
            <div className="mt-3 p-2.5 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              Onboarding legal completado — todos los ítems aplicables han sido aceptados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Este checklist es una <strong>herramienta de gestión interna</strong>. La aceptación digital
          registrada constituye evidencia interna, no firma electrónica cualificada. No sustituye
          asesoramiento jurídico profesional.
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checklist" className="gap-1.5 text-xs">
                <ClipboardCheck className="h-3.5 w-3.5" /> Checklist
              </TabsTrigger>
              <TabsTrigger value="evidence" className="gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" /> Evidencias
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" /> Plazos
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Checklist Tab */}
            <TabsContent value="checklist" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-5">
                  {Array.from(groupedItems.entries()).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-medium">
                          {getCategoryLabel(category as any)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {items.filter(i => i.status === 'accepted').length}/{items.filter(i => i.status !== 'not_applicable').length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map(item => {
                          const cfg = STATUS_CONFIG[item.status];
                          const StatusIcon = cfg.icon;
                          const deadline = getItemDeadline(item, workflow.hireDate);
                          const daysLeft = differenceInDays(deadline, new Date());
                          const isOverdue = item.status !== 'accepted' && item.status !== 'not_applicable' && daysLeft < 0;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'p-3 rounded-lg border transition-colors',
                                item.status === 'accepted' ? 'bg-green-50/50 border-green-200' : '',
                                item.status === 'not_applicable' ? 'opacity-50' : '',
                                isOverdue ? 'border-red-300 bg-red-50/30' : '',
                                selectedItem?.id === item.id ? 'ring-2 ring-primary/30' : '',
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <StatusIcon className={cn('h-4.5 w-4.5 mt-0.5 shrink-0',
                                    item.status === 'accepted' ? 'text-green-600' :
                                    item.status === 'not_applicable' ? 'text-muted-foreground' :
                                    isOverdue ? 'text-red-600' : 'text-yellow-600'
                                  )} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium">{item.title}</p>
                                      {item.mandatory && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          Obligatorio
                                        </Badge>
                                      )}
                                      {isOverdue && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                          Vencido
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                                      {item.legalBasis}
                                    </p>
                                    {item.evidence && (
                                      <div className="mt-1.5 p-1.5 rounded bg-green-50 border border-green-100 text-[10px] text-green-700">
                                        ✓ {item.evidence.method} — {item.evidence.timestamp ? format(new Date(item.evidence.timestamp), 'dd/MM/yyyy HH:mm') : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className={cn('text-[10px]', cfg.color)}>
                                    {cfg.label}
                                  </Badge>
                                  {item.status === 'pending' && (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => handleGenerateItem(item.id)}
                                      >
                                        <FileCheck className="h-3 w-3 mr-1" /> Generar
                                      </Button>
                                      {item.requiresEmployeeAcceptance && (
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => handleAcceptItem(item.id)}
                                        >
                                          <UserCheck className="h-3 w-3 mr-1" /> Aceptar
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                  {item.status === 'generated' && item.requiresEmployeeAcceptance && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleAcceptItem(item.id)}
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" /> Aceptar
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setSelectedItem(item)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Evidence Tab */}
            <TabsContent value="evidence" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-2">
                  {workflow.items.filter(i => i.evidence).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No hay evidencias registradas aún</p>
                    </div>
                  ) : (
                    workflow.items
                      .filter(i => i.evidence)
                      .map(item => (
                        <div key={item.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">
                              {item.evidence!.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Método:</span> {item.evidence!.method}
                            </div>
                            <div>
                              <span className="font-medium">Fecha:</span>{' '}
                              {item.evidence!.timestamp
                                ? format(new Date(item.evidence!.timestamp), 'dd/MM/yyyy HH:mm:ss')
                                : '—'}
                            </div>
                            {item.evidence!.acceptedBy && (
                              <div>
                                <span className="font-medium">Aceptado por:</span> {item.evidence!.acceptedBy}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Doc. vinculado:</span>{' '}
                              {item.linkedDocumentType ?? '—'}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
                            {item.legalBasis}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-2">
                  {workflow.items
                    .filter(i => i.status !== 'not_applicable')
                    .sort((a, b) => a.deadlineDays - b.deadlineDays)
                    .map(item => {
                      const deadline = getItemDeadline(item, workflow.hireDate);
                      const daysLeft = differenceInDays(deadline, new Date());
                      const isDone = item.status === 'accepted' || (item.status === 'generated' && !item.requiresEmployeeAcceptance);
                      const isOverdue = !isDone && daysLeft < 0;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'p-3 rounded-lg border flex items-center justify-between',
                            isDone ? 'bg-green-50/40 border-green-200' :
                            isOverdue ? 'bg-red-50/40 border-red-300' :
                            'bg-card'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : isOverdue ? (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Plazo: {item.deadlineDays === 0 ? 'Día del alta' : `+${item.deadlineDays} días`}
                                {' — '}
                                {format(deadline, 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isDone ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 text-[10px]">
                                Completado
                              </Badge>
                            ) : isOverdue ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Vencido hace {Math.abs(daysLeft)}d
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {daysLeft === 0 ? 'Hoy' : `${daysLeft}d restantes`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Detail side panel */}
      {selectedItem && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Detalle: {selectedItem.title}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Código</p>
                <p className="font-mono text-xs">{selectedItem.code}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Base Legal</p>
                <p className="text-xs">{selectedItem.legalBasis}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                <p className="text-xs">{selectedItem.description}</p>
              </div>
              {selectedItem.applicabilityCondition && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Condición de aplicabilidad</p>
                    <p className="text-xs">{selectedItem.applicabilityCondition}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Requiere aceptación</p>
                  <p className="text-xs">{selectedItem.requiresEmployeeAcceptance ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Doc. vinculado</p>
                  <p className="text-xs font-mono">{selectedItem.linkedDocumentType ?? '—'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HRLegalOnboardingPanel;
