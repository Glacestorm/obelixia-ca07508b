/**
 * CustomerPortalDashboard
 * Dashboard principal del portal de clientes
 * Fase 12 - Enterprise SaaS 2025-2026
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  CreditCard,
  Settings,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Package,
  Bell,
  Search,
  Star,
} from 'lucide-react';
import { useCustomerPortal, type SupportTicket } from '@/hooks/admin/portals/useCustomerPortal';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const priorityConfig = {
  low: { color: 'bg-slate-500', label: 'Baja' },
  medium: { color: 'bg-blue-500', label: 'Media' },
  high: { color: 'bg-orange-500', label: 'Alta' },
  critical: { color: 'bg-red-500', label: 'Crítica' },
};

const statusConfig = {
  open: { color: 'bg-blue-500', label: 'Abierto', icon: AlertCircle },
  in_progress: { color: 'bg-purple-500', label: 'En Progreso', icon: Activity },
  waiting_customer: { color: 'bg-yellow-500', label: 'Esperando Respuesta', icon: Clock },
  waiting_partner: { color: 'bg-orange-500', label: 'Esperando Partner', icon: Clock },
  resolved: { color: 'bg-emerald-500', label: 'Resuelto', icon: CheckCircle },
  closed: { color: 'bg-slate-500', label: 'Cerrado', icon: CheckCircle },
};

export function CustomerPortalDashboard() {
  const {
    account,
    tickets,
    isLoading,
    createTicket,
    rateTicket,
    getUsageStats,
  } = useCustomerPortal();

  const [activeTab, setActiveTab] = useState('overview');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as SupportTicket['priority'],
    category: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const usageStats = getUsageStats();

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) return;
    
    await createTicket(newTicket);
    setNewTicket({
      subject: '',
      description: '',
      priority: 'medium',
      category: '',
    });
    setDialogOpen(false);
  };

  const openTickets = tickets.filter(t => ['open', 'in_progress', 'waiting_customer'].includes(t.status));
  const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));

  if (!account) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Portal de Cliente</h3>
          <p className="text-muted-foreground mb-4">
            No tienes una cuenta de cliente asociada.
          </p>
          <Button>Contactar Ventas</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{account.company_name}</h1>
            <Badge variant={account.subscription_status === 'active' ? 'default' : 'destructive'}>
              {account.subscription_tier} - {account.subscription_status === 'active' ? 'Activo' : account.subscription_status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Módulos: {account.modules_enabled?.length || 0} activos · 
            Health Score: {account.health_score}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Ticket de Soporte</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Asunto *</label>
                  <Input
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Describe brevemente el problema"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Prioridad</label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as SupportTicket['priority'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <div className={cn('w-2 h-2 rounded-full', config.color)} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoría</label>
                    <Select
                      value={newTicket.category}
                      onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="billing">Facturación</SelectItem>
                        <SelectItem value="technical">Técnico</SelectItem>
                        <SelectItem value="integration">Integración</SelectItem>
                        <SelectItem value="feature_request">Nueva Funcionalidad</SelectItem>
                        <SelectItem value="training">Formación</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción *</label>
                  <Textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el problema en detalle..."
                    rows={5}
                  />
                </div>
                <Button onClick={handleCreateTicket} className="w-full">
                  Crear Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Ticket className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{openTickets.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Tickets Abiertos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{resolvedTickets.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Resueltos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{account.modules_enabled?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Módulos Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{account.health_score}%</span>
            </div>
            <p className="text-sm text-muted-foreground">Health Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Ayuda
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Ajustes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso de Recursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {usageStats && Object.entries(usageStats.usagePercentages).map(([key, percentage]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className={cn(
                        'font-medium',
                        percentage > 80 ? 'text-red-500' : percentage > 60 ? 'text-yellow-500' : 'text-emerald-500'
                      )}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={cn(
                        'h-2',
                        percentage > 80 ? '[&>div]:bg-red-500' : percentage > 60 ? '[&>div]:bg-yellow-500' : ''
                      )} 
                    />
                  </div>
                ))}
                {(!usageStats || Object.keys(usageStats.usagePercentages).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay datos de uso disponibles
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {tickets.slice(0, 5).map((ticket) => {
                      const statusInfo = statusConfig[ticket.status];
                      const priorityInfo = priorityConfig[ticket.priority];
                      return (
                        <div key={ticket.id} className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <statusInfo.icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{ticket.ticket_number}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm truncate mb-1">{ticket.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className={cn('w-2 h-2 rounded-full', priorityInfo.color)} />
                            <span>{priorityInfo.label}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true })}</span>
                          </div>
                        </div>
                      );
                    })}
                    {tickets.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No tienes tickets</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Modules */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Módulos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {account.modules_enabled?.map((module) => (
                    <Badge key={module} variant="secondary" className="px-3 py-1">
                      <Package className="h-3 w-3 mr-1" />
                      {module}
                    </Badge>
                  ))}
                  {(!account.modules_enabled || account.modules_enabled.length === 0) && (
                    <p className="text-sm text-muted-foreground">No hay módulos activos</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Mis Tickets</CardTitle>
                  <CardDescription>Gestiona tus solicitudes de soporte</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {tickets
                    .filter(t => 
                      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((ticket) => {
                      const statusInfo = statusConfig[ticket.status];
                      const priorityInfo = priorityConfig[ticket.priority];
                      return (
                        <div key={ticket.id} className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                                <Badge className={cn(priorityInfo.color, 'text-white text-xs')}>
                                  {priorityInfo.label}
                                </Badge>
                              </div>
                              <h4 className="font-medium">{ticket.subject}</h4>
                            </div>
                            <Badge className={cn(statusInfo.color, 'text-white')}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {ticket.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span>Creado: {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                              {ticket.category && <span>Categoría: {ticket.category}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {ticket.status === 'resolved' && !ticket.satisfaction_rating && (
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <Star className="h-4 w-4" />
                                  Valorar
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="gap-1">
                                <MessageSquare className="h-4 w-4" />
                                Ver
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Base de Conocimiento</h3>
              <p className="text-muted-foreground mb-4">
                Encuentra respuestas a preguntas frecuentes y guías de uso
              </p>
              <div className="relative max-w-md mx-auto mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar artículos..." className="pl-9" />
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline">Ver Categorías</Button>
                <Button>Artículos Populares</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Facturación</h3>
              <p className="text-muted-foreground mb-4">
                Gestiona tu suscripción y métodos de pago
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline">Ver Facturas</Button>
                <Button>Gestionar Suscripción</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Configuración</h3>
              <p className="text-muted-foreground mb-4">
                Personaliza tu experiencia en el portal
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline">Notificaciones</Button>
                <Button>Preferencias</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CustomerPortalDashboard;
