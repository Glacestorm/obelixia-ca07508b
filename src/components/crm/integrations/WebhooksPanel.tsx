/**
 * Webhooks Management Panel
 * Fase 9: Gestión de webhooks entrantes y salientes
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Webhook, 
  Plus, 
  MoreVertical, 
  Send, 
  Download,
  Play,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useCRMIntegrations, type CRMWebhook } from '@/hooks/crm/integrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const WEBHOOK_EVENTS = [
  { value: 'lead.created', label: 'Lead Creado' },
  { value: 'lead.updated', label: 'Lead Actualizado' },
  { value: 'lead.converted', label: 'Lead Convertido' },
  { value: 'deal.created', label: 'Oportunidad Creada' },
  { value: 'deal.won', label: 'Oportunidad Ganada' },
  { value: 'deal.lost', label: 'Oportunidad Perdida' },
  { value: 'deal.stage_changed', label: 'Etapa Cambiada' },
  { value: 'contact.created', label: 'Contacto Creado' },
  { value: 'contact.updated', label: 'Contacto Actualizado' },
  { value: 'activity.completed', label: 'Actividad Completada' },
  { value: 'task.created', label: 'Tarea Creada' },
  { value: 'task.completed', label: 'Tarea Completada' }
];

export function WebhooksPanel() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhook_type: 'outgoing' as 'incoming' | 'outgoing',
    url: '',
    events: [] as string[]
  });

  const {
    webhooks,
    isLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook
  } = useCRMIntegrations();

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('El nombre es requerido');
      return;
    }

    if (formData.webhook_type === 'outgoing' && !formData.url) {
      toast.error('La URL es requerida para webhooks salientes');
      return;
    }

    const result = await createWebhook({
      ...formData,
      events: selectedEvents
    });

    if (result) {
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        webhook_type: 'outgoing',
        url: '',
        events: []
      });
      setSelectedEvents([]);
    }
  };

  const handleToggleEvent = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) 
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copiado al portapapeles');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Configura webhooks para recibir o enviar eventos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Mi Webhook"
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

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.webhook_type}
                  onValueChange={(value: 'incoming' | 'outgoing') => 
                    setFormData(prev => ({ ...prev, webhook_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outgoing">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Saliente (Enviar eventos)
                      </div>
                    </SelectItem>
                    <SelectItem value="incoming">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Entrante (Recibir datos)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.webhook_type === 'outgoing' && (
                <div className="space-y-2">
                  <Label>URL de Destino</Label>
                  <Input
                    placeholder="https://api.ejemplo.com/webhook"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Eventos</Label>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {WEBHOOK_EVENTS.map((event) => (
                      <div
                        key={event.value}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors",
                          selectedEvents.includes(event.value)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        )}
                        onClick={() => handleToggleEvent(event.value)}
                      >
                        <span className="text-sm">{event.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedEvents.length} evento(s) seleccionado(s)
                </p>
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={isLoading}>
                Crear Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No hay webhooks</h3>
              <p className="text-sm text-muted-foreground">
                Crea tu primer webhook para integrar con sistemas externos
              </p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      webhook.webhook_type === 'incoming' 
                        ? "bg-blue-500/10" 
                        : "bg-green-500/10"
                    )}>
                      {webhook.webhook_type === 'incoming' 
                        ? <Download className="h-5 w-5 text-blue-500" />
                        : <Send className="h-5 w-5 text-green-500" />
                      }
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{webhook.name}</h3>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-muted-foreground">
                          {webhook.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 3}
                          </Badge>
                        )}
                      </div>
                      {webhook.webhook_type === 'incoming' && webhook.secret_key && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {webhook.secret_key.substring(0, 12)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopySecret(webhook.secret_key!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {webhook.success_count}
                      </div>
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {webhook.failure_count}
                      </div>
                      {webhook.last_triggered_at && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(webhook.last_triggered_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => testWebhook(webhook.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Probar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateWebhook(webhook.id, { is_active: !webhook.is_active })}
                        >
                          {webhook.is_active ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default WebhooksPanel;
