import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  FileText, Users, GraduationCap, Sparkles, Download, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// RACI Matrix data
const RACI_ROLES = ['GAL Coordinador', 'GALs Socios', 'Asistencia Técnica', 'Administración'];
const RACI_ACTIVITIES = [
  { name: 'Definición requisitos técnicos', values: ['R', 'C', 'A', 'I'] },
  { name: 'Desarrollo plataforma IA', values: ['A', 'I', 'R', 'I'] },
  { name: 'Integración con AAPP', values: ['A', 'C', 'R', 'C'] },
  { name: 'Formación técnicos', values: ['R', 'R', 'A', 'I'] },
  { name: 'Pruebas piloto', values: ['R', 'R', 'C', 'I'] },
  { name: 'Evaluación resultados', values: ['R', 'C', 'C', 'A'] },
  { name: 'Difusión y comunicación', values: ['R', 'R', 'C', 'I'] },
  { name: 'Gestión administrativa', values: ['R', 'I', 'I', 'A'] },
  { name: 'Contratación pública', values: ['R', 'I', 'C', 'A'] },
  { name: 'Auditoría y control', values: ['C', 'I', 'I', 'R'] },
];

const RACI_COLORS: Record<string, string> = {
  R: 'bg-primary text-primary-foreground',
  A: 'bg-accent text-accent-foreground',
  C: 'bg-secondary text-secondary-foreground',
  I: 'bg-muted text-muted-foreground',
};

// Training strategy modules
const TRAINING_MODULES = [
  { id: 1, name: 'Uso del asistente virtual', hours: 4, mode: 'Virtual', quarter: 'Q1' },
  { id: 2, name: 'Panel de control y dashboards', hours: 3, mode: 'Presencial', quarter: 'Q1' },
  { id: 3, name: 'Moderación de costes con IA', hours: 4, mode: 'Virtual', quarter: 'Q1' },
  { id: 4, name: 'Circuito de tramitación LEADER', hours: 6, mode: 'Presencial', quarter: 'Q2' },
  { id: 5, name: 'Análisis documental automatizado', hours: 3, mode: 'Virtual', quarter: 'Q2' },
  { id: 6, name: 'Detección de fraude e irregularidades', hours: 4, mode: 'Virtual', quarter: 'Q2' },
  { id: 7, name: 'Generación de informes y exportación', hours: 2, mode: 'Virtual', quarter: 'Q3' },
  { id: 8, name: 'Integraciones con AAPP', hours: 4, mode: 'Presencial', quarter: 'Q3' },
  { id: 9, name: 'Administración avanzada del sistema', hours: 4, mode: 'Virtual', quarter: 'Q4' },
];

// Spec templates
const SPEC_TEMPLATES = [
  { id: 'assistant', name: 'Asistente Virtual IA', description: 'Pliego técnico para el desarrollo del chatbot especializado en normativa LEADER' },
  { id: 'cost-mod', name: 'Moderación de Costes', description: 'Especificaciones para el sistema de análisis automático de presupuestos' },
  { id: 'dashboards', name: 'Dashboards y Reporting', description: 'Requisitos para paneles de control y generación de informes' },
  { id: 'integration', name: 'Integraciones AAPP', description: 'Pliego para la conexión con registros electrónicos y firma digital' },
];

