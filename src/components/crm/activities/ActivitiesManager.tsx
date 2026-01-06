import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  CheckSquare, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useCRMActivities, ACTIVITY_TYPES, ActivityType, CRMActivity } from '@/hooks/crm/useCRMActivities';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
};

interface ActivitiesManagerProps {
  contactId?: string;
  dealId?: string;
}

export function ActivitiesManager({ contactId, dealId }: ActivitiesManagerProps) {
  const { 
    activities, 
    loading, 
    createActivity, 
    completeActivity, 
    deleteActivity,
    getUpcomingActivities,
    getOverdueActivities,
  } = useCRMActivities(contactId, dealId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: 'task' as ActivityType,
    subject: '',
    description: '',
    scheduled_at: '',
  });

  const upcomingActivities = getUpcomingActivities();
  const overdueActivities = getOverdueActivities();
  const completedActivities = activities.filter(a => a.status === 'completed');

  const handleCreate = async () => {
    if (!formData.subject) return;
    
    await createActivity({
      activity_type: formData.activity_type,
      subject: formData.subject,
      description: formData.description || null,
      scheduled_at: formData.scheduled_at || null,
      status: 'pending',
      contact_id: contactId || null,
      deal_id: dealId || null,
    });
    
    setFormData({ activity_type: 'task', subject: '', description: '', scheduled_at: '' });
    setIsCreateOpen(false);
  };

  const renderActivityCard = (activity: CRMActivity, showActions = true) => (
    <Card key={activity.id} className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              {ACTIVITY_ICONS[activity.activity_type] || <FileText className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{activity.subject}</h4>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {ACTIVITY_TYPES.find(t => t.value === activity.activity_type)?.label || activity.activity_type}
                </Badge>
                {activity.scheduled_at && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(activity.scheduled_at), 'dd MMM HH:mm', { locale: es })}
                  </span>
                )}
              </div>
            </div>
          </div>
          {showActions && activity.status !== 'completed' && (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => completeActivity(activity.id)}
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => deleteActivity(activity.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Actividades</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Actividad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Actividad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={formData.activity_type} 
                  onValueChange={(v) => setFormData({ ...formData, activity_type: v as ActivityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {ACTIVITY_ICONS[type.value]}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Asunto *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Título de la actividad"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles..."
                />
              </div>
              <div>
                <Label>Fecha/Hora Programada</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Crear Actividad</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{overdueActivities.length}</p>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{upcomingActivities.length}</p>
            <p className="text-xs text-muted-foreground">Próximas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{completedActivities.length}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ScrollArea className="h-[400px]">
            {upcomingActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay actividades próximas
              </div>
            ) : (
              upcomingActivities.map(activity => renderActivityCard(activity))
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="overdue">
          <ScrollArea className="h-[400px]">
            {overdueActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay actividades vencidas
              </div>
            ) : (
              overdueActivities.map(activity => renderActivityCard(activity))
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="completed">
          <ScrollArea className="h-[400px]">
            {completedActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay actividades completadas
              </div>
            ) : (
              completedActivities.map(activity => renderActivityCard(activity, false))
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ActivitiesManager;
