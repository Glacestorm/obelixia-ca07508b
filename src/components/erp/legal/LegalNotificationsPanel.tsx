/**
 * LegalNotificationsPanel - Sistema de Notificaciones Proactivas
 * Fase 8: Alertas a agentes y usuarios afectados por cambios normativos
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Bell,
  BellOff,
  BellRing,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Bot,
  Settings,
  Filter,
  Check,
  X,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  ExternalLink,
  Trash2,
  MailCheck,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'regulation_change' | 'deadline_reminder' | 'compliance_alert' | 'agent_advisory' | 'system_update';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  source: string;
  jurisdiction?: string;
  createdAt: string;
  isRead: boolean;
  isActionRequired: boolean;
  actionUrl?: string;
  actionLabel?: string;
  recipients: {
    type: 'user' | 'role' | 'agent';
    id: string;
    name: string;
    notified: boolean;
    readAt?: string;
  }[];
  metadata?: Record<string, unknown>;
}

interface NotificationPreferences {
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    slack: boolean;
  };
  categories: {
    regulation_change: boolean;
    deadline_reminder: boolean;
    compliance_alert: boolean;
    agent_advisory: boolean;
    system_update: boolean;
  };
  jurisdictions: string[];
  digest: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface LegalNotificationsPanelProps {
  companyId?: string;
  className?: string;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'regulation_change',
    priority: 'urgent',
    title: 'Nueva Ley de Jornada Laboral publicada',
    message: 'Se ha publicado la Ley 28/2025 que modifica la jornada laboral máxima. Requiere adaptación inmediata de contratos laborales.',
    source: 'BOE',
    jurisdiction: 'ES',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isActionRequired: true,
    actionUrl: '/admin/legal?module=compliance',
    actionLabel: 'Ver plan de adaptación',
    recipients: [
      { type: 'role', id: 'hr_manager', name: 'Directores RRHH', notified: true },
      { type: 'agent', id: 'erp-hr-agent', name: 'Agente HR IA', notified: true },
      { type: 'user', id: 'user1', name: 'María García', notified: true, readAt: new Date().toISOString() }
    ]
  },
  {
    id: '2',
    type: 'deadline_reminder',
    priority: 'high',
    title: 'Vence plazo de adaptación DORA',
    message: 'Quedan 15 días para completar la evaluación de resiliencia operativa digital según DORA.',
    source: 'Sistema',
    jurisdiction: 'EU',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isActionRequired: true,
    actionUrl: '/admin/legal?module=compliance',
    actionLabel: 'Revisar checklist',
    recipients: [
      { type: 'role', id: 'compliance_officer', name: 'Compliance Officers', notified: true },
      { type: 'agent', id: 'banking-legal', name: 'Agente Compliance Bancario', notified: true }
    ]
  },
  {
    id: '3',
    type: 'compliance_alert',
    priority: 'high',
    title: 'Brecha de cumplimiento detectada',
    message: 'El análisis automático ha detectado que faltan cláusulas obligatorias en 12 contratos laborales.',
    source: 'Agente Legal IA',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isActionRequired: true,
    actionUrl: '/admin/legal?module=documents',
    actionLabel: 'Ver contratos afectados',
    recipients: [
      { type: 'user', id: 'user2', name: 'Carlos López', notified: true }
    ]
  },
  {
    id: '4',
    type: 'agent_advisory',
    priority: 'medium',
    title: 'Asesoría solicitada por Agente HR',
    message: 'El agente de RRHH ha solicitado validación legal para una propuesta de despido objetivo.',
    source: 'erp-hr-agent',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isRead: false,
    isActionRequired: true,
    actionUrl: '/admin/legal?module=activity',
    actionLabel: 'Revisar solicitud',
    recipients: [
      { type: 'role', id: 'legal_team', name: 'Equipo Legal', notified: true }
    ]
  },
  {
    id: '5',
    type: 'system_update',
    priority: 'low',
    title: 'Base de conocimiento actualizada',
    message: 'Se han añadido 23 nuevas sentencias del Tribunal Supremo a la base de precedentes.',
    source: 'Sistema',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isActionRequired: false,
    recipients: [
      { type: 'role', id: 'legal_team', name: 'Equipo Legal', notified: true }
    ]
  }
];

const notificationTypeLabels = {
  regulation_change: 'Cambio normativo',
  deadline_reminder: 'Recordatorio',
  compliance_alert: 'Alerta compliance',
  agent_advisory: 'Consulta agente',
  system_update: 'Actualización sistema'
};

const notificationTypeIcons = {
  regulation_change: <AlertTriangle className="h-4 w-4" />,
  deadline_reminder: <Clock className="h-4 w-4" />,
  compliance_alert: <AlertTriangle className="h-4 w-4" />,
  agent_advisory: <Bot className="h-4 w-4" />,
  system_update: <Info className="h-4 w-4" />
};

const priorityColors = {
  low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20'
};

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente'
};

export function LegalNotificationsPanel({ companyId, className }: LegalNotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    channels: { email: true, push: true, inApp: true, slack: false },
    categories: { 
      regulation_change: true, 
      deadline_reminder: true, 
      compliance_alert: true, 
      agent_advisory: true, 
      system_update: true 
    },
    jurisdictions: ['ES', 'AD', 'EU'],
    digest: 'immediate',
    quietHours: { enabled: false, start: '22:00', end: '08:00' }
  });
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('notifications');

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.isRead).length;

  const handleMarkAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ));
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  }, []);

  const handleDeleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    toast.success('Notificación eliminada');
  }, []);

  const handleUpdatePreference = useCallback((
    category: keyof NotificationPreferences,
    key: string,
    value: boolean | string
  ) => {
    setPreferences(prev => ({
      ...prev,
      [category]: typeof prev[category] === 'object' 
        ? { ...prev[category] as Record<string, unknown>, [key]: value }
        : value
    }));
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    if (filter === 'urgent') return n.priority === 'urgent' || n.priority === 'high';
    if (filter === 'action') return n.isActionRequired && !n.isRead;
    return n.type === filter;
  });

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
              <BellRing className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Centro de Notificaciones</CardTitle>
              <CardDescription>
                Alertas proactivas de cambios normativos
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} sin leer
              </Badge>
            )}
            {urgentCount > 0 && (
              <Badge className="bg-red-500/10 text-red-500">
                {urgentCount} urgentes
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="recipients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Destinatarios
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferencias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {/* Filtros y acciones */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border bg-background text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="unread">Sin leer</option>
                  <option value="urgent">Urgentes</option>
                  <option value="action">Requieren acción</option>
                  <option value="regulation_change">Cambios normativos</option>
                  <option value="deadline_reminder">Recordatorios</option>
                  <option value="compliance_alert">Alertas compliance</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <MailCheck className="h-4 w-4 mr-2" />
                Marcar todo leído
              </Button>
            </div>

            {/* Lista de notificaciones */}
            <ScrollArea className="h-[450px]">
              <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay notificaciones</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={cn(
                        "p-4 transition-all",
                        !notification.isRead && "border-l-4 border-l-primary bg-primary/5"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              notification.priority === 'urgent' && "bg-red-500/10",
                              notification.priority === 'high' && "bg-orange-500/10",
                              notification.priority === 'medium' && "bg-blue-500/10",
                              notification.priority === 'low' && "bg-gray-500/10"
                            )}>
                              {notificationTypeIcons[notification.type]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={priorityColors[notification.priority]} variant="outline">
                                  {priorityLabels[notification.priority]}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {notificationTypeLabels[notification.type]}
                                </Badge>
                                {notification.jurisdiction && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.jurisdiction}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Fuente: {notification.source}</span>
                            <span>
                              {formatDistanceToNow(new Date(notification.createdAt), { 
                                addSuffix: true, 
                                locale: es 
                              })}
                            </span>
                          </div>
                          {notification.isActionRequired && notification.actionUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={notification.actionUrl}>
                                {notification.actionLabel || 'Ver más'}
                                <ExternalLink className="h-3 w-3 ml-2" />
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* Destinatarios */}
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Enviado a:</span>
                            {notification.recipients.map((recipient, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  recipient.readAt && "bg-green-500/10"
                                )}
                              >
                                {recipient.type === 'agent' && <Bot className="h-3 w-3 mr-1" />}
                                {recipient.type === 'role' && <Users className="h-3 w-3 mr-1" />}
                                {recipient.name}
                                {recipient.readAt && <Check className="h-3 w-3 ml-1 text-green-500" />}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recipients" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuarios y Roles
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Directores RRHH</p>
                      <p className="text-xs text-muted-foreground">Rol • 3 usuarios</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Compliance Officers</p>
                      <p className="text-xs text-muted-foreground">Rol • 2 usuarios</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Equipo Legal</p>
                      <p className="text-xs text-muted-foreground">Rol • 5 usuarios</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Agentes IA
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Agente HR IA</p>
                      <p className="text-xs text-muted-foreground">erp-hr-agent</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Agente Fiscal IA</p>
                      <p className="text-xs text-muted-foreground">erp-fiscal-agent</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Agente Compliance Bancario</p>
                      <p className="text-xs text-muted-foreground">banking-legal</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Canales */}
            <div>
              <h4 className="font-medium mb-4">Canales de notificación</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Email</p>
                      <p className="text-xs text-muted-foreground">Notificaciones por correo</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.channels.email}
                    onCheckedChange={(v) => handleUpdatePreference('channels', 'email', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Push</p>
                      <p className="text-xs text-muted-foreground">Notificaciones móvil</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.channels.push}
                    onCheckedChange={(v) => handleUpdatePreference('channels', 'push', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">In-App</p>
                      <p className="text-xs text-muted-foreground">Notificaciones en aplicación</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.channels.inApp}
                    onCheckedChange={(v) => handleUpdatePreference('channels', 'inApp', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Slack</p>
                      <p className="text-xs text-muted-foreground">Integración Slack</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.channels.slack}
                    onCheckedChange={(v) => handleUpdatePreference('channels', 'slack', v)}
                  />
                </div>
              </div>
            </div>

            {/* Categorías */}
            <div>
              <h4 className="font-medium mb-4">Categorías de alertas</h4>
              <div className="space-y-3">
                {Object.entries(preferences.categories).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {notificationTypeIcons[key as keyof typeof notificationTypeIcons]}
                      <span className="text-sm">{notificationTypeLabels[key as keyof typeof notificationTypeLabels]}</span>
                    </div>
                    <Switch 
                      checked={value}
                      onCheckedChange={(v) => handleUpdatePreference('categories', key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Frecuencia */}
            <div>
              <h4 className="font-medium mb-4">Frecuencia de resumen</h4>
              <div className="flex gap-2">
                {['immediate', 'daily', 'weekly'].map((freq) => (
                  <Button
                    key={freq}
                    variant={preferences.digest === freq ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreferences(prev => ({ ...prev, digest: freq as any }))}
                  >
                    {freq === 'immediate' && 'Inmediato'}
                    {freq === 'daily' && 'Diario'}
                    {freq === 'weekly' && 'Semanal'}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => toast.success('Preferencias guardadas')}>
              <Check className="h-4 w-4 mr-2" />
              Guardar preferencias
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalNotificationsPanel;
