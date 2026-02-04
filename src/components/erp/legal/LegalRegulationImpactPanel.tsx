/**
 * LegalRegulationImpactPanel - Fase 9
 * Panel para reportes de impacto de nuevas normativas
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  RefreshCw,
  Calendar,
  Globe,
  TrendingUp,
  Building2,
  Users,
  Database,
  Sparkles,
  ChevronRight,
  Target,
  Zap,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalRegulationImpactPanelProps {
  companyId: string;
}

interface RegulationImpact {
  id: string;
  regulation: string;
  code: string;
  jurisdiction: string;
  type: 'new' | 'amendment' | 'repeal';
  effectiveDate: string;
  publishedDate: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  readinessScore: number;
  affectedAreas: string[];
  affectedProcesses: number;
  estimatedCost: string;
  status: 'pending' | 'analyzing' | 'adapting' | 'compliant';
  summary: string;
  actions: {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
    completed: boolean;
  }[];
}

export function LegalRegulationImpactPanel({ companyId }: LegalRegulationImpactPanelProps) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [regulations] = useState<RegulationImpact[]>([
    {
      id: '1',
      regulation: 'Reglamento de Inteligencia Artificial (AI Act)',
      code: 'Reglamento (UE) 2024/1689',
      jurisdiction: 'EU',
      type: 'new',
      effectiveDate: '2026-08-02',
      publishedDate: '2024-07-12',
      impactLevel: 'critical',
      readinessScore: 45,
      affectedAreas: ['IT', 'Producto', 'Compliance', 'RRHH', 'Legal'],
      affectedProcesses: 12,
      estimatedCost: '€150,000 - €300,000',
      status: 'adapting',
      summary: 'Establece requisitos para sistemas de IA de alto riesgo, incluyendo transparencia, supervisión humana y gestión de riesgos.',
      actions: [
        { id: 'a1', title: 'Inventario de sistemas de IA', priority: 'high', dueDate: '2025-06-01', completed: true },
        { id: 'a2', title: 'Clasificación por nivel de riesgo', priority: 'high', dueDate: '2025-09-01', completed: false },
        { id: 'a3', title: 'Evaluación de impacto algorítmico', priority: 'medium', dueDate: '2026-01-01', completed: false },
        { id: 'a4', title: 'Documentación técnica obligatoria', priority: 'high', dueDate: '2026-05-01', completed: false }
      ]
    },
    {
      id: '2',
      regulation: 'DORA - Resiliencia Operativa Digital',
      code: 'Reglamento (UE) 2022/2554',
      jurisdiction: 'EU',
      type: 'new',
      effectiveDate: '2025-01-17',
      publishedDate: '2022-12-27',
      impactLevel: 'high',
      readinessScore: 78,
      affectedAreas: ['IT', 'Seguridad', 'Operaciones', 'Proveedores'],
      affectedProcesses: 8,
      estimatedCost: '€80,000 - €150,000',
      status: 'adapting',
      summary: 'Marco de resiliencia operativa digital para entidades financieras, incluyendo gestión de riesgos TIC y supervisión de terceros.',
      actions: [
        { id: 'b1', title: 'Marco de gestión de riesgos TIC', priority: 'high', dueDate: '2024-12-01', completed: true },
        { id: 'b2', title: 'Plan de continuidad de negocio', priority: 'high', dueDate: '2024-12-15', completed: true },
        { id: 'b3', title: 'Due diligence proveedores TIC críticos', priority: 'medium', dueDate: '2025-01-10', completed: false }
      ]
    },
    {
      id: '3',
      regulation: 'NIS2 - Directiva de Seguridad de Redes',
      code: 'Directiva (UE) 2022/2555',
      jurisdiction: 'EU',
      type: 'amendment',
      effectiveDate: '2024-10-18',
      publishedDate: '2022-12-27',
      impactLevel: 'high',
      readinessScore: 92,
      affectedAreas: ['IT', 'Seguridad', 'Legal', 'Comunicaciones'],
      affectedProcesses: 5,
      estimatedCost: '€40,000 - €80,000',
      status: 'compliant',
      summary: 'Ampliación del ámbito de aplicación de ciberseguridad con nuevas obligaciones de notificación y medidas de seguridad.',
      actions: [
        { id: 'c1', title: 'Análisis de aplicabilidad', priority: 'high', dueDate: '2024-06-01', completed: true },
        { id: 'c2', title: 'Actualización políticas de seguridad', priority: 'medium', dueDate: '2024-08-01', completed: true },
        { id: 'c3', title: 'Procedimiento de notificación incidentes', priority: 'high', dueDate: '2024-10-01', completed: true }
      ]
    },
    {
      id: '4',
      regulation: 'Reforma Ley de Protección de Datos Andorra',
      code: 'Llei 29/2021 modificada',
      jurisdiction: 'AD',
      type: 'amendment',
      effectiveDate: '2025-07-01',
      publishedDate: '2025-01-15',
      impactLevel: 'medium',
      readinessScore: 35,
      affectedAreas: ['Legal', 'IT', 'RRHH', 'Marketing'],
      affectedProcesses: 6,
      estimatedCost: '€20,000 - €40,000',
      status: 'analyzing',
      summary: 'Modificaciones para alinear con estándares europeos de transferencias internacionales y derechos del interesado.',
      actions: [
        { id: 'd1', title: 'Análisis de cambios', priority: 'high', dueDate: '2025-03-01', completed: false },
        { id: 'd2', title: 'Actualización cláusulas informativas', priority: 'medium', dueDate: '2025-05-01', completed: false }
      ]
    }
  ]);

  const handleAnalyzeImpact = async (regulationId: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'analyze_regulation_impact',
          context: { companyId },
          params: { regulationId }
        }
      });

      if (error) throw error;
      toast.success('Análisis de impacto completado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al analizar impacto');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getImpactBadge = (level: RegulationImpact['impactLevel']) => {
    const config = {
      low: { label: 'Bajo', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      medium: { label: 'Medio', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      high: { label: 'Alto', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      critical: { label: 'Crítico', className: 'bg-red-500/10 text-red-600 border-red-500/20' }
    };
    return (
      <Badge variant="outline" className={config[level].className}>
        {config[level].label}
      </Badge>
    );
  };

  const getTypeBadge = (type: RegulationImpact['type']) => {
    const config = {
      new: { label: 'Nueva', className: 'bg-blue-500/10 text-blue-600' },
      amendment: { label: 'Modificación', className: 'bg-purple-500/10 text-purple-600' },
      repeal: { label: 'Derogación', className: 'bg-muted text-muted-foreground' }
    };
    return <Badge className={config[type].className}>{config[type].label}</Badge>;
  };

  const getStatusBadge = (status: RegulationImpact['status']) => {
    const config = {
      pending: { label: 'Pendiente', icon: Clock, className: 'bg-muted text-muted-foreground' },
      analyzing: { label: 'Analizando', icon: Eye, className: 'bg-blue-500/10 text-blue-600' },
      adapting: { label: 'Adaptando', icon: RefreshCw, className: 'bg-amber-500/10 text-amber-600' },
      compliant: { label: 'Cumple', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600' }
    };
    const { icon: Icon, label, className } = config[status];
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = {
      'ES': '🇪🇸',
      'AD': '🇦🇩',
      'EU': '🇪🇺',
      'INT': '🌍'
    };
    return flags[code] || '🏳️';
  };

  const getDaysUntil = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: `Vigente hace ${Math.abs(days)} días`, urgent: false };
    if (days <= 30) return { text: `${days} días`, urgent: true };
    if (days <= 90) return { text: `${days} días`, urgent: false };
    return { text: `${Math.floor(days / 30)} meses`, urgent: false };
  };

  const upcomingRegulations = regulations.filter(r => new Date(r.effectiveDate) > new Date());
  const activeRegulations = regulations.filter(r => new Date(r.effectiveDate) <= new Date() && r.status !== 'compliant');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Impacto Regulatorio</h2>
            <p className="text-sm text-muted-foreground">
              Análisis de nuevas normativas y su impacto
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Exportar Reporte
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Normativas Monitoreadas</p>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{regulations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Próximas Entradas</p>
              <Calendar className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{upcomingRegulations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Impacto Crítico</p>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {regulations.filter(r => r.impactLevel === 'critical').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Readiness Media</p>
              <Target className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">
              {Math.round(regulations.reduce((acc, r) => acc + r.readinessScore, 0) / regulations.length)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Próximas ({upcomingRegulations.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Zap className="h-4 w-4" />
            En Adaptación ({activeRegulations.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            Todas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {(activeTab === 'upcoming' ? upcomingRegulations : 
                    activeTab === 'active' ? activeRegulations : regulations
                  ).map((regulation) => {
                    const daysInfo = getDaysUntil(regulation.effectiveDate);
                    const completedActions = regulation.actions.filter(a => a.completed).length;
                    
                    return (
                      <div key={regulation.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="text-2xl">{getJurisdictionFlag(regulation.jurisdiction)}</div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{regulation.regulation}</p>
                                <p className="text-sm text-muted-foreground">{regulation.code}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getTypeBadge(regulation.type)}
                                {getImpactBadge(regulation.impactLevel)}
                                {getStatusBadge(regulation.status)}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {regulation.summary}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 rounded-lg bg-muted/50 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Entrada en Vigor</p>
                                <p className={`font-medium ${daysInfo.urgent ? 'text-red-600' : ''}`}>
                                  {format(new Date(regulation.effectiveDate), 'dd MMM yyyy', { locale: es })}
                                </p>
                                <p className={`text-xs ${daysInfo.urgent ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {daysInfo.text}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Readiness</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={regulation.readinessScore} className="h-2 flex-1" />
                                  <span className="text-sm font-medium">{regulation.readinessScore}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Procesos Afectados</p>
                                <p className="font-medium">{regulation.affectedProcesses}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Coste Estimado</p>
                                <p className="font-medium text-sm">{regulation.estimatedCost}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {regulation.affectedAreas.map((area, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  Acciones: {completedActions}/{regulation.actions.length}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAnalyzeImpact(regulation.id)}
                                  disabled={isAnalyzing}
                                >
                                  {isAnalyzing ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-1" />
                                      Analizar
                                    </>
                                  )}
                                </Button>
                                <Button size="sm" variant="ghost">
                                  Ver Plan <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalRegulationImpactPanel;
