/**
 * AuditAgentConfigSheet — Configuración individual de agentes de auditoría
 * Patrón idéntico al IA Center: Sheet lateral con secciones de ejecución,
 * umbrales, límites, escalación, aprendizaje, horarios y logging.
 */
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings, Zap, Gauge, Shield, ArrowUpRight, Brain, Clock, FileText, Network,
} from 'lucide-react';
import type { AuditAgent } from '@/hooks/erp/audit';
import { cn } from '@/lib/utils';

interface AuditAgentConfigSheetProps {
  agent: AuditAgent;
  onSave?: (agentId: string, config: AgentConfig) => void;
  trigger?: React.ReactNode;
}

interface AgentConfig {
  // Execution
  executionMode: 'autonomous' | 'supervised' | 'manual';
  maxConcurrentTasks: number;
  // Thresholds
  confidenceThreshold: number;
  riskThreshold: number;
  anomalyScoreThreshold: number;
  // HITL
  requiresHumanReview: boolean;
  hitlThreshold: number;
  autoApproveBelow: number;
  // Limits
  maxTokensPerInvocation: number;
  maxInvocationsPerHour: number;
  timeoutMs: number;
  // Escalation
  escalationTarget: string;
  escalateOnFailure: boolean;
  escalateOnLowConfidence: boolean;
  maxRetries: number;
  // Learning
  fewShotEnabled: boolean;
  adaptiveThresholds: boolean;
  feedbackLoopActive: boolean;
  // Schedule
  activeSchedule: 'always' | 'business_hours' | 'custom';
  // Logging
  detailedLogging: boolean;
  auditTrailImmutable: boolean;
  xaiEnabled: boolean;
  // Cross-domain
  crossDomainEnabled: boolean;
  coordinateWithIACenter: boolean;
  coordinateWithHR: boolean;
  coordinateWithLegal: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  executionMode: 'supervised',
  maxConcurrentTasks: 3,
  confidenceThreshold: 0.75,
  riskThreshold: 0.80,
  anomalyScoreThreshold: 0.65,
  requiresHumanReview: true,
  hitlThreshold: 0.70,
  autoApproveBelow: 0.30,
  maxTokensPerInvocation: 5000,
  maxInvocationsPerHour: 100,
  timeoutMs: 30000,
  escalationTarget: 'supervisor',
  escalateOnFailure: true,
  escalateOnLowConfidence: true,
  maxRetries: 2,
  fewShotEnabled: true,
  adaptiveThresholds: true,
  feedbackLoopActive: false,
  activeSchedule: 'always',
  detailedLogging: true,
  auditTrailImmutable: true,
  xaiEnabled: true,
  crossDomainEnabled: false,
  coordinateWithIACenter: false,
  coordinateWithHR: false,
  coordinateWithLegal: false,
};

const SECTIONS = [
  { id: 'execution', label: 'Ejecución', icon: Zap },
  { id: 'thresholds', label: 'Umbrales', icon: Gauge },
  { id: 'hitl', label: 'HITL', icon: Shield },
  { id: 'limits', label: 'Límites', icon: Clock },
  { id: 'escalation', label: 'Escalación', icon: ArrowUpRight },
  { id: 'learning', label: 'Aprendizaje', icon: Brain },
  { id: 'crossdomain', label: 'Cross-Domain', icon: Network },
  { id: 'logging', label: 'Logging', icon: FileText },
] as const;

export function AuditAgentConfigSheet({ agent, onSave, trigger }: AuditAgentConfigSheetProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('execution');
  const [config, setConfig] = useState<AgentConfig>({
    ...DEFAULT_CONFIG,
    confidenceThreshold: agent.confidence_threshold,
    requiresHumanReview: agent.requires_human_review,
    executionMode: agent.execution_type === 'autonomous' ? 'autonomous' : 'supervised',
    crossDomainEnabled: agent.agent_type === 'super_supervisor',
    coordinateWithIACenter: agent.agent_type === 'super_supervisor',
  });

  const updateConfig = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave?.(agent.id, config);
    setOpen(false);
  };

  const agentTypeLabel = {
    specialist: 'Especialista',
    supervisor: 'Supervisor',
    super_supervisor: 'SuperSupervisor',
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            Configurar {agent.name}
            <Badge variant="outline" className="text-[10px]">{agent.code}</Badge>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">{agentTypeLabel[agent.agent_type]} · {agent.specialization}</p>
        </SheetHeader>

        {/* Section tabs */}
        <div className="flex border-b overflow-x-auto px-2">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-[10px] font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeSection === s.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />{s.label}
              </button>
            );
          })}
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          {/* Execution */}
          {activeSection === 'execution' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Modo de ejecución</Label>
                <Select value={config.executionMode} onValueChange={v => updateConfig('executionMode', v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autonomous">Autónomo</SelectItem>
                    <SelectItem value="supervised">Supervisado (recomendado)</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {config.executionMode === 'autonomous' && '⚠️ El agente actúa sin aprobación. Solo para tareas de bajo riesgo.'}
                  {config.executionMode === 'supervised' && '✓ El supervisor valida las acciones del agente antes de ejecutarlas.'}
                  {config.executionMode === 'manual' && 'El agente solo propone — un humano ejecuta todas las acciones.'}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Tareas concurrentes máx.</span><span className="font-medium">{config.maxConcurrentTasks}</span>
                </div>
                <Slider value={[config.maxConcurrentTasks]} min={1} max={10} step={1} onValueChange={v => updateConfig('maxConcurrentTasks', v[0])} />
              </div>
            </div>
          )}

          {/* Thresholds */}
          {activeSection === 'thresholds' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Confianza mínima</span><span className="font-medium">{config.confidenceThreshold}</span>
                </div>
                <Slider value={[config.confidenceThreshold * 100]} min={40} max={99} step={1} onValueChange={v => updateConfig('confidenceThreshold', v[0] / 100)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Por debajo se escala al supervisor</p>
              </div>
              <Separator />
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Umbral de riesgo</span><span className="font-medium">{config.riskThreshold}</span>
                </div>
                <Slider value={[config.riskThreshold * 100]} min={50} max={99} step={1} onValueChange={v => updateConfig('riskThreshold', v[0] / 100)} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Umbral anomalía</span><span className="font-medium">{config.anomalyScoreThreshold}</span>
                </div>
                <Slider value={[config.anomalyScoreThreshold * 100]} min={30} max={95} step={5} onValueChange={v => updateConfig('anomalyScoreThreshold', v[0] / 100)} />
              </div>
            </div>
          )}

          {/* HITL */}
          {activeSection === 'hitl' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Revisión humana obligatoria</Label>
                <Switch checked={config.requiresHumanReview} onCheckedChange={v => updateConfig('requiresHumanReview', v)} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Umbral HITL (escalar a humano)</span><span className="font-medium">{config.hitlThreshold}</span>
                </div>
                <Slider value={[config.hitlThreshold * 100]} min={40} max={95} step={5} onValueChange={v => updateConfig('hitlThreshold', v[0] / 100)} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Auto-aprobar bajo riesgo (&lt;)</span><span className="font-medium">{config.autoApproveBelow}</span>
                </div>
                <Slider value={[config.autoApproveBelow * 100]} min={10} max={50} step={5} onValueChange={v => updateConfig('autoApproveBelow', v[0] / 100)} />
              </div>
            </div>
          )}

          {/* Limits */}
          {activeSection === 'limits' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Tokens máx/invocación</span><span className="font-medium">{config.maxTokensPerInvocation.toLocaleString()}</span>
                </div>
                <Slider value={[config.maxTokensPerInvocation]} min={1000} max={20000} step={1000} onValueChange={v => updateConfig('maxTokensPerInvocation', v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Invocaciones máx/hora</span><span className="font-medium">{config.maxInvocationsPerHour}</span>
                </div>
                <Slider value={[config.maxInvocationsPerHour]} min={10} max={500} step={10} onValueChange={v => updateConfig('maxInvocationsPerHour', v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Timeout (ms)</span><span className="font-medium">{config.timeoutMs.toLocaleString()}</span>
                </div>
                <Slider value={[config.timeoutMs]} min={5000} max={120000} step={5000} onValueChange={v => updateConfig('timeoutMs', v[0])} />
              </div>
            </div>
          )}

          {/* Escalation */}
          {activeSection === 'escalation' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Destino de escalación</Label>
                <Select value={config.escalationTarget} onValueChange={v => updateConfig('escalationTarget', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">Supervisor de dominio</SelectItem>
                    <SelectItem value="supersupervisor">SuperSupervisor Auditoría</SelectItem>
                    <SelectItem value="obelixia">ObelixIA-Supervisor (cross-domain)</SelectItem>
                    <SelectItem value="human">Revisión humana directa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Escalar en fallo</Label>
                <Switch checked={config.escalateOnFailure} onCheckedChange={v => updateConfig('escalateOnFailure', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Escalar por baja confianza</Label>
                <Switch checked={config.escalateOnLowConfidence} onCheckedChange={v => updateConfig('escalateOnLowConfidence', v)} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Reintentos antes de escalar</span><span className="font-medium">{config.maxRetries}</span>
                </div>
                <Slider value={[config.maxRetries]} min={0} max={5} step={1} onValueChange={v => updateConfig('maxRetries', v[0])} />
              </div>
            </div>
          )}

          {/* Learning */}
          {activeSection === 'learning' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Few-shot learning</Label>
                <Switch checked={config.fewShotEnabled} onCheckedChange={v => updateConfig('fewShotEnabled', v)} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Utiliza casos validados de <code>erp_validated_cases</code> como ejemplos para mejorar la precisión del agente.
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-xs">Umbrales adaptativos</Label>
                <Switch checked={config.adaptiveThresholds} onCheckedChange={v => updateConfig('adaptiveThresholds', v)} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                El SuperSupervisor ajusta automáticamente los umbrales basándose en el rendimiento histórico.
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-xs">Feedback loop activo</Label>
                <Switch checked={config.feedbackLoopActive} onCheckedChange={v => updateConfig('feedbackLoopActive', v)} />
              </div>
            </div>
          )}

          {/* Cross-Domain */}
          {activeSection === 'crossdomain' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-medium mb-1">Coordinación Cross-Domain</p>
                <p className="text-[10px] text-muted-foreground">
                  Permite que este agente se coordine con supervisores de otros dominios del ERP
                  a través del ObelixIA-Supervisor para resolver consultas multi-dominio.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Coordinación cross-domain activa</Label>
                <Switch checked={config.crossDomainEnabled} onCheckedChange={v => updateConfig('crossDomainEnabled', v)} />
              </div>
              <Separator />
              <p className="text-xs font-medium">Dominios coordinados</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-500/10 text-violet-600 text-[10px]">IA Center</Badge>
                  <span className="text-[10px] text-muted-foreground">ObelixIA-Supervisor</span>
                </div>
                <Switch checked={config.coordinateWithIACenter} onCheckedChange={v => updateConfig('coordinateWithIACenter', v)} disabled={!config.crossDomainEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-500/10 text-pink-600 text-[10px]">RRHH</Badge>
                  <span className="text-[10px] text-muted-foreground">HR-Supervisor</span>
                </div>
                <Switch checked={config.coordinateWithHR} onCheckedChange={v => updateConfig('coordinateWithHR', v)} disabled={!config.crossDomainEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-500/10 text-indigo-600 text-[10px]">Jurídico</Badge>
                  <span className="text-[10px] text-muted-foreground">Legal-Supervisor</span>
                </div>
                <Switch checked={config.coordinateWithLegal} onCheckedChange={v => updateConfig('coordinateWithLegal', v)} disabled={!config.crossDomainEnabled} />
              </div>
              {config.crossDomainEnabled && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-700">
                    ⚡ El protocolo de escalación cross-domain sigue el principio de recomendación más conservadora:
                    si HR-Supervisor y Audit-Supervisor dan evaluaciones divergentes, prevalece la más restrictiva.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Logging */}
          {activeSection === 'logging' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Logging detallado</Label>
                <Switch checked={config.detailedLogging} onCheckedChange={v => updateConfig('detailedLogging', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Audit trail inmutable</Label>
                <Switch checked={config.auditTrailImmutable} onCheckedChange={v => updateConfig('auditTrailImmutable', v)} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Todos los registros se almacenan con hash de integridad. Requerido para compliance regulatorio.
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-xs">XAI Explicabilidad (GDPR Art. 22)</Label>
                <Switch checked={config.xaiEnabled} onCheckedChange={v => updateConfig('xaiEnabled', v)} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                El agente adjunta explicaciones transparentes y trazables en cada decisión.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <Button className="w-full" onClick={handleSave}>
            Guardar configuración
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
