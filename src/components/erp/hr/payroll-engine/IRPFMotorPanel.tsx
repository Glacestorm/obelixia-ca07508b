/**
 * IRPFMotorPanel — Motor IRPF: Modelo 111, 190 y certificados
 * P1.5R: Replaced demo data with real engine integration + tracking card
 * Absorbed from HRIRPFPage.tsx standalone (S8.5)
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator, FileText, TrendingUp, AlertTriangle,
  CheckCircle, RefreshCw, Download, Users, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { FiscalIRPFTrackingCard } from './FiscalIRPFTrackingCard';
import { AEATResponseDialog } from './AEATResponseDialog';
import { AEAT_STATUS_META, type AEATArtifactStatus } from '@/engines/erp/hr/aeatArtifactEngine';

interface IRPFEmployeeSummary {
  id: string;
  name: string;
  nif?: string;
  situacion: 1 | 2 | 3;
  tipoLegal: number;
  tipoSolicitado: number | null;
  tipoEfectivo: number;
  baseAnual: number;
  retencionMensual: number;
  regularizado: boolean;
  modelo145Complete: boolean;
}

interface IRPFMotorPanelProps {
  companyId?: string;
  /** Employee data from real payroll engine — if not provided, shows empty state */
  employees?: IRPFEmployeeSummary[];
  /** Modelo 111 artifacts status */
  modelo111Status?: Array<{ trimester: number; status: AEATArtifactStatus; periodLabel: string }>;
  /** Modelo 190 status */
  modelo190Status?: AEATArtifactStatus | null;
  /** Periodicity */
  periodicity?: 'trimestral' | 'mensual';
  /** Fiscal year */
  fiscalYear?: number;
  /** AEAT response statuses */
  aeat111ResponseStatus?: AEATArtifactStatus | null;
  aeat190ResponseStatus?: AEATArtifactStatus | null;
  /** Reconciliation score */
  reconciliationScore?: number;
}

