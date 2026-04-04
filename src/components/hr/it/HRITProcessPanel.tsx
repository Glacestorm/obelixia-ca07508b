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
  FileText, Calculator, Activity, XCircle, ChevronRight,
} from 'lucide-react';
import { useHRITProcesses } from '@/hooks/hr/useHRITProcesses';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { getProcessAlerts, calculateMilestones } from '@/lib/hr/it-engine';
import { IT_PROCESS_TYPE_LABELS } from '@/types/hr';
import type { HRITProcess, ITProcessType } from '@/types/hr';
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

      {/* Parts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Partes (RD 625/2014)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreatePart({
                process_id: process.id,
                part_type: 'confirmacion',
                issue_date: new Date().toISOString().split('T')[0],
                part_number: parts.length + 1,
              })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir parte
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin partes registrados</p>
          ) : (
            <div className="space-y-2">
              {parts.map((part: any) => (
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

      {/* Bases */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Bases Reguladoras</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default HRITProcessPanel;
