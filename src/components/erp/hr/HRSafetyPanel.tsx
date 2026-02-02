/**
 * HRSafetyPanel - Prevención de riesgos laborales y seguridad
 * Integrado con tabla erp_hr_safety_incidents
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, FileText,
  Users, Calendar, Plus, Search, Download, Activity,
  HardHat, Flame, Eye, Heart, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HRIncidentFormDialog } from './HRIncidentFormDialog';
import { HRSafetyEvaluationDialog, HRSafetyTrainingDialog, HREPIManagementDialog } from './dialogs';

interface HRSafetyPanelProps {
  companyId: string;
}

interface SafetyIncident {
  id: string;
  incident_date: string;
  incident_type: string;
  severity: string;
  description: string;
  area: string | null;
  investigation_status: string;
  days_lost: number;
  employee?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function HRSafetyPanel({ companyId }: HRSafetyPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [showEPIDialog, setShowEPIDialog] = useState(false);

  // Fetch incidents from database
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_safety_incidents')
        .select(`
          id, incident_date, incident_type, severity, description, area,
          investigation_status, days_lost,
          erp_hr_employees!employee_id (first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('incident_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setIncidents((data || []).map((i: any) => ({
        ...i,
        employee: i.erp_hr_employees
      })));
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleIncidentSuccess = () => {
    fetchIncidents();
    setShowIncidentDialog(false);
  };

  // Demo data for static sections
  const safetyStats = {
    accidentFree: 156,
    pendingTrainings: 8,
    upcomingReviews: 3,
    openIncidents: incidents.filter(i => i.investigation_status === 'pending').length,
    complianceScore: 94
  };

  const riskAssessments = [
    { 
      id: '1', 
      area: 'Taller Mecánico', 
      riskLevel: 'high',
      lastReview: '2025-11-15',
      nextReview: '2026-02-15',
      pendingActions: 2,
      status: 'active'
    },
    { 
      id: '2', 
      area: 'Almacén', 
      riskLevel: 'medium',
      lastReview: '2025-12-01',
      nextReview: '2026-03-01',
      pendingActions: 1,
      status: 'active'
    },
    { 
      id: '3', 
      area: 'Oficinas', 
      riskLevel: 'low',
      lastReview: '2025-10-20',
      nextReview: '2026-04-20',
      pendingActions: 0,
      status: 'active'
    },
  ];

  const trainings = [
    { 
      id: '1', 
      name: 'Prevención de Riesgos Laborales - Básico', 
      type: 'mandatory',
      employees: 47,
      completed: 45,
      dueDate: '2026-03-31'
    },
    { 
      id: '2', 
      name: 'Manejo de Carretillas Elevadoras', 
      type: 'specific',
      employees: 12,
      completed: 10,
      dueDate: '2026-02-28'
    },
    { 
      id: '3', 
      name: 'Primeros Auxilios', 
      type: 'recommended',
      employees: 15,
      completed: 12,
      dueDate: '2026-04-30'
    },
    { 
      id: '4', 
      name: 'Prevención de Incendios', 
      type: 'mandatory',
      employees: 47,
      completed: 47,
      dueDate: '2025-12-31'
    },
  ];

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Medio</Badge>;
      case 'low':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Bajo</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getTrainingTypeBadge = (type: string) => {
    switch (type) {
      case 'mandatory':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Obligatoria</Badge>;
      case 'specific':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Específica</Badge>;
      case 'recommended':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Recomendada</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs de seguridad */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Días sin accidentes</p>
                <p className="text-lg font-bold">{safetyStats.accidentFree}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Formaciones pendientes</p>
                <p className="text-lg font-bold">{safetyStats.pendingTrainings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Revisiones próximas</p>
                <p className="text-lg font-bold">{safetyStats.upcomingReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Incidentes abiertos</p>
                <p className="text-lg font-bold">{safetyStats.openIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
                <p className="text-lg font-bold">{safetyStats.complianceScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            Evaluación Riesgos
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <HardHat className="h-4 w-4" />
            Formación PRL
          </TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Incidentes
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Eye className="h-4 w-4" />
            EPIs
          </TabsTrigger>
        </TabsList>

        {/* Evaluación de Riesgos */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Evaluación de Riesgos por Área</CardTitle>
                  <CardDescription>Estado de las evaluaciones y acciones pendientes</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowEvaluationDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva Evaluación
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Área</TableHead>
                      <TableHead>Nivel Riesgo</TableHead>
                      <TableHead>Última Revisión</TableHead>
                      <TableHead>Próxima Revisión</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskAssessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">{assessment.area}</TableCell>
                        <TableCell>{getRiskBadge(assessment.riskLevel)}</TableCell>
                        <TableCell>{assessment.lastReview}</TableCell>
                        <TableCell>{assessment.nextReview}</TableCell>
                        <TableCell className="text-center">
                          {assessment.pendingActions > 0 ? (
                            <Badge variant="outline" className="text-amber-600">
                              {assessment.pendingActions} pendientes
                            </Badge>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formación */}
        <TabsContent value="training" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Formación en Prevención</CardTitle>
                  <CardDescription>Estado de las formaciones obligatorias y específicas</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowTrainingDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva Formación
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-4">
                  {trainings.map((training) => (
                    <Card key={training.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <HardHat className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{training.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {getTrainingTypeBadge(training.type)}
                                <span>Vence: {training.dueDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {training.completed}/{training.employees}
                            </p>
                            <p className="text-xs text-muted-foreground">completados</p>
                          </div>
                        </div>
                        <Progress 
                          value={(training.completed / training.employees) * 100} 
                          className="h-2"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidentes */}
        <TabsContent value="incidents" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Registro de Incidentes</CardTitle>
                  <CardDescription>Historial de accidentes e incidentes laborales</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowIncidentDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar Incidente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {loading ? 'Cargando incidentes...' : 'No hay incidentes registrados'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      incidents.map((incident) => {
                        const employeeName = incident.employee 
                          ? `${incident.employee.first_name} ${incident.employee.last_name}` 
                          : '-';
                        return (
                          <TableRow key={incident.id}>
                            <TableCell>{incident.incident_date}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{incident.incident_type}</Badge>
                            </TableCell>
                            <TableCell>{incident.description}</TableCell>
                            <TableCell>{incident.area || '-'}</TableCell>
                            <TableCell>{employeeName}</TableCell>
                            <TableCell>
                              {incident.investigation_status === 'resolved' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600">Resuelto</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600">Investigando</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EPIs */}
        <TabsContent value="equipment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipos de Protección Individual</CardTitle>
              <CardDescription>Gestión de EPIs por empleado y área</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Eye className="h-12 w-12 mx-auto mb-4 text-primary opacity-70" />
                <p className="text-muted-foreground mb-4">Gestión de entregas, caducidades y renovaciones de EPIs</p>
                <Button onClick={() => setShowEPIDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Gestionar EPIs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <HRSafetyEvaluationDialog
        open={showEvaluationDialog}
        onOpenChange={setShowEvaluationDialog}
        companyId={companyId}
        onSuccess={() => setShowEvaluationDialog(false)}
      />

      <HRSafetyTrainingDialog
        open={showTrainingDialog}
        onOpenChange={setShowTrainingDialog}
        companyId={companyId}
        onSuccess={() => setShowTrainingDialog(false)}
      />

      <HRIncidentFormDialog
        open={showIncidentDialog}
        onOpenChange={(open) => {
          setShowIncidentDialog(open);
          if (!open) fetchIncidents();
        }}
        companyId={companyId}
      />

      <HREPIManagementDialog
        open={showEPIDialog}
        onOpenChange={setShowEPIDialog}
        companyId={companyId}
      />
    </div>
  );
}

export default HRSafetyPanel;