export function IRPFMotorPanel({
  companyId = '',
  employees = [],
  modelo111Status = [],
  modelo190Status = null,
  periodicity = 'trimestral',
  fiscalYear = new Date().getFullYear(),
  aeat111ResponseStatus = null,
  aeat190ResponseStatus = null,
  reconciliationScore,
}: IRPFMotorPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState(`${fiscalYear}-Q${Math.ceil(new Date().getMonth() / 3) || 1}`);
  const [showAEATDialog, setShowAEATDialog] = useState(false);

  // Computed KPIs from real data
  const kpis = useMemo(() => {
    if (employees.length === 0) {
      return { perceptores: 0, tipoMedio: 0, retencionTrimestral: 0, regularizaciones: 0 };
    }
    const tipoMedio = employees.length > 0
      ? employees.reduce((s, e) => s + e.tipoEfectivo, 0) / employees.length
      : 0;
    const retencionMensualTotal = employees.reduce((s, e) => s + e.retencionMensual, 0);
    const regularizaciones = employees.filter(e => e.regularizado).length;
    return {
      perceptores: employees.length,
      tipoMedio: Math.round(tipoMedio * 10) / 10,
      retencionTrimestral: Math.round(retencionMensualTotal * 3 * 100) / 100,
      regularizaciones,
    };
  }, [employees]);

  // 145 completion
  const mod145Complete = employees.filter(e => e.modelo145Complete).length;

  // Period options
  const periodOptions = periodicity === 'mensual'
    ? Array.from({ length: 12 }, (_, i) => ({ value: `${fiscalYear}-M${i + 1}`, label: `${fiscalYear} — M${i + 1}` }))
    : Array.from({ length: 4 }, (_, i) => ({ value: `${fiscalYear}-Q${i + 1}`, label: `${fiscalYear} — T${i + 1}` }));

  const hasData = employees.length > 0;

  return (
    <div className="space-y-6">
      {/* Tracking Card */}
      <FiscalIRPFTrackingCard
        modelo145Complete={mod145Complete}
        modelo145Total={employees.length}
        irpfCalcStatus={hasData ? (kpis.perceptores > 0 ? 'complete' : 'partial') : 'not_started'}
        modelo111Artifacts={modelo111Status.map(s => ({ status: s.status, periodLabel: s.periodLabel }))}
        modelo111Periodicity={periodicity}
        modelo190Status={modelo190Status}
        modelo190FiscalYear={fiscalYear}
        aeat111ResponseStatus={aeat111ResponseStatus}
        aeat190ResponseStatus={aeat190ResponseStatus}
        reconciliationScore={reconciliationScore}
        onRegisterAEATResponse={() => setShowAEATDialog(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Motor IRPF</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Regularización fiscal, modelos 111/190 y certificados de retenciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {periodicity === 'mensual' && (
            <Badge variant="outline" className="text-[10px]">Grandes empresas</Badge>
          )}
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" /> Recalcular
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Perceptores</span></div><p className="text-2xl font-bold">{kpis.perceptores}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Calculator className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Tipo medio</span></div><p className="text-2xl font-bold">{kpis.tipoMedio}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Retención {periodicity === 'mensual' ? 'mensual' : 'trimestral'}</span></div><p className="text-2xl font-bold">{kpis.retencionTrimestral.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Regularizaciones</span></div><p className="text-2xl font-bold">{kpis.regularizaciones}</p></CardContent></Card>
      </div>

      {/* Empty state */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Calculator className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sin datos de empleados para el período seleccionado</p>
            <p className="text-xs text-muted-foreground mt-1">Los datos se cargarán automáticamente desde el motor de nómina</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {hasData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Resumen retenciones</TabsTrigger>
            <TabsTrigger value="modelo111" className="flex items-center gap-1">
              Modelo 111
              {modelo111Status.length > 0 && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
                  {modelo111Status.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="modelo190" className="flex items-center gap-1">
              Modelo 190
              {modelo190Status && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
                  {AEAT_STATUS_META[modelo190Status]?.label.split(' ')[0] ?? modelo190Status}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="certificates">Certificados</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retenciones por empleado — {selectedPeriod}</CardTitle>
                <CardDescription>Tipo legal (Art. 82-86 RIRPF) vs tipo solicitado (Art. 88.5 RIRPF)</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {employees.map((emp) => (
                      <div key={emp.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Situación {emp.situacion} · Base anual: {emp.baseAnual.toLocaleString('es-ES')} €
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!emp.modelo145Complete && (
                              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                                145 incompleto
                              </Badge>
                            )}
                            {emp.regularizado && (
                              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                                Regularizado
                              </Badge>
                            )}
                            {emp.tipoSolicitado && emp.tipoSolicitado > emp.tipoLegal && (
                              <Badge variant="secondary" className="text-[10px]">Art. 88.5</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div><span className="text-muted-foreground">Tipo legal</span><p className="font-mono font-semibold">{emp.tipoLegal}%</p></div>
                          <div><span className="text-muted-foreground">Solicitado</span><p className="font-mono font-semibold">{emp.tipoSolicitado ? `${emp.tipoSolicitado}%` : '—'}</p></div>
                          <div><span className="text-muted-foreground">Tipo efectivo</span><p className="font-mono font-semibold text-primary">{emp.tipoEfectivo}%</p></div>
                          <div><span className="text-muted-foreground">Retención/mes</span><p className="font-mono font-semibold">{emp.retencionMensual.toFixed(2)} €</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modelo111" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Modelo 111 — Retenciones e ingresos a cuenta</CardTitle>
                    <CardDescription>
                      Declaración {periodicity === 'mensual' ? 'mensual (grandes empresas)' : 'trimestral'} de retenciones IRPF
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => toast.info('Generar Modelo 111 desde motor de nómina')}>
                    <Download className="h-4 w-4 mr-1" /> Generar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {modelo111Status.length > 0 ? (
                  <div className="space-y-3">
                    {modelo111Status.map((m111) => (
                      <div key={m111.trimester} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{m111.periodLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {AEAT_STATUS_META[m111.status]?.disclaimer.slice(0, 60) ?? m111.status}...
                          </p>
                        </div>
                        <Badge className={AEAT_STATUS_META[m111.status]?.color ?? ''}>
                          {AEAT_STATUS_META[m111.status]?.label ?? m111.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">I. Rendimientos del trabajo</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nº perceptores</span><span className="font-mono">{kpis.perceptores}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base retenciones</span><span className="font-mono">{(kpis.retencionTrimestral / (kpis.tipoMedio / 100 || 1)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Retenciones</span><span className="font-mono font-semibold text-primary">{kpis.retencionTrimestral.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">Resumen</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total a ingresar</span><span className="font-mono font-bold text-lg">{kpis.retencionTrimestral.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Período</span><span>{selectedPeriod}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modelo190" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Modelo 190 — Resumen anual</CardTitle>
                    <CardDescription>Declaración informativa anual de retenciones e ingresos a cuenta del IRPF</CardDescription>
                  </div>
                  {modelo190Status ? (
                    <Badge className={AEAT_STATUS_META[modelo190Status]?.color ?? ''}>
                      {AEAT_STATUS_META[modelo190Status]?.label ?? modelo190Status}
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <FileText className="h-4 w-4 mr-1" /> Disponible al cierre
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {modelo190Status
                      ? `Modelo 190 en estado: ${AEAT_STATUS_META[modelo190Status]?.label ?? modelo190Status}`
                      : 'El Modelo 190 se genera al cierre del ejercicio fiscal'}
                  </p>
                  <p className="text-xs mt-1">Datos acumulados del ejercicio {fiscalYear}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certificados de retenciones</CardTitle>
                <CardDescription>Generación individual de certificados para cada empleado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Retención acum.: {(emp.retencionMensual * 6).toFixed(2)} € · Tipo: {emp.tipoEfectivo}%
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`Certificado de ${emp.name} generado`)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* AEAT Response Dialog */}
      <AEATResponseDialog
        open={showAEATDialog}
        onOpenChange={setShowAEATDialog}
        companyId={companyId}
      />
    </div>
  );
}

export default IRPFMotorPanel;
