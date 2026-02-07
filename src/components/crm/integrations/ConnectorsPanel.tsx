/**
 * Connectors Management Panel
 * Fase 9: Gestión de conectores externos (Slack, Teams, Email, etc.)
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plug, 
  Plus, 
  RefreshCw,
  Power,
  PowerOff,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  Mail,
  Zap,
  Globe
} from 'lucide-react';
import { useCRMIntegrations, type CRMConnector } from '@/hooks/crm/integrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const CONNECTOR_TYPES = [
  { 
    value: 'slack', 
    label: 'Slack', 
    icon: MessageSquare,
    description: 'Notificaciones y comandos en Slack',
    color: 'bg-[#4A154B]'
  },
  { 
    value: 'teams', 
    label: 'Microsoft Teams', 
    icon: MessageSquare,
    description: 'Integración con Microsoft Teams',
    color: 'bg-[#5558AF]'
  },
  { 
    value: 'email', 
    label: 'Email SMTP', 
    icon: Mail,
    description: 'Envío de emails vía SMTP',
    color: 'bg-blue-500'
  },
  { 
    value: 'zapier', 
    label: 'Zapier', 
    icon: Zap,
    description: 'Automatizaciones con Zapier',
    color: 'bg-orange-500'
  },
  { 
    value: 'custom', 
    label: 'Custom API', 
    icon: Globe,
    description: 'API personalizada',
    color: 'bg-gray-500'
  }
];

export function ConnectorsPanel() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    connector_type: '',
    name: '',
    description: '',
    config: {} as Record<string, string>
  });

  const {
    connectors,
    syncHistory,
    isLoading,
    createConnector,
    toggleConnector,
    syncConnector,
    fetchSyncHistory
  } = useCRMIntegrations();

  const handleCreate = async () => {
    if (!formData.connector_type || !formData.name) {
      toast.error('Tipo y nombre son requeridos');
      return;
    }

    const result = await createConnector({
      connector_type: formData.connector_type,
      name: formData.name,
      description: formData.description,
      config: formData.config,
      credentials: {}
    });

    if (result) {
      setIsCreateDialogOpen(false);
      setFormData({
        connector_type: '',
        name: '',
        description: '',
        config: {}
      });
    }
  };

  const getConnectorIcon = (type: string) => {
    const connectorType = CONNECTOR_TYPES.find(t => t.value === type);
    if (connectorType) {
      const Icon = connectorType.icon;
      return <Icon className="h-5 w-5 text-white" />;
    }
    return <Plug className="h-5 w-5 text-white" />;
  };

  const getConnectorColor = (type: string) => {
    return CONNECTOR_TYPES.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const getStatusIcon = (status: CRMConnector['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conectores</h2>
          <p className="text-sm text-muted-foreground">
            Conecta con servicios externos como Slack, Teams y más
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Conector
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Añadir Conector</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Conector</Label>
                <Select
                  value={formData.connector_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, connector_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1 rounded", type.color)}>
                            <type.icon className="h-3 w-3 text-white" />
                          </div>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Mi Conector Slack"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Descripción opcional..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Dynamic config fields based on connector type */}
              {formData.connector_type === 'slack' && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      config: { ...prev.config, webhook_url: e.target.value }
                    }))}
                  />
                </div>
              )}

              {formData.connector_type === 'email' && (
                <>
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      placeholder="smtp.ejemplo.com"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, smtp_host: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Puerto</Label>
                      <Input
                        placeholder="587"
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, smtp_port: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Usuario</Label>
                      <Input
                        placeholder="usuario@ejemplo.com"
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          config: { ...prev.config, smtp_user: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.connector_type === 'zapier' && (
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Tu API Key de Zapier"
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      config: { ...prev.config, api_key: e.target.value }
                    }))}
                  />
                </div>
              )}

              {formData.connector_type === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input
                      placeholder="https://api.ejemplo.com"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, base_url: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key (opcional)</Label>
                    <Input
                      type="password"
                      placeholder="Tu API Key"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        config: { ...prev.config, api_key: e.target.value }
                      }))}
                    />
                  </div>
                </>
              )}

              <Button onClick={handleCreate} className="w-full" disabled={isLoading}>
                Crear Conector
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Connector Types */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CONNECTOR_TYPES.map((type) => {
          const existingConnectors = connectors.filter(c => c.connector_type === type.value);
          const connectedCount = existingConnectors.filter(c => c.status === 'connected').length;
          
          return (
            <Card 
              key={type.value} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setFormData(prev => ({ ...prev, connector_type: type.value }));
                setIsCreateDialogOpen(true);
              }}
            >
              <CardContent className="pt-4 text-center">
                <div className={cn("w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center", type.color)}>
                  <type.icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-medium text-sm">{type.label}</p>
                {existingConnectors.length > 0 && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {connectedCount}/{existingConnectors.length}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connectors List */}
      <div className="grid gap-4">
        {connectors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Plug className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No hay conectores</h3>
              <p className="text-sm text-muted-foreground">
                Añade tu primer conector para sincronizar con servicios externos
              </p>
            </CardContent>
          </Card>
        ) : (
          connectors.map((connector) => (
            <Card key={connector.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      getConnectorColor(connector.connector_type)
                    )}>
                      {getConnectorIcon(connector.connector_type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{connector.name}</h3>
                        {getStatusIcon(connector.status)}
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
                      </div>
                      {connector.description && (
                        <p className="text-sm text-muted-foreground">
                          {connector.description}
                        </p>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {connector.connector_type}
                      </Badge>
                      {connector.last_error && (
                        <p className="text-xs text-red-500 mt-1">
                          {connector.last_error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connector.last_sync_at && (
                      <div className="text-right text-sm mr-4">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Última sync: {formatDistanceToNow(new Date(connector.last_sync_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    )}

                    {connector.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncConnector(connector.id)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                        Sync
                      </Button>
                    )}

                    <Button
                      variant={connector.status === 'connected' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleConnector(connector.id, connector.status !== 'connected')}
                      disabled={isLoading}
                    >
                      {connector.status === 'connected' ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-1" />
                          Desconectar
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-1" />
                          Conectar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default ConnectorsPanel;
