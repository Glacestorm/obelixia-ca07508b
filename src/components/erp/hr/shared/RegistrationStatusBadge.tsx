/**
 * RegistrationStatusBadge — Badge for registration/affiliation process status
 * V2-ES.5 Paso 1: Visual indicator for registration states
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { REGISTRATION_STATUS_CONFIG, type RegistrationStatus } from '@/hooks/erp/hr/useHRRegistrationProcess';

interface Props {
  status: string | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

export function RegistrationStatusBadge({ status, className, size = 'sm' }: Props) {
  const normalized = (status || 'pending_data') as RegistrationStatus;
  const config = REGISTRATION_STATUS_CONFIG[normalized] || REGISTRATION_STATUS_CONFIG.pending_data;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.color,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className,
      )}
    >
      {config.labelES}
    </Badge>
  );
}
