/**
 * HRTrainingPanel - Sistema de Formación y Desarrollo Profesional
 * Gestión de competencias, planes formativos, certificaciones y análisis de gaps
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  GraduationCap,
  Target,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  Brain,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  Sparkles,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRTrainingPanelProps {
  companyId: string;
}

interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  is_mandatory: boolean;
}

interface TrainingCatalogItem {
  id: string;
  title: string;
  description: string;
  provider: string;
  provider_name: string;
  modality: string;
  duration_hours: number;
  cost_per_person: number;
  certification_provided: boolean;
  certification_name: string;
  is_mandatory: boolean;
  is_active: boolean;
}

interface TrainingPlan {
  id: string;
  year: number;
  name: string;
  description: string;
  total_budget: number;
  spent_budget: number;
  status: string;
}

interface Certification {
  id: string;
  employee_id: string;
  certification_name: string;
  issuing_organization: string;
  issued_date: string;
  expiry_date: string;
  status: string;
  is_mandatory: boolean;
}

interface GapAnalysisResult {
  gaps: Array<{
    competency_name: string;
    current_level: number;
    required_level: number;
    gap_severity: string;
    impact_areas: string[];
    estimated_training_hours: number;
  }>;
  total_training_hours_needed: number;
  recommendations: string[];
}

export function HRTrainingPanel({ companyId }: HRTrainingPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [trainingCatalog, setTrainingCatalog] = useState<TrainingCatalogItem[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null);
  
  // Dialog states
  const [showCompetencyDialog, setShowCompetencyDialog] = useState(false);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [showGapAnalysisDialog, setShowGapAnalysisDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCompetencies: 0,
    totalTrainings: 0,
    activePlans: 0,
    expiringCertifications: 0,
    totalBudget: 0,
    spentBudget: 0,
    averageHoursPerEmployee: 0
  });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load competencies
      const { data: compData } = await supabase
        .from('erp_hr_competencies')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      
      if (compData) setCompetencies(compData);

      // Load training catalog
      const { data: catalogData } = await supabase
        .from('erp_hr_training_catalog')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('title');
      
      if (catalogData) setTrainingCatalog(catalogData);

      // Load training plans
      const { data: plansData } = await supabase
        .from('erp_hr_training_plans')
        .select('*')
        .eq('company_id', companyId)
        .order('year', { ascending: false });
      
      if (plansData) setTrainingPlans(plansData);

      // Load certifications expiring in next 90 days
      const futureDate = addDays(new Date(), 90);
      const { data: certsData } = await supabase
        .from('erp_hr_employee_certifications')
        .select('*')
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .in('status', ['active', 'pending_renewal']);

      if (certsData) setCertifications(certsData);

      // Calculate stats
      const currentPlan = plansData?.find(p => p.year === new Date().getFullYear());
      setStats({
        totalCompetencies: compData?.length || 0,
        totalTrainings: catalogData?.length || 0,
        activePlans: plansData?.filter(p => p.status === 'active').length || 0,
        expiringCertifications: certsData?.length || 0,
        totalBudget: currentPlan?.total_budget || 0,
        spentBudget: currentPlan?.spent_budget || 0,
        averageHoursPerEmployee: 24 // TODO: Calculate from history
      });

    } catch (error) {
      console.error('Error loading training data:', error);
      toast.error('Error al cargar datos de formación');
    } finally {
      setIsLoading(false);
    }
  };

  const runGapAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-training-agent', {
        body: {
          action: 'analyze_gaps',
          company_id: companyId,
          context: {
            total_competencies: stats.totalCompetencies,
            total_trainings: stats.totalTrainings
          }
        }
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        setGapAnalysis(data.data);
        setShowGapAnalysisDialog(true);
        toast.success('Análisis de gaps completado');
      }
    } catch (error) {
      console.error('Error running gap analysis:', error);
      toast.error('Error al ejecutar análisis de gaps');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      technical: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      soft: 'bg-green-500/10 text-green-500 border-green-500/20',
      leadership: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      compliance: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    };
    const labels: Record<string, string> = {
      technical: 'Técnica',
      soft: 'Soft Skill',
      leadership: 'Liderazgo',
      compliance: 'Compliance'
    };
    return (
      <Badge variant="outline" className={styles[category] || ''}>
        {labels[category] || category}
      </Badge>
    );
  };

  const getModalityBadge = (modality: string) => {
    const styles: Record<string, string> = {
      presencial: 'bg-blue-500/10 text-blue-500',
      online: 'bg-green-500/10 text-green-500',
      blended: 'bg-purple-500/10 text-purple-500'
    };
    return (
      <Badge variant="secondary" className={styles[modality] || ''}>
        {modality.charAt(0).toUpperCase() + modality.slice(1)}
      </Badge>
    );
  };

  const getExpiryStatus = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { label: 'Vencida', color: 'text-destructive', icon: AlertTriangle };
    if (days <= 30) return { label: `${days} días`, color: 'text-orange-500', icon: Clock };
    if (days <= 90) return { label: `${days} días`, color: 'text-yellow-500', icon: Clock };
    return { label: `${days} días`, color: 'text-green-500', icon: CheckCircle };
  };

  const budgetProgress = stats.totalBudget > 0 
    ? (stats.spentBudget / stats.totalBudget) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header con KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Competencias</p>
                <p className="text-2xl font-bold">{stats.totalCompetencies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Formaciones</p>
                <p className="text-2xl font-bold">{stats.totalTrainings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Planes activos</p>
                <p className="text-2xl font-bold">{stats.activePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cert. expiran</p>
                <p className="text-2xl font-bold">{stats.expiringCertifications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Presupuesto</p>
                <p className="text-xl font-bold">
                  {(stats.totalBudget / 1000).toFixed(0)}K€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <BarChart3 className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ejecutado</p>
                <p className="text-xl font-bold">{budgetProgress.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <Clock className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas/Emp</p>
                <p className="text-2xl font-bold">{stats.averageHoursPerEmployee}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar competencias, formaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runGapAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Análisis IA
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="competencies" className="gap-2">
            <Target className="h-4 w-4" />
            Competencias
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Calendar className="h-4 w-4" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2">
            <Award className="h-4 w-4" />
            Certificaciones
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Presupuesto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Presupuesto de Formación {new Date().getFullYear()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ejecutado</span>
                    <span className="font-medium">
                      {stats.spentBudget.toLocaleString('es-ES')}€ / {stats.totalBudget.toLocaleString('es-ES')}€
                    </span>
                  </div>
                  <Progress value={budgetProgress} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-500">
                      {(stats.totalBudget - stats.spentBudget).toLocaleString('es-ES')}€
                    </p>
                    <p className="text-xs text-muted-foreground">Disponible</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-blue-500">
                      {stats.averageHoursPerEmployee}h
                    </p>
                    <p className="text-xs text-muted-foreground">Media/Empleado</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alertas de certificaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Certificaciones por Renovar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {certifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                      <p className="text-sm">Sin certificaciones próximas a vencer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certifications.slice(0, 5).map((cert) => {
                        const status = getExpiryStatus(cert.expiry_date);
                        const StatusIcon = status.icon;
                        return (
                          <div
                            key={cert.id}
                            className="flex items-center justify-between p-2 rounded-lg border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <StatusIcon className={cn("h-4 w-4", status.color)} />
                              <div>
                                <p className="text-sm font-medium">{cert.certification_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cert.issuing_organization}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-sm font-medium", status.color)}>
                                {status.label}
                              </p>
                              {cert.is_mandatory && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Obligatoria
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Formaciones más demandadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Formaciones Disponibles
              </CardTitle>
              <CardDescription>
                Catálogo de formaciones activas para inscripción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formación</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Coste</TableHead>
                      <TableHead>Certificación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingCatalog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay formaciones en el catálogo
                        </TableCell>
                      </TableRow>
                    ) : (
                      trainingCatalog.map((training) => (
                        <TableRow key={training.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{training.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {training.provider_name || training.provider}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getModalityBadge(training.modality)}</TableCell>
                          <TableCell>{training.duration_hours}h</TableCell>
                          <TableCell>{training.cost_per_person.toLocaleString('es-ES')}€</TableCell>
                          <TableCell>
                            {training.certification_provided ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                <Award className="h-3 w-3 mr-1" />
                                {training.certification_name || 'Sí'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
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

        {/* Tab: Competencias */}
        <TabsContent value="competencies" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Mapa de Competencias</CardTitle>
                <CardDescription>
                  Competencias definidas para la organización
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowCompetencyDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Competencia
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {competencies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <Target className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Sin competencias definidas</p>
                    <p className="text-sm">Añade competencias para comenzar el mapeo</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowCompetencyDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir primera competencia
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {competencies
                      .filter(c => 
                        searchTerm === '' || 
                        c.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((comp) => (
                        <Card key={comp.id} className="border hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{comp.name}</h4>
                              {comp.is_mandatory && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Obligatoria
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {comp.description}
                            </p>
                            {getCategoryBadge(comp.category)}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Catálogo */}
        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Catálogo de Formaciones</CardTitle>
                <CardDescription>
                  Cursos y formaciones disponibles para inscripción
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowTrainingDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Formación
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formación</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Coste</TableHead>
                      <TableHead>Certificación</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingCatalog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No hay formaciones en el catálogo</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      trainingCatalog
                        .filter(t => 
                          searchTerm === '' || 
                          t.title.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((training) => (
                          <TableRow key={training.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{training.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {training.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {training.provider === 'interno' ? 'Interno' : 
                                 training.provider === 'externo' ? 'Externo' : 'Online'}
                              </Badge>
                            </TableCell>
                            <TableCell>{getModalityBadge(training.modality)}</TableCell>
                            <TableCell>{training.duration_hours}h</TableCell>
                            <TableCell>{training.cost_per_person.toLocaleString('es-ES')}€</TableCell>
                            <TableCell>
                              {training.certification_provided ? (
                                <div className="flex items-center gap-1 text-green-500">
                                  <Award className="h-3 w-3" />
                                  <span className="text-xs">{training.certification_name || 'Sí'}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {training.is_active ? (
                                <Badge className="bg-green-500/10 text-green-500">Activa</Badge>
                              ) : (
                                <Badge variant="secondary">Inactiva</Badge>
                              )}
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

        {/* Tab: Planes */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Planes de Formación</CardTitle>
                <CardDescription>
                  Planes anuales de formación y desarrollo
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Plan
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {trainingPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <Calendar className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Sin planes de formación</p>
                    <p className="text-sm">Crea un plan anual para gestionar el presupuesto</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trainingPlans.map((plan) => {
                      const progress = plan.total_budget > 0 
                        ? (plan.spent_budget / plan.total_budget) * 100 
                        : 0;
                      return (
                        <Card key={plan.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{plan.name}</h4>
                                  <Badge variant="outline">{plan.year}</Badge>
                                  <Badge 
                                    className={cn(
                                      plan.status === 'active' && 'bg-green-500/10 text-green-500',
                                      plan.status === 'draft' && 'bg-yellow-500/10 text-yellow-500',
                                      plan.status === 'completed' && 'bg-blue-500/10 text-blue-500'
                                    )}
                                  >
                                    {plan.status === 'active' ? 'Activo' :
                                     plan.status === 'draft' ? 'Borrador' :
                                     plan.status === 'completed' ? 'Completado' : plan.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {plan.description}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Presupuesto ejecutado</span>
                                <span className="font-medium">
                                  {plan.spent_budget.toLocaleString('es-ES')}€ / {plan.total_budget.toLocaleString('es-ES')}€
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Certificaciones */}
        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestión de Certificaciones</CardTitle>
              <CardDescription>
                Control de certificaciones profesionales y vencimientos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificación</TableHead>
                      <TableHead>Emisor</TableHead>
                      <TableHead>Fecha Emisión</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No hay certificaciones registradas</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      certifications.map((cert) => {
                        const status = getExpiryStatus(cert.expiry_date);
                        const StatusIcon = status.icon;
                        return (
                          <TableRow key={cert.id}>
                            <TableCell className="font-medium">
                              {cert.certification_name}
                            </TableCell>
                            <TableCell>{cert.issuing_organization}</TableCell>
                            <TableCell>
                              {cert.issued_date 
                                ? format(new Date(cert.issued_date), 'dd/MM/yyyy', { locale: es })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon className={cn("h-4 w-4", status.color)} />
                                <span className={status.color}>
                                  {cert.expiry_date
                                    ? format(new Date(cert.expiry_date), 'dd/MM/yyyy', { locale: es })
                                    : 'Sin vencimiento'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={cn(
                                  cert.status === 'active' && 'bg-green-500/10 text-green-500',
                                  cert.status === 'expired' && 'bg-red-500/10 text-red-500',
                                  cert.status === 'pending_renewal' && 'bg-orange-500/10 text-orange-500'
                                )}
                              >
                                {cert.status === 'active' ? 'Activa' :
                                 cert.status === 'expired' ? 'Vencida' :
                                 cert.status === 'pending_renewal' ? 'Renovar' : cert.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cert.is_mandatory ? (
                                <Badge variant="destructive">Obligatoria</Badge>
                              ) : (
                                <Badge variant="secondary">Opcional</Badge>
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
      </Tabs>

      {/* Dialog: Análisis de Gaps */}
      <Dialog open={showGapAnalysisDialog} onOpenChange={setShowGapAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análisis de Gaps Formativos
            </DialogTitle>
            <DialogDescription>
              Resultados del análisis de brechas de competencias
            </DialogDescription>
          </DialogHeader>

          {gapAnalysis && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {gapAnalysis.gaps?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Gaps identificados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-500">
                      {gapAnalysis.total_training_hours_needed || 0}h
                    </p>
                    <p className="text-sm text-muted-foreground">Horas formación necesarias</p>
                  </div>
                </div>
              </div>

              {gapAnalysis.gaps && gapAnalysis.gaps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Gaps por Competencia</h4>
                  {gapAnalysis.gaps.map((gap, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-3 rounded-lg border",
                        gap.gap_severity === 'critical' && 'border-red-500/50 bg-red-500/5',
                        gap.gap_severity === 'high' && 'border-orange-500/50 bg-orange-500/5',
                        gap.gap_severity === 'medium' && 'border-yellow-500/50 bg-yellow-500/5',
                        gap.gap_severity === 'low' && 'border-green-500/50 bg-green-500/5'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{gap.competency_name}</span>
                        <Badge 
                          variant="outline"
                          className={cn(
                            gap.gap_severity === 'critical' && 'text-red-500',
                            gap.gap_severity === 'high' && 'text-orange-500',
                            gap.gap_severity === 'medium' && 'text-yellow-500',
                            gap.gap_severity === 'low' && 'text-green-500'
                          )}
                        >
                          {gap.gap_severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Nivel actual: {gap.current_level}/5</span>
                        <span>→</span>
                        <span>Requerido: {gap.required_level}/5</span>
                        <span className="text-muted-foreground">
                          ({gap.estimated_training_hours}h estimadas)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {gapAnalysis.recommendations && gapAnalysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recomendaciones</h4>
                  <ul className="space-y-1">
                    {gapAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGapAnalysisDialog(false)}>
              Cerrar
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Exportar Informe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva Competencia */}
      <Dialog open={showCompetencyDialog} onOpenChange={setShowCompetencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Competencia</DialogTitle>
            <DialogDescription>
              Define una nueva competencia para el mapa organizacional
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la competencia</Label>
              <Input placeholder="Ej: Gestión de proyectos" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe la competencia y sus niveles..." />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="technical">Técnica</option>
                <option value="soft">Soft Skill</option>
                <option value="leadership">Liderazgo</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompetencyDialog(false)}>
              Cancelar
            </Button>
            <Button>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva Formación */}
      <Dialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Formación</DialogTitle>
            <DialogDescription>
              Añade una formación al catálogo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ej: Excel Avanzado para Finanzas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modalidad</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="blended">Blended</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Duración (horas)</Label>
                <Input type="number" placeholder="40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coste por persona (€)</Label>
                <Input type="number" placeholder="500" />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="interno">Interno</option>
                  <option value="externo">Externo</option>
                  <option value="online">Plataforma Online</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Objetivos y contenido de la formación..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrainingDialog(false)}>
              Cancelar
            </Button>
            <Button>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRTrainingPanel;
