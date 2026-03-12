/**
 * HRAdminPortalDashboard — Mini-dashboard with status overview
 */
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, ArrowRightLeft, Inbox, Send
} from 'lucide-react';

interface Stats {
  total: number;
  draft: number;
  submitted: number;
  reviewing: number;
  pending_approval: number;
  approved: number;
  in_progress: number;
  completed: number;
  rejected: number;
}

interface Props {
  stats: Stats;
  onFilterByStatus: (status: string) => void;
}

const STAT_CARDS = [
  { key: 'submitted', label: 'Enviadas', icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'reviewing', label: 'En revisión', icon: ArrowRightLeft, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { key: 'pending_approval', label: 'Pend. aprobación', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'in_progress', label: 'En gestión', icon: Inbox, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { key: 'completed', label: 'Completadas', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'rejected', label: 'Rechazadas', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
];

export function HRAdminPortalDashboard({ stats, onFilterByStatus }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
        <Card
          key={key}
          className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
          onClick={() => onFilterByStatus(key)}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{(stats as any)[key] || 0}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