export function GaliaPhase2Planner() {
  const [activeTab, setActiveTab] = useState('specs');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const generateSpec = useCallback(async (templateId: string) => {
    setIsGenerating(true);
    setSelectedTemplate(templateId);
    try {
      const template = SPEC_TEMPLATES.find(t => t.id === templateId);
      const { data, error } = await supabase.functions.invoke('galia-phase2-planner', {
        body: {
          action: 'generate_spec',
          params: { templateId, templateName: template?.name, templateDescription: template?.description }
        }
      });
      if (error) throw error;
      if (data?.success && data?.data) {
        const content = typeof data.data === 'string' ? data.data : (data.data.content || data.data.specification || JSON.stringify(data.data, null, 2));
        setGeneratedContent(prev => ({ ...prev, [templateId]: content }));
        toast.success(`Pliego "${template?.name}" generado`);
      }
    } catch (err) {
      console.error('[GaliaPhase2Planner] Error:', err);
      toast.error('Error al generar prescripciones');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Planificación Fase 2</h2>
          <p className="text-sm text-muted-foreground">Prescripciones técnicas, roles y estrategia formativa</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="specs" className="text-xs gap-1"><FileText className="h-3 w-3" /> Prescripciones</TabsTrigger>
          <TabsTrigger value="raci" className="text-xs gap-1"><Users className="h-3 w-3" /> Roles RACI</TabsTrigger>
          <TabsTrigger value="training" className="text-xs gap-1"><GraduationCap className="h-3 w-3" /> Formación</TabsTrigger>
        </TabsList>

        {/* Tab: Technical Specs */}
        <TabsContent value="specs" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SPEC_TEMPLATES.map(template => (
              <Card key={template.id} className={cn("cursor-pointer transition-all hover:border-primary/50", selectedTemplate === template.id && "border-primary ring-1 ring-primary/20")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {template.name}
                    {generatedContent[template.id] ? (
                      <Badge variant="default" className="text-[10px]"><CheckCircle className="h-3 w-3 mr-1" /> Generado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <Button
                    size="sm"
                    variant={generatedContent[template.id] ? 'outline' : 'default'}
                    onClick={() => generateSpec(template.id)}
                    disabled={isGenerating && selectedTemplate === template.id}
                    className="w-full text-xs"
                  >
                    <Sparkles className={cn("h-3 w-3 mr-1", isGenerating && selectedTemplate === template.id && "animate-spin")} />
                    {generatedContent[template.id] ? 'Regenerar' : 'Generar con IA'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && generatedContent[selectedTemplate] && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {SPEC_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs whitespace-pre-wrap text-foreground/80 leading-relaxed">
                    {generatedContent[selectedTemplate]}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: RACI Matrix */}
        <TabsContent value="raci" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Matriz RACI – Roles y Responsabilidades</CardTitle>
              <div className="flex gap-3 mt-2">
                {Object.entries(RACI_COLORS).map(([key, cls]) => (
                  <Badge key={key} className={cn(cls, 'text-[10px]')}>
                    {key} = {key === 'R' ? 'Responsable' : key === 'A' ? 'Aprobador' : key === 'C' ? 'Consultado' : 'Informado'}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold min-w-[200px]">Actividad</TableHead>
                      {RACI_ROLES.map(role => (
                        <TableHead key={role} className="text-xs text-center min-w-[120px]">{role}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RACI_ACTIVITIES.map((activity, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-medium">{activity.name}</TableCell>
                        {activity.values.map((val, i) => (
                          <TableCell key={i} className="text-center">
                            <Badge className={cn(RACI_COLORS[val], 'text-[10px] w-6 h-6 flex items-center justify-center mx-auto')}>
                              {val}
                            </Badge>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Training Strategy */}
        <TabsContent value="training" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total horas formación</p>
                <p className="text-2xl font-bold text-primary">{TRAINING_MODULES.reduce((s, m) => s + m.hours, 0)}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Módulos</p>
                <p className="text-2xl font-bold">{TRAINING_MODULES.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Modalidad</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="default" className="text-[10px]">{TRAINING_MODULES.filter(m => m.mode === 'Virtual').length} Virtual</Badge>
                  <Badge variant="secondary" className="text-[10px]">{TRAINING_MODULES.filter(m => m.mode === 'Presencial').length} Presencial</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Programa Formativo Fase 2</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Módulo</TableHead>
                    <TableHead className="text-xs text-center">Horas</TableHead>
                    <TableHead className="text-xs text-center">Modalidad</TableHead>
                    <TableHead className="text-xs text-center">Trimestre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRAINING_MODULES.map(mod => (
                    <TableRow key={mod.id}>
                      <TableCell className="text-xs text-muted-foreground">{mod.id}</TableCell>
                      <TableCell className="text-xs font-medium">{mod.name}</TableCell>
                      <TableCell className="text-xs text-center">{mod.hours}h</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={mod.mode === 'Virtual' ? 'default' : 'secondary'} className="text-[10px]">{mod.mode}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">{mod.quarter}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaPhase2Planner;
