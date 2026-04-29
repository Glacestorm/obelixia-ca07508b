import { Badge } from '@/components/ui/badge';

interface Props {
  badges: string[];
}

const VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OPERATIVO_ACTUAL: 'default',
  REGISTRY_METADATA_ONLY: 'outline',
  REGISTRY_PARSED: 'secondary',
  REGISTRY_HUMAN_VALIDATED: 'secondary',
  REGISTRY_READY: 'default',
  MISSING_FROM_REGISTRY: 'outline',
  NEEDS_HUMAN_REVIEW: 'destructive',
  NO_ENCONTRADO: 'outline',
};

export function AgreementStatusBadges({ badges }: Props) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1" data-testid="agreement-status-badges">
      {badges.map((b) => (
        <Badge key={b} variant={VARIANT_MAP[b] ?? 'outline'} className="text-[10px]">
          {b}
        </Badge>
      ))}
    </div>
  );
}

export default AgreementStatusBadges;