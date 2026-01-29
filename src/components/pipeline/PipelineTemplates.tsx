/**
 * Templates predefinidos de Pipeline
 * Permite aplicar configuraciones de etapas prediseñadas para diferentes industrias
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Briefcase, 
  Building2, 
  Code, 
  ShoppingCart, 
  Stethoscope, 
  GraduationCap,
  Loader2,
  Check,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { usePipelineStages, CreatePipelineStage } from '@/hooks/usePipelineStages';
import { toast } from 'sonner';

// Template definitions
interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  industry: string;
  stages: Omit<CreatePipelineStage, 'order_position'>[];
}

const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'b2b-saas',
    name: 'Ventas B2B SaaS',
    description: 'Pipeline optimizado para ventas de software empresarial',
    icon: Code,
    industry: 'Tecnología',
    stages: [
      { name: 'Lead Entrante', slug: 'lead_entrante', probability: 10, probability_mode: 'auto', color: '#6366f1', icon: 'Search', is_terminal: false, terminal_type: null, is_default: true, is_active: true },
      { name: 'Cualificación', slug: 'cualificacion', probability: 25, probability_mode: 'auto', color: '#8b5cf6', icon: 'Target', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Demo Realizada', slug: 'demo_realizada', probability: 40, probability_mode: 'auto', color: '#3b82f6', icon: 'MessageSquare', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Propuesta Enviada', slug: 'propuesta_enviada', probability: 60, probability_mode: 'auto', color: '#f59e0b', icon: 'FileText', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Negociación', slug: 'negociacion', probability: 80, probability_mode: 'auto', color: '#ef4444', icon: 'TrendingUp', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Cerrada Ganada', slug: 'cerrada_ganada', probability: 100, probability_mode: 'auto', color: '#22c55e', icon: 'Trophy', is_terminal: true, terminal_type: 'won', is_default: false, is_active: true },
      { name: 'Cerrada Perdida', slug: 'cerrada_perdida', probability: 0, probability_mode: 'auto', color: '#64748b', icon: 'XCircle', is_terminal: true, terminal_type: 'lost', is_default: false, is_active: true },
    ],
  },
  {
    id: 'inmobiliaria',
    name: 'Inmobiliaria',
    description: 'Pipeline para agencias inmobiliarias y promotoras',
    icon: Building2,
    industry: 'Real Estate',
    stages: [
      { name: 'Interesado', slug: 'interesado', probability: 10, probability_mode: 'auto', color: '#06b6d4', icon: 'Search', is_terminal: false, terminal_type: null, is_default: true, is_active: true },
      { name: 'Primera Visita', slug: 'primera_visita', probability: 25, probability_mode: 'auto', color: '#3b82f6', icon: 'Calendar', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Segunda Visita', slug: 'segunda_visita', probability: 45, probability_mode: 'auto', color: '#8b5cf6', icon: 'Users', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Oferta Presentada', slug: 'oferta_presentada', probability: 65, probability_mode: 'auto', color: '#f59e0b', icon: 'FileText', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Reserva', slug: 'reserva', probability: 85, probability_mode: 'auto', color: '#22c55e', icon: 'CheckCircle', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Escriturada', slug: 'escriturada', probability: 100, probability_mode: 'auto', color: '#10b981', icon: 'Trophy', is_terminal: true, terminal_type: 'won', is_default: false, is_active: true },
      { name: 'Descartado', slug: 'descartado', probability: 0, probability_mode: 'auto', color: '#64748b', icon: 'XCircle', is_terminal: true, terminal_type: 'lost', is_default: false, is_active: true },
    ],
  },
  {
    id: 'consultoria',
    name: 'Consultoría',
    description: 'Pipeline para servicios profesionales y consultoría',
    icon: Briefcase,
    industry: 'Servicios',
    stages: [
      { name: 'Oportunidad', slug: 'oportunidad', probability: 15, probability_mode: 'auto', color: '#6366f1', icon: 'Search', is_terminal: false, terminal_type: null, is_default: true, is_active: true },
      { name: 'Reunión Inicial', slug: 'reunion_inicial', probability: 30, probability_mode: 'auto', color: '#3b82f6', icon: 'Calendar', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Diagnóstico', slug: 'diagnostico', probability: 50, probability_mode: 'auto', color: '#8b5cf6', icon: 'Target', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Propuesta', slug: 'propuesta', probability: 70, probability_mode: 'auto', color: '#f59e0b', icon: 'FileText', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Cierre', slug: 'cierre', probability: 90, probability_mode: 'auto', color: '#ef4444', icon: 'TrendingUp', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Proyecto Activo', slug: 'proyecto_activo', probability: 100, probability_mode: 'auto', color: '#22c55e', icon: 'Trophy', is_terminal: true, terminal_type: 'won', is_default: false, is_active: true },
      { name: 'No Cualificado', slug: 'no_cualificado', probability: 0, probability_mode: 'auto', color: '#64748b', icon: 'XCircle', is_terminal: true, terminal_type: 'lost', is_default: false, is_active: true },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce B2B',
    description: 'Pipeline para ventas mayoristas y distribución',
    icon: ShoppingCart,
    industry: 'Retail',
    stages: [
      { name: 'Contacto', slug: 'contacto', probability: 10, probability_mode: 'auto', color: '#06b6d4', icon: 'Phone', is_terminal: false, terminal_type: null, is_default: true, is_active: true },
      { name: 'Muestra Enviada', slug: 'muestra_enviada', probability: 30, probability_mode: 'auto', color: '#3b82f6', icon: 'Mail', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Cotización', slug: 'cotizacion', probability: 50, probability_mode: 'auto', color: '#f59e0b', icon: 'FileText', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Orden de Compra', slug: 'orden_compra', probability: 80, probability_mode: 'auto', color: '#22c55e', icon: 'CheckCircle', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Cliente Activo', slug: 'cliente_activo', probability: 100, probability_mode: 'auto', color: '#10b981', icon: 'Trophy', is_terminal: true, terminal_type: 'won', is_default: false, is_active: true },
      { name: 'Sin Interés', slug: 'sin_interes', probability: 0, probability_mode: 'auto', color: '#64748b', icon: 'XCircle', is_terminal: true, terminal_type: 'lost', is_default: false, is_active: true },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare B2B',
    description: 'Pipeline para ventas a hospitales y clínicas',
    icon: Stethoscope,
    industry: 'Salud',
    stages: [
      { name: 'Lead', slug: 'lead_healthcare', probability: 10, probability_mode: 'auto', color: '#06b6d4', icon: 'Search', is_terminal: false, terminal_type: null, is_default: true, is_active: true },
      { name: 'Presentación', slug: 'presentacion', probability: 25, probability_mode: 'auto', color: '#3b82f6', icon: 'MessageSquare', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Evaluación Técnica', slug: 'evaluacion_tecnica', probability: 45, probability_mode: 'auto', color: '#8b5cf6', icon: 'Target', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Comité de Compras', slug: 'comite_compras', probability: 65, probability_mode: 'auto', color: '#f59e0b', icon: 'Users', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Licitación', slug: 'licitacion', probability: 80, probability_mode: 'auto', color: '#ef4444', icon: 'FileText', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Adjudicado', slug: 'adjudicado', probability: 100, probability_mode: 'auto', color: '#22c55e', icon: 'Trophy', is_terminal: true, terminal_type: 'won', is_default: false, is_active: true },
      { name: 'No Adjudicado', slug: 'no_adjudicado', probability: 0, probability_mode: 'auto', color: '#64748b', icon: 'XCircle', is_terminal: true, terminal_type: 'lost', is_default: false, is_active: true },
    ],
  },
  {
    id: 'educacion',
    name: 'Educación',
    description: 'Pipeline para ventas a instituciones educativas',
    icon: GraduationCap,
    industry: 'Educación',
    stages: [
      { name: 'Prospecto', slug: 'prospecto_edu', probability: 10, probability_mode: 'auto', color: '#6366f1', icon: 'Search', is_terminal: false, terminal_type: null, is_default: true, is_active: true },
      { name: 'Demo Agendada', slug: 'demo_agendada', probability: 30, probability_mode: 'auto', color: '#3b82f6', icon: 'Calendar', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Piloto', slug: 'piloto', probability: 55, probability_mode: 'auto', color: '#8b5cf6', icon: 'Zap', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Propuesta Institucional', slug: 'propuesta_institucional', probability: 75, probability_mode: 'auto', color: '#f59e0b', icon: 'FileText', is_terminal: false, terminal_type: null, is_default: false, is_active: true },
      { name: 'Contrato', slug: 'contrato', probability: 100, probability_mode: 'auto', color: '#22c55e', icon: 'Trophy', is_terminal: true, terminal_type: 'won', is_default: false, is_active: true },
      { name: 'Rechazado', slug: 'rechazado_edu', probability: 0, probability_mode: 'auto', color: '#64748b', icon: 'XCircle', is_terminal: true, terminal_type: 'lost', is_default: false, is_active: true },
    ],
  },
];

interface PipelineTemplatesProps {
  onApply?: () => void;
}

export function PipelineTemplates({ onApply }: PipelineTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { createStage, stages } = usePipelineStages();

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);
    try {
      // Create stages in order
      for (let i = 0; i < selectedTemplate.stages.length; i++) {
        const stageData = {
          ...selectedTemplate.stages[i],
          order_position: stages.length + i,
        };
        
        await createStage.mutateAsync(stageData);
      }

      toast.success(`Template "${selectedTemplate.name}" aplicado correctamente`);
      setConfirmOpen(false);
      setIsOpen(false);
      onApply?.();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Error al aplicar el template');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Usar Template
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Templates de Pipeline</DialogTitle>
            <DialogDescription>
              Selecciona un template predefinido para configurar rápidamente tu pipeline
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3">
              {PIPELINE_TEMPLATES.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <template.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary">{template.industry}</Badge>
                        </div>
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.stages.filter(s => !s.is_terminal).slice(0, 4).map((stage, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: stage.color, color: stage.color }}
                            >
                              {stage.name}
                            </Badge>
                          ))}
                          {template.stages.filter(s => !s.is_terminal).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.stages.filter(s => !s.is_terminal).length - 4} más
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => setConfirmOpen(true)} 
              disabled={!selectedTemplate}
            >
              Aplicar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmar Aplicación
            </DialogTitle>
            <DialogDescription>
              Se añadirán {selectedTemplate?.stages.length} nuevas etapas a tu pipeline actual.
              Las etapas existentes no serán eliminadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyTemplate} disabled={isApplying}>
              {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PipelineTemplates;
