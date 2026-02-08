/**
 * GaliaConvocatoriaSimulatorPanel - Simulador de Convocatorias
 * Predicción de elegibilidad, estimación de ayuda y sugerencias de mejora
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Target,
  Euro,
  Building,
  Users,
  Sparkles,
  Play,
  Save,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Maximize2,
  Minimize2,
  FileText,
  Award,
  Clock
} from 'lucide-react';
import { 
  useGaliaConvocatoriaSimulator, 
  ProjectProfile,
  SimulationResult 
} from '@/hooks/galia/useGaliaConvocatoriaSimulator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaConvocatoriaSimulatorPanelProps {
  className?: string;
  defaultRegion?: string;
}

const SECTORS = [
  { value: 'agroalimentario', label: 'Agroalimentario' },
  { value: 'turismo', label: 'Turismo Rural' },
  { value: 'artesania', label: 'Artesanía' },
  { value: 'comercio', label: 'Comercio Local' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'industria', label: 'Industria' },
  { value: 'tecnologia', label: 'Tecnología/Digital' },
  { value: 'cultura', label: 'Cultura y Patrimonio' },
  { value: 'medio_ambiente', label: 'Medio Ambiente' },
  { value: 'energia', label: 'Energías Renovables' }
];

const PROJECT_TYPES = [
  { value: 'inversion', label: 'Inversión Productiva' },
  { value: 'emprendimiento', label: 'Emprendimiento' },
  { value: 'innovacion', label: 'Innovación' },
  { value: 'digitalizacion', label: 'Digitalización' },
  { value: 'sostenibilidad', label: 'Sostenibilidad' },
  { value: 'turismo', label: 'Turismo' }
];

const LEGAL_FORMS = [
  { value: 'autonomo', label: 'Autónomo' },
  { value: 'sl', label: 'Sociedad Limitada' },
  { value: 'sa', label: 'Sociedad Anónima' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'asociacion', label: 'Asociación' },
  { value: 'ayuntamiento', label: 'Ayuntamiento/Entidad Local' },
  { value: 'other', label: 'Otra forma jurídica' }
];

export function GaliaConvocatoriaSimulatorPanel({ 
  className,
  defaultRegion = 'asturias'
}: GaliaConvocatoriaSimulatorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  
  // Form state
  const [formData, setFormData] = useState<Partial<ProjectProfile>>({
    name: '',
    description: '',
    sector: '',
    municipality: '',
    legalForm: 'sl',
    employeesCount: 1,
    totalInvestment: 50000,
    requestedGrant: 25000,
    projectType: 'inversion',
    activities: [],
    createsJobs: true,
    jobsToCreate: 1,
    isRuralArea: true
  });

  const {
    isSimulating,
    simulationResult,
    savedProfiles,
    error,
    simulateEligibility,
    saveProjectProfile,
    clearSimulation,
    exportSimulationResult
  } = useGaliaConvocatoriaSimulator();

  const handleInputChange = useCallback((field: keyof ProjectProfile, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSimulate = useCallback(async () => {
    if (!formData.name || !formData.description || !formData.sector) {
      return;
    }

    const project: ProjectProfile = {
      name: formData.name || '',
      description: formData.description || '',
      sector: formData.sector || '',
      municipality: formData.municipality || '',
      legalForm: (formData.legalForm as ProjectProfile['legalForm']) || 'sl',
      employeesCount: formData.employeesCount || 1,
      annualRevenue: formData.annualRevenue,
      yearsOperating: formData.yearsOperating,
      totalInvestment: formData.totalInvestment || 50000,
      requestedGrant: formData.requestedGrant || 25000,
      projectType: (formData.projectType as ProjectProfile['projectType']) || 'inversion',
      activities: formData.activities || [],
      hasEnvironmentalImpact: formData.hasEnvironmentalImpact,
      createsJobs: formData.createsJobs,
      jobsToCreate: formData.jobsToCreate,
      isRuralArea: formData.isRuralArea,
      previousGrants: formData.previousGrants
    };

    await simulateEligibility(project, { region: defaultRegion });
    setActiveTab('results');
  }, [formData, defaultRegion, simulateEligibility]);

  const handleSaveProfile = useCallback(() => {
    if (formData.name) {
      saveProjectProfile(formData as ProjectProfile);
    }
  }, [formData, saveProjectProfile]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500 text-xs">Media</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Baja</Badge>;
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case 'easy':
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Fácil</Badge>;
      case 'moderate':
        return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">Moderado</Badge>;
      default:
        return <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Difícil</Badge>;
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Simulador de Convocatorias
                <Badge variant="outline" className="text-xs">Phase 8C</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Predice elegibilidad y estima ayuda antes de solicitar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {simulationResult && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => exportSimulationResult(simulationResult)}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="form" className="text-xs gap-1">
              <FileText className="h-3 w-3" />
              Proyecto
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs gap-1" disabled={!simulationResult}>
              <Target className="h-3 w-3" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="improvements" className="text-xs gap-1" disabled={!simulationResult}>
              <Lightbulb className="h-3 w-3" />
              Mejoras
            </TabsTrigger>
            <TabsTrigger value="calls" className="text-xs gap-1" disabled={!simulationResult}>
              <Award className="h-3 w-3" />
              Convocatorias
            </TabsTrigger>
          </TabsList>

          {/* FORMULARIO */}
          <TabsContent value="form" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-4 pr-2">
                {/* Información básica */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Información del Proyecto
                  </Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="name" className="text-xs">Nombre del proyecto *</Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Ej: Ampliación quesería artesanal"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="municipality" className="text-xs">Municipio</Label>
                      <Input
                        id="municipality"
                        value={formData.municipality || ''}
                        onChange={(e) => handleInputChange('municipality', e.target.value)}
                        placeholder="Ej: Cangas del Narcea"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-xs">Descripción del proyecto *</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe brevemente el proyecto y sus objetivos..."
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Sector *</Label>
                      <Select 
                        value={formData.sector || ''} 
                        onValueChange={(v) => handleInputChange('sector', v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTORS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de proyecto</Label>
                      <Select 
                        value={formData.projectType || 'inversion'} 
                        onValueChange={(v) => handleInputChange('projectType', v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Forma jurídica</Label>
                      <Select 
                        value={formData.legalForm || 'sl'} 
                        onValueChange={(v) => handleInputChange('legalForm', v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEGAL_FORMS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Información económica */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Información Económica
                  </Label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Inversión total (€)</Label>
                      <Input
                        type="number"
                        value={formData.totalInvestment || 50000}
                        onChange={(e) => handleInputChange('totalInvestment', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ayuda solicitada (€)</Label>
                      <Input
                        type="number"
                        value={formData.requestedGrant || 25000}
                        onChange={(e) => handleInputChange('requestedGrant', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between text-sm">
                      <span>Intensidad de ayuda:</span>
                      <span className="font-medium">
                        {formData.totalInvestment 
                          ? ((formData.requestedGrant || 0) / formData.totalInvestment * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={formData.totalInvestment 
                        ? ((formData.requestedGrant || 0) / formData.totalInvestment * 100) 
                        : 0} 
                      className="h-2 mt-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo habitual LEADER: 50% (hasta 70% en zonas despobladas)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nº empleados actuales</Label>
                      <Input
                        type="number"
                        value={formData.employeesCount || 1}
                        onChange={(e) => handleInputChange('employeesCount', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Facturación anual (€)</Label>
                      <Input
                        type="number"
                        value={formData.annualRevenue || ''}
                        onChange={(e) => handleInputChange('annualRevenue', parseInt(e.target.value) || undefined)}
                        className="h-9 text-sm"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Criterios adicionales */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Criterios de Valoración
                  </Label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-xs font-medium">¿Crea empleo?</Label>
                        <p className="text-xs text-muted-foreground">Mayor puntuación si genera puestos de trabajo</p>
                      </div>
                      <Switch
                        checked={formData.createsJobs || false}
                        onCheckedChange={(v) => handleInputChange('createsJobs', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-xs font-medium">¿Zona rural?</Label>
                        <p className="text-xs text-muted-foreground">Municipio &lt;20.000 habitantes</p>
                      </div>
                      <Switch
                        checked={formData.isRuralArea || false}
                        onCheckedChange={(v) => handleInputChange('isRuralArea', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-xs font-medium">¿Impacto ambiental positivo?</Label>
                        <p className="text-xs text-muted-foreground">Sostenibilidad, eficiencia energética</p>
                      </div>
                      <Switch
                        checked={formData.hasEnvironmentalImpact || false}
                        onCheckedChange={(v) => handleInputChange('hasEnvironmentalImpact', v)}
                      />
                    </div>
                    {formData.createsJobs && (
                      <div className="p-3 rounded-lg border">
                        <Label className="text-xs font-medium mb-2 block">Empleos a crear</Label>
                        <Slider
                          value={[formData.jobsToCreate || 1]}
                          onValueChange={([v]) => handleInputChange('jobsToCreate', v)}
                          min={1}
                          max={20}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1</span>
                          <span className="font-medium">{formData.jobsToCreate || 1} empleos</span>
                          <span>20</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2 pt-4">
                  <Button 
                    onClick={handleSimulate}
                    disabled={isSimulating || !formData.name || !formData.description || !formData.sector}
                    className="flex-1 gap-2"
                  >
                    {isSimulating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Simulando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Simular Elegibilidad
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSaveProfile}
                    disabled={!formData.name}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {error}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* RESULTADOS */}
          <TabsContent value="results" className="flex-1 mt-0">
            {simulationResult && (
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
                <div className="space-y-4 pr-2">
                  {/* Resumen de elegibilidad */}
                  <Card className={cn(
                    "border-l-4",
                    simulationResult.eligibility.isEligible ? "border-l-green-500" : "border-l-destructive"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {simulationResult.eligibility.isEligible 
                            ? <CheckCircle2 className="h-6 w-6 text-green-500" />
                            : <XCircle className="h-6 w-6 text-destructive" />
                          }
                          <div>
                            <h3 className="font-semibold">
                              {simulationResult.eligibility.isEligible ? 'Proyecto Elegible' : 'No Elegible'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Puntuación: {simulationResult.eligibility.eligibilityScore}/100
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {simulationResult.grantEstimate.estimatedAmount.toLocaleString('es-ES')}€
                          </div>
                          <p className="text-xs text-muted-foreground">Ayuda estimada</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {simulationResult.eligibility.summary}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Criterios de elegibilidad */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Criterios de Elegibilidad</Label>
                    <div className="space-y-2">
                      {simulationResult.eligibility.passedCriteria.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 p-2 rounded bg-green-50 dark:bg-green-950">
                          {getStatusIcon(c.status)}
                          <div className="flex-1">
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.details}</div>
                          </div>
                        </div>
                      ))}
                      {simulationResult.eligibility.warningCriteria.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-950">
                          {getStatusIcon(c.status)}
                          <div className="flex-1">
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.details}</div>
                          </div>
                        </div>
                      ))}
                      {simulationResult.eligibility.failedCriteria.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-950">
                          {getStatusIcon(c.status)}
                          <div className="flex-1">
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Puntuación predicha */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-xs font-semibold">Puntuación Predicha</Label>
                        <Badge variant={
                          simulationResult.scoring.ranking === 'alto' ? 'default' :
                          simulationResult.scoring.ranking === 'medio' ? 'secondary' : 'outline'
                        }>
                          Ranking {simulationResult.scoring.ranking}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-3xl font-bold">
                          {simulationResult.scoring.predictedScore}
                        </div>
                        <div className="text-muted-foreground">/</div>
                        <div className="text-xl text-muted-foreground">
                          {simulationResult.scoring.maxPossibleScore}
                        </div>
                        <div className="flex-1">
                          <Progress 
                            value={(simulationResult.scoring.predictedScore / simulationResult.scoring.maxPossibleScore) * 100} 
                            className="h-3" 
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {simulationResult.scoring.competitivenessAnalysis}
                      </p>

                      <Separator className="my-3" />

                      <div className="space-y-2">
                        {simulationResult.scoring.scoreBreakdown.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.criterion}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={(item.points / item.maxPoints) * 100} className="w-20 h-2" />
                              <span className="font-medium w-16 text-right">{item.points}/{item.maxPoints}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Estimación de ayuda */}
                  <Card>
                    <CardContent className="p-4">
                      <Label className="text-xs font-semibold mb-3 block">Estimación de Ayuda</Label>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="text-lg font-bold text-muted-foreground">
                            {simulationResult.grantEstimate.minAmount.toLocaleString('es-ES')}€
                          </div>
                          <div className="text-xs text-muted-foreground">Mínimo</div>
                        </div>
                        <div className="text-center p-2 bg-primary/10 rounded">
                          <div className="text-xl font-bold text-primary">
                            {simulationResult.grantEstimate.estimatedAmount.toLocaleString('es-ES')}€
                          </div>
                          <div className="text-xs text-muted-foreground">Estimado</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <div className="text-lg font-bold text-muted-foreground">
                            {simulationResult.grantEstimate.maxAmount.toLocaleString('es-ES')}€
                          </div>
                          <div className="text-xs text-muted-foreground">Máximo</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                        <span>Confianza del cálculo:</span>
                        <div className="flex items-center gap-2">
                          <Progress value={simulationResult.grantEstimate.confidenceLevel} className="w-24 h-2" />
                          <span className="font-medium">{simulationResult.grantEstimate.confidenceLevel}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* MEJORAS */}
          <TabsContent value="improvements" className="flex-1 mt-0">
            {simulationResult && simulationResult.improvements.length > 0 && (
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
                <div className="space-y-3 pr-2">
                  <p className="text-sm text-muted-foreground">
                    Sugerencias para mejorar tu elegibilidad y puntuación
                  </p>
                  {simulationResult.improvements.map((imp) => (
                    <Card key={imp.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-primary" />
                            <h4 className="font-medium text-sm">{imp.title}</h4>
                          </div>
                          <div className="flex items-center gap-1">
                            {getPriorityBadge(imp.priority)}
                            {getEffortBadge(imp.effort)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {imp.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs mb-3">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span>+{imp.impact} puntos</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{imp.timeline}</span>
                          </div>
                        </div>
                        {imp.specificActions.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Acciones específicas:</Label>
                            {imp.specificActions.map((action, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* CONVOCATORIAS */}
          <TabsContent value="calls" className="flex-1 mt-0">
            {simulationResult && simulationResult.matchingCalls.length > 0 && (
              <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
                <div className="space-y-3 pr-2">
                  <p className="text-sm text-muted-foreground">
                    Convocatorias compatibles con tu proyecto
                  </p>
                  {simulationResult.matchingCalls.map((call) => (
                    <Card key={call.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">{call.title}</h4>
                            <p className="text-xs text-muted-foreground">{call.organization}</p>
                          </div>
                          <Badge variant={
                            call.eligibilityStatus === 'eligible' ? 'default' :
                            call.eligibilityStatus === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {call.matchScore}% compatible
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Plazo: {call.deadline}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            <span>Presupuesto: {(call.budget / 1000000).toFixed(1)}M€</span>
                          </div>
                        </div>
                        {call.recommendedActions.length > 0 && (
                          <div className="p-2 bg-muted/50 rounded text-xs">
                            <span className="font-medium">Recomendación: </span>
                            {call.recommendedActions[0]}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaConvocatoriaSimulatorPanel;
