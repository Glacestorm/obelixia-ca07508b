/**
 * HRWorkflowDesigner - Diseñador de flujos sin código
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GitBranch, Plus, ChevronDown, ChevronRight, Settings, Trash2, ArrowDown, Zap, Database } from 'lucide-react';
import { useHRWorkflowEngine, type WorkflowDefinition } from '@/hooks/admin/hr/useHRWorkflowEngine';
import { cn } from '@/lib/utils';

interface Props { companyId: string; }

const PROCESS_TYPES = [
  { value: 'vacations', label: 'Vacaciones' },
  { value: 'hiring', label: 'Contratación' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'promotion', label: 'Promoción' },
  { value: 'salary_review', label: 'Revisión Salarial' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'disciplinary', label: 'Expediente Disciplinario' },
  { value: 'settlement_validation', label: 'Validación Finiquito' },
];

const STEP_TYPES = [
  { value: 'approval', label: 'Aprobación', icon: '✅' },
  { value: 'review', label: 'Revisión', icon: '👁️' },
  { value: 'notification', label: 'Notificación', icon: '🔔' },
  { value: 'condition', label: 'Condición', icon: '🔀' },
];

const ROLES = [
  { value: 'HR_DIRECTOR', label: 'Director RRHH' },
  { value: 'HR_MANAGER', label: 'Manager RRHH' },
  { value: 'HR_SPECIALIST', label: 'Especialista RRHH' },
  { value: 'PAYROLL_ADMIN', label: 'Admin Nóminas' },
  { value: 'RECRUITER', label: 'Reclutador' },
  { value: 'MANAGER', label: 'Manager/Responsable' },
  { value: 'EMPLOYEE', label: 'Empleado' },
];

export function HRWorkflowDesigner({ companyId }: Props) {
  const { definitions, fetchDefinitions, saveDefinition, seedWorkflows, loading } = useHRWorkflowEngine();
  const [expandedDefs, setExpandedDefs] = useState<Set<string>>(new Set());

  useEffect(() => { fetchDefinitions(companyId); }, [companyId]);

  const toggleDef = (id: string) => {
    setExpandedDefs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><GitBranch className="h-5 w-5" /> Diseñador de Workflows</h3>
          <p className="text-sm text-muted-foreground">Flujos de aprobación configurables para procesos HR</p>
        </div>
        <div className="flex gap-2">
          {definitions.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => seedWorkflows(companyId)} disabled={loading}>
              <Database className="h-4 w-4 mr-2" /> Generar Workflows Demo
            </Button>
          )}
        </div>
      </div>

      {definitions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sin workflows definidos. Genera los workflows demo para 9 procesos HR.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {definitions.map((def) => {
            const isExpanded = expandedDefs.has(def.id);
            const steps = (def.erp_hr_workflow_steps || []).sort((a, b) => a.step_order - b.step_order);
            const processLabel = PROCESS_TYPES.find(p => p.value === def.process_type)?.label || def.process_type;

            return (
              <Card key={def.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleDef(def.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <Zap className="h-4 w-4 text-primary" />
                          {def.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{processLabel}</Badge>
                          <Badge variant="secondary">v{def.version}</Badge>
                          <Badge variant={def.is_active ? 'default' : 'secondary'}>{def.is_active ? 'Activo' : 'Inactivo'}</Badge>
                          <Badge>{steps.length} pasos</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      {def.description && <p className="text-sm text-muted-foreground mb-4">{def.description}</p>}
                      <div className="space-y-2">
                        {steps.map((step, i) => {
                          const stepTypeInfo = STEP_TYPES.find(t => t.value === step.step_type);
                          const roleInfo = ROLES.find(r => r.value === step.approver_role);
                          return (
                            <div key={step.id}>
                              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  {step.step_order}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{stepTypeInfo?.icon}</span>
                                    <span className="font-medium text-sm">{step.name}</span>
                                    <Badge variant="outline" className="text-xs">{stepTypeInfo?.label || step.step_type}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {roleInfo && <span>👤 {roleInfo.label}</span>}
                                    <span>⏱️ SLA: {step.sla_hours}h</span>
                                    {step.escalation_hours && <span>🔺 Escalado: {step.escalation_hours}h</span>}
                                    {step.comments_required && <span>💬 Comentario obligatorio</span>}
                                    {step.delegation_enabled && <span>🔄 Delegable</span>}
                                  </div>
                                </div>
                              </div>
                              {i < steps.length - 1 && (
                                <div className="flex justify-center py-1">
                                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
