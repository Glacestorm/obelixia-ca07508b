/**
 * PremiumAPIWebhooksPanel - Panel central de Premium API & Webhooks
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Globe, Webhook, FileText, Activity, BookOpen,
  Plus, Trash2, RefreshCw, Play, Copy, Key, Shield,
  CheckCircle, XCircle, Clock, AlertTriangle, Eye,
  Send, RotateCcw, ExternalLink, Code, Zap
} from 'lucide-react';
import { useHRPremiumAPI, type WebhookSubscription, type EventCatalogItem } from '@/hooks/admin/hr/useHRPremiumAPI';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  companyId: string;
}

const API_ENDPOINTS = [
  { method: 'GET', path: 'get_report_templates', description: 'Listar plantillas de reportes', scope: 'read:reports' },
  { method: 'GET', path: 'get_generated_reports', description: 'Listar reportes generados', scope: 'read:reports' },
  { method: 'GET', path: 'get_report_schedules', description: 'Listar reportes programados', scope: 'read:reports' },
  { method: 'GET', path: 'list_api_clients', description: 'Listar clientes API', scope: 'admin:api' },
  { method: 'POST', path: 'create_api_client', description: 'Crear cliente API', scope: 'admin:api' },
  { method: 'GET', path: 'list_webhooks', description: 'Listar webhooks', scope: 'admin:webhooks' },
  { method: 'POST', path: 'create_webhook', description: 'Crear webhook', scope: 'admin:webhooks' },
  { method: 'GET', path: 'list_events', description: 'Catálogo de eventos', scope: 'read:events' },
  { method: 'GET', path: 'list_access_logs', description: 'Logs de acceso', scope: 'admin:logs' },
  { method: 'GET', path: 'list_deliveries', description: 'Logs de entregas webhook', scope: 'admin:webhooks' },
];

const AVAILABLE_SCOPES = [
  'read:reports', 'read:events', 'admin:api', 'admin:webhooks', 'admin:logs',
  'read:fairness', 'read:workforce', 'read:legal', 'read:compliance',
];

export function PremiumAPIWebhooksPanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('endpoints');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDesc, setNewClientDesc] = useState('');
  const [newClientScopes, setNewClientScopes] = useState<string[]>(['read:reports']);
  const [newWhName, setNewWhName] = useState('');
  const [newWhUrl, setNewWhUrl] = useState('');
  const [newWhEvents, setNewWhEvents] = useState<string[]>([]);
  const [selectedDeliveryWebhook, setSelectedDeliveryWebhook] = useState<string | undefined>();

  const {
    clients, webhooks, deliveries, events, accessLogs, isLoading,
    fetchClients, createClient, revokeClient,
    fetchWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook,
    fetchDeliveries, retryDelivery,
    fetchEvents, fetchAccessLogs,
  } = useHRPremiumAPI(companyId);

  useEffect(() => {
    if (companyId) {
      fetchClients();
      fetchWebhooks();
      fetchEvents();
    }
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAccessLogs();
      fetchDeliveries(selectedDeliveryWebhook);
    }
  }, [activeTab, selectedDeliveryWebhook]);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    await createClient({ name: newClientName, description: newClientDesc, scopes: newClientScopes });
    setShowCreateClient(false);
    setNewClientName('');
    setNewClientDesc('');
    setNewClientScopes(['read:reports']);
  };

  const handleCreateWebhook = async () => {
    if (!newWhName.trim() || !newWhUrl.trim() || !newWhEvents.length) return;
    await createWebhook({ name: newWhName, url: newWhUrl, events: newWhEvents });
    setShowCreateWebhook(false);
    setNewWhName('');
    setNewWhUrl('');
    setNewWhEvents([]);
  };

  const toggleScope = (scope: string) => {
    setNewClientScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const toggleEvent = (ev: string) => {
    setNewWhEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
      success: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      retrying: { variant: 'outline', icon: <RotateCcw className="h-3 w-3" /> },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant} className="gap-1 text-[10px]">{s.icon}{status}</Badge>;
  };

  const groupedEvents = events.reduce<Record<string, EventCatalogItem[]>>((acc, ev) => {
    (acc[ev.category] = acc[ev.category] || []).push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Premium API & Webhooks</h2>
          <p className="text-sm text-muted-foreground">Integración enterprise para HR Premium Suite</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline" className="gap-1"><Key className="h-3 w-3" />{clients.length} Clients</Badge>
          <Badge variant="outline" className="gap-1"><Webhook className="h-3 w-3" />{webhooks.length} Webhooks</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="endpoints" className="gap-1 text-xs"><Globe className="h-3.5 w-3.5" />API</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1 text-xs"><Webhook className="h-3.5 w-3.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1 text-xs"><Activity className="h-3.5 w-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="events" className="gap-1 text-xs"><Zap className="h-3.5 w-3.5" />Eventos</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1 text-xs"><BookOpen className="h-3.5 w-3.5" />Docs</TabsTrigger>
        </TabsList>

        {/* === ENDPOINTS / API CLIENTS === */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">API Clients</CardTitle>
                  <CardDescription>Gestiona clientes externos con acceso a la API</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowCreateClient(!showCreateClient)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />Nuevo Client
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showCreateClient && (
                <div className="p-4 rounded-lg border bg-muted/30 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="BI System" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Descripción</Label>
                      <Input value={newClientDesc} onChange={e => setNewClientDesc(e.target.value)} placeholder="Opcional" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Scopes</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_SCOPES.map(scope => (
                        <Badge
                          key={scope}
                          variant={newClientScopes.includes(scope) ? 'default' : 'outline'}
                          className="cursor-pointer text-[10px]"
                          onClick={() => toggleScope(scope)}
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" onClick={handleCreateClient} disabled={!newClientName.trim()}>Crear Client</Button>
                </div>
              )}

              <div className="space-y-2">
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No hay API clients configurados</p>
                ) : clients.map(client => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{client.name}</span>
                        <Badge variant={client.is_active ? 'default' : 'destructive'} className="text-[9px]">
                          {client.is_active ? 'Activo' : 'Revocado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <code className="bg-muted px-1.5 py-0.5 rounded">{client.api_key_prefix}...</code>
                        <span>•</span>
                        <span>{client.scopes?.join(', ')}</span>
                      </div>
                    </div>
                    {client.is_active && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => revokeClient(client.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Endpoints Disponibles</CardTitle>
              <CardDescription>Catálogo de endpoints de la Premium API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {API_ENDPOINTS.map(ep => (
                  <div key={ep.path} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card text-sm">
                    <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'} className="text-[10px] w-12 justify-center">{ep.method}</Badge>
                    <code className="text-xs font-mono flex-1">{ep.path}</code>
                    <span className="text-xs text-muted-foreground hidden sm:block">{ep.description}</span>
                    <Badge variant="outline" className="text-[9px]">{ep.scope}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === WEBHOOKS === */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Webhook Subscriptions</CardTitle>
                  <CardDescription>Recibe eventos en tiempo real en tus sistemas</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fetchWebhooks()} className="gap-1">
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateWebhook(!showCreateWebhook)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />Nuevo Webhook
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showCreateWebhook && (
                <div className="p-4 rounded-lg border bg-muted/30 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input value={newWhName} onChange={e => setNewWhName(e.target.value)} placeholder="My Webhook" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">URL endpoint</Label>
                      <Input value={newWhUrl} onChange={e => setNewWhUrl(e.target.value)} placeholder="https://api.example.com/webhook" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Eventos</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {events.map(ev => (
                        <Badge
                          key={ev.event_type}
                          variant={newWhEvents.includes(ev.event_type) ? 'default' : 'outline'}
                          className="cursor-pointer text-[10px]"
                          onClick={() => toggleEvent(ev.event_type)}
                        >
                          {ev.event_type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" onClick={handleCreateWebhook} disabled={!newWhName.trim() || !newWhUrl.trim() || !newWhEvents.length}>
                    Crear Webhook
                  </Button>
                </div>
              )}

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {webhooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No hay webhooks configurados</p>
                  ) : webhooks.map(wh => (
                    <div key={wh.id} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm flex-1">{wh.name}</span>
                        <Switch
                          checked={wh.is_active}
                          onCheckedChange={(v) => updateWebhook(wh.id, { is_active: v } as any)}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        <code className="truncate max-w-[300px]">{wh.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {wh.events?.map(ev => (
                          <Badge key={ev} variant="outline" className="text-[9px]">{ev}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="text-green-600">✓ {wh.success_count}</span>
                        <span className="text-destructive">✗ {wh.failure_count}</span>
                        {wh.last_triggered_at && (
                          <span>Último: {formatDistanceToNow(new Date(wh.last_triggered_at), { locale: es, addSuffix: true })}</span>
                        )}
                        <div className="ml-auto flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => testWebhook(wh.id)}>
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteWebhook(wh.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === LOGS === */}
        <TabsContent value="logs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" />Webhook Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1.5">
                    {deliveries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sin entregas registradas</p>
                    ) : deliveries.map(d => (
                      <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
                        {statusBadge(d.status)}
                        <code className="flex-1 truncate">{d.event_type}</code>
                        <span className="text-muted-foreground">{d.response_status || '-'}</span>
                        <span className="text-muted-foreground">{d.response_time_ms ? `${d.response_time_ms}ms` : '-'}</span>
                        {d.status === 'failed' && (
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => retryDelivery(d.id)}>
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />API Access Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1.5">
                    {accessLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sin registros de acceso</p>
                    ) : accessLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
                        <Badge variant="secondary" className="text-[9px] w-10 justify-center">{log.method}</Badge>
                        <code className="flex-1 truncate">{log.endpoint}</code>
                        <Badge variant={log.status_code === 200 ? 'default' : 'destructive'} className="text-[9px]">
                          {log.status_code}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === EVENTS CATALOG === */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Catálogo de Eventos</CardTitle>
              <CardDescription>Todos los eventos disponibles para suscripción via webhook</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(groupedEvents).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold capitalize mb-2 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" />{category}
                    </h4>
                    <div className="space-y-1.5">
                      {items.map(ev => (
                        <div key={ev.event_type} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs font-mono font-semibold text-primary">{ev.event_type}</code>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{ev.description}</p>
                          <details className="text-[11px]">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver payload de ejemplo
                            </summary>
                            <pre className="mt-1.5 p-2 rounded bg-muted text-[10px] overflow-x-auto">
                              {JSON.stringify(ev.example_payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === DOCS === */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />Guía de Integración
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-bold mb-2">1. Autenticación</h3>
                  <p className="text-xs text-muted-foreground">Todas las llamadas requieren un Bearer token válido en el header Authorization.</p>
                  <pre className="p-3 rounded-lg bg-muted text-[11px] overflow-x-auto">{`curl -X POST \\
  https://<project>.supabase.co/functions/v1/hr-premium-api \\
  -H "Authorization: Bearer <YOUR_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "list_webhooks", "params": {"company_id": "<UUID>"}}'`}</pre>
                </section>

                <section>
                  <h3 className="text-sm font-bold mb-2">2. Verificar Firma de Webhook</h3>
                  <p className="text-xs text-muted-foreground">Los payloads se firman con HMAC-SHA256. Verifica el header <code>X-Webhook-Signature</code>.</p>
                  <pre className="p-3 rounded-lg bg-muted text-[11px] overflow-x-auto">{`// Node.js example
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
                </section>

                <section>
                  <h3 className="text-sm font-bold mb-2">3. Reintentos</h3>
                  <p className="text-xs text-muted-foreground">
                    Si la entrega falla (status ≥ 400 o timeout), se reintenta automáticamente según la política configurada
                    (por defecto: 3 reintentos con backoff exponencial desde 1s).
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold mb-2">4. Scopes</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SCOPES.map(scope => (
                      <div key={scope} className="flex items-center gap-2 p-2 rounded border text-xs">
                        <Shield className="h-3 w-3 text-primary" />
                        <code>{scope}</code>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold mb-2">5. Rate Limiting</h3>
                  <p className="text-xs text-muted-foreground">
                    Cada API Client tiene un límite configurable (default: 60 req/min).
                    Las respuestas incluyen headers <code>X-RateLimit-Remaining</code>.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold mb-2">6. Errores</h3>
                  <pre className="p-3 rounded-lg bg-muted text-[11px] overflow-x-auto">{`// Error response format
{
  "success": false,
  "error": "Description of what went wrong",
  "code": "UNAUTHORIZED | NOT_FOUND | RATE_LIMITED | INTERNAL"
}`}</pre>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PremiumAPIWebhooksPanel;
