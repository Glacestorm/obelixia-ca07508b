/**
 * Pipelines Adaptables - Tendencia 2025-2026
 * Etapas que se crean o ajustan automáticamente según tipo de producto/cliente
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Layers,
  GitBranch,
  Settings2,
  Sparkles,
  Building2,
  Package,
  Users,
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdaptiveRule {
  id: string;
  name: string;
  trigger: {
    type: 'product_type' | 'deal_size' | 'customer_segment' | 'industry';
    value: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  };
  modifications: {
    addStages?: string[];
    removeStages?: string[];
    reorderStages?: string[];
    modifyDuration?: { stage: string; days: number }[];
  };
  isActive: boolean;
  lastTriggered?: Date;
  timesTriggered: number;
}

interface PipelineVariant {
  id: string;
  name: string;
  description: string;
  stages: { id: string; name: string; color: string; avgDays: number }[];
  applicableTo: string[];
  efficiency: number;
}

const DEFAULT_STAGES = [
  { id: 'lead', name: 'Lead', color: 'bg-gray-500', avgDays: 3 },
  { id: 'qualified', name: 'Calificado', color: 'bg-blue-500', avgDays: 5 },
  { id: 'proposal', name: 'Propuesta', color: 'bg-yellow-500', avgDays: 7 },
  { id: 'negotiation', name: 'Negociación', color: 'bg-orange-500', avgDays: 10 },
  { id: 'closed', name: 'Cerrado', color: 'bg-green-500', avgDays: 0 },
];

export function AdaptivePipeline() {
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [rules, setRules] = useState<AdaptiveRule[]>([
    {
      id: 'rule-1',
      name: 'Enterprise - Proceso Extendido',
      trigger: { type: 'deal_size', value: '50000', operator: 'greater_than' },
      modifications: {
        addStages: ['POC', 'Comité de Compras', 'Legal Review'],
        modifyDuration: [
          { stage: 'Negociación', days: 20 },
          { stage: 'Propuesta', days: 14 },
        ],
      },
      isActive: true,
      lastTriggered: new Date(Date.now() - 86400000),
      timesTriggered: 24,
    },
    {
      id: 'rule-2',
      name: 'SaaS - Proceso Ágil',
      trigger: { type: 'product_type', value: 'saas', operator: 'equals' },
      modifications: {
        removeStages: ['Negociación'],
        addStages: ['Trial Activo'],
        modifyDuration: [
          { stage: 'Calificado', days: 2 },
          { stage: 'Propuesta', days: 3 },
        ],
      },
      isActive: true,
      lastTriggered: new Date(Date.now() - 3600000),
      timesTriggered: 156,
    },
    {
      id: 'rule-3',
      name: 'Gobierno - Licitación',
      trigger: { type: 'customer_segment', value: 'government', operator: 'equals' },
      modifications: {
        addStages: ['RFP', 'Licitación', 'Evaluación Técnica', 'Adjudicación'],
        removeStages: ['Lead'],
        modifyDuration: [
          { stage: 'Propuesta', days: 30 },
        ],
      },
      isActive: true,
      timesTriggered: 8,
    },
  ]);

  const [variants] = useState<PipelineVariant[]>([
    {
      id: 'var-1',
      name: 'Pipeline Estándar',
      description: 'Proceso de ventas B2B tradicional',
      stages: DEFAULT_STAGES,
      applicableTo: ['SMB', 'Mid-Market'],
      efficiency: 100,
    },
    {
      id: 'var-2',
      name: 'Pipeline Enterprise',
      description: 'Deals complejos con múltiples stakeholders',
      stages: [
        ...DEFAULT_STAGES.slice(0, 2),
        { id: 'poc', name: 'POC', color: 'bg-purple-500', avgDays: 14 },
        { id: 'committee', name: 'Comité', color: 'bg-indigo-500', avgDays: 10 },
        ...DEFAULT_STAGES.slice(2),
        { id: 'legal', name: 'Legal', color: 'bg-red-500', avgDays: 7 },
      ],
      applicableTo: ['Enterprise', 'Government'],
      efficiency: 85,
    },
    {
      id: 'var-3',
      name: 'Pipeline SaaS Express',
      description: 'Ventas rápidas con trial',
      stages: [
        { id: 'signup', name: 'Signup', color: 'bg-cyan-500', avgDays: 0 },
        { id: 'trial', name: 'Trial Activo', color: 'bg-teal-500', avgDays: 14 },
        { id: 'conversion', name: 'Conversión', color: 'bg-green-500', avgDays: 3 },
      ],
      applicableTo: ['Startup', 'SMB', 'Self-Service'],
      efficiency: 140,
    },
  ]);

  const [selectedVariant, setSelectedVariant] = useState<string>('var-1');

  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    ));
    toast.success('Regla actualizada');
  }, []);

  const getTriggerLabel = (trigger: AdaptiveRule['trigger']) => {
    const typeLabels = {
      product_type: 'Tipo de producto',
      deal_size: 'Valor del deal',
      customer_segment: 'Segmento cliente',
      industry: 'Industria',
    };
    const operatorLabels = {
      equals: '=',
      greater_than: '>',
      less_than: '<',
      contains: 'contiene',
    };
    return `${typeLabels[trigger.type]} ${operatorLabels[trigger.operator]} ${trigger.value}`;
  };

  const currentVariant = variants.find(v => v.id === selectedVariant);

  return (
    <div className="space-y-4">
      {/* Adaptive Mode Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-emerald-500/10 border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300",
            adaptiveMode 
              ? "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/25" 
              : "bg-muted"
          )}>
            <GitBranch className={cn("h-6 w-6", adaptiveMode ? "text-white" : "text-muted-foreground")} />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Pipeline Adaptativo
              {adaptiveMode && (
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30">
                  Inteligente
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {adaptiveMode 
                ? 'Las etapas se ajustan automáticamente según el contexto'
                : 'Modo manual - Pipeline fijo para todas las oportunidades'}
            </p>
          </div>
        </div>
        <Switch checked={adaptiveMode} onCheckedChange={setAdaptiveMode} />
      </div>

      {/* Pipeline Variants */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Variantes de Pipeline
          </CardTitle>
          <CardDescription className="text-xs">
            Selecciona o deja que la IA elija automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant.id)}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-all",
                  selectedVariant === variant.id 
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{variant.name}</span>
                  <Badge variant="outline" className={cn(
                    variant.efficiency >= 100 ? "text-green-600" : "text-yellow-600"
                  )}>
                    {variant.efficiency}% eficiencia
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{variant.description}</p>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {variant.stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center">
                      <div className={cn("px-2 py-0.5 rounded text-[10px] text-white shrink-0", stage.color)}>
                        {stage.name}
                      </div>
                      {idx < variant.stages.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Adaptive Rules */}
      {adaptiveMode && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Reglas de Adaptación
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Nueva Regla
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div 
                    key={rule.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      rule.isActive ? "bg-card" : "bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.isActive} 
                          onCheckedChange={() => toggleRule(rule.id)}
                          className="scale-75"
                        />
                        <span className="font-medium text-sm">{rule.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {rule.timesTriggered}x usado
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 ml-8">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Cuando: {getTriggerLabel(rule.trigger)}
                      </div>
                      
                      {rule.modifications.addStages && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Añadir: {rule.modifications.addStages.join(', ')}
                        </div>
                      )}
                      
                      {rule.modifications.removeStages && (
                        <div className="text-xs text-red-600 flex items-center gap-1">
                          <Trash2 className="h-3 w-3" />
                          Quitar: {rule.modifications.removeStages.join(', ')}
                        </div>
                      )}
                      
                      {rule.lastTriggered && (
                        <div className="text-xs text-muted-foreground">
                          Última vez: {new Date(rule.lastTriggered).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Current Pipeline Preview */}
      {currentVariant && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Pipeline Activo: {currentVariant.name}</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {currentVariant.stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn("px-3 py-1 rounded text-xs text-white shrink-0", stage.color)}>
                    {stage.name}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    ~{stage.avgDays}d
                  </span>
                </div>
                {idx < currentVariant.stages.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdaptivePipeline;
