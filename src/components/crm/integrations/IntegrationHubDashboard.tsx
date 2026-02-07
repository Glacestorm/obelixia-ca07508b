/**
 * Integration Hub Dashboard
 * Fase 9: Panel principal de gestión de integraciones
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Webhook, 
  Key, 
  Plug, 
  Activity, 
  RefreshCw,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Send,
  Download,
  ArrowRightLeft,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { useCRMIntegrations, type CRMWebhook, type CRMAPIKey, type CRMConnector } from '@/hooks/crm/integrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { WebhooksPanel } from './WebhooksPanel';
import { APIKeysPanel } from './APIKeysPanel';
import { ConnectorsPanel } from './ConnectorsPanel';
import { EventsPanel } from './EventsPanel';

export function IntegrationHubDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    webhooks,
    apiKeys,
    connectors,
    events,
    stats,
    isLoading,
    fetchWebhooks,
    fetchApiKeys,
    fetchConnectors,
    fetchEvents,
    calculateStats
  } = useCRMIntegrations();

  const handleRefresh = async () => {
    await Promise.all([
      fetchWebhooks(),
      fetchApiKeys(),
      fetchConnectors(),
      fetchEvents(),
      calculateStats()
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />
            Integration Hub
          </h1>
          <p className="text-muted-foreground">
            Gestiona webhooks, API keys y conectores externos
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Webhooks</p>
                <p className="text-2xl font-bold">{stats?.activeWebhooks || 0}</p>
                <p className="text-xs text-muted-foreground">
                  de {stats?.totalWebhooks || 0} totales
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Webhook className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Keys</p>
                <p className="text-2xl font-bold">{stats?.activeApiKeys || 0}</p>
                <p className="text-xs text-muted-foreground">
                  de {stats?.totalApiKeys || 0} totales
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Key className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conectores</p>
                <p className="text-2xl font-bold">{stats?.connectedConnectors || 0}</p>
                <p className="text-xs text-muted-foreground">
                  de {stats?.totalConnectors || 0} conectados
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Plug className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                <p className="text-2xl font-bold">{stats?.successRate || 100}%</p>
                <Progress value={stats?.successRate || 100} className="mt-2 h-1" />
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="connectors" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Conectores</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Webhooks Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Actividad de Webhooks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {webhooks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay webhooks configurados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {webhooks.slice(0, 5).map((webhook) => (
                        <div
                          key={webhook.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              webhook.webhook_type === 'incoming' 
                                ? "bg-blue-500/10" 
                                : "bg-green-500/10"
                            )}>
                              {webhook.webhook_type === 'incoming' 
                                ? <Download className="h-4 w-4 text-blue-500" />
                                : <Send className="h-4 w-4 text-green-500" />
                              }
                            </div>
                            <div>
                              <p className="font-medium text-sm">{webhook.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {webhook.events.slice(0, 2).join(', ')}
                                {webhook.events.length > 2 && ` +${webhook.events.length - 2}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                              {webhook.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {webhook.success_count}/{webhook.success_count + webhook.failure_count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Connectors Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plug className="h-4 w-4" />
                  Estado de Conectores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {connectors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Plug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay conectores configurados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {connectors.map((connector) => (
                        <div
                          key={connector.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              connector.status === 'connected' && "bg-green-500/10",
                              connector.status === 'disconnected' && "bg-gray-500/10",
                              connector.status === 'error' && "bg-red-500/10",
                              connector.status === 'syncing' && "bg-blue-500/10"
                            )}>
                              {connector.status === 'connected' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {connector.status === 'disconnected' && <XCircle className="h-4 w-4 text-gray-500" />}
                              {connector.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                              {connector.status === 'syncing' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{connector.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {connector.connector_type}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={
                                connector.status === 'connected' ? 'default' :
                                connector.status === 'error' ? 'destructive' : 'secondary'
                              }
                            >
                              {connector.status === 'connected' && 'Conectado'}
                              {connector.status === 'disconnected' && 'Desconectado'}
                              {connector.status === 'error' && 'Error'}
                              {connector.status === 'syncing' && 'Sincronizando'}
                            </Badge>
                            {connector.last_sync_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(connector.last_sync_at), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('webhooks')}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Nuevo Webhook</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('api-keys')}
                >
                  <Key className="h-5 w-5" />
                  <span className="text-sm">Crear API Key</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('connectors')}
                >
                  <Plug className="h-5 w-5" />
                  <span className="text-sm">Añadir Conector</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('events')}
                >
                  <Activity className="h-5 w-5" />
                  <span className="text-sm">Ver Eventos</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <WebhooksPanel />
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <APIKeysPanel />
        </TabsContent>

        {/* Connectors Tab */}
        <TabsContent value="connectors">
          <ConnectorsPanel />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <EventsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntegrationHubDashboard;
