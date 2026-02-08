/**
 * GaliaProjectStatusDashboard - Dashboard de estado del proyecto GALIA
 * Roadmap visual y comparativa internacional
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Globe2, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Award,
  Zap,
  Users,
  Building2,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseData {
  id: string;
  nombre: string;
  descripcion: string;
  progreso: number;
  estado: 'completado' | 'en_progreso' | 'pendiente';
  componentes: string[];
  fechaEstimada?: string;
}

const FASES: PhaseData[] = [
  {
    id: 'fase0',
    nombre: 'Corrección Memoria',
    descripcion: 'Optimización del build y code-splitting',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaMainTabs', 'Lazy loading', 'Dashboard modularizado']
  },
  {
    id: 'fase1',
    nombre: 'Knowledge Base RAG',
    descripcion: 'Base de conocimiento normativo con IA',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaKnowledgeExplorer', 'galia-expert-agent', 'galia_knowledge_base']
  },
  {
    id: 'fase2',
    nombre: 'EU Funding Monitor',
    descripcion: 'Monitorización de fondos europeos',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaEUFundingAlerts', 'galia-eu-funding-monitor']
  },
  {
    id: 'fase3',
    nombre: 'Portal Ciudadano',
    descripcion: 'Wizard de solicitudes y Cl@ve',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaSolicitudWizard', 'GaliaPortalCiudadanoAvanzado']
  },
  {
    id: 'fase4',
    nombre: 'Knowledge Graph',
    descripcion: 'Grafo de conocimiento normativo',
    progreso: 100,
    estado: 'completado',
    componentes: ['galia-knowledge-graph', 'useGaliaKnowledgeGraph']
  },
  {
    id: 'fase5',
    nombre: 'API Pública',
    descripcion: 'Portal de transparencia Ley 19/2013',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaPublicDashboard', 'galia-public-api']
  },
  {
    id: 'fase6',
    nombre: 'Decision Support',
    descripcion: 'Sistema de soporte a decisiones',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaDecisionSupportPanel', 'galia-decision-support']
  },
  {
    id: 'fase7',
    nombre: 'Export/Print',
    descripcion: 'Exportación e impresión universal',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaExportToolbar', 'GaliaExpedientePrint', 'galia-document-print']
  },
  {
    id: 'fase8',
    nombre: 'Compliance Auditor',
    descripcion: 'Auditoría de cumplimiento V4',
    progreso: 100,
    estado: 'completado',
    componentes: ['GaliaComplianceAuditor', 'GaliaProjectStatusDashboard']
  },
  {
    id: 'fase9',
    nombre: 'IA Híbrida',
    descripcion: 'Automatización extrema con IA local/cloud',
    progreso: 20,
    estado: 'pendiente',
    componentes: ['Ollama integration', 'Hybrid routing'],
    fechaEstimada: '2025 Q2'
  },
  {
    id: 'fase10',
    nombre: 'Federación Nacional',
    descripcion: 'Portal multi-GAL e interoperabilidad UE',
    progreso: 15,
    estado: 'pendiente',
    componentes: ['Multi-GAL Portal', 'ENRD integration', 'eIDAS 2.0'],
    fechaEstimada: '2025 Q3'
  }
];

const COMPARATIVA = [
  { pais: 'Estonia', puntuacion: 85, color: 'bg-blue-500', icono: Globe2 },
  { pais: 'Dinamarca', puntuacion: 82, color: 'bg-red-500', icono: Globe2 },
  { pais: 'GALIA', puntuacion: 78, color: 'bg-primary', icono: Zap },
  { pais: 'Media UE', puntuacion: 65, color: 'bg-muted', icono: Building2 },
  { pais: 'Media España', puntuacion: 62, color: 'bg-orange-500', icono: Building2 },
];

export function GaliaProjectStatusDashboard() {
  const [activeTab, setActiveTab] = useState('roadmap');

  const fasesCompletadas = FASES.filter(f => f.estado === 'completado').length;
  const progresoGlobal = Math.round(FASES.reduce((acc, f) => acc + f.progreso, 0) / FASES.length);

  return (
    <div className="space-y-6">
      {/* Header con KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary">{progresoGlobal}%</div>
                <div className="text-sm text-muted-foreground">Progreso Global</div>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
            <Progress value={progresoGlobal} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-400">{fasesCompletadas}/{FASES.length}</div>
                <div className="text-sm text-muted-foreground">Fases Completadas</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">78</div>
                <div className="text-sm text-muted-foreground">Puntuación DESI</div>
              </div>
              <Award className="h-8 w-8 text-yellow-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-400">11+</div>
                <div className="text-sm text-muted-foreground">GAL Conectados</div>
              </div>
              <Users className="h-8 w-8 text-blue-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa UE</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>

        {/* Roadmap */}
        <TabsContent value="roadmap" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {FASES.map((fase, idx) => (
              <Card key={fase.id} className={cn(
                "transition-all",
                fase.estado === 'completado' && "border-green-500/30 bg-green-500/5",
                fase.estado === 'en_progreso' && "border-yellow-500/30 bg-yellow-500/5"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {String(idx).padStart(2, '0')}
                      </Badge>
                      {fase.nombre}
                    </CardTitle>
                    <Badge className={cn(
                      fase.estado === 'completado' && "bg-green-500/20 text-green-400",
                      fase.estado === 'en_progreso' && "bg-yellow-500/20 text-yellow-400",
                      fase.estado === 'pendiente' && "bg-muted text-muted-foreground"
                    )}>
                      {fase.estado === 'completado' ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                       fase.estado === 'en_progreso' ? <Clock className="h-3 w-3 mr-1 animate-pulse" /> :
                       <Clock className="h-3 w-3 mr-1" />}
                      {fase.progreso}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{fase.descripcion}</p>
                  <Progress value={fase.progreso} className="h-1.5 mb-3" />
                  <div className="flex flex-wrap gap-1">
                    {fase.componentes.slice(0, 3).map((comp, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {comp}
                      </Badge>
                    ))}
                    {fase.componentes.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{fase.componentes.length - 3} más
                      </Badge>
                    )}
                  </div>
                  {fase.fechaEstimada && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Estimado: {fase.fechaEstimada}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Comparativa */}
        <TabsContent value="comparativa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Índice de Digitalización Gubernamental (DESI)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {COMPARATIVA.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icono className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.pais}</span>
                      </div>
                      <span className="font-bold">{item.puntuacion}/100</span>
                    </div>
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("absolute left-0 top-0 h-full rounded-full transition-all", item.color)}
                        style={{ width: `${item.puntuacion}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Posición de GALIA
                </h4>
                <p className="text-sm text-muted-foreground">
                  GALIA se posiciona <strong className="text-primary">3 puntos por debajo</strong> de Dinamarca 
                  y <strong className="text-primary">7 puntos por debajo</strong> de Estonia, pero 
                  <strong className="text-green-400"> 13 puntos por encima</strong> de la media UE y 
                  <strong className="text-green-400"> 16 puntos por encima</strong> de la media española.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métricas */}
        <TabsContent value="metricas" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Edge Functions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">24+</div>
                <p className="text-xs text-muted-foreground">Funciones desplegadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Componentes React</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">45+</div>
                <p className="text-xs text-muted-foreground">Componentes GALIA</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Custom Hooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">30+</div>
                <p className="text-xs text-muted-foreground">Hooks especializados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tablas Supabase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">15+</div>
                <p className="text-xs text-muted-foreground">Tablas con RLS</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Integraciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">BDNS, AEAT, TGSS, Catastro...</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Modelo IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">Gemini 2.5</div>
                <p className="text-xs text-muted-foreground">Flash + Pro</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaProjectStatusDashboard;
