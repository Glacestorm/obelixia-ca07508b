/**
 * HRAdminRequestTimeline — Visual activity timeline
 */
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  PlusCircle, ArrowRightLeft, UserCheck, MessageSquare, 
  Paperclip, Play, ListChecks, Clock
} from 'lucide-react';
import { type AdminRequestActivity } from '@/hooks/admin/hr/useAdminPortal';

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  created: { icon: PlusCircle, color: 'text-emerald-500', label: 'Solicitud creada' },
  status_changed: { icon: ArrowRightLeft, color: 'text-blue-500', label: 'Estado cambiado' },
  assigned: { icon: UserCheck, color: 'text-violet-500', label: 'Asignada' },
  commented: { icon: MessageSquare, color: 'text-amber-500', label: 'Comentario añadido' },
  attachment_added: { icon: Paperclip, color: 'text-cyan-500', label: 'Adjunto añadido' },
  workflow_started: { icon: Play, color: 'text-indigo-500', label: 'Workflow iniciado' },
  task_generated: { icon: ListChecks, color: 'text-teal-500', label: 'Tareas generadas' },
};

interface Props {
  activity: AdminRequestActivity[];
}

export function HRAdminRequestTimeline({ activity }: Props) {
  if (activity.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Sin actividad registrada
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activity.map((item, idx) => {
        const config = ACTION_CONFIG[item.action] || { icon: Clock, color: 'text-muted-foreground', label: item.action };
        const Icon = config.icon;

        return (
          <div key={item.id} className="flex gap-3 relative">
            {/* Vertical line */}
            {idx < activity.length - 1 && (
              <div className="absolute left-[15px] top-[32px] w-px h-[calc(100%-16px)] bg-border" />
            )}
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium">{config.label}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{item.actor_name}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
              </div>
              {item.old_value && item.new_value && (
                <p className="text-xs mt-1">
                  <span className="text-muted-foreground line-through">{item.old_value}</span>
                  {' → '}
                  <span className="font-medium">{item.new_value}</span>
                </p>
              )}
              {item.new_value && !item.old_value && item.action !== 'created' && (
                <p className="text-xs mt-1 text-muted-foreground">{item.new_value}</p>
              )}
              {item.metadata && (item.metadata as any).tasks_count && (
                <p className="text-xs mt-1 text-muted-foreground">
                  {(item.metadata as any).tasks_count} tareas creadas automáticamente
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
