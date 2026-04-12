/**
 * HRInspectionCopilotPanel — C3: Copiloto de Inspección de Trabajo
 * 
 * Evaluación de readiness por áreas, semáforos, pack documental,
 * carencias y disclaimers visibles.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  FileText, Download, RefreshCw, Info, Eye,
  ClipboardList, FolderOpen, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INSPECTION_AREAS,
  generateInspectionReport,
  createEmptySnapshot,
  type CompanyDataSnapshot,
  type InspectionReadinessReport,
  type AreaEvaluation,
  type TrafficLight,
} from '@/engines/erp/hr/inspectionCopilotEngine';

// ─── Traffic Light Component ─────────────────────────────────────────────────

function TrafficLightBadge({ light, score }: { light: TrafficLight; score: number }) {
  const config = {
    green: { label: 'Adecuado', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
    yellow: { label: 'Revisable', className: 'bg-amber-500/15 text-amber-700 border-amber-300' },
    red: { label: 'Deficiente', className: 'bg-red-500/15 text-red-700 border-red-300' },
  }[light];

  return (
    <Badge variant="outline" className={cn('font-mono text-xs', config.className)}>
      {config.label} · {score}%
    </Badge>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface HRInspectionCopilotPanelProps {
  companyId?: string;
  className?: string;
}

export function HRInspectionCopilotPanel({ companyId = 'default', className }: HRInspectionCopilotPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CompanyDataSnapshot>(createEmptySnapshot);

  // Toggle helpers for interactive self-assessment
  const toggleField = useCallback((field: keyof CompanyDataSnapshot, value?: number) => {
    setSnapshot(prev => ({
      ...prev,
      [field]: value !== undefined ? value : !prev[field],
    }));
  }, []);

  const report = useMemo(
    () => generateInspectionReport(companyId, snapshot),
    [companyId, snapshot]
  );

  const selectedAreaData = useMemo(
    () => selectedArea ? report.areas.find(a => a.areaId === selectedArea) : null,
    [report, selectedArea]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Disclaimer */}
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {report.disclaimer}
          </p>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Copiloto de Inspección de Trabajo</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Autoevaluación orientativa · {INSPECTION_AREAS.length} áreas · {report.areas.reduce((s, a) => s + a.totalChecks, 0)} verificaciones
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrafficLightBadge light={report.overallLight} score={report.overallScore} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={report.overallScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs gap-1">
            <Eye className="h-3.5 w-3.5" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="assessment" className="text-xs gap-1">
            <ClipboardList className="h-3.5 w-3.5" /> Evaluación
          </TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs gap-1">
            <Search className="h-3.5 w-3.5" /> Carencias
          </TabsTrigger>
          <TabsTrigger value="docpack" className="text-xs gap-1">
            <FolderOpen className="h-3.5 w-3.5" /> Pack Documental
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {report.areas.map(area => (
              <Card
                key={area.areaId}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedArea === area.areaId && 'ring-2 ring-primary'
                )}
                onClick={() => {
                  setSelectedArea(area.areaId);
                  setActiveTab('assessment');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold leading-tight">{area.label}</h4>
                    <TrafficLightBadge light={area.light} score={area.score} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{area.legalBasis}</p>
                  <Progress value={area.score} className="h-1.5 mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{area.passedChecks}/{area.totalChecks} verificaciones</span>
                    {area.gaps.length > 0 && (
                      <span className="text-destructive font-medium">{area.gaps.length} carencias</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Critical gaps summary */}
          {report.criticalGaps.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  Carencias críticas ({report.criticalGaps.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1">
                  {report.criticalGaps.slice(0, 8).map((gap, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-0.5">•</span> {gap}
                    </li>
                  ))}
                  {report.criticalGaps.length > 8 && (
                    <li className="text-xs text-muted-foreground italic">
                      ... y {report.criticalGaps.length - 8} más
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Assessment (interactive self-check) ─── */}
        <TabsContent value="assessment" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Autoevaluación interactiva
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Active los indicadores que correspondan a la situación real de la empresa.
                El semáforo se actualiza automáticamente.
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-3">
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium">Nº de empleados</label>
                  <input
                    type="number"
                    min={0}
                    value={snapshot.employeeCount}
                    onChange={e => toggleField('employeeCount', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-2 py-1 text-sm border rounded bg-background"
                  />
                </div>

                {INSPECTION_AREAS.map(area => {
                  const areaEval = report.areas.find(a => a.areaId === area.id)!;
                  return (
                    <div key={area.id} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">{area.label}</h4>
                        <TrafficLightBadge light={areaEval.light} score={areaEval.score} />
                      </div>
                      <div className="space-y-2 pl-2 border-l-2 border-muted">
                        {area.checks.map(check => {
                          const evidence = areaEval.evidences.find(e => e.checkId === check.id);
                          return (
                            <div key={check.id} className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <span className="text-xs">{check.description}</span>
                                {check.category === 'recommended' && (
                                  <Badge variant="outline" className="ml-1.5 text-[9px] py-0">Recomendado</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {evidence?.available ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  );
                })}

                {/* Self-assessment toggles */}
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4" /> Datos de la empresa
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Active cada indicador según la situación real. Los semáforos se recalculan en tiempo real.
                  </p>

                  {renderToggleGroup('Registro de Jornada', [
                    ['hasTimeClockSystem', 'Sistema de fichaje operativo'],
                    ['timeClockExportReady', 'Exportación disponible'],
                    ['rltInformed', 'RLT informada del sistema'],
                  ], snapshot, toggleField)}

                  {renderToggleGroup('Contratos', [
                    ['sepeContractsCommunicated', 'Contratos comunicados al SEPE'],
                    ['copiaBasicaDelivered', 'Copia básica entregada a RLT'],
                  ], snapshot, toggleField)}

                  {renderToggleGroup('PRL', [
                    ['hasPRLEvaluation', 'Evaluación de riesgos'],
                    ['hasPRLPlanning', 'Planificación preventiva'],
                    ['hasPRLTraining', 'Formación PRL registrada'],
                    ['hasMedicalSurveillance', 'Vigilancia de la salud'],
                    ['hasSPA', 'SPA/SPP contratado'],
                  ], snapshot, toggleField)}

                  {renderToggleGroup('Igualdad', [
                    ['hasEqualityPlan', 'Plan de Igualdad elaborado'],
                    ['equalityDiagnosisComplete', 'Diagnóstico completado'],
                    ['hasSalaryAudit', 'Auditoría retributiva'],
                    ['equalityNegotiated', 'Negociado con RLT'],
                    ['equalityRegistered', 'Inscrito en REGCON'],
                  ], snapshot, toggleField)}

                  {renderToggleGroup('LISMI / LGD', [
                    ['lismiQuotaMet', 'Cuota 2% cumplida'],
                    ['lismiAlternatives', 'Medidas alternativas'],
                    ['lismiCertificatesArchived', 'Certificados archivados'],
                  ], snapshot, toggleField)}

                  {renderToggleGroup('Canal de Denuncias', [
                    ['hasWhistleblowerChannel', 'Canal habilitado'],
                    ['whistleblowerResponsible', 'Responsable designado'],
                    ['whistleblowerConfidentiality', 'Confidencialidad documentada'],
                    ['whistleblowerResponseTime', 'Acuse recibo en 7 días'],
                  ], snapshot, toggleField)}

                  {renderToggleGroup('Documentación Laboral', [
                    ['payslipsDelivered', 'Nóminas entregadas'],
                    ['hasTC2', 'TC2/RLC disponibles'],
                    ['hasCalendar', 'Calendario laboral publicado'],
                    ['hasIRPFCertificates', 'Certificados IRPF'],
                    ['ssAffiliationsCommunicated', 'Altas/bajas SS comunicadas'],
                  ], snapshot, toggleField)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Gaps ─── */}
        <TabsContent value="gaps" className="mt-3 space-y-3">
          {report.areas.map(area => {
            if (area.gaps.length === 0) return null;
            return (
              <Card key={area.areaId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{area.label}</CardTitle>
                    <TrafficLightBadge light={area.light} score={area.score} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{area.legalBasis}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {area.gaps.map((gap, i) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          {report.areas.every(a => a.gaps.length === 0) && (
            <Card className="border-emerald-300">
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">No se han detectado carencias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos los indicadores están activos. Recuerde que esto es orientativo.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Document Pack ─── */}
        <TabsContent value="docpack" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Pack Documental para Inspección
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {report.documentPack.filter(d => d.available).length}/{report.documentPack.length} disponibles
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Documentación agrupada por área, basada en los datos internos del ERP.
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-3">
                {INSPECTION_AREAS.map(area => {
                  const areaDocs = report.documentPack.filter(d => d.areaId === area.id);
                  if (areaDocs.length === 0) return null;
                  return (
                    <div key={area.id} className="mb-4">
                      <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                        {area.label}
                      </h4>
                      <div className="space-y-1.5">
                        {areaDocs.map(doc => (
                          <div
                            key={doc.documentType}
                            className={cn(
                              'flex items-center justify-between p-2.5 rounded-lg border text-xs',
                              doc.available
                                ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20'
                                : 'bg-muted/30 border-dashed'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className={cn(
                                'h-3.5 w-3.5',
                                doc.available ? 'text-emerald-600' : 'text-muted-foreground'
                              )} />
                              <span>{doc.label}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px]',
                                doc.available
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {doc.available ? 'Disponible' : 'No disponible'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Toggle group helper ─────────────────────────────────────────────────────

function renderToggleGroup(
  title: string,
  fields: [keyof CompanyDataSnapshot, string][],
  snapshot: CompanyDataSnapshot,
  toggleField: (field: keyof CompanyDataSnapshot) => void
) {
  return (
    <div className="space-y-2">
      <h5 className="text-xs font-semibold text-muted-foreground">{title}</h5>
      {fields.map(([field, label]) => (
        <div key={field} className="flex items-center justify-between">
          <span className="text-xs">{label}</span>
          <Switch
            checked={!!snapshot[field]}
            onCheckedChange={() => toggleField(field)}
          />
        </div>
      ))}
    </div>
  );
}

export default HRInspectionCopilotPanel;
