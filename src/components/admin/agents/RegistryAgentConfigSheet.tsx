/**
 * RegistryAgentConfigSheet - Governed configuration for registry agents
 * Persists to erp_ai_agents_registry via Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bot, Save, RotateCcw, Shield, Brain, Target, Activity, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { RegistryAgent } from '@/hooks/admin/agents/useSupervisorDomainData';

interface RegistryAgentConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: RegistryAgent | null;
  onSaved?: () => void;
}

export function RegistryAgentConfigSheet({ open, onOpenChange, agent, onSaved }: RegistryAgentConfigSheetProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [requiresHumanReview, setRequiresHumanReview] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setStatus(agent.status);
      setConfidenceThreshold(Math.round(agent.confidence_threshold * 100));
      setRequiresHumanReview(agent.requires_human_review);
      setSupervisorCode(agent.supervisor_code || '');
    }
  }, [agent]);

  const handleSave = useCallback(async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('erp_ai_agents_registry')
        .update({
          name,
          description,
          status,
          confidence_threshold: confidenceThreshold / 100,
          requires_human_review: requiresHumanReview,
          supervisor_code: supervisorCode || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', agent.id);

      if (error) throw error;
      toast.success('Configuración guardada');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error('[RegistryAgentConfigSheet] save error:', err);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  }, [agent, name, description, status, confidenceThreshold, requiresHumanReview, supervisorCode, onSaved, onOpenChange]);

  const handleReset = () => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setStatus(agent.status);
      setConfidenceThreshold(Math.round(agent.confidence_threshold * 100));
      setRequiresHumanReview(agent.requires_human_review);
      setSupervisorCode(agent.supervisor_code || '');
    }
  };

  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-violet-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-base">Configurar Agente</SheetTitle>
              <SheetDescription className="text-xs">
                <code className="bg-muted px-1 rounded">{agent.code}</code> · {agent.module_domain.toUpperCase()}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Identity */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" /> Identidad
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">Nombre visible</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-sm min-h-[60px]" />
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" /> Estado
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">Estado del agente</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="disabled">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Confidence & Thresholds */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" /> Umbrales
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Umbral de confianza</Label>
                  <Badge variant="outline" className="text-xs">{confidenceThreshold}%</Badge>
                </div>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={([v]) => setConfidenceThreshold(v)}
                  min={10}
                  max={100}
                  step={5}
                />
                <p className="text-[10px] text-muted-foreground">
                  Por debajo de este umbral se escalará o pedirá revisión humana
                </p>
              </div>
            </div>

            <Separator />

            {/* Review & Escalation */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" /> Revisión y Escalado
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Requiere revisión humana</Label>
                  <p className="text-[10px] text-muted-foreground">Todas las respuestas pasarán por revisión</p>
                </div>
                <Switch checked={requiresHumanReview} onCheckedChange={setRequiresHumanReview} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Supervisor asignado</Label>
                <Input
                  value={supervisorCode}
                  onChange={e => setSupervisorCode(e.target.value)}
                  placeholder="ej: hr-supervisor"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Read-only info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4" /> Información técnica
                <Badge variant="outline" className="text-[9px]">Solo lectura</Badge>
              </h4>
              <Card className="bg-muted/50">
                <CardContent className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código</span>
                    <code className="bg-background px-1.5 py-0.5 rounded">{agent.code}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>{agent.agent_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Handler</span>
                    <code className="bg-background px-1.5 py-0.5 rounded">{agent.backend_handler}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ejecución</span>
                    <span>{agent.execution_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creado</span>
                    <span>{new Date(agent.created_at).toLocaleDateString('es')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="h-3 w-3" /> Resetear
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 gap-1">
            <Save className="h-3 w-3" /> {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default RegistryAgentConfigSheet;
