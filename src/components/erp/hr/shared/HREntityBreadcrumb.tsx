/**
 * HREntityBreadcrumb — Contextual breadcrumb: Empresa > Entidad Legal > Centro > Departamento > Empleado
 */
import { ChevronRight, Building2, MapPin, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'company' | 'legal_entity' | 'work_center' | 'department' | 'employee' | 'module';
  onClick?: () => void;
}

const ICONS: Record<string, React.ElementType> = {
  company: Building2,
  legal_entity: Building2,
  work_center: MapPin,
  department: Users,
  employee: User,
  module: Users,
};

interface Props {
  items: BreadcrumbItem[];
  className?: string;
}

export function HREntityBreadcrumb({ items, className }: Props) {
  if (!items.length) return null;

  return (
    <nav className={cn('flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto', className)}>
      {items.map((item, idx) => {
        const Icon = ICONS[item.type] || Users;
        const isLast = idx === items.length - 1;
        return (
          <span key={item.id} className="flex items-center gap-1 shrink-0">
            {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            <button
              onClick={item.onClick}
              disabled={!item.onClick || isLast}
              className={cn(
                'flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
                isLast
                  ? 'font-medium text-foreground cursor-default'
                  : 'hover:text-foreground hover:bg-accent cursor-pointer'
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{item.label}</span>
            </button>
          </span>
        );
      })}
    </nav>
  );
}
