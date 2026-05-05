/**
 * B13.6 — Controlled Apply panel.
 *
 * Pure routing UI: explains the safe flow B8A/B8B/B9 → Mapping (B10C)
 * → Runtime Apply (B10D) → Pilot/flags (B10E/B10F), and renders
 * navigation buttons that ONLY change activeModule via the provided
 * callback. No edge calls, no writes, no auto-apply.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Network, Activity, Gauge, Gavel, BookOpen } from 'lucide-react';

export type CuratedNavTarget =
  | 'registry-mapping'
  | 'registry-runtime-apply'
  | 'registry-pilot-monitor'
  | 'agreement-hub'
  | 'rollback-guide';

export interface CuratedAgreementsControlledApplyPanelProps {
  onNavigate?: (target: CuratedNavTarget) => void;
}

const STEPS = [
  {
    n: 1,
    title: 'Convenio ready_for_payroll',
    description:
      'El convenio debe haber pasado validación humana B8A/B8B y activación B9.',
  },
  {
    n: 2,
    title: 'Mapping aprobado (B10C)',
    description:
      'Debe existir un mapping empresa/contrato aprobado para el scope objetivo.',
  },
  {
    n: 3,
    title: 'Runtime Apply activado (B10D)',
    description:
      'Debe existir un runtime apply activado por scope, sin saltos de validación.',
  },
  {
    n: 4,
    title: 'Piloto y flags (B10E/B10F)',
    description:
      'El uso efectivo en nómina sigue bloqueado por flags y allow-list piloto.',
  },
  {
    n: 5,
    title: 'Revisión humana y rollback',
    description:
      'Toda aplicación real exige revisión humana y plan de rollback documentado.',
  },
];

const ACTIONS: Array<{
  target: CuratedNavTarget;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { target: 'registry-mapping', label: 'Abrir Mapping empresa/contrato', icon: Network },
  { target: 'registry-runtime-apply', label: 'Abrir Runtime Apply', icon: Activity },
  { target: 'registry-pilot-monitor', label: 'Abrir Monitor piloto', icon: Gauge },
  { target: 'agreement-hub', label: 'Abrir Centro de Convenios', icon: Gavel },
  { target: 'rollback-guide', label: 'Ver guía de rollback', icon: BookOpen },
];

export function CuratedAgreementsControlledApplyPanel({
  onNavigate,
}: CuratedAgreementsControlledApplyPanelProps) {
  return (
    <div className="space-y-4" aria-label="curated-controlled-apply">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aplicación controlada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta vista <strong>no</strong> aplica nada por sí sola. Solo te enruta
            hacia los flujos seguros existentes. Toda activación real exige
            revisión humana, mapping aprobado, runtime apply y piloto.
          </p>

          <ol className="space-y-2">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <Badge variant="outline" className="shrink-0">
                  Paso {s.n}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2 pt-2">
            {ACTIONS.map(({ target, label, icon: Icon }) => (
              <Button
                key={target}
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.(target)}
                disabled={!onNavigate}
                aria-label={`curated-action-${target}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Estas acciones solo cambian de vista. No crean mapping, no crean
            runtime, no cambian flags y no tocan motor de nómina.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default CuratedAgreementsControlledApplyPanel;