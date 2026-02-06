/**
 * HRIndustryTemplatesPanel - Panel de Industry Cloud Templates
 * Fase 9: Verticalización por sector CNAE
 * 
 * Gestión de plantillas específicas por industria:
 * - Contratos laborales sectoriales
 * - Procesos de onboarding por CNAE
 * - Compliance específico por normativa
 * - Generación IA de plantillas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  FileText,
  Sparkles,
  Plus,
  Copy,
  Trash2,
  Settings,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  Search,
  Factory,
  Briefcase,
  GraduationCap,
  Heart,
  Truck,
  Landmark,
  ShoppingBag,
  Hammer,
  Leaf,
  Zap,
  Building,
  Film,
  MoreHorizontal,
  Eye,
  Play
} from 'lucide-react';
import { useHRIndustryTemplates, type IndustryCategory, type TemplateType, type IndustryTemplate, type AITemplateRecommendation } from '@/hooks/erp/hr/useHRIndustryTemplates';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// Mapeo de iconos por industria
const INDUSTRY_ICONS: Record<IndustryCategory, React.ReactNode> = {
  technology: <Briefcase className="h-4 w-4" />,
  healthcare: <Heart className="h-4 w-4" />,
  hospitality: <Building className="h-4 w-4" />,
  construction: <Hammer className="h-4 w-4" />,
  retail: <ShoppingBag className="h-4 w-4" />,
  manufacturing: <Factory className="h-4 w-4" />,
  finance: <Landmark className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  logistics: <Truck className="h-4 w-4" />,
  agriculture: <Leaf className="h-4 w-4" />,
  energy: <Zap className="h-4 w-4" />,
  professional_services: <Briefcase className="h-4 w-4" />,
  real_estate: <Building2 className="h-4 w-4" />,
  media: <Film className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />
};

const INDUSTRY_LABELS: Record<IndustryCategory, string> = {
  technology: 'Tecnología',
  healthcare: 'Sanidad',
  hospitality: 'Hostelería',
  construction: 'Construcción',
  retail: 'Comercio',
  manufacturing: 'Industria',
  finance: 'Finanzas',
  education: 'Educación',
  logistics: 'Logística',
  agriculture: 'Agricultura',
  energy: 'Energía',
  professional_services: 'Servicios Profesionales',
  real_estate: 'Inmobiliario',
  media: 'Medios',
  other: 'Otros'
};

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  contract: 'Contrato',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  policy: 'Política',
  compliance: 'Compliance',
  payroll_config: 'Nómina',
  benefits: 'Beneficios',
  safety: 'Seguridad',
  training: 'Formación'
};

interface HRIndustryTemplatesPanelProps {
  className?: string;
  companyId?: string;
}

export function HRIndustryTemplatesPanel({ className, companyId }: HRIndustryTemplatesPanelProps) {
  const {
    templates,
    industryProfile,
    stats,
    loading,
    fetchTemplates,
    fetchIndustryProfile,
    fetchStats,
    saveTemplate,
    generateTemplateFromAI,
    getAIRecommendations,
    cloneTemplate,
    deleteTemplate
  } = useHRIndustryTemplates();

  const [activeTab, setActiveTab] = useState('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIndustry, setFilterIndustry] = useState<IndustryCategory | 'all'>('all');
  const [filterType, setFilterType] = useState<TemplateType | 'all'>('all');
  
  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<AITemplateRecommendation | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    template_type: 'contract' as TemplateType,
    industry: 'technology' as IndustryCategory,
    cnae_code: '',
    jurisdiction: 'España',
    collective_agreement: '',
    specific_requirements: ''
  });

  // Load data on mount
  useEffect(() => {
    if (companyId) {
      fetchTemplates(companyId);
      fetchIndustryProfile(companyId);
      fetchStats(companyId);
    }
  }, [companyId, fetchTemplates, fetchIndustryProfile, fetchStats]);

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.template_description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = filterIndustry === 'all' || t.industry_category === filterIndustry;
    const matchesType = filterType === 'all' || t.template_type === filterType;
    return matchesSearch && matchesIndustry && matchesType;
  });

  // Generate template with AI
  const handleGenerateTemplate = async () => {
    if (!companyId) return;
    
    setIsGenerating(true);
    try {
      const generated = await generateTemplateFromAI(companyId, generateForm);
      if (generated) {
        // Save the generated template
        await saveTemplate({
          company_id: companyId,
          ...generated as any
        });
        setShowGenerateDialog(false);
        fetchTemplates(companyId);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Load AI recommendations
  const loadRecommendations = async () => {
    if (!companyId || !industryProfile) return;
    
    setLoadingRecommendations(true);
    try {
      const recs = await getAIRecommendations(companyId, {
        industry: industryProfile.primary_industry,
        cnae_codes: industryProfile.cnae_codes,
        employee_count: 50, // TODO: Get from company profile
        current_templates: templates.map(t => t.template_type)
      });
      setRecommendations(recs);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Handle template actions
  const handleCloneTemplate = async (template: IndustryTemplate) => {
    const newName = `${template.template_name} (Copia)`;
    await cloneTemplate(template.id, newName);
    if (companyId) {
      fetchTemplates(companyId);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('¿Eliminar esta plantilla?')) {
      await deleteTemplate(templateId);
    }
  };

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para gestionar plantillas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Industry Cloud Templates
          </h2>
          <p className="text-muted-foreground mt-1">
            Plantillas verticalizadas por sector y CNAE
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generar con IA
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Plantillas</p>
                  <p className="text-2xl font-bold">{stats.total_templates}</p>
                </div>
                <FileText className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cobertura Compliance</p>
                  <p className="text-2xl font-bold">{Math.round(stats.compliance_coverage)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/20" />
              </div>
              <Progress value={stats.compliance_coverage} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Más Usada</p>
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {stats.most_used_templates[0]?.template_name || 'N/A'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Última Actualización</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(stats.last_template_update), { 
                      locale: es, 
                      addSuffix: true 
                    })}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="h-4 w-4" />
                Plantillas
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Recomendaciones IA
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2">
                <Settings className="h-4 w-4" />
                Perfil Sectorial
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-0">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar plantillas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterIndustry} onValueChange={(v) => setFilterIndustry(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Industria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las industrias</SelectItem>
                    {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {INDUSTRY_ICONS[key as IndustryCategory]}
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(TEMPLATE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay plantillas</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 gap-2"
                    onClick={() => setShowGenerateDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Crear primera plantilla
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {INDUSTRY_ICONS[template.industry_category]}
                            <Badge variant="outline" className="text-xs">
                              {TEMPLATE_TYPE_LABELS[template.template_type]}
                            </Badge>
                          </div>
                          <Badge 
                            variant={template.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {template.status === 'active' ? 'Activa' : 
                             template.status === 'draft' ? 'Borrador' : 
                             template.status === 'deprecated' ? 'Obsoleta' : 'Archivada'}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2">{template.template_name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {template.template_description || 'Sin descripción'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>v{template.version}</span>
                          <span>{template.usage_count} usos</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.cnae_codes.slice(0, 3).map((code) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              CNAE {code}
                            </Badge>
                          ))}
                          {template.cnae_codes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.cnae_codes.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 gap-1"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowTemplateDialog(true);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCloneTemplate(template)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Recomendaciones IA</h3>
                    <p className="text-sm text-muted-foreground">
                      Análisis inteligente de plantillas recomendadas para tu sector
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={loadRecommendations}
                    disabled={loadingRecommendations || !industryProfile}
                    className="gap-2"
                  >
                    {loadingRecommendations ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Analizar
                  </Button>
                </div>

                {!industryProfile ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">
                        Configura tu perfil sectorial para obtener recomendaciones
                      </p>
                      <Button variant="outline" onClick={() => setActiveTab('profile')}>
                        Configurar perfil
                      </Button>
                    </CardContent>
                  </Card>
                ) : recommendations ? (
                  <div className="grid gap-6">
                    {/* Recommended Templates */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Plantillas Recomendadas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations.recommended_templates.map((rec, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={rec.priority === 'high' ? 'destructive' : 
                                            rec.priority === 'medium' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {rec.priority === 'high' ? 'Alta' : 
                                     rec.priority === 'medium' ? 'Media' : 'Baja'}
                                  </Badge>
                                  <span className="font-medium">
                                    {TEMPLATE_TYPE_LABELS[rec.template_type as TemplateType]}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {rec.reason}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  ⏱️ Ahorro estimado: {rec.estimated_time_savings}
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                className="gap-1"
                                onClick={() => {
                                  setGenerateForm(prev => ({
                                    ...prev,
                                    template_type: rec.template_type as TemplateType
                                  }));
                                  setShowGenerateDialog(true);
                                }}
                              >
                                <Play className="h-3 w-3" />
                                Generar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insights & Gaps */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Insights del Sector
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {recommendations.industry_insights.map((insight, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            Gaps de Compliance
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {recommendations.compliance_gaps.length > 0 ? (
                              recommendations.compliance_gaps.map((gap, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                  {gap}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-muted-foreground">
                                No se detectaron gaps críticos
                              </li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Best Practices */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          Mejores Prácticas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="grid md:grid-cols-2 gap-2">
                          {recommendations.best_practices.map((practice, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                              <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                              {practice}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Pulsa "Analizar" para obtener recomendaciones personalizadas
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Perfil Sectorial</CardTitle>
                  <CardDescription>
                    Configura el perfil de tu empresa para personalizar las plantillas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industria Principal</Label>
                      <Select defaultValue={industryProfile?.primary_industry || 'technology'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {INDUSTRY_ICONS[key as IndustryCategory]}
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Códigos CNAE</Label>
                      <Input 
                        placeholder="62, 63, 58..." 
                        defaultValue={industryProfile?.cnae_codes.join(', ')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Jurisdicción Principal</Label>
                      <Select defaultValue="españa">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="españa">España</SelectItem>
                          <SelectItem value="andorra">Andorra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nivel de Compliance</Label>
                      <Select defaultValue={industryProfile?.compliance_level || 'standard'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="standard">Estándar</SelectItem>
                          <SelectItem value="enhanced">Avanzado</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>Guardar Perfil</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Generate Template Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generar Plantilla con IA
            </DialogTitle>
            <DialogDescription>
              La IA generará una plantilla específica para tu sector
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Plantilla</Label>
                <Select 
                  value={generateForm.template_type}
                  onValueChange={(v) => setGenerateForm(prev => ({ ...prev, template_type: v as TemplateType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Industria</Label>
                <Select 
                  value={generateForm.industry}
                  onValueChange={(v) => setGenerateForm(prev => ({ ...prev, industry: v as IndustryCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código CNAE</Label>
                <Input 
                  placeholder="Ej: 62"
                  value={generateForm.cnae_code}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, cnae_code: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Jurisdicción</Label>
                <Select 
                  value={generateForm.jurisdiction}
                  onValueChange={(v) => setGenerateForm(prev => ({ ...prev, jurisdiction: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="España">España</SelectItem>
                    <SelectItem value="Andorra">Andorra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Convenio Colectivo (opcional)</Label>
              <Input 
                placeholder="Ej: Convenio del Metal"
                value={generateForm.collective_agreement}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, collective_agreement: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Requisitos Específicos (opcional)</Label>
              <Textarea 
                placeholder="Describe requisitos adicionales para la plantilla..."
                value={generateForm.specific_requirements}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, specific_requirements: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateTemplate} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.template_name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.template_description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{INDUSTRY_LABELS[selectedTemplate.industry_category]}</Badge>
                <Badge variant="outline">{TEMPLATE_TYPE_LABELS[selectedTemplate.template_type]}</Badge>
                <Badge variant="secondary">v{selectedTemplate.version}</Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Códigos CNAE</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.cnae_codes.map(code => (
                    <Badge key={code} variant="outline">CNAE {code}</Badge>
                  ))}
                </div>
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Variables ({selectedTemplate.variables.length})</h4>
                  <div className="grid gap-2">
                    {selectedTemplate.variables.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                        <span className="font-mono text-sm">{`{{${v.key}}}`}</span>
                        <span className="text-sm text-muted-foreground">{v.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.compliance_requirements && selectedTemplate.compliance_requirements.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Requisitos de Compliance</h4>
                  <div className="space-y-2">
                    {selectedTemplate.compliance_requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded border">
                        {req.is_mandatory ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{req.requirement_name}</p>
                          <p className="text-xs text-muted-foreground">{req.regulation_reference}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cerrar
            </Button>
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Aplicar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRIndustryTemplatesPanel;
