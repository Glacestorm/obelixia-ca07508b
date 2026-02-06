/**
 * HRContingentWorkforcePanel - Panel de gestión de fuerza laboral contingente
 * Fase 8: Freelancers, Contratistas y Trabajadores Externos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  UserPlus,
  FileText,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  Shield,
  TrendingUp,
  Building2,
  Briefcase,
  Calendar,
  FileCheck,
  Receipt,
  AlertCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useHRContingentWorkforce, ContingentWorker, ContingentWorkerType, ContingentWorkerStatus, ComplianceRiskLevel } from '@/hooks/erp/hr/useHRContingentWorkforce';
import { useERPContext } from '@/hooks/erp';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// ============ COMPONENTES AUXILIARES ============

const WorkerTypeBadge: React.FC<{ type: ContingentWorkerType }> = ({ type }) => {
  const config: Record<ContingentWorkerType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    freelancer: { label: 'Freelancer', variant: 'default' },
    contractor: { label: 'Contratista', variant: 'secondary' },
    consultant: { label: 'Consultor', variant: 'outline' },
    temp_agency: { label: 'ETT', variant: 'secondary' },
    outsourced: { label: 'Externalizado', variant: 'outline' },
    intern_external: { label: 'Becario Ext.', variant: 'secondary' },
    gig_worker: { label: 'Gig Worker', variant: 'default' }
  };

  const c = config[type] || { label: type, variant: 'outline' as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

const StatusBadge: React.FC<{ status: ContingentWorkerStatus }> = ({ status }) => {
  const config: Record<ContingentWorkerStatus, { label: string; className: string }> = {
    active: { label: 'Activo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    inactive: { label: 'Inactivo', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
    onboarding: { label: 'Onboarding', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    offboarding: { label: 'Offboarding', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    suspended: { label: 'Suspendido', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    pending_approval: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
  };

  const c = config[status] || { label: status, className: '' };
  return <Badge className={c.className}>{c.label}</Badge>;
};

const ComplianceBadge: React.FC<{ level: ComplianceRiskLevel }> = ({ level }) => {
  const config: Record<ComplianceRiskLevel, { label: string; icon: React.ReactNode; className: string }> = {
    low: { label: 'Bajo', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-green-100 text-green-800' },
    medium: { label: 'Medio', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-yellow-100 text-yellow-800' },
    high: { label: 'Alto', icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-orange-100 text-orange-800' },
    critical: { label: 'Crítico', icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-red-100 text-red-800' }
  };

  const c = config[level];
  return (
    <Badge className={cn('flex items-center gap-1', c.className)}>
      {c.icon}
      {c.label}
    </Badge>
  );
};

// ============ COMPONENTE PRINCIPAL ============

export function HRContingentWorkforcePanel() {
  const { currentCompany } = useERPContext();
  const {
    workers,
    contracts,
    stats,
    isLoading,
    fetchWorkers,
    fetchContracts,
    createWorker,
    updateWorker,
    runComplianceCheck,
    fetchStats,
    startAutoRefresh,
    stopAutoRefresh
  } = useHRContingentWorkforce();

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ContingentWorkerType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ContingentWorkerStatus | 'all'>('all');
  
  // Dialogs
  const [showNewWorkerDialog, setShowNewWorkerDialog] = useState(false);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<ContingentWorker | null>(null);
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form state
  const [newWorkerForm, setNewWorkerForm] = useState({
    legal_name: '',
    trade_name: '',
    tax_id: '',
    email: '',
    phone: '',
    worker_type: 'freelancer' as ContingentWorkerType,
    is_company: false,
    country: 'ES',
    default_rate: 0,
    rate_type: 'hourly' as 'hourly' | 'daily' | 'monthly' | 'project',
    currency: 'EUR',
    skills: '',
    has_liability_insurance: false
  });

  // ============ EFFECTS ============
  useEffect(() => {
    if (currentCompany?.id) {
      startAutoRefresh(currentCompany.id);
    }
    return () => stopAutoRefresh();
  }, [currentCompany?.id, startAutoRefresh, stopAutoRefresh]);

  // ============ HANDLERS ============
  const handleRefresh = useCallback(() => {
    if (currentCompany?.id) {
      fetchWorkers(currentCompany.id, {
        status: filterStatus !== 'all' ? filterStatus : undefined,
        worker_type: filterType !== 'all' ? filterType : undefined,
        search: searchTerm || undefined
      });
      fetchStats(currentCompany.id);
    }
  }, [currentCompany?.id, fetchWorkers, fetchStats, filterStatus, filterType, searchTerm]);

  const handleCreateWorker = async () => {
    if (!currentCompany?.id) return;

    const result = await createWorker(currentCompany.id, {
      ...newWorkerForm,
      skills: newWorkerForm.skills.split(',').map(s => s.trim()).filter(Boolean)
    });

    if (result) {
      setShowNewWorkerDialog(false);
      setNewWorkerForm({
        legal_name: '',
        trade_name: '',
        tax_id: '',
        email: '',
        phone: '',
        worker_type: 'freelancer',
        is_company: false,
        country: 'ES',
        default_rate: 0,
        rate_type: 'hourly',
        currency: 'EUR',
        skills: '',
        has_liability_insurance: false
      });
    }
  };

  const handleRunComplianceCheck = async (worker: ContingentWorker) => {
    if (!currentCompany?.id) return;

    setSelectedWorker(worker);
    setShowComplianceDialog(true);
    setIsAnalyzing(true);
    setComplianceResult(null);

    const result = await runComplianceCheck(currentCompany.id, worker.id, 'periodic');
    
    setComplianceResult(result);
    setIsAnalyzing(false);
    
    // Refresh workers to get updated compliance status
    handleRefresh();
  };

  // ============ FILTRAR TRABAJADORES ============
  const filteredWorkers = workers.filter(w => {
    if (filterType !== 'all' && w.worker_type !== filterType) return false;
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        w.legal_name.toLowerCase().includes(term) ||
        w.trade_name?.toLowerCase().includes(term) ||
        w.email.toLowerCase().includes(term) ||
        w.tax_id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // ============ RENDER ============
  if (!currentCompany) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para gestionar la fuerza laboral contingente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Workforce Contingente
          </h2>
          <p className="text-muted-foreground">
            Gestión de freelancers, contratistas y trabajadores externos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button onClick={() => setShowNewWorkerDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Trabajador
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Activos</p>
                  <p className="text-2xl font-bold">{stats.active_workers}</p>
                </div>
                <Users className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Contratos Activos</p>
                  <p className="text-2xl font-bold">{stats.active_contracts}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500/20" />
              </div>
              {stats.expiring_soon > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {stats.expiring_soon} expiran pronto
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Gasto Mes</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('es-ES', { 
                      style: 'currency', 
                      currency: 'EUR',
                      maximumFractionDigits: 0
                    }).format(stats.total_spend_mtd)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Facturas Pendientes</p>
                  <p className="text-2xl font-bold">{stats.pending_invoices}</p>
                </div>
                <Receipt className="h-8 w-8 text-yellow-500/20" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats.pending_amount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tarifa Media</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('es-ES', { 
                      style: 'currency', 
                      currency: 'EUR',
                      maximumFractionDigits: 0
                    }).format(stats.avg_hourly_rate)}/h
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(stats.compliance_issues > 0 && "border-orange-500/50")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Alertas Compliance</p>
                  <p className="text-2xl font-bold">{stats.compliance_issues}</p>
                </div>
                <Shield className={cn("h-8 w-8", stats.compliance_issues > 0 ? "text-orange-500" : "text-green-500/20")} />
              </div>
              {stats.high_risk_workers > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {stats.high_risk_workers} riesgo crítico
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Users className="h-4 w-4 mr-2" />
            Directorio
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="h-4 w-4 mr-2" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="time">
            <Clock className="h-4 w-4 mr-2" />
            Tiempo & Horas
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Receipt className="h-4 w-4 mr-2" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Tab: Directorio */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Directorio de Trabajadores</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="contractor">Contratista</SelectItem>
                      <SelectItem value="consultant">Consultor</SelectItem>
                      <SelectItem value="temp_agency">ETT</SelectItem>
                      <SelectItem value="outsourced">Externalizado</SelectItem>
                      <SelectItem value="gig_worker">Gig Worker</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tarifa</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Última Revisión</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se encontraron trabajadores
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkers.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{worker.legal_name}</p>
                              {worker.trade_name && (
                                <p className="text-xs text-muted-foreground">{worker.trade_name}</p>
                              )}
                              <p className="text-xs text-muted-foreground">{worker.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <WorkerTypeBadge type={worker.worker_type} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={worker.status} />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: worker.currency }).format(worker.default_rate)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              /{worker.rate_type === 'hourly' ? 'h' : worker.rate_type === 'daily' ? 'd' : 'm'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ComplianceBadge level={worker.compliance_status} />
                          </TableCell>
                          <TableCell>
                            {worker.last_compliance_review ? (
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(worker.last_compliance_review), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            ) : (
                              <span className="text-sm text-orange-600">Sin revisar</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRunComplianceCheck(worker)}
                                title="Análisis de Compliance"
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Contratos */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contratos de Servicios</CardTitle>
              <CardDescription>
                Gestión de contratos con trabajadores contingentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un trabajador para ver sus contratos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tiempo */}
        <TabsContent value="time" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Control de Horas</CardTitle>
              <CardDescription>
                Registro y aprobación de horas trabajadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sistema de control de tiempo para trabajadores externos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Facturación */}
        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Facturación</CardTitle>
              <CardDescription>
                Gestión de facturas y pagos a trabajadores contingentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sistema de facturación integrado con Tesorería</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Compliance */}
        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance y Riesgo Legal
              </CardTitle>
              <CardDescription>
                Análisis de riesgo de falso autónomo y cumplimiento normativo (Ley 12/2024)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Resumen de riesgos */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-xs text-green-700">Riesgo Bajo</p>
                          <p className="text-xl font-bold text-green-800">
                            {workers.filter(w => w.compliance_status === 'low').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-xs text-yellow-700">Riesgo Medio</p>
                          <p className="text-xl font-bold text-yellow-800">
                            {workers.filter(w => w.compliance_status === 'medium').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-xs text-orange-700">Riesgo Alto</p>
                          <p className="text-xl font-bold text-orange-800">
                            {workers.filter(w => w.compliance_status === 'high').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-xs text-red-700">Riesgo Crítico</p>
                          <p className="text-xl font-bold text-red-800">
                            {workers.filter(w => w.compliance_status === 'critical').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de trabajadores con riesgo */}
                <div className="space-y-2">
                  <h4 className="font-medium">Trabajadores con Alertas</h4>
                  {workers
                    .filter(w => w.compliance_status === 'high' || w.compliance_status === 'critical')
                    .map(worker => (
                      <div key={worker.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <ComplianceBadge level={worker.compliance_status} />
                          <div>
                            <p className="font-medium">{worker.legal_name}</p>
                            <p className="text-xs text-muted-foreground">{worker.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunComplianceCheck(worker)}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analizar
                        </Button>
                      </div>
                    ))}
                  {workers.filter(w => w.compliance_status === 'high' || w.compliance_status === 'critical').length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No hay alertas de compliance activas
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Nuevo Trabajador */}
      <Dialog open={showNewWorkerDialog} onOpenChange={setShowNewWorkerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Trabajador Contingente</DialogTitle>
            <DialogDescription>
              Registra un nuevo freelancer, contratista o trabajador externo
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre Legal *</Label>
              <Input
                value={newWorkerForm.legal_name}
                onChange={(e) => setNewWorkerForm(prev => ({ ...prev, legal_name: e.target.value }))}
                placeholder="Nombre completo o razón social"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nombre Comercial</Label>
              <Input
                value={newWorkerForm.trade_name}
                onChange={(e) => setNewWorkerForm(prev => ({ ...prev, trade_name: e.target.value }))}
                placeholder="Nombre comercial (opcional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label>NIF/CIF *</Label>
              <Input
                value={newWorkerForm.tax_id}
                onChange={(e) => setNewWorkerForm(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder="12345678A"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newWorkerForm.email}
                onChange={(e) => setNewWorkerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@ejemplo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={newWorkerForm.phone}
                onChange={(e) => setNewWorkerForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+34 600 000 000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Trabajador *</Label>
              <Select
                value={newWorkerForm.worker_type}
                onValueChange={(v) => setNewWorkerForm(prev => ({ ...prev, worker_type: v as ContingentWorkerType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer / Autónomo</SelectItem>
                  <SelectItem value="contractor">Contratista</SelectItem>
                  <SelectItem value="consultant">Consultor</SelectItem>
                  <SelectItem value="temp_agency">ETT / Agencia</SelectItem>
                  <SelectItem value="outsourced">Servicio Externalizado</SelectItem>
                  <SelectItem value="gig_worker">Gig Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tarifa por Defecto *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newWorkerForm.default_rate}
                  onChange={(e) => setNewWorkerForm(prev => ({ ...prev, default_rate: Number(e.target.value) }))}
                  placeholder="50"
                  className="flex-1"
                />
                <Select
                  value={newWorkerForm.rate_type}
                  onValueChange={(v) => setNewWorkerForm(prev => ({ ...prev, rate_type: v as any }))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">/hora</SelectItem>
                    <SelectItem value="daily">/día</SelectItem>
                    <SelectItem value="monthly">/mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label>Habilidades</Label>
              <Input
                value={newWorkerForm.skills}
                onChange={(e) => setNewWorkerForm(prev => ({ ...prev, skills: e.target.value }))}
                placeholder="React, TypeScript, Node.js (separadas por comas)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewWorkerDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorker} disabled={!newWorkerForm.legal_name || !newWorkerForm.tax_id || !newWorkerForm.email}>
              Registrar Trabajador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resultado Compliance */}
      <Dialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Análisis de Compliance
            </DialogTitle>
            <DialogDescription>
              {selectedWorker?.legal_name} - Evaluación de riesgo de falso autónomo
            </DialogDescription>
          </DialogHeader>

          {isAnalyzing ? (
            <div className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
              <p className="text-muted-foreground">Analizando indicadores de laboralidad...</p>
              <Progress value={33} className="w-48 mx-auto mt-4" />
            </div>
          ) : complianceResult ? (
            <div className="space-y-6 py-4">
              {/* Risk Assessment */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Nivel de Riesgo</p>
                  <p className="text-2xl font-bold">
                    <ComplianceBadge level={complianceResult.risk_assessment} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Fecha Análisis</p>
                  <p className="font-medium">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>
              </div>

              {/* Indicadores */}
              {complianceResult.indicators && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(complianceResult.indicators).map(([key, data]: [string, any]) => (
                    <Card key={key}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium capitalize">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <Badge variant={data.score > 70 ? 'destructive' : data.score > 40 ? 'secondary' : 'default'}>
                            {data.score}%
                          </Badge>
                        </div>
                        <Progress value={data.score} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">{data.risk}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Legal Opinion */}
              {complianceResult.legal_opinion && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Opinión Legal</h4>
                  <p className="text-sm text-muted-foreground">{complianceResult.legal_opinion}</p>
                </div>
              )}

              {/* Recommendations */}
              {complianceResult.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recomendaciones</h4>
                  <ul className="space-y-2">
                    {complianceResult.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComplianceDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRContingentWorkforcePanel;
