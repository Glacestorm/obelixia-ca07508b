import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface AgreementRulesReviewCardProps {
  rules: Record<string, unknown> | null;
}

const FIELDS: Array<[string, string]> = [
  ['annual_hours', 'Jornada anual'],
  ['vacation_days', 'Vacaciones'],
  ['extra_payments', 'Pagas extra'],
  ['seniority_rule', 'Antigüedad'],
  ['overtime_rule', 'Horas extra'],
  ['night_shift_rule', 'Nocturnidad'],
  ['holidays_rule', 'Festivos'],
  ['it_complement_rule', 'Complemento IT'],
  ['leaves_rule', 'Permisos'],
  ['notice_period', 'Preaviso'],
  ['trial_period', 'Periodo de prueba'],
];

function stringify(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function AgreementRulesReviewCard({ rules }: AgreementRulesReviewCardProps) {
  const unresolved = (rules?.unresolved_fields as string[]) ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Reglas convencionales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!rules ? (
          <p className="text-muted-foreground">Sin reglas parseadas.</p>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            {FIELDS.map(([k, label]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono text-xs text-right break-all">{stringify(rules[k])}</dd>
              </div>
            ))}
          </dl>
        )}
        {unresolved.length > 0 && (
          <div className="text-xs text-warning">Campos no resueltos: {unresolved.join(', ')}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementRulesReviewCard;