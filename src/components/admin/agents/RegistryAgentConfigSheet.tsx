/**
 * RegistryAgentConfigSheet - Governed configuration for registry agents
 * Phase 2: Enforces can_configure_agent_domain + audit logging
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
  Bot, Save, RotateCcw, Shield, Brain, Target, Activity, AlertTriangle, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const [canConfigure, setCanConfigure] = useState<boolean | null>(null);
  const { user, isSuperAdmin, isAdmin } = useAuth();

  // Check domain permissions
  useEffect(() => {
    if (!agent || !user) {
      setCanConfigure(null);
      return;
    }
    // Superadmin/admin always can
    if (isSuperAdmin || isAdmin) {
      setCanConfigure(true);
      return;
    }
    // Check via DB function
    (async () => {
      try {
        const { data, error } = await supabase.rpc('can_configure_agent_domain', {
          p_user_id: user.id,
          p_domain: agent.module_domain,
        });
        if (error) throw error;
        setCanConfigure(!!data);
      } catch {
        setCanConfigure(false);
      }
    })();
  }, [agent, user, isSuperAdmin, isAdmin]);

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
    if (!agent || !user) return;
    if (!canConfigure) {
      toast.error('No tienes permisos para configurar este agente');
      return;
    }

    setSaving(true);
    try {
      // Build changes for audit
      const changes: Record<string, { old: any; new: any }> = {};
      if (name !== agent.name) changes.name = { old: agent.name, new: name };
      if (description !== agent.description) changes.description = { old: agent.description, new: description };
      if (status !== agent.status) changes.status = { old: agent.status, new: status };
      const newThreshold = confidenceThreshold / 100;
      if (Math.abs(newThreshold - agent.confidence_threshold) > 0.001) {
        changes.confidence_threshold = { old: agent.confidence_threshold, new: newThreshold };
      }
      if (requiresHumanReview !== agent.requires_human_review) {
        changes.requires_human_review = { old: agent.requires_human_review, new: requiresHumanReview };
      }
      const newSupervisor = supervisorCode || null;
      if (newSupervisor !== agent.supervisor_code) {
        changes.supervisor_code = { old: agent.supervisor_code, new: newSupervisor };
      }

      // Save to registry
      const { error } = await supabase
        .from('erp_ai_agents_registry')
        .update({
          name,
          description,
          status,
          confidence_threshold: newThreshold,
          requires_human_review: requiresHumanReview,
          supervisor_code: newSupervisor,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', agent.id);

      if (error) throw error;

      // Audit log via invocation
      if (Object.keys(changes).length > 0) {
        try {
          await supabase.from('erp_ai_agent_invocations').insert({
            agent_code: agent.code,
            supervisor_code: 'governance',
            company_id: '00000000-0000-0000-0000-000000000000',
            user_id: user.id,
            input_summary: `Config change: ${Object.keys(changes).join(', ')}`,
            routing_reason: 'agent_config_change',
            confidence_score: 1,
            outcome_status: 'config_change',
            execution_time_ms: 0,
            response_summary: JSON.stringify(changes).substring(0, 1000),
            metadata: {
              action: 'config_change',
              agent_id: agent.id,
              agent_code: agent.code,
              domain: agent.module_domain,
              changes,
              phase: '2',
            },
          });
        } catch (auditErr) {
          console.error('[RegistryAgentConfigSheet] audit log error:', auditErr);
        }
      }

      toast.success('Configuración guardada');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error('[RegistryAgentConfigSheet] save error:', err);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  }, [agent, user, canConfigure, name, description, status, confidenceThreshold, requiresHumanReview, supervisorCode, onSaved, onOpenChange]);

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

  const isLocked = canConfigure === false;

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
          {isLocked && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <Lock className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive">No tienes permisos para editar agentes del dominio {agent.module_domain.toUpperCase()}</span>
            </div>
          )}
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
                <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" disabled={isLocked} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-sm min-h-[60px]" disabled={isLocked} />
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" /> Estado
                {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">Estado del agente</Label>
                <Select value={status} onValueChange={setStatus} disabled={isLocked}>
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
                {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
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
                  disabled={isLocked}
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
                {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Requiere revisión humana</Label>
                  <p className="text-[10px] text-muted-foreground">Todas las respuestas pasarán por revisión</p>
                </div>
                <Switch checked={requiresHumanReview} onCheckedChange={setRequiresHumanReview} disabled={isLocked} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Supervisor asignado</Label>
                <Input
                  value={supervisorCode}
                  onChange={e => setSupervisorCode(e.target.value)}
                  placeholder="ej: hr-supervisor"
                  className="h-8 text-sm"
                  disabled={isLocked}
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
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1" disabled={isLocked}>
            <RotateCcw className="h-3 w-3" /> Resetear
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || isLocked} className="flex-1 gap-1">
            {isLocked ? <Lock className="h-3 w-3" /> : <Save className="h-3 w-3" />}
            {isLocked ? 'Sin permisos' : saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default RegistryAgentConfigSheet;
