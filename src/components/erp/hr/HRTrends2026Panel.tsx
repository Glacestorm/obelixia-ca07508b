/**
 * HRTrends2026Panel - Tendencias RRHH 2026+ con demos interactivas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Rocket, Brain, Users, Shield, Sparkles, Target, Zap, Globe, Eye, Cpu, TrendingUp, Play, ChevronRight, Clock, Star, LineChart, Heart, Blocks, Network, Glasses } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Trend {
  id: string;
  icon: any;
  title: string;
  status: 'active' | 'coming' | 'planned' | '2027+' | '2028+';
  description: string;
  features: string[];
  demoAvailable: boolean;
  readinessScore?: number;
}

const TRENDS_2026: Trend[] = [
  { id: 'ai-selection', icon: Brain, title: 'IA Generativa en Selección', status: 'coming', description: 'Análisis automático de CVs con scoring predictivo de ajuste cultural y competencias.', features: ['Scoring de CVs', 'Matching cultural', 'Predicción rendimiento'], demoAvailable: true, readinessScore: 75 },
  { id: 'people-analytics', icon: LineChart, title: 'People Analytics Predictivo', status: 'active', description: 'Predicción de rotación, engagement y necesidades de desarrollo mediante ML.', features: ['Predicción rotación', 'Análisis engagement', 'Gaps competenciales'], demoAvailable: true, readinessScore: 90 },
  { id: 'digital-wellness', icon: Heart, title: 'Bienestar Digital 360', status: 'coming', description: 'Monitorización proactiva de burnout y estrés con intervenciones automatizadas.', features: ['Índice bienestar', 'Alertas tempranas', 'Planes recuperación'], demoAvailable: true, readinessScore: 60 },
  { id: 'onboarding-ai', icon: Sparkles, title: 'Onboarding Inmersivo IA', status: 'planned', description: 'Asistente virtual personalizado para nuevos empleados con rutas adaptativas.', features: ['Buddy virtual', 'Rutas adaptativas', 'Gamificación'], demoAvailable: false, readinessScore: 45 },
  { id: 'dynamic-comp', icon: Target, title: 'Compensación Dinámica AI', status: 'planned', description: 'Ajuste salarial basado en mercado en tiempo real y equidad interna.', features: ['Benchmarking real-time', 'Análisis equidad', 'Simulador total comp'], demoAvailable: false, readinessScore: 35 },
];

const TRENDS_2027: Trend[] = [
  { id: 'blockchain-creds', icon: Blocks, title: 'Blockchain Credenciales', status: '2027+', description: 'Verificación descentralizada e inmutable de títulos y certificaciones.', features: ['Credenciales verificables', 'NFT certificados', 'Red descentralizada'], demoAvailable: false },
  { id: 'digital-twins', icon: Network, title: 'Gemelos Digitales RRHH', status: '2027+', description: 'Simulación de escenarios de plantilla para planificación estratégica.', features: ['Simulación plantilla', 'What-if análisis', 'Optimización costes'], demoAvailable: false },
];

const TRENDS_2028: Trend[] = [
  { id: 'neurotech', icon: Cpu, title: 'Neurotech Wellness', status: '2028+', description: 'Monitorización cognitiva no invasiva para bienestar y productividad.', features: ['EEG wearables', 'Carga cognitiva', 'Optimización mental'], demoAvailable: false },
  { id: 'autonomous-hr', icon: Zap, title: 'IA Autónoma HR', status: '2028+', description: 'Agente IA que gestiona procesos HR sin intervención humana directa.', features: ['Decisiones autónomas', 'Aprendizaje continuo', 'Human-in-loop'], demoAvailable: false },
  { id: 'metaverse', icon: Glasses, title: 'Metaverso Corporativo', status: '2028+', description: 'Espacios virtuales inmersivos para trabajo, formación y colaboración.', features: ['Oficina virtual', 'Formación VR', 'Eventos inmersivos'], demoAvailable: false },
];

export function HRTrends2026Panel() {
  const [activeTab, setActiveTab] = useState('2026');
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<Trend | null>(null);
  const [demoProgress, setDemoProgress] = useState(0);

  const openDemo = (trend: Trend) => {
    setSelectedDemo(trend);
    setDemoDialogOpen(true);
    setDemoProgress(0);
    const interval = setInterval(() => {
      setDemoProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 10;
      });
    }, 300);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Activo</Badge>;
      case 'coming': return <Badge className="bg-blue-500">Próximo</Badge>;
      case 'planned': return <Badge variant="outline">Planificado</Badge>;
      case '2027+': return <Badge variant="secondary">2027+</Badge>;
      case '2028+': return <Badge variant="secondary" className="bg-purple-100 text-purple-700">2028+</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

const [implementing, setImplementing] = useState<string | null>(null);

  const handleImplementFeature = async (trend: Trend) => {
    setImplementing(trend.id);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-innovation-discovery', {
        body: {
          action: 'implement_feature',
          feature_code: trend.id,
          config: {
            feature_name: trend.title,
            description: trend.description,
            category: trend.id.includes('ai') ? 'ai' : 'general'
          }
        }
      });

      if (error) throw error;
      toast.success(`¡${trend.title} está siendo implementado!`);
    } catch (error) {
      console.error('Implementation error:', error);
      toast.error('Error al implementar la funcionalidad');
    } finally {
      setImplementing(null);
    }
  };

  const TrendCard = ({ trend }: { trend: Trend }) => (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <trend.icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{trend.title}</h4>
            {getStatusBadge(trend.status)}
          </div>
        </div>
        <div className="flex gap-1">
          {trend.demoAvailable && (
            <Button size="sm" variant="ghost" onClick={() => openDemo(trend)} className="gap-1">
              <Play className="h-3 w-3" />Demo
            </Button>
          )}
          {trend.status !== '2027+' && trend.status !== '2028+' && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleImplementFeature(trend)}
              disabled={implementing === trend.id}
              className="gap-1"
            >
              {implementing === trend.id ? (
                <><Rocket className="h-3 w-3 animate-pulse" />...</>
              ) : (
                <><Rocket className="h-3 w-3" />Implementar</>
              )}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{trend.description}</p>
      {trend.readinessScore !== undefined && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Preparación</span>
            <span className="font-medium">{trend.readinessScore}%</span>
          </div>
          <Progress value={trend.readinessScore} className="h-1.5" />
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {trend.features.map((f, i) => (
          <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Tendencias RRHH 2026+
            <Badge variant="outline" className="ml-auto text-xs">Roadmap Innovación</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="2026" className="text-xs gap-1"><Zap className="h-3 w-3" />2026</TabsTrigger>
              <TabsTrigger value="2027" className="text-xs gap-1"><Target className="h-3 w-3" />2027</TabsTrigger>
              <TabsTrigger value="2028" className="text-xs gap-1"><Globe className="h-3 w-3" />2028+</TabsTrigger>
            </TabsList>

            <TabsContent value="2026">
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  {TRENDS_2026.map(trend => <TrendCard key={trend.id} trend={trend} />)}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="2027">
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4" />Horizonte 2027</div>
                    <p className="text-xs text-muted-foreground mt-1">Tecnologías en fase de exploración y pruebas piloto</p>
                  </div>
                  {TRENDS_2027.map(trend => <TrendCard key={trend.id} trend={trend} />)}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="2028">
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><Star className="h-4 w-4" />Visión 2028+</div>
                    <p className="text-xs text-muted-foreground mt-1">El futuro de RRHH: IA autónoma, metaverso y neurotecnología</p>
                  </div>
                  {TRENDS_2028.map(trend => <TrendCard key={trend.id} trend={trend} />)}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDemo && <selectedDemo.icon className="h-5 w-5 text-primary" />}
              Demo: {selectedDemo?.title}
            </DialogTitle>
            <DialogDescription>{selectedDemo?.description}</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-primary mb-2">{demoProgress}%</div>
              <p className="text-sm text-muted-foreground">
                {demoProgress < 30 && 'Analizando datos...'}
                {demoProgress >= 30 && demoProgress < 60 && 'Aplicando modelo IA...'}
                {demoProgress >= 60 && demoProgress < 90 && 'Generando predicciones...'}
                {demoProgress >= 90 && '¡Análisis completo!'}
              </p>
            </div>
            <Progress value={demoProgress} className="h-2" />
            {demoProgress === 100 && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium mb-2">
                  <TrendingUp className="h-4 w-4" />Resultados de la demo
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Precisión del modelo: 94.2%</li>
                  <li>• Empleados analizados: 127</li>
                  <li>• Insights generados: 15</li>
                  <li>• Tiempo de proceso: 2.3s</li>
                </ul>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => { setDemoDialogOpen(false); toast.success('Demo completada'); }}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HRTrends2026Panel;
