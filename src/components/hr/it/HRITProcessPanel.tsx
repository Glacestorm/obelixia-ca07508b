/**
 * HRITProcessPanel — Panel principal de procesos de Incapacidad Temporal
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCw, Plus, AlertTriangle, Clock, CheckCircle,
  FileText, Calculator, Activity, XCircle, ChevronRight, CalendarIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useHRITProcesses } from '@/hooks/hr/useHRITProcesses';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { getProcessAlerts, calculateMilestones } from '@/lib/hr/it-engine';
import { IT_PROCESS_TYPE_LABELS } from '@/types/hr';
import type { HRITProcess, ITProcessType } from '@/types/hr';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  closed: { label: 'Cerrado', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  extended: { label: 'Prorrogado', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  relapsed: { label: 'Recaída', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const processTypeColors: Record<string, string> = {
  EC: 'bg-yellow-500/10 text-yellow-600',
  AT: 'bg-red-500/10 text-red-600',
  ANL: 'bg-orange-500/10 text-orange-600',
  MAT: 'bg-pink-500/10 text-pink-600',
  PAT: 'bg-indigo-500/10 text-indigo-600',
  RE: 'bg-purple-500/10 text-purple-600',
};

export function HRITProcessPanel() {
  const { currentCompany } = useERPContext();
  const companyId = currentCompany?.id;
  const {
    processes, parts, bases, isLoading,
    fetchProcesses, fetchParts, fetchBases,
    createProcess, createPart, updateProcess,
  } = useHRITProcesses(companyId);

  const [activeTab, setActiveTab] = useState('processes');
  const [selectedProcess, setSelectedProcess] = useState<HRITProcess | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    if (companyId) {
      fetchProcesses({
        status: filterStatus || undefined,
        process_type: filterType || undefined,
      });
    }
  }, [companyId, fetchProcesses, filterStatus, filterType]);

  const handleSelectProcess = useCallback(async (process: HRITProcess) => {
    setSelectedProcess(process);
    await Promise.all([fetchParts(process.id), fetchBases(process.id)]);
    setActiveTab('detail');
  }, [fetchParts, fetchBases]);

  // Count active alerts
  const activeAlerts = processes
    .filter(p => p.status === 'active')
    .flatMap(p => getProcessAlerts(p));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Incapacidad Temporal</h2>
            <p className="text-sm text-muted-foreground">
              LGSS art. 169-176 · RD 625/2014
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProcesses({ status: filterStatus || undefined, process_type: filterType || undefined })}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <NewProcessDialog
            open={showNewDialog}
            onOpenChange={setShowNewDialog}
            onSubmit={createProcess}
          />
        </div>
      </div>

      {/* Alert banner */}
      {activeAlerts.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="font-medium text-orange-600">
                {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} activa{activeAlerts.length > 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground">—</span>
              <span className="text-muted-foreground truncate">
                {activeAlerts[0]?.message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniKPI label="Total procesos" value={processes.length} icon={FileText} />
        <MiniKPI label="Activos" value={processes.filter(p => p.status === 'active').length} icon={Activity} color="text-blue-500" />
        <MiniKPI label="EC" value={processes.filter(p => p.process_type === 'EC').length} icon={Clock} color="text-yellow-500" />
        <MiniKPI label="AT/ANL" value={processes.filter(p => p.process_type === 'AT' || p.process_type === 'ANL').length} icon={AlertTriangle} color="text-red-500" />
        <MiniKPI label="MAT/PAT" value={processes.filter(p => p.process_type === 'MAT' || p.process_type === 'PAT').length} icon={CheckCircle} color="text-pink-500" />
      </div>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processes">Procesos</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedProcess}>Detalle</TabsTrigger>
          <TabsTrigger value="alerts">Alertas ({activeAlerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="processes" className="mt-4">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="closed">Cerrados</SelectItem>
                <SelectItem value="extended">Prorrogados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de proceso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(IT_PROCESS_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                {processes.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay procesos IT registrados</p>
                    <p className="text-xs mt-1">Crea un nuevo proceso para comenzar</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {processes.map((process) => {
                      const alerts = getProcessAlerts(process);
                      const milestones = calculateMilestones(process.start_date);
                      const sc = statusConfig[process.status] || statusConfig.active;
                      return (
                        <div
                          key={process.id}
                          className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleSelectProcess(process)}
                        >
                          <Badge className={cn("text-xs font-mono", processTypeColors[process.process_type])}>
                            {process.process_type}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {IT_PROCESS_TYPE_LABELS[process.process_type as ITProcessType]}
                              </p>
                              {alerts.length > 0 && (
                                <AlertTriangle className={cn("h-3.5 w-3.5", alerts[0].type === 'critical' ? 'text-red-500' : 'text-orange-500')} />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {process.start_date} → {process.end_date || 'En curso'} · {milestones.daysElapsed} días
                              {process.diagnosis_description && ` · ${process.diagnosis_description}`}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("text-xs", sc.color)}>
                            {sc.label}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          {selectedProcess && (
            <ProcessDetailView
              process={selectedProcess}
              parts={parts}
              bases={bases}
              onCreatePart={createPart}
              onUpdateProcess={updateProcess}
            />
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alertas de Hitos Temporales</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Sin alertas activas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {processes
                      .filter(p => p.status === 'active')
                      .map(p => {
                        const alerts = getProcessAlerts(p);
                        return alerts.map((alert, i) => (
                          <div
                            key={`${p.id}-${i}`}
                            className={cn(
                              "p-3 rounded-lg border",
                              alert.type === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                              alert.type === 'warning' ? 'border-orange-500/30 bg-orange-500/5' :
                              'border-blue-500/30 bg-blue-500/5'
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {alert.type === 'critical' ? <XCircle className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                              <span className="text-sm font-medium">{IT_PROCESS_TYPE_LABELS[p.process_type as ITProcessType]}</span>
                              <Badge variant="outline" className="text-[10px]">{alert.code}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">{alert.message}</p>
                          </div>
                        ));
                      })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function MiniKPI({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: typeof Activity; color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
          <span className="text-lg font-bold">{value}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function NewProcessDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<any>;
}) {
  const [form, setForm] = useState({
    process_type: 'EC' as ITProcessType,
    start_date: new Date().toISOString().split('T')[0],
    employee_id: '',
    diagnosis_description: '',
    issuing_entity: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!form.employee_id) {
      return;
    }
    await onSubmit(form);
    onOpenChange(false);
    setForm({
      process_type: 'EC',
      start_date: new Date().toISOString().split('T')[0],
      employee_id: '',
      diagnosis_description: '',
      issuing_entity: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo proceso IT
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Proceso de Incapacidad Temporal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de proceso</Label>
              <Select value={form.process_type} onValueChange={(v) => setForm(f => ({ ...f, process_type: v as ITProcessType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IT_PROCESS_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de baja</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>ID Empleado</Label>
            <Input
              placeholder="UUID del empleado"
              value={form.employee_id}
              onChange={(e) => setForm(f => ({ ...f, employee_id: e.target.value }))}
            />
          </div>
          <div>
            <Label>Diagnóstico</Label>
            <Input
              placeholder="Descripción del diagnóstico"
              value={form.diagnosis_description}
              onChange={(e) => setForm(f => ({ ...f, diagnosis_description: e.target.value }))}
            />
          </div>
          <div>
            <Label>Entidad emisora</Label>
            <Input
              placeholder="INSS, Mutua..."
              value={form.issuing_entity}
              onChange={(e) => setForm(f => ({ ...f, issuing_entity: e.target.value }))}
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Crear proceso IT
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProcessDetailView({ process, parts, bases, onCreatePart, onUpdateProcess }: {
  process: HRITProcess;
  parts: any[];
  bases: any[];
  onCreatePart: (data: any) => Promise<any>;
  onUpdateProcess: (id: string, data: any) => Promise<boolean>;
}) {
  const milestones = calculateMilestones(process.start_date);
  const alerts = getProcessAlerts(process);
  const [detailTab, setDetailTab] = useState('bases');
  const isERE = process.process_type === 'ERE_TOTAL' || process.process_type === 'ERE_PARCIAL';

  // ERE form state
  const [ereForm, setEreForm] = useState({
    ere_number: (process as any).ere_number ?? '',
    ere_resume_previous: (process as any).ere_resume_previous ?? false,
    ere_suspension_pct: (process as any).ere_suspension_pct ?? 0,
    ere_cc_base: (process as any).ere_cc_base ?? 0,
    ere_at_base: (process as any).ere_at_base ?? 0,
    ere_cc_base_1: (process as any).ere_cc_base_1 ?? 0,
    ere_cc_base_2: (process as any).ere_cc_base_2 ?? 0,
    ere_at_base_1: (process as any).ere_at_base_1 ?? 0,
    ere_at_base_2: (process as any).ere_at_base_2 ?? 0,
    ere_no_unemployment: (process as any).ere_no_unemployment ?? false,
  });

  // Otros form state
  const [otrosForm, setOtrosForm] = useState({
    strike_work_pct: (process as any).strike_work_pct ?? 0,
    pnr_cc_base: (process as any).pnr_cc_base ?? 0,
    pnr_at_base: (process as any).pnr_at_base ?? 0,
  });

  // Bases sub-tab state
  const [basesSubTab, setBasesSubTab] = useState('del_mes');
  const [basesDirectasForm, setBasesDirectasForm] = useState({
    base_enfermedad: (process as any).base_enfermedad ?? 0,
    base_accidente: (process as any).base_accidente ?? 0,
    base_maternidad: (process as any).base_maternidad ?? 0,
    base_hextras: (process as any).base_hextras ?? 0,
  });
  const [basesFdiForm, setBasesFdiForm] = useState({
    fdi_cc_base: (process as any).fdi_cc_base ?? 0,
    fdi_at_base: (process as any).fdi_at_base ?? 0,
    fdi_compatible_tp: (process as any).fdi_compatible_tp ?? false,
    fdi_pct_base_reg: (process as any).fdi_pct_base_reg ?? 0,
    fdi_recaida: (process as any).fdi_recaida ?? false,
    fdi_pct_liquido: (process as any).fdi_pct_liquido ?? 0,
    fdi_esquema_complemento: (process as any).fdi_esquema_complemento ?? '',
    fdi_no_complementa: (process as any).fdi_no_complementa ?? false,
    fdi_ruptura_recibo: (process as any).fdi_ruptura_recibo ?? false,
    fdi_atrasos_cotizacion: (process as any).fdi_atrasos_cotizacion ?? false,
    fdi_tipo_liquidacion: (process as any).fdi_tipo_liquidacion ?? '',
  });

  // Otros datos form state
  const [otrosDatosForm, setOtrosDatosForm] = useState({
    tipo_asistencia: (process as any).tipo_asistencia ?? '',
    mat_motivo: (process as any).mat_motivo ?? '',
    mat_empleado_publico: (process as any).mat_empleado_publico ?? '',
    emp_pub_permiso_desde: (process as any).emp_pub_permiso_desde ?? '',
    emp_pub_permiso_hasta: (process as any).emp_pub_permiso_hasta ?? '',
    emp_pub_otra_norma: (process as any).emp_pub_otra_norma ?? '',
    siguiente_revision_medica: (process as any).siguiente_revision_medica ? new Date((process as any).siguiente_revision_medica) : undefined as Date | undefined,
  });

  // Partes conf dialog
  const [showConfPartDialog, setShowConfPartDialog] = useState(false);
  const [confPartForm, setConfPartForm] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    part_number: parts.length + 1,
    has_change: false,
    entity: '',
    insurer_name: '',
    change_date: '',
    last_by_transfer: false,
  });

  return (
    <div className="space-y-4">
      {/* Process info card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge className={cn("text-xs font-mono", processTypeColors[process.process_type])}>
                {process.process_type}
              </Badge>
              {IT_PROCESS_TYPE_LABELS[process.process_type as ITProcessType]}
            </CardTitle>
            {process.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateProcess(process.id, { status: 'closed', end_date: new Date().toISOString().split('T')[0] })}
              >
                Cerrar proceso
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Fecha baja</p>
              <p className="font-medium">{process.start_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha alta</p>
              <p className="font-medium">{process.end_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Días transcurridos</p>
              <p className="font-medium">{milestones.daysElapsed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hito 365</p>
              <p className={cn("font-medium", milestones.isPast365 && "text-orange-500")}>
                {milestones.milestone365}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hito 545</p>
              <p className={cn("font-medium", milestones.isPast545 && "text-red-500")}>
                {milestones.milestone545}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pago directo</p>
              <p className="font-medium">{process.direct_payment ? 'Sí' : 'No'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Complemento</p>
              <p className="font-medium">{process.complement_scheme} ({process.complement_percentage}%)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diagnóstico</p>
              <p className="font-medium truncate">{process.diagnosis_description || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Card key={i} className={cn(
              "border",
              alert.type === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-orange-500/30 bg-orange-500/5'
            )}>
              <CardContent className="py-3 flex items-center gap-2">
                {alert.type === 'critical' ? <XCircle className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                <span className="text-sm">{alert.message}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className={cn("grid w-full", isERE ? "grid-cols-6" : "grid-cols-5")}>
          <TabsTrigger value="bases" className="text-xs">Bases I.T.</TabsTrigger>
          <TabsTrigger value="partes_baja" className="text-xs">Partes Baja/Alta</TabsTrigger>
          <TabsTrigger value="partes_conf" className="text-xs">Partes Confirmación</TabsTrigger>
          <TabsTrigger value="otros_datos" className="text-xs">Otros datos I.T.</TabsTrigger>
          {isERE && <TabsTrigger value="ere" className="text-xs">Exp. Regul. Empleo</TabsTrigger>}
          <TabsTrigger value="otros" className="text-xs">Otros</TabsTrigger>
        </TabsList>

        {/* Tab: Bases I.T. — 3 sub-tabs */}
        <TabsContent value="bases" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Bases I.T.</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={basesSubTab} onValueChange={setBasesSubTab}>
                <TabsList className="grid w-full grid-cols-3 mb-3">
                  <TabsTrigger value="del_mes" className="text-xs">Del mes</TabsTrigger>
                  <TabsTrigger value="bases_directas" className="text-xs">Bases directas</TabsTrigger>
                  <TabsTrigger value="bases_fdi" className="text-xs">Bases mes FDI</TabsTrigger>
                </TabsList>

                <TabsContent value="del_mes" className="mt-2">
                  {bases.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin bases calculadas</p>
                  ) : (
                    <div className="space-y-2">
                      {bases.map((base: any) => (
                        <div key={base.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                          <span className="text-muted-foreground">{base.calculation_date}</span>
                          <span className="flex-1 font-medium">Base: {base.total_base_reguladora}€</span>
                          <span className="text-muted-foreground">{base.pct_subsidy}% → {base.daily_subsidy}€/día</span>
                          {base.employer_complement > 0 && (
                            <Badge variant="secondary" className="text-xs">+{base.employer_complement}€ compl.</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="bases_directas" className="mt-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Enfermedad / Común (€)</Label>
                      <Input type="number" min={0} step={0.01} value={basesDirectasForm.base_enfermedad} onChange={e => setBasesDirectasForm(f => ({ ...f, base_enfermedad: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Accidente / Profesional (€)</Label>
                      <Input type="number" min={0} step={0.01} value={basesDirectasForm.base_accidente} onChange={e => setBasesDirectasForm(f => ({ ...f, base_accidente: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Maternidad (€)</Label>
                      <Input type="number" min={0} step={0.01} value={basesDirectasForm.base_maternidad} onChange={e => setBasesDirectasForm(f => ({ ...f, base_maternidad: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Horas extras (€)</Label>
                      <Input type="number" min={0} step={0.01} value={basesDirectasForm.base_hextras} onChange={e => setBasesDirectasForm(f => ({ ...f, base_hextras: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <Button onClick={() => onUpdateProcess(process.id, basesDirectasForm)}>Guardar bases directas</Button>
                </TabsContent>

                <TabsContent value="bases_fdi" className="mt-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Base FDI Contingencias Comunes (€)</Label>
                      <Input type="number" min={0} step={0.01} value={basesFdiForm.fdi_cc_base} onChange={e => setBasesFdiForm(f => ({ ...f, fdi_cc_base: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Base FDI A.T. y E.P. (€)</Label>
                      <Input type="number" min={0} step={0.01} value={basesFdiForm.fdi_at_base} onChange={e => setBasesFdiForm(f => ({ ...f, fdi_at_base: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>% de Base reguladora</Label>
                      <Input type="number" min={0} max={100} value={basesFdiForm.fdi_pct_base_reg} onChange={e => setBasesFdiForm(f => ({ ...f, fdi_pct_base_reg: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>% líquido de referencia</Label>
                      <Input type="number" min={0} max={100} value={basesFdiForm.fdi_pct_liquido} onChange={e => setBasesFdiForm(f => ({ ...f, fdi_pct_liquido: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Esquema de complemento IT</Label>
                      <Select value={basesFdiForm.fdi_esquema_complemento} onValueChange={v => setBasesFdiForm(f => ({ ...f, fdi_esquema_complemento: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="convenio">Convenio</SelectItem>
                          <SelectItem value="empresa">Empresa</SelectItem>
                          <SelectItem value="ninguno">Ninguno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo liquidación</Label>
                      <Input value={basesFdiForm.fdi_tipo_liquidacion} onChange={e => setBasesFdiForm(f => ({ ...f, fdi_tipo_liquidacion: e.target.value }))} placeholder="Ej: L00, L13..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="fdi_compat_tp" checked={basesFdiForm.fdi_compatible_tp} onCheckedChange={v => setBasesFdiForm(f => ({ ...f, fdi_compatible_tp: !!v }))} />
                      <Label htmlFor="fdi_compat_tp" className="cursor-pointer">Compatible con jornada a tiempo parcial</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="fdi_recaida" checked={basesFdiForm.fdi_recaida} onCheckedChange={v => setBasesFdiForm(f => ({ ...f, fdi_recaida: !!v }))} />
                      <Label htmlFor="fdi_recaida" className="cursor-pointer">Recaída del proceso</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="fdi_no_compl" checked={basesFdiForm.fdi_no_complementa} onCheckedChange={v => setBasesFdiForm(f => ({ ...f, fdi_no_complementa: !!v }))} />
                      <Label htmlFor="fdi_no_compl" className="cursor-pointer">Este proceso no complementa la IT</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="fdi_ruptura" checked={basesFdiForm.fdi_ruptura_recibo} onCheckedChange={v => setBasesFdiForm(f => ({ ...f, fdi_ruptura_recibo: !!v }))} />
                      <Label htmlFor="fdi_ruptura" className="cursor-pointer">Ruptura de recibo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="fdi_atrasos" checked={basesFdiForm.fdi_atrasos_cotizacion} onCheckedChange={v => setBasesFdiForm(f => ({ ...f, fdi_atrasos_cotizacion: !!v }))} />
                      <Label htmlFor="fdi_atrasos" className="cursor-pointer">Atrasos cotización</Label>
                    </div>
                  </div>
                  <Button onClick={() => onUpdateProcess(process.id, basesFdiForm)}>Guardar datos FDI</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Partes Baja/Alta (unchanged) */}
        <TabsContent value="partes_baja" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Partes de Baja y Alta</CardTitle>
                <Button variant="outline" size="sm" onClick={() => onCreatePart({ process_id: process.id, part_type: 'baja', issue_date: new Date().toISOString().split('T')[0], part_number: parts.length + 1 })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir parte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {parts.filter((p: any) => p.part_type === 'baja' || p.part_type === 'alta').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin partes de baja/alta registrados</p>
              ) : (
                <div className="space-y-2">
                  {parts.filter((p: any) => p.part_type === 'baja' || p.part_type === 'alta').map((part: any) => (
                    <div key={part.id} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                      <Badge variant="outline" className="text-xs capitalize">{part.part_type}</Badge>
                      <span className="text-muted-foreground">#{part.part_number}</span>
                      <span className="flex-1">{part.issue_date}</span>
                      <Badge variant="outline" className="text-xs">{part.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Partes Confirmación — tabla 7 columnas */}
        <TabsContent value="partes_conf" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Partes de Confirmación (RD 625/2014)</CardTitle>
                <Dialog open={showConfPartDialog} onOpenChange={setShowConfPartDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Registrar parte de confirmación
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nuevo Parte de Confirmación</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Fecha</Label>
                          <Input type="date" value={confPartForm.issue_date} onChange={e => setConfPartForm(f => ({ ...f, issue_date: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Nº Parte</Label>
                          <Input type="number" value={confPartForm.part_number} onChange={e => setConfPartForm(f => ({ ...f, part_number: Number(e.target.value) }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Entidad</Label>
                        <Input value={confPartForm.entity} onChange={e => setConfPartForm(f => ({ ...f, entity: e.target.value }))} placeholder="INSS, Mutua..." />
                      </div>
                      <div>
                        <Label>Denominación aseguradora</Label>
                        <Input value={confPartForm.insurer_name} onChange={e => setConfPartForm(f => ({ ...f, insurer_name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Fecha cambio</Label>
                        <Input type="date" value={confPartForm.change_date} onChange={e => setConfPartForm(f => ({ ...f, change_date: e.target.value }))} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox id="conf_change" checked={confPartForm.has_change} onCheckedChange={v => setConfPartForm(f => ({ ...f, has_change: !!v }))} />
                          <Label htmlFor="conf_change" className="cursor-pointer">Cambio</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="conf_transfer" checked={confPartForm.last_by_transfer} onCheckedChange={v => setConfPartForm(f => ({ ...f, last_by_transfer: !!v }))} />
                          <Label htmlFor="conf_transfer" className="cursor-pointer">Último por traslado</Label>
                        </div>
                      </div>
                      <Button className="w-full" onClick={async () => {
                        await onCreatePart({
                          process_id: process.id,
                          part_type: 'confirmacion',
                          issue_date: confPartForm.issue_date,
                          part_number: confPartForm.part_number,
                          metadata: {
                            has_change: confPartForm.has_change,
                            entity: confPartForm.entity,
                            insurer_name: confPartForm.insurer_name,
                            change_date: confPartForm.change_date,
                            last_by_transfer: confPartForm.last_by_transfer,
                          },
                        });
                        setShowConfPartDialog(false);
                      }}>Registrar parte</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {parts.filter((p: any) => p.part_type === 'confirmacion').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay partes de confirmación registrados</p>
              ) : (
                <ScrollArea className="w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2 font-medium text-muted-foreground">Fecha</th>
                        <th className="p-2 font-medium text-muted-foreground">Nº Parte</th>
                        <th className="p-2 font-medium text-muted-foreground">Cambio</th>
                        <th className="p-2 font-medium text-muted-foreground">Entidad</th>
                        <th className="p-2 font-medium text-muted-foreground">Denom. aseguradora</th>
                        <th className="p-2 font-medium text-muted-foreground">Fecha cambio</th>
                        <th className="p-2 font-medium text-muted-foreground">Último por traslado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.filter((p: any) => p.part_type === 'confirmacion').map((part: any) => {
                        const meta = part.metadata ?? {};
                        return (
                          <tr key={part.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{part.issue_date}</td>
                            <td className="p-2">{part.part_number}</td>
                            <td className="p-2">{meta.has_change ? 'S' : 'N'}</td>
                            <td className="p-2">{meta.entity || '—'}</td>
                            <td className="p-2">{meta.insurer_name || '—'}</td>
                            <td className="p-2">{meta.change_date || '—'}</td>
                            <td className="p-2">{meta.last_by_transfer ? 'S' : 'N'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Otros datos I.T. — ampliado */}
        <TabsContent value="otros_datos" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Datos Clínicos e Hitos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Diagnóstico</p>
                  <p className="font-medium">{process.diagnosis_description || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entidad emisora</p>
                  <p className="font-medium">{process.issuing_entity || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago directo</p>
                  <p className="font-medium">{process.direct_payment ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Esquema complemento</p>
                  <p className="font-medium">{process.complement_scheme} ({process.complement_percentage}%)</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Hito 365 días</p>
                  <p className={cn("font-medium", milestones.isPast365 && "text-orange-500")}>{milestones.milestone365}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hito 545 días</p>
                  <p className={cn("font-medium", milestones.isPast545 && "text-red-500")}>{milestones.milestone545}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Días transcurridos</p>
                  <p className="font-medium">{milestones.daysElapsed}</p>
                </div>
              </div>

              {process.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm">{process.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Campos adicionales */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo asistencia</Label>
                  <Select value={otrosDatosForm.tipo_asistencia} onValueChange={v => setOtrosDatosForm(f => ({ ...f, tipo_asistencia: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgencia">Urgencia</SelectItem>
                      <SelectItem value="domicilio">Domicilio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Siguiente revisión médica</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !otrosDatosForm.siguiente_revision_medica && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {otrosDatosForm.siguiente_revision_medica ? format(otrosDatosForm.siguiente_revision_medica, 'dd/MM/yyyy') : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={otrosDatosForm.siguiente_revision_medica} onSelect={d => setOtrosDatosForm(f => ({ ...f, siguiente_revision_medica: d }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Maternidad / Paternidad</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Motivo</Label>
                    <Select value={otrosDatosForm.mat_motivo} onValueChange={v => setOtrosDatosForm(f => ({ ...f, mat_motivo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacimiento">Nacimiento</SelectItem>
                        <SelectItem value="adopcion">Adopción</SelectItem>
                        <SelectItem value="acogimiento">Acogimiento</SelectItem>
                        <SelectItem value="riesgo_embarazo">Riesgo embarazo</SelectItem>
                        <SelectItem value="riesgo_lactancia">Riesgo lactancia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Empleado público</Label>
                    <Select value={otrosDatosForm.mat_empleado_publico} onValueChange={v => setOtrosDatosForm(f => ({ ...f, mat_empleado_publico: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="si_funcionario">Sí - Funcionario</SelectItem>
                        <SelectItem value="si_laboral">Sí - Laboral</SelectItem>
                        <SelectItem value="si_estatutario">Sí - Estatutario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Empleado público</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Permiso cargo emp. pública (desde)</Label>
                    <Input type="date" value={otrosDatosForm.emp_pub_permiso_desde} onChange={e => setOtrosDatosForm(f => ({ ...f, emp_pub_permiso_desde: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Permiso cargo emp. pública (hasta)</Label>
                    <Input type="date" value={otrosDatosForm.emp_pub_permiso_hasta} onChange={e => setOtrosDatosForm(f => ({ ...f, emp_pub_permiso_hasta: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Otra norma EBEP</Label>
                    <Input value={otrosDatosForm.emp_pub_otra_norma} onChange={e => setOtrosDatosForm(f => ({ ...f, emp_pub_otra_norma: e.target.value }))} placeholder="Art. / Disposición..." />
                  </div>
                </div>
              </div>

              <Button onClick={() => onUpdateProcess(process.id, {
                ...otrosDatosForm,
                siguiente_revision_medica: otrosDatosForm.siguiente_revision_medica?.toISOString().split('T')[0] ?? null,
              })}>Guardar otros datos</Button>
            </CardContent>
          </Card>
        </TabsContent>
        {isERE && (
          <TabsContent value="ere" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Expediente de Regulación de Empleo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número de ERE</Label>
                    <Input
                      value={ereForm.ere_number}
                      onChange={e => setEreForm(f => ({ ...f, ere_number: e.target.value }))}
                      placeholder="Ej: ERE/2026/001"
                    />
                  </div>
                  <div>
                    <Label>% jornada en suspensión parcial</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={ereForm.ere_suspension_pct}
                      onChange={e => setEreForm(f => ({ ...f, ere_suspension_pct: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ere_resume"
                    checked={ereForm.ere_resume_previous}
                    onCheckedChange={v => setEreForm(f => ({ ...f, ere_resume_previous: !!v }))}
                  />
                  <Label htmlFor="ere_resume" className="cursor-pointer">Reanudación del anterior</Label>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Bases diarias directas</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contingencias comunes (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ereForm.ere_cc_base}
                        onChange={e => setEreForm(f => ({ ...f, ere_cc_base: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>A.T. y E.P. (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ereForm.ere_at_base}
                        onChange={e => setEreForm(f => ({ ...f, ere_at_base: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Bases diarias directas 1-2 (ERE con 2 periodos)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contingencias comunes 1 (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ereForm.ere_cc_base_1}
                        onChange={e => setEreForm(f => ({ ...f, ere_cc_base_1: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Contingencias comunes 2 (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ereForm.ere_cc_base_2}
                        onChange={e => setEreForm(f => ({ ...f, ere_cc_base_2: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>A.T. y E.P. 1 (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ereForm.ere_at_base_1}
                        onChange={e => setEreForm(f => ({ ...f, ere_at_base_1: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>A.T. y E.P. 2 (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ereForm.ere_at_base_2}
                        onChange={e => setEreForm(f => ({ ...f, ere_at_base_2: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ere_no_unemp"
                    checked={ereForm.ere_no_unemployment}
                    onCheckedChange={v => setEreForm(f => ({ ...f, ere_no_unemployment: !!v }))}
                  />
                  <Label htmlFor="ere_no_unemp" className="cursor-pointer">No cobra prestación por desempleo</Label>
                </div>

                <Button
                  className="w-full"
                  onClick={() => onUpdateProcess(process.id, ereForm)}
                >
                  Guardar datos ERE
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Otros */}
        <TabsContent value="otros" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Otros datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Huelga</p>
                <div className="max-w-xs">
                  <Label>% de jornada trabajada (0-100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={otrosForm.strike_work_pct}
                    onChange={e => setOtrosForm(f => ({ ...f, strike_work_pct: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Permiso no retribuido para funcionarios</p>
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <Label>Contingencias comunes (€)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={otrosForm.pnr_cc_base}
                      onChange={e => setOtrosForm(f => ({ ...f, pnr_cc_base: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>A.T. y E.P. (€)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={otrosForm.pnr_at_base}
                      onChange={e => setOtrosForm(f => ({ ...f, pnr_at_base: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {/* TODO: conectar cálculo de bases */}}>
                  Calcular bases
                </Button>
                <Button onClick={() => onUpdateProcess(process.id, otrosForm)}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRITProcessPanel;
