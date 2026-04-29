import { Badge } from '@/components/ui/badge';

export type ValidationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_internal'
  | 'rejected'
  | 'superseded';

const LABELS: Record<ValidationStatus, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  approved_internal: 'Aprobada (interna)',
  rejected: 'Rechazada',
  superseded: 'Superseded',
};

export function ValidationStatusBadge({ status }: { status: ValidationStatus | string }) {
  const s = (status as ValidationStatus) ?? 'draft';
  const variant =
    s === 'approved_internal'
      ? 'default'
      : s === 'rejected'
        ? 'destructive'
        : s === 'superseded'
          ? 'outline'
          : 'secondary';
  return <Badge variant={variant as 'default' | 'destructive' | 'outline' | 'secondary'}>{LABELS[s] ?? s}</Badge>;
}

export default ValidationStatusBadge;