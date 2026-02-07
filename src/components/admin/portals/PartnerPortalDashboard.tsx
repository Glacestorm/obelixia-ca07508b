/**
 * PartnerPortalDashboard
 * Dashboard principal del portal de partners
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
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Plus,
  FileText,
  BookOpen,
  Headphones,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { usePartnerPortal } from '@/hooks/admin/portals/usePartnerPortal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const tierConfig = {
  bronze: { color: 'bg-amber-600', label: 'Bronze', icon: '🥉' },
  silver: { color: 'bg-slate-400', label: 'Silver', icon: '🥈' },
  gold: { color: 'bg-yellow-500', label: 'Gold', icon: '🥇' },
  platinum: { color: 'bg-purple-500', label: 'Platinum', icon: '💎' },
  strategic: { color: 'bg-emerald-500', label: 'Strategic', icon: '🌟' },
};

const statusConfig = {
  pending: { color: 'bg-slate-500', label: 'Pendiente', icon: Clock },
  contacted: { color: 'bg-blue-500', label: 'Contactado', icon: Users },
  demo_scheduled: { color: 'bg-purple-500', label: 'Demo Programada', icon: FileText },
  negotiating: { color: 'bg-yellow-500', label: 'Negociando', icon: TrendingUp },
  won: { color: 'bg-emerald-500', label: 'Ganado', icon: CheckCircle },
  lost: { color: 'bg-red-500', label: 'Perdido', icon: XCircle },
};

export function PartnerPortalDashboard() {
  const {
    account,
    referredClients,
    isLoading,
    createReferral,
    updateReferralStatus,
    getStats,
  } = usePartnerPortal();

  const [activeTab, setActiveTab] = useState('overview');
  const [newReferral, setNewReferral] = useState({
    client_company_name: '',
    client_email: '',
    client_contact_name: '',
    client_phone: '',
    notes: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const stats = getStats();
  const tier = account?.tier || 'bronze';
  const tierInfo = tierConfig[tier];

  const handleCreateReferral = async () => {
    if (!newReferral.client_company_name || !newReferral.client_email) return;
    
    await createReferral(newReferral);
    setNewReferral({
      client_company_name: '',
      client_email: '',
      client_contact_name: '',
      client_phone: '',
      notes: '',
    });
    setDialogOpen(false);
  };

  if (!account) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Portal de Partners</h3>
          <p className="text-muted-foreground mb-4">
            No tienes una cuenta de partner asociada.
          </p>
          <Button>Solicitar acceso como Partner</Button>
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
            <h1 className="text-2xl font-bold">{account.partner_name}</h1>
            <Badge className={cn(tierInfo.color, 'text-white')}>
              {tierInfo.icon} {tierInfo.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Comisión: {account.commission_rate}% · {account.specializations?.join(', ') || 'Sin especialización'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Referido
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Cliente Referido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Empresa *</label>
                <Input
                  value={newReferral.client_company_name}
                  onChange={(e) => setNewReferral(prev => ({ ...prev, client_company_name: e.target.value }))}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={newReferral.client_email}
                  onChange={(e) => setNewReferral(prev => ({ ...prev, client_email: e.target.value }))}
                  placeholder="contacto@empresa.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Persona de contacto</label>
                <Input
                  value={newReferral.client_contact_name}
                  onChange={(e) => setNewReferral(prev => ({ ...prev, client_contact_name: e.target.value }))}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={newReferral.client_phone}
                  onChange={(e) => setNewReferral(prev => ({ ...prev, client_phone: e.target.value }))}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notas</label>
                <Textarea
                  value={newReferral.notes}
                  onChange={(e) => setNewReferral(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Información adicional..."
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateReferral} className="w-full">
                Registrar Referido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalReferrals}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Referidos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.wonDeals}</span>
            </div>
            <p className="text-sm text-muted-foreground">Deals Cerrados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">
                {stats.totalCommissions.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Comisiones Totales</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Users className="h-4 w-4" />
            Referidos
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Recursos
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <Headphones className="h-4 w-4" />
            Soporte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline de Referidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = referredClients.filter(c => c.status === key).length;
                  const percentage = stats.totalReferrals > 0 ? (count / stats.totalReferrals) * 100 : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {referredClients.slice(0, 5).map((client) => {
                      const statusInfo = statusConfig[client.status];
                      return (
                        <div key={client.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <div className={cn('w-2 h-2 rounded-full', statusInfo.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.client_company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(client.referral_date), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Commissions */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Comisiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-emerald-500/10">
                    <p className="text-2xl font-bold text-emerald-600">
                      {stats.paidCommissions.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-sm text-muted-foreground">Pagadas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.pendingCommissions.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-500/10">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-sm text-muted-foreground">Revenue Generado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clientes Referidos</CardTitle>
              <CardDescription>Gestiona tus referidos y su estado en el pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {referredClients.map((client) => {
                    const statusInfo = statusConfig[client.status];
                    return (
                      <div key={client.id} className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{client.client_company_name}</h4>
                            <p className="text-sm text-muted-foreground">{client.client_email}</p>
                          </div>
                          <Badge className={cn(statusInfo.color, 'text-white')}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Contacto: {client.client_contact_name || 'N/A'}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(client.referral_date), { locale: es, addSuffix: true })}</span>
                          {client.deal_value && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">
                                {client.deal_value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </>
                          )}
                        </div>
                        {client.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">"{client.notes}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'Catálogo de Productos', icon: FileText, desc: 'Documentación comercial' },
              { title: 'Material de Ventas', icon: TrendingUp, desc: 'Presentaciones y demos' },
              { title: 'Guías Técnicas', icon: BookOpen, desc: 'Documentación de integración' },
              { title: 'Casos de Éxito', icon: Award, desc: 'Testimonios de clientes' },
              { title: 'Formación', icon: Sparkles, desc: 'Cursos y certificaciones' },
              { title: 'API Docs', icon: FileText, desc: 'Documentación técnica' },
            ].map((resource) => (
              <Card key={resource.title} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <resource.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{resource.title}</h4>
                      <p className="text-sm text-muted-foreground">{resource.desc}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full gap-2">
                    Acceder <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Headphones className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Centro de Soporte Partner</h3>
              <p className="text-muted-foreground mb-4">
                Accede a soporte prioritario como partner de ObelixIA
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline">Base de Conocimiento</Button>
                <Button>Crear Ticket</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PartnerPortalDashboard;
