import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StagingStatusBadgeProps {
  status: string;
  className?: string;
}

const LABELS: Record<string, string> = {
  ocr_pending_review: 'OCR pendiente',
  manual_pending_review: 'Manual pendiente',
  needs_correction: 'Necesita corrección',
  human_approved_first: 'Aprobada (1ª)',
  human_approved_second: 'Aprobada (2ª)',
  human_approved_single: 'Aprobada',
  rejected: 'Rechazada',
};

const TONES: Record<string, string> = {
  ocr_pending_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  manual_pending_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  needs_correction: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  human_approved_first: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  human_approved_second: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  human_approved_single: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-destructive/15 text-destructive',
};

export function StagingStatusBadge({ status, className }: StagingStatusBadgeProps) {
  const label = LABELS[status] ?? status;
  const tone = TONES[status] ?? 'bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('font-medium', tone, className)}>
      {label}
    </Badge>
  );
}

export default StagingStatusBadge;