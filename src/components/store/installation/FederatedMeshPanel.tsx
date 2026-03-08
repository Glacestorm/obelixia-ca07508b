import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Network, RefreshCw, Play, Pause, AlertTriangle, CheckCircle2,
  GitMerge, Clock, Wifi, WifiOff, Activity, Plus, Settings2,
  ArrowLeftRight, Zap, Shield, XCircle
} from 'lucide-react';
import { useFederatedMesh, type MeshNode, type MeshConflict } from '@/hooks/admin/useFederatedMesh';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface FederatedMeshPanelProps {
  installationId?: string;
  className?: string;
}

const NODE_STATUS_CONFIG: Record<string, { color: string; icon: typeof Wifi; label: string }> = {
  connected: { color: 'text-green-400', icon: Wifi, label: 'Conectado' },
  disconnected: { color: 'text-red-400', icon: WifiOff, label: 'Desconectado' },
  syncing: { color: 'text-amber-400', icon: RefreshCw, label: 'Sincronizando' },
  error: { color: 'text-red-500', icon: XCircle, label: 'Error' },
};

const ROLE_COLORS: Record<string, string> = {
  primary: 'bg-blue-500/20 text-blue-400',
  replica: 'bg-green-500/20 text-green-400',
  observer: 'bg-slate-500/20 text-slate-400',
};

export function FederatedMeshPanel({ installationId, className }: FederatedMeshPanelProps) {
  const [activeTab, setActiveTab] = useState('nodes');
  const [createOpen, setCreateOpen] = useState(false);
  const [newFedName, setNewFedName] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [autoSyncActive, setAutoSyncActive] = useState(false);

  const {
    federations,
    activeFederation,
    nodes,
    syncLogs,
    pendingConflicts,
    isLoading,
    isSyncing,
    fetchFederations,
    fetchFederationStatus,
    createFederation,
    addNode,
    syncNodes,
    resolveConflict,
    startAutoSync,
    stopAutoSync,
  } = useFederatedMesh();

  // Auto-select first federation
  useEffect(() => {
    if (federations.length > 0 && !activeFederation) {
      fetchFederationStatus(federations[0].id);
    }
  }, [federations, activeFederation, fetchFederationStatus]);

  const handleCreateFederation = async () => {
    if (!newFedName.trim()) return;
    await createFederation({ federation_name: newFedName, description: `Federación multi-sede: ${newFedName}` });
    setNewFedName('');
    setCreateOpen(false);
  };

  const handleAddNode = async () => {
    if (!activeFederation || !newNodeName.trim()) return;
    await addNode(activeFederation.id, { node_name: newNodeName, node_role: 'replica' }, installationId);
    setNewNodeName('');
    setAddNodeOpen(false);
  };

  const handleSync = async () => {
    if (!activeFederation) return;
    await syncNodes(activeFederation.id);
  };

  const toggleAutoSync = () => {
    if (!activeFederation) return;
    if (autoSyncActive) {
      stopAutoSync();
      setAutoSyncActive(false);
    } else {
      startAutoSync(activeFederation.id, 90000);
      setAutoSyncActive(true);
    }
  };

  const connectedNodes = nodes.filter(n => n.connection_status === 'connected').length;
  const totalPending = nodes.reduce((sum, n) => sum + n.pending_operations, 0);
  const avgLatency = nodes.length > 0 ? Math.round(nodes.reduce((sum, n) => sum + n.sync_latency_ms, 0) / nodes.length) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Nodos', value: `${connectedNodes}/${nodes.length}`, icon: Network, color: 'text-blue-400' },
          { label: 'Syncs', value: activeFederation?.total_syncs || 0, icon: ArrowLeftRight, color: 'text-green-400' },
          { label: 'Conflictos', value: pendingConflicts.length, icon: AlertTriangle, color: pendingConflicts.length > 0 ? 'text-amber-400' : 'text-slate-400' },
          { label: 'Latencia', value: `${avgLatency}ms`, icon: Zap, color: 'text-purple-400' },
          { label: 'Pendientes', value: totalPending, icon: Clock, color: 'text-orange-400' },
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 flex items-center gap-2">
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Federation Selector + Actions */}
      <div className="flex items-center gap-2">
        <Select
          value={activeFederation?.id || ''}
          onValueChange={(id) => fetchFederationStatus(id)}
        >
          <SelectTrigger className="flex-1 bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="Seleccionar federación..." />
          </SelectTrigger>
          <SelectContent>
            {federations.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.federation_name} ({f.node_count} nodos)</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Federación</DialogTitle></DialogHeader>
            <Input placeholder="Nombre de la federación..." value={newFedName} onChange={e => setNewFedName(e.target.value)} />
            <Button onClick={handleCreateFederation} disabled={!newFedName.trim()}>Crear Federación</Button>
          </DialogContent>
        </Dialog>

        <Button size="sm" onClick={handleSync} disabled={isSyncing || !activeFederation} className="gap-1">
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          Sync
        </Button>

        <Button
          size="sm"
          variant={autoSyncActive ? "destructive" : "outline"}
          onClick={toggleAutoSync}
          disabled={!activeFederation}
          className="gap-1"
        >
          {autoSyncActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {autoSyncActive ? 'Stop' : 'Auto'}
        </Button>
      </div>

      {!activeFederation ? (
        <Card className="bg-slate-800/50 border-slate-700 border-dashed">
          <CardContent className="py-8 text-center">
            <Network className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Crea o selecciona una federación para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="nodes" className="text-xs gap-1"><Network className="h-3 w-3" /> Nodos</TabsTrigger>
            <TabsTrigger value="conflicts" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" /> Conflictos
              {pendingConflicts.length > 0 && (
                <Badge className="ml-1 bg-amber-500/20 text-amber-400 text-[9px] px-1">{pendingConflicts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sync-log" className="text-xs gap-1"><ArrowLeftRight className="h-3 w-3" /> Sync Log</TabsTrigger>
            <TabsTrigger value="config" className="text-xs gap-1"><Settings2 className="h-3 w-3" /> Config</TabsTrigger>
          </TabsList>

          {/* ==================== NODES TAB ==================== */}
          <TabsContent value="nodes" className="mt-0">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-muted-foreground">
                {activeFederation.last_sync_at
                  ? `Última sync: ${formatDistanceToNow(new Date(activeFederation.last_sync_at), { locale: es, addSuffix: true })}`
                  : 'Sin sincronizar aún'}
              </p>
              <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Nodo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Añadir Nodo</DialogTitle></DialogHeader>
                  <Input placeholder="Nombre del nodo (ej: Sede Barcelona)..." value={newNodeName} onChange={e => setNewNodeName(e.target.value)} />
                  <Button onClick={handleAddNode} disabled={!newNodeName.trim()}>Añadir Nodo</Button>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[380px]">
              <div className="space-y-2">
                {nodes.map(node => <NodeCard key={node.id} node={node} />)}
                {nodes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin nodos. Añade instalaciones a la federación.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== CONFLICTS TAB ==================== */}
          <TabsContent value="conflicts" className="mt-0">
            <ScrollArea className="h-[420px]">
              <div className="space-y-2">
                {pendingConflicts.map(conflict => (
                  <ConflictCard
                    key={conflict.id}
                    conflict={conflict}
                    onResolve={(strategy) => resolveConflict(conflict.id, { strategy, resolved_value: conflict.origin_value })}
                  />
                ))}
                {pendingConflicts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400/40" />
                    <p className="text-sm">Sin conflictos pendientes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== SYNC LOG TAB ==================== */}
          <TabsContent value="sync-log" className="mt-0">
            <ScrollArea className="h-[420px]">
              <div className="space-y-2">
                {syncLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                    <div className={cn("p-1.5 rounded-full", log.status === 'completed' ? 'bg-green-500/20' : 'bg-red-500/20')}>
                      {log.status === 'completed' ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        Sync {log.sync_type} — {log.records_synced} registros
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {log.conflicts_detected > 0 && `${log.conflicts_detected} conflictos (${log.conflicts_resolved} resueltos) • `}
                        {log.duration_ms}ms •{' '}
                        {formatDistanceToNow(new Date(log.started_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{log.sync_type}</Badge>
                  </div>
                ))}
                {syncLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin sincronizaciones registradas</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== CONFIG TAB ==================== */}
          <TabsContent value="config" className="mt-0">
            <ScrollArea className="h-[420px]">
              <div className="space-y-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GitMerge className="h-4 w-4 text-purple-400" />
                      Política de Resolución de Conflictos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { type: 'Datos Financieros', strategy: 'manual', desc: 'Requiere revisión humana siempre' },
                      { type: 'RRHH / Nóminas', strategy: 'lww', desc: 'Last-Write-Wins — la versión más reciente gana' },
                      { type: 'Inventario', strategy: 'merge', desc: 'Merge automático de cantidades' },
                      { type: 'Logs / Auditoría', strategy: 'merge', desc: 'Merge — se conservan todos los registros' },
                      { type: 'Configuración', strategy: 'manual', desc: 'Requiere aprobación de admin' },
                    ].map((rule, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                        <div>
                          <p className="text-xs font-medium text-foreground">{rule.type}</p>
                          <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
                        </div>
                        <Badge className={cn("text-[9px]",
                          rule.strategy === 'manual' ? 'bg-red-500/20 text-red-400' :
                          rule.strategy === 'lww' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        )}>
                          {rule.strategy.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      Vector Clocks (Ordenación Causal)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Cada nodo mantiene un reloj vectorial para garantizar ordenación causal de eventos y detectar conflictos de concurrencia.
                    </p>
                    <div className="space-y-1">
                      {nodes.map(node => (
                        <div key={node.id} className="flex items-center justify-between p-2 rounded bg-slate-900/30">
                          <span className="text-xs text-foreground">{node.node_name}</span>
                          <code className="text-[10px] text-muted-foreground font-mono">
                            {JSON.stringify(node.vector_clock || {}).substring(0, 40)}
                          </code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ==================== NODE CARD ====================
function NodeCard({ node }: { node: MeshNode }) {
  const statusCfg = NODE_STATUS_CONFIG[node.connection_status] || NODE_STATUS_CONFIG.disconnected;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
      <div className={cn("p-2 rounded-lg bg-slate-700/50")}>
        <StatusIcon className={cn("h-4 w-4", statusCfg.color, node.connection_status === 'syncing' && 'animate-spin')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">{node.node_name}</h4>
          <Badge className={cn("text-[9px] px-1 py-0", ROLE_COLORS[node.node_role] || ROLE_COLORS.replica)}>
            {node.node_role}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> {node.sync_latency_ms}ms
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {node.pending_operations} pendientes
          </span>
          {node.last_heartbeat && (
            <span>
              Heartbeat: {formatDistanceToNow(new Date(node.last_heartbeat), { locale: es, addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <Badge className={cn("text-[10px]",
        node.connection_status === 'connected' ? 'bg-green-500/20 text-green-400' :
        node.connection_status === 'syncing' ? 'bg-amber-500/20 text-amber-400' :
        'bg-red-500/20 text-red-400'
      )}>
        {statusCfg.label}
      </Badge>
    </div>
  );
}

// ==================== CONFLICT CARD ====================
function ConflictCard({ conflict, onResolve }: { conflict: MeshConflict; onResolve: (strategy: string) => void }) {
  const typeColors: Record<string, string> = {
    data_divergence: 'bg-amber-500/20 text-amber-400',
    schema_mismatch: 'bg-red-500/20 text-red-400',
    version_conflict: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="p-3 rounded-lg bg-slate-800/40 border border-amber-500/20">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <Badge className={cn("text-[9px]", typeColors[conflict.conflict_type] || typeColors.data_divergence)}>
              {conflict.conflict_type}
            </Badge>
            <Badge variant="outline" className="text-[9px]">{conflict.data_type}</Badge>
          </div>
          {conflict.table_name && (
            <p className="text-xs text-muted-foreground mt-1">
              Tabla: <code className="text-foreground">{conflict.table_name}</code>
              {conflict.record_id && <> • ID: <code className="text-foreground">{conflict.record_id.substring(0, 8)}...</code></>}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="p-2 rounded bg-blue-500/5 border border-blue-500/10">
          <p className="text-[10px] font-medium text-blue-400 mb-0.5">Origen</p>
          <p className="text-[10px] text-muted-foreground">{(conflict.origin_value as any)?.summary || 'N/A'}</p>
        </div>
        <div className="p-2 rounded bg-orange-500/5 border border-orange-500/10">
          <p className="text-[10px] font-medium text-orange-400 mb-0.5">Destino</p>
          <p className="text-[10px] text-muted-foreground">{(conflict.destination_value as any)?.summary || 'N/A'}</p>
        </div>
      </div>

      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => onResolve('lww')}>
          <Zap className="h-2.5 w-2.5" /> LWW
        </Button>
        <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => onResolve('merge')}>
          <GitMerge className="h-2.5 w-2.5" /> Merge
        </Button>
        <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => onResolve('origin')}>
          Usar Origen
        </Button>
        <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => onResolve('destination')}>
          Usar Destino
        </Button>
      </div>
    </div>
  );
}

export default FederatedMeshPanel;
