/**
 * TaskAssignmentRules — Configuration for auto-assignment & SLA defaults
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock, ArrowUpCircle, Users } from 'lucide-react';

interface Props { companyId: string; }

const DEFAULT_RULES = [
  { category: 'admin_request', role: 'hr_manager', sla: 48, escalation: 'hr_director' },
  { category: 'payroll', role: 'payroll_specialist', sla: 24, escalation: 'hr_manager' },
  { category: 'mobility', role: 'mobility_manager', sla: 72, escalation: 'hr_director' },
  { category: 'document', role: 'hr_admin', sla: 24, escalation: 'hr_manager' },
  { category: 'compliance', role: 'compliance_officer', sla: 48, escalation: 'hr_director' },
  { category: 'integration', role: 'hr_tech', sla: 12, escalation: 'hr_manager' },
  { category: 'onboarding', role: 'hr_admin', sla: 72, escalation: 'hr_manager' },
  { category: 'offboarding', role: 'hr_admin', sla: 48, escalation: 'hr_manager' },
];

const CATEGORY_LABELS: Record<string, string> = {
  admin_request: 'Solicitudes', payroll: 'Nómina', mobility: 'Movilidad',
  document: 'Documentos', compliance: 'Compliance', integration: 'Integraciones',
  onboarding: 'Onboarding', offboarding: 'Offboarding',
};

export function TaskAssignmentRules({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-violet-500" /> Reglas de Asignación y SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reglas predeterminadas de asignación por categoría. Personalización avanzada próximamente.
          </p>
          <div className="space-y-2">
            {DEFAULT_RULES.map(rule => (
              <div key={rule.category} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{CATEGORY_LABELS[rule.category]}</Badge>
                  <span className="text-sm flex items-center gap-1">
                    <Users className="h-3 w-3" /> {rule.role}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {rule.sla}h SLA
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowUpCircle className="h-3 w-3" /> → {rule.escalation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
