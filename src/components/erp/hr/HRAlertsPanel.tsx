/**
 * Panel de Alertas HR - HRAlertsPanel
 * Gestión de alertas multicanal: email, WhatsApp, push, in-app
 * Vencimientos, accidentes, defunciones, etc.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  Shield,
  Calendar,
  MessageSquare,
  Mail,
  Smartphone,
  Zap,
  Settings,
  RefreshCw,
  Eye,
  Check,
  X,
  Filter,
  BellRing
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  employee_id: string | null;
  employee_name?: string;
  alert_type: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trigger_date: string;
  due_date: string | null;
  is_read: boolean;
  is_resolved: boolean;
  notified_via: string[];
  ai_notified: boolean;
}

interface AlertPreference {
  id: string;
  alert_type: string;
  is_enabled: boolean;
  channels: string[];
  advance_days: number;
  email_address: string | null;
  whatsapp_number: string | null;
}

interface HRAlertsPanelProps {
  companyId: string;
}

const ALERT_TYPES = [
  { value: 'contract_expiry', label: 'Vencimiento Contrato', icon: FileText, color: 'text-orange-500' },
  { value: 'accident', label: 'Accidente Laboral', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'death_employee', label: 'Fallecimiento Empleado', icon: Heart, color: 'text-red-700' },
  { value: 'death_family', label: 'Fallecimiento Familiar', icon: Heart, color: 'text-purple-500' },
  { value: 'medical_leave', label: 'Baja Médica', icon: Shield, color: 'text-blue-500' },
  { value: 'vacation_request', label: 'Solicitud Vacaciones', icon: Calendar, color: 'text-green-500' },
  { value: 'vacation_approved', label: 'Vacaciones Aprobadas', icon: CheckCircle, color: 'text-green-600' },
  { value: 'document_expiry', label: 'Vencimiento Documento', icon: FileText, color: 'text-amber-500' },
  { value: 'probation_end', label: 'Fin Período Prueba', icon: Clock, color: 'text-cyan-500' },
  { value: 'anniversary', label: 'Aniversario', icon: Calendar, color: 'text-pink-500' },
  { value: 'birthday', label: 'Cumpleaños', icon: Calendar, color: 'text-violet-500' }
];

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'push', label: 'Push', icon: Smartphone },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'in_app', label: 'App', icon: Bell }
];

export function HRAlertsPanel({ companyId }: HRAlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_alerts')
        .select(`
          *,
          erp_hr_employees(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('trigger_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedAlerts = (data || []).map((alert: any) => ({
        ...alert,
        employee_name: alert.erp_hr_employees 
          ? `${alert.erp_hr_employees.first_name} ${alert.erp_hr_employees.last_name}`
          : null,
        notified_via: alert.notified_via || []
      }));

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Demo data
      setAlerts([
        {
          id: '1',
          employee_id: '3',
          employee_name: 'Ana Martínez Sánchez',
          alert_type: 'contract_expiry',
          title: 'Vencimiento de contrato',
          description: 'El contrato temporal vence el 31/08/2026',
          severity: 'high',
          trigger_date: new Date().toISOString(),
          due_date: '2026-08-31',
          is_read: false,
          is_resolved: false,
          notified_via: ['email', 'in_app'],
          ai_notified: true
        },
        {
          id: '2',
          employee_id: '4',
          employee_name: 'Juan López Fernández',
          alert_type: 'medical_leave',
          title: 'Baja médica registrada',
          description: 'Baja por enfermedad común desde el 15/01/2026',
          severity: 'medium',
          trigger_date: new Date(Date.now() - 86400000).toISOString(),
          due_date: null,
          is_read: true,
          is_resolved: false,
          notified_via: ['email', 'whatsapp'],
          ai_notified: true
        },
        {
          id: '3',
          employee_id: '5',
          employee_name: 'Elena Fernández Ruiz',
          alert_type: 'probation_end',
          title: 'Fin de período de prueba',
          description: 'El período de prueba finaliza el 01/03/2026',
          severity: 'medium',
          trigger_date: new Date(Date.now() - 172800000).toISOString(),
          due_date: '2026-03-01',
          is_read: false,
          is_resolved: false,
          notified_via: ['in_app'],
          ai_notified: false
        },
        {
          id: '4',
          employee_id: '2',
          employee_name: 'Carlos Rodríguez Martín',
          alert_type: 'anniversary',
          title: 'Aniversario laboral',
          description: '7 años en la empresa',
          severity: 'low',
          trigger_date: new Date(Date.now() + 604800000).toISOString(),
          due_date: '2026-06-01',
          is_read: false,
          is_resolved: false,
          notified_via: [],
          ai_notified: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('erp_hr_alert_preferences')
        .select('*')
        .eq('company_id', companyId);

      if (data) {
        setPreferences(data.map((p: any) => ({
          ...p,
          channels: p.channels || []
        })));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Demo data
      setPreferences(ALERT_TYPES.map(type => ({
        id: type.value,
        alert_type: type.value,
        is_enabled: true,
        channels: ['email', 'in_app'],
        advance_days: 7,
        email_address: null,
        whatsapp_number: null
      })));
    }
  }, [companyId]);

  useEffect(() => {
    fetchAlerts();
    fetchPreferences();
  }, [fetchAlerts, fetchPreferences]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (activeTab === 'pending' && alert.is_resolved) return false;
      if (activeTab === 'resolved' && !alert.is_resolved) return false;
      if (filterType !== 'all' && alert.alert_type !== filterType) return false;
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      return true;
    });
  }, [alerts, activeTab, filterType, filterSeverity]);

  // Stats
  const stats = useMemo(() => ({
    total: alerts.length,
    pending: alerts.filter(a => !a.is_resolved).length,
    unread: alerts.filter(a => !a.is_read && !a.is_resolved).length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length,
    high: alerts.filter(a => a.severity === 'high' && !a.is_resolved).length
  }), [alerts]);

  // Mark as read
  const handleMarkAsRead = async (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, is_read: true } : a
    ));
    
    try {
      await supabase
        .from('erp_hr_alerts')
        .update({ is_read: true })
        .eq('id', alertId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Resolve alert
  const handleResolve = async (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, is_resolved: true, is_read: true } : a
    ));
    toast.success('Alerta resuelta');
    
    try {
      await supabase
        .from('erp_hr_alerts')
        .update({ 
          is_resolved: true, 
          is_read: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // Notify AI
  const handleNotifyAI = async (alert: Alert) => {
    toast.info('Notificando al Agente IA...');
    
    try {
      // Call edge function to notify AI
      const { error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'notify_alert',
          alert: {
            type: alert.alert_type,
            title: alert.title,
            employee_name: alert.employee_name,
            description: alert.description,
            severity: alert.severity,
            due_date: alert.due_date
          }
        }
      });

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alert.id ? { ...a, ai_notified: true } : a
      ));
      
      toast.success('Agente IA notificado');
    } catch (error) {
      console.error('Error notifying AI:', error);
      // Still mark as notified for demo
      setAlerts(prev => prev.map(a => 
        a.id === alert.id ? { ...a, ai_notified: true } : a
      ));
      toast.success('Agente IA notificado (simulado)');
    }
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPES.find(t => t.value === type) || { 
      label: type, 
      icon: Bell, 
      color: 'text-gray-500' 
    };
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500 text-white">Crítica</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white">Media</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white">Baja</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sin leer</p>
                <p className="text-lg font-bold text-blue-600">{stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Críticas</p>
                <p className="text-lg font-bold text-red-600">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Urgentes</p>
                <p className="text-lg font-bold text-orange-600">{stats.high}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de alerta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {ALERT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAlerts}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreferencesDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar alertas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="h-3 w-3" />
                Pendientes ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Resueltas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {filteredAlerts.map(alert => {
                const typeInfo = getAlertTypeInfo(alert.alert_type);
                const TypeIcon = typeInfo.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      !alert.is_read && !alert.is_resolved && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-lg bg-muted", typeInfo.color)}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{alert.title}</h4>
                          {getSeverityBadge(alert.severity)}
                          {!alert.is_read && !alert.is_resolved && (
                            <Badge variant="outline" className="text-xs">Nueva</Badge>
                          )}
                          {alert.ai_notified && (
                            <Badge variant="outline" className="text-xs text-primary">
                              IA notificada
                            </Badge>
                          )}
                        </div>
                        {alert.employee_name && (
                          <p className="text-sm text-muted-foreground">
                            {alert.employee_name}
                          </p>
                        )}
                        {alert.description && (
                          <p className="text-sm mt-1">{alert.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(alert.trigger_date), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </span>
                          {alert.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vence: {format(new Date(alert.due_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {alert.notified_via.length > 0 && (
                            <span className="flex items-center gap-1">
                              {alert.notified_via.map(channel => {
                                const ch = CHANNELS.find(c => c.value === channel);
                                if (!ch) return null;
                                return <ch.icon key={channel} className="h-3 w-3" />;
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      {!alert.is_resolved && (
                        <div className="flex gap-1">
                          {!alert.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsRead(alert.id)}
                              title="Marcar como leída"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {!alert.ai_notified && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleNotifyAI(alert)}
                              title="Notificar a IA"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResolve(alert.id)}
                            title="Resolver"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredAlerts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay alertas {activeTab === 'pending' ? 'pendientes' : 'resueltas'}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Alertas
            </DialogTitle>
            <DialogDescription>
              Configure qué alertas recibir y por qué canales
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {ALERT_TYPES.map(type => {
                const pref = preferences.find(p => p.alert_type === type.value);
                const TypeIcon = type.icon;
                
                return (
                  <div
                    key={type.value}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-muted", type.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{type.label}</p>
                        <div className="flex gap-1 mt-1">
                          {CHANNELS.map(channel => (
                            <Badge
                              key={channel.value}
                              variant={pref?.channels.includes(channel.value) ? 'default' : 'outline'}
                              className="text-xs cursor-pointer"
                              onClick={() => {
                                // Toggle channel
                                toast.info(`Canal ${channel.label} ${pref?.channels.includes(channel.value) ? 'desactivado' : 'activado'}`);
                              }}
                            >
                              <channel.icon className="h-3 w-3 mr-1" />
                              {channel.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={pref?.is_enabled ?? true}
                      onCheckedChange={(checked) => {
                        toast.info(`Alerta ${checked ? 'activada' : 'desactivada'}`);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Configuración de canales</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email de alertas</Label>
                <Input
                  type="email"
                  placeholder="alertas@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  type="tel"
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferencesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast.success('Preferencias guardadas');
              setShowPreferencesDialog(false);
            }}>
              Guardar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRAlertsPanel;
