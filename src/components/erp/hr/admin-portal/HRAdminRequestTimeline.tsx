/**
 * HRAdminRequestTimeline — Unified read-only timeline
 * V2-ES.2 Paso 5: Merges activity + comments + linked tasks chronologically
 */
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle, ArrowRightLeft, UserCheck, MessageSquare,
  Paperclip, Play, ListChecks, Clock, ClipboardList, CheckCircle
} from 'lucide-react';
import {
  type AdminRequestActivity,
  type AdminRequestComment,
  type LinkedTask,
} from '@/hooks/admin/hr/useAdminPortal';

// ── Unified timeline item ──
interface TimelineEntry {
  id: string;
  type: 'activity' | 'comment' | 'task';
  timestamp: string;
  icon: any;
  iconColor: string;
  label: string;
  actor?: string;
  detail?: string;
  oldValue?: string;
  newValue?: string;
  taskStatus?: string;
  taskPriority?: string;
  isInternal?: boolean;
  meta?: Record<string, any>;
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  created: { icon: PlusCircle, color: 'text-emerald-500', label: 'Solicitud creada' },
  status_changed: { icon: ArrowRightLeft, color: 'text-blue-500', label: 'Estado cambiado' },
  assigned: { icon: UserCheck, color: 'text-violet-500', label: 'Asignada' },
  commented: { icon: MessageSquare, color: 'text-amber-500', label: 'Comentario añadido' },
  attachment_added: { icon: Paperclip, color: 'text-cyan-500', label: 'Adjunto añadido' },
  workflow_started: { icon: Play, color: 'text-indigo-500', label: 'Workflow iniciado' },
  task_generated: { icon: ListChecks, color: 'text-teal-500', label: 'Tareas generadas' },
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700',
  in_progress: 'bg-blue-500/10 text-blue-700',
  completed: 'bg-emerald-500/10 text-emerald-700',
  cancelled: 'bg-muted text-muted-foreground',
  on_hold: 'bg-orange-500/10 text-orange-700',
};

interface Props {
  activity: AdminRequestActivity[];
  comments?: AdminRequestComment[];
  linkedTasks?: LinkedTask[];
}

export function HRAdminRequestTimeline({ activity, comments = [], linkedTasks = [] }: Props) {
  const entries = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];

    // Activity entries (excluding 'commented' since we show real comments)
    activity.forEach(a => {
      if (a.action === 'commented') return; // avoid duplication with real comments
      const config = ACTION_CONFIG[a.action] || { icon: Clock, color: 'text-muted-foreground', label: a.action };
      items.push({
        id: `act-${a.id}`,
        type: 'activity',
        timestamp: a.created_at,
        icon: config.icon,
        iconColor: config.color,
        label: config.label,
        actor: a.actor_name,
        oldValue: a.old_value || undefined,
        newValue: a.new_value || undefined,
        meta: (a.metadata || {}) as Record<string, any>,
      });
    });

    // Comments
    comments.forEach(c => {
      items.push({
        id: `com-${c.id}`,
        type: 'comment',
        timestamp: c.created_at,
        icon: MessageSquare,
        iconColor: c.is_internal ? 'text-orange-500' : 'text-amber-500',
        label: c.is_internal ? 'Nota interna' : 'Comentario',
        actor: c.author_name,
        detail: c.content,
        isInternal: c.is_internal,
      });
    });

    // Linked tasks
    linkedTasks.forEach(t => {
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        timestamp: t.created_at,
        icon: ClipboardList,
        iconColor: 'text-violet-500',
        label: t.title,
        taskStatus: t.status,
        taskPriority: t.priority,
      });
    });

    // Sort newest first
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  }, [activity, comments, linkedTasks]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Sin actividad registrada
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => {
        const Icon = entry.icon;
        return (
          <div key={entry.id} className="flex gap-3 relative">
            {/* Vertical line */}
            {idx < entries.length - 1 && (
              <div className="absolute left-[15px] top-[32px] w-px h-[calc(100%-16px)] bg-border" />
            )}
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 ${entry.iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{entry.label}</p>
                {entry.type === 'task' && entry.taskStatus && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TASK_STATUS_COLORS[entry.taskStatus] || ''}`}>
                    {entry.taskStatus}
                  </Badge>
                )}
                {entry.isInternal && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-700">interno</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {entry.actor && <span>{entry.actor}</span>}
                {entry.actor && <span>·</span>}
                <span>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: es })}</span>
              </div>
              {/* Status change */}
              {entry.oldValue && entry.newValue && (
                <p className="text-xs mt-1">
                  <span className="text-muted-foreground line-through">{entry.oldValue}</span>
                  {' → '}
                  <span className="font-medium">{entry.newValue}</span>
                </p>
              )}
              {entry.newValue && !entry.oldValue && entry.type === 'activity' && (
                <p className="text-xs mt-1 text-muted-foreground">{entry.newValue}</p>
              )}
              {/* Comment content */}
              {entry.detail && (
                <p className="text-xs mt-1 text-muted-foreground bg-muted/30 rounded p-2">{entry.detail}</p>
              )}
              {/* Task count from meta */}
              {entry.meta?.tasks_count && (
                <p className="text-xs mt-1 text-muted-foreground">
                  {entry.meta.tasks_count} tareas creadas automáticamente
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
