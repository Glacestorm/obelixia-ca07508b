/**
 * HRVacationsPanel - Gestión de vacaciones con workflow de aprobación de 2 niveles
 * Nivel 1: Responsable de departamento
 * Nivel 2: Responsable de RRHH
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle, XCircle, 
  AlertTriangle, Users, Plus, Search, Filter, UserCheck, Building2,
  ArrowRight, MessageSquare, RefreshCw, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { HRVacationRequestDialog } from './HRVacationRequestDialog';

interface VacationRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  department_id: string;
  start_date: string;
  end_date: string;
  days: number;
  type: string;
  status: 'pending_dept' | 'pending_hr' | 'approved' | 'rejected';
  dept_approved_by: string | null;
  dept_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  ai_synced: boolean;
}

interface HRVacationsPanelProps {
  companyId: string;
}

export function HRVacationsPanel({ companyId }: HRVacationsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<'dept_manager' | 'hr_manager' | 'employee'>('hr_manager');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  // Demo data with two-level workflow
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([
    { 
      id: '1', 
      employee_id: 'emp1',
      employee_name: 'María García López', 
      department: 'Administración',
      department_id: 'dept1',
      start_date: '2026-02-15',
      end_date: '2026-02-21',
      days: 5,
      type: 'vacation',
      status: 'pending_dept',
      dept_approved_by: null,
      dept_approved_at: null,
      hr_approved_by: null,
      hr_approved_at: null,
      rejection_reason: null,
      notes: 'Vacaciones de invierno',
      ai_synced: false
    },
    { 
      id: '2', 
      employee_id: 'emp2',
      employee_name: 'Juan Martínez Ruiz', 
      department: 'Producción',
      department_id: 'dept2',
      start_date: '2026-02-10',
      end_date: '2026-02-14',
      days: 5,
      type: 'vacation',
      status: 'pending_hr',
      dept_approved_by: 'Carlos Rodríguez',
      dept_approved_at: '2026-02-01',
      hr_approved_by: null,
      hr_approved_at: null,
      rejection_reason: null,
      notes: null,
      ai_synced: false
    },
    { 
      id: '3', 
      employee_id: 'emp3',
      employee_name: 'Ana Fernández Castro', 
      department: 'Comercial',
      department_id: 'dept3',
      start_date: '2026-02-03',
      end_date: '2026-02-03',
      days: 1,
      type: 'personal',
      status: 'approved',
      dept_approved_by: 'Pedro López',
      dept_approved_at: '2026-01-28',
      hr_approved_by: 'Laura Sánchez',
      hr_approved_at: '2026-01-29',
      rejection_reason: null,
      notes: 'Asunto personal urgente',
      ai_synced: true
    },
    { 
      id: '4', 
      employee_id: 'emp4',
      employee_name: 'Pedro Sánchez Gil', 
      department: 'IT',
      department_id: 'dept4',
      start_date: '2026-01-20',
      end_date: '2026-01-24',
      days: 5,
      type: 'vacation',
      status: 'rejected',
      dept_approved_by: null,
      dept_approved_at: null,
      hr_approved_by: null,
      hr_approved_at: null,
      rejection_reason: 'Coincide con fecha de entrega crítica del proyecto',
      notes: null,
      ai_synced: true
    },
  ]);

  const balances = [
    { employee: 'María García López', total: 22, used: 10, pending: 5, remaining: 7 },
    { employee: 'Juan Martínez Ruiz', total: 22, used: 5, pending: 5, remaining: 12 },
    { employee: 'Ana Fernández Castro', total: 22, used: 15, pending: 1, remaining: 6 },
    { employee: 'Pedro Sánchez Gil', total: 22, used: 0, pending: 0, remaining: 22 },
  ];

  const getStatusBadge = (status: VacationRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'pending_dept':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Building2 className="h-3 w-3 mr-1" />
            Pendiente Dpto.
          </Badge>
        );
      case 'pending_hr':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <UserCheck className="h-3 w-3 mr-1" />
            Pendiente RRHH
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazada
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vacation':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Vacaciones</Badge>;
      case 'personal':
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Personal</Badge>;
      case 'sick':
        return <Badge variant="outline" className="text-red-600 border-red-300">Enfermedad</Badge>;
      case 'marriage':
        return <Badge variant="outline" className="text-pink-600 border-pink-300">Matrimonio</Badge>;
      case 'death':
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Fallecimiento</Badge>;
      default:
        return <Badge variant="outline">Otro</Badge>;
    }
  };

  // Sync vacation to AI agent
  const syncToAI = useCallback(async (request: VacationRequest) => {
    try {
      const { error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'analyze_vacation',
          context: {
            employee_id: request.employee_id,
            employee_name: request.employee_name,
            department: request.department,
            start_date: request.start_date,
            end_date: request.end_date,
            days: request.days,
            type: request.type,
            status: request.status,
            approved: request.status === 'approved'
          }
        }
      });
      
      if (!error) {
        setVacationRequests(prev => prev.map(r => 
          r.id === request.id ? { ...r, ai_synced: true } : r
        ));
      }
    } catch (e) {
      console.error('Error syncing to AI:', e);
    }
  }, []);

  // Approve by department manager
  const handleDeptApproval = async (requestId: string, approve: boolean) => {
    const request = vacationRequests.find(r => r.id === requestId);
    if (!request) return;

    if (approve) {
      setVacationRequests(prev => prev.map(r => 
        r.id === requestId ? { 
          ...r, 
          status: 'pending_hr',
          dept_approved_by: 'Usuario Actual (Dpto)',
          dept_approved_at: new Date().toISOString()
        } : r
      ));
      toast.success(`Vacaciones de ${request.employee_name} aprobadas por departamento. Pendiente RRHH.`);
    } else {
      if (!rejectionReason) {
        setShowRejectDialog(requestId);
        return;
      }
      setVacationRequests(prev => prev.map(r => 
        r.id === requestId ? { 
          ...r, 
          status: 'rejected',
          rejection_reason: rejectionReason
        } : r
      ));
      toast.error(`Vacaciones de ${request.employee_name} rechazadas`);
      setRejectionReason('');
      setShowRejectDialog(null);
    }
  };

  // Approve by HR manager
  const handleHRApproval = async (requestId: string, approve: boolean) => {
    const request = vacationRequests.find(r => r.id === requestId);
    if (!request) return;

    if (approve) {
      const updatedRequest = { 
        ...request, 
        status: 'approved' as const,
        hr_approved_by: 'Usuario Actual (RRHH)',
        hr_approved_at: new Date().toISOString()
      };
      
      setVacationRequests(prev => prev.map(r => 
        r.id === requestId ? updatedRequest : r
      ));
      
      toast.success(`Vacaciones de ${request.employee_name} aprobadas definitivamente`);
      
      // Sync to AI agent
      await syncToAI(updatedRequest);
    } else {
      if (!rejectionReason) {
        setShowRejectDialog(requestId);
        return;
      }
      setVacationRequests(prev => prev.map(r => 
        r.id === requestId ? { 
          ...r, 
          status: 'rejected',
          rejection_reason: rejectionReason
        } : r
      ));
      toast.error(`Vacaciones de ${request.employee_name} rechazadas por RRHH`);
      setRejectionReason('');
      setShowRejectDialog(null);
    }
  };

  // Filter requests based on tab
  const getFilteredRequests = () => {
    let filtered = vacationRequests;
    
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    switch (activeTab) {
      case 'pending':
        return filtered.filter(v => v.status === 'pending_dept' || v.status === 'pending_hr');
      case 'pending_dept':
        return filtered.filter(v => v.status === 'pending_dept');
      case 'pending_hr':
        return filtered.filter(v => v.status === 'pending_hr');
      case 'approved':
        return filtered.filter(v => v.status === 'approved');
      case 'rejected':
        return filtered.filter(v => v.status === 'rejected');
      default:
        return filtered;
    }
  };

  const filteredRequests = getFilteredRequests();
  const pendingDeptCount = vacationRequests.filter(v => v.status === 'pending_dept').length;
  const pendingHRCount = vacationRequests.filter(v => v.status === 'pending_hr').length;
  const approvedCount = vacationRequests.filter(v => v.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendiente Dpto.</p>
                <p className="text-lg font-bold">{pendingDeptCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendiente RRHH</p>
                <p className="text-lg font-bold">{pendingHRCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Aprobadas</p>
                <p className="text-lg font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Días este mes</p>
                <p className="text-lg font-bold">23</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              <div>
                <p className="text-xs text-muted-foreground">Ausentes hoy</p>
                <p className="text-lg font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow explanation */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-600 font-bold">1</span>
              </div>
              <span className="text-muted-foreground">Solicitud</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-muted-foreground">Aprueba Dpto.</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-muted-foreground">Aprueba RRHH</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-muted-foreground">Confirmada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Solicitudes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Solicitudes de Vacaciones</CardTitle>
                <CardDescription>Workflow de aprobación de 2 niveles</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowRequestDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Solicitud
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="pending" className="text-xs">
                  Pendientes ({pendingDeptCount + pendingHRCount})
                </TabsTrigger>
                <TabsTrigger value="pending_dept" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Dpto ({pendingDeptCount})
                </TabsTrigger>
                <TabsTrigger value="pending_hr" className="text-xs">
                  <UserCheck className="h-3 w-3 mr-1" />
                  RRHH ({pendingHRCount})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">Aprobadas</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">Rechazadas</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay solicitudes en esta categoría
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{request.department}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(request.type)}</TableCell>
                          <TableCell className="text-sm">
                            <div>
                              <p>{request.start_date}</p>
                              <p className="text-xs text-muted-foreground">→ {request.end_date}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{request.days}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(request.status)}
                              {request.ai_synced && (
                                <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                                  🤖 IA
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              {request.status === 'pending_dept' && (
                                <div className="flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-green-600 h-7 px-2"
                                        onClick={() => handleDeptApproval(request.id, true)}
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Aprobar (Dpto)</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-600 h-7 px-2"
                                        onClick={() => handleDeptApproval(request.id, false)}
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Rechazar</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {request.status === 'pending_hr' && (
                                <div className="flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-green-600 h-7 px-2"
                                        onClick={() => handleHRApproval(request.id, true)}
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Aprobar (RRHH)</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-600 h-7 px-2"
                                        onClick={() => handleHRApproval(request.id, false)}
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Rechazar</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {request.status === 'approved' && !request.ai_synced && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-purple-600 h-7 px-2"
                                      onClick={() => syncToAI(request)}
                                    >
                                      <Send className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Sincronizar con IA</TooltipContent>
                                </Tooltip>
                              )}
                              {request.rejection_reason && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2">
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-medium">Motivo:</p>
                                    <p>{request.rejection_reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        {/* Calendario y Saldos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className="rounded-md border"
            />
            
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Saldos de vacaciones</p>
              <ScrollArea className="h-[150px]">
                {balances.map((balance, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm truncate max-w-[120px]">{balance.employee}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600 font-medium">{balance.remaining}d</span>
                      <span className="text-muted-foreground">/ {balance.total}d</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>

            {/* Ausencias de hoy */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Ausentes hoy</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Ana Fernández - Personal</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Carlos Ruiz - Vacaciones</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rejection dialog - simple inline */}
      {showRejectDialog && (
        <Card className="fixed bottom-4 right-4 w-96 shadow-xl z-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Motivo de rechazo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Indica el motivo del rechazo..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => {
                setShowRejectDialog(null);
                setRejectionReason('');
              }}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => {
                const req = vacationRequests.find(r => r.id === showRejectDialog);
                if (req?.status === 'pending_dept') {
                  handleDeptApproval(showRejectDialog, false);
                } else {
                  handleHRApproval(showRejectDialog, false);
                }
              }} disabled={!rejectionReason}>
                Confirmar Rechazo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de solicitud de vacaciones */}
      <HRVacationRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        companyId={companyId}
        employeeName="María García López"
        onSubmit={(data) => {
          console.log('Vacation request:', data);
          setVacationRequests(prev => [{
            id: `new-${Date.now()}`,
            employee_id: 'emp1',
            employee_name: 'María García López',
            department: 'Administración',
            department_id: 'dept1',
            start_date: data.start_date,
            end_date: data.end_date,
            days: data.days_requested,
            type: data.leave_type_code,
            status: 'pending_dept',
            dept_approved_by: null,
            dept_approved_at: null,
            hr_approved_by: null,
            hr_approved_at: null,
            rejection_reason: null,
            notes: data.notes || null,
            ai_synced: false
          }, ...prev]);
          toast.success('Solicitud enviada - Pendiente aprobación de departamento');
        }}
      />
    </div>
  );
}

export default HRVacationsPanel;
