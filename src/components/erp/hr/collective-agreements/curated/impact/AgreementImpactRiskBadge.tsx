/**
 * B13.5C — Risk badge.
 */
import { Badge } from '@/components/ui/badge';

export type ImpactRiskLevel = 'low' | 'medium' | 'high';

export function AgreementImpactRiskBadge({ level }: { level: ImpactRiskLevel }) {
  const variant = level === 'high' ? 'destructive' : level === 'medium' ? 'default' : 'secondary';
  const label = level === 'high' ? 'Alto' : level === 'medium' ? 'Medio' : 'Bajo';
  return <Badge variant={variant} aria-label={`risk-${level}`}>{label}</Badge>;
}

export default AgreementImpactRiskBadge;