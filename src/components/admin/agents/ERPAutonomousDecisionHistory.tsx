/**
 * ERPAutonomousDecisionHistory - Historial de decisiones autónomas de agentes ERP
 * Incluye búsqueda, filtros y exportación
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Zap,
  Target,
  RotateCcw,
  FileJson,
  FileSpreadsheet,
  Copy,
  Eye,
  Calendar,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format as formatDate, formatDistanceToNow, subDays, subHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { AgentDomain, ModuleAgentType } from '@/hooks/admin/agents/erpAgentTypes';
import { DOMAIN_CONFIG, MODULE_AGENT_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';

// === TIPOS ===

type DecisionStatus = 'executed' | 'pending_approval' | 'rejected' | 'reverted' | 'failed';
type DecisionType = 'optimization' | 'prevention' | 'automation' | 'recommendation' | 'escalation';

interface AutonomousDecision {
  id: string;
  domain: AgentDomain;
  agentType: ModuleAgentType;
  agentName: string;
  type: DecisionType;
  status: DecisionStatus;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  impact: {
    type: 'positive' | 'negative' | 'neutral';
    value?: number;
    metric?: string;
  };
  context: Record<string, unknown>;
  actions: Array<{
    action: string;
    target: string;
    result?: string;
  }>;
  createdAt: string;
  executedAt?: string;
  executedBy?: string;
  revertedAt?: string;
  revertedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

interface ERPAutonomousDecisionHistoryProps {
  maxItems?: number;
  onDecisionClick?: (decision: AutonomousDecision) => void;
  onRevert?: (decisionId: string) => Promise<void>;
}

// === DATOS MOCK ===

const generateMockDecisions = (): AutonomousDecision[] => {
  const decisions: AutonomousDecision[] = [
    {
      id: 'dec_001',
      domain: 'crm_cs',
      agentType: 'churn_prevention',
      agentName: 'Agente Anti-Churn',
      type: 'prevention',
      status: 'executed',
      title: 'Activación de Protocolo de Retención',
      description: 'Se activó protocolo de retención para cliente con alto riesgo de churn',
      reasoning: 'Cliente ABC Corp no ha interactuado en 45 días, ticket de soporte negativo hace 2 semanas, uso de plataforma reducido 70%. Probabilidad de churn calculada: 82%.',
      confidence: 92,
      impact: { type: 'positive', value: 45000, metric: 'ARR preservado' },
      context: { customerId: 'cust_abc123', churnProbability: 0.82, daysInactive: 45 },
      actions: [
        { action: 'Enviar email personalizado', target: 'cliente@abccorp.com', result: 'Entregado' },
        { action: 'Asignar CSM dedicado', target: 'María García', result: 'Completado' },
        { action: 'Crear ticket de seguimiento', target: 'Zendesk', result: 'Ticket #4521' }
      ],
      createdAt: subHours(new Date(), 2).toISOString(),
      executedAt: subHours(new Date(), 2).toISOString(),
      executedBy: 'Automático'
    },
    {
      id: 'dec_002',
      domain: 'financial',
      agentType: 'cashflow',
      agentName: 'Agente de Cash Flow',
      type: 'optimization',
      status: 'executed',
      title: 'Optimización de Pagos a Proveedores',
      description: 'Reprogramación de pagos para maximizar descuentos por pronto pago',
      reasoning: 'Análisis de términos de pago indica posibilidad de obtener €12,500 en descuentos adelantando pagos a 3 proveedores con cash flow disponible.',
      confidence: 88,
      impact: { type: 'positive', value: 12500, metric: 'Ahorro en descuentos' },
      context: { suppliersAffected: 3, cashAvailable: 150000 },
      actions: [
        { action: 'Adelantar pago', target: 'Proveedor A', result: '€5,200 descuento' },
        { action: 'Adelantar pago', target: 'Proveedor B', result: '€4,800 descuento' },
        { action: 'Adelantar pago', target: 'Proveedor C', result: '€2,500 descuento' }
      ],
      createdAt: subHours(new Date(), 5).toISOString(),
      executedAt: subHours(new Date(), 5).toISOString(),
      executedBy: 'Automático'
    },
    {
      id: 'dec_003',
      domain: 'compliance',
      agentType: 'gdpr',
      agentName: 'Agente GDPR',
      type: 'automation',
      status: 'executed',
      title: 'Eliminación Automática de Datos Expirados',
      description: 'Eliminación de datos personales cuyo período de retención ha expirado',
      reasoning: '156 registros de datos personales excedieron el período de retención de 24 meses sin actividad del titular.',
      confidence: 100,
      impact: { type: 'positive', value: 156, metric: 'Registros eliminados' },
      context: { retentionPeriodMonths: 24, recordsProcessed: 156 },
      actions: [
        { action: 'Anonimizar datos', target: '89 registros', result: 'Completado' },
        { action: 'Eliminar datos', target: '67 registros', result: 'Completado' },
        { action: 'Generar log de auditoría', target: 'Sistema', result: 'Registrado' }
      ],
      createdAt: subDays(new Date(), 1).toISOString(),
      executedAt: subDays(new Date(), 1).toISOString(),
      executedBy: 'Automático'
    },
    {
      id: 'dec_004',
      domain: 'operations',
      agentType: 'inventory',
      agentName: 'Agente de Inventario',
      type: 'recommendation',
      status: 'pending_approval',
      title: 'Reorden de Stock Crítico',
      description: 'Solicitud de reorden para 5 productos bajo nivel mínimo',
      reasoning: 'Inventario de 5 SKUs ha caído bajo el nivel de seguridad. Tiempo estimado de agotamiento: 3-5 días basado en ventas actuales.',
      confidence: 95,
      impact: { type: 'neutral', value: 23500, metric: 'Valor de compra' },
      context: { skusAffected: 5, daysToStockout: 4 },
      actions: [
        { action: 'Generar PO', target: 'SKU-001, SKU-002, SKU-003', result: 'Pendiente' },
        { action: 'Notificar compras', target: 'Equipo de Compras', result: 'Enviado' }
      ],
      createdAt: subHours(new Date(), 1).toISOString()
    },
    {
      id: 'dec_005',
      domain: 'crm_cs',
      agentType: 'upsell',
      agentName: 'Agente de Upsell',
      type: 'recommendation',
      status: 'executed',
      title: 'Propuesta de Upgrade Automatizada',
      description: 'Envío de propuesta de upgrade personalizada a cliente elegible',
      reasoning: 'Cliente XYZ Ltd ha utilizado 95% de su cuota durante 3 meses consecutivos. Patrón indica necesidad de plan superior.',
      confidence: 87,
      impact: { type: 'positive', value: 24000, metric: 'MRR potencial' },
      context: { usagePercentage: 95, consecutiveMonths: 3 },
      actions: [
        { action: 'Generar propuesta', target: 'Plan Enterprise', result: 'Creada' },
        { action: 'Enviar email', target: 'cfo@xyzltd.com', result: 'Abierto' }
      ],
      createdAt: subDays(new Date(), 2).toISOString(),
      executedAt: subDays(new Date(), 2).toISOString(),
      executedBy: 'Automático'
    },
    {
      id: 'dec_006',
      domain: 'hr',
      agentType: 'performance',
      agentName: 'Agente de Performance',
      type: 'escalation',
      status: 'rejected',
      title: 'Alerta de Bajo Rendimiento',
      description: 'Recomendación de plan de mejora para empleado con bajo rendimiento',
      reasoning: 'KPIs del empleado están 40% por debajo del promedio durante 2 meses.',
      confidence: 75,
      impact: { type: 'neutral' },
      context: { employeeId: 'emp_123', performanceGap: 40 },
      actions: [
        { action: 'Crear PIP', target: 'Sistema RRHH', result: 'Cancelado' }
      ],
      createdAt: subDays(new Date(), 3).toISOString(),
      rejectedBy: 'Ana Martínez',
      rejectionReason: 'El empleado está en baja médica, reevaluar al reincorporarse'
    },
    {
      id: 'dec_007',
      domain: 'financial',
      agentType: 'collections',
      agentName: 'Agente de Cobros',
      type: 'automation',
      status: 'reverted',
      title: 'Envío de Recordatorio de Pago',
      description: 'Recordatorio automático para factura vencida hace 30 días',
      reasoning: 'Factura #INV-2024-0892 vencida hace 30 días sin respuesta a primer recordatorio.',
      confidence: 90,
      impact: { type: 'neutral', value: 8500, metric: 'Factura pendiente' },
      context: { invoiceId: 'INV-2024-0892', daysPastDue: 30 },
      actions: [
        { action: 'Enviar recordatorio nivel 2', target: 'Cliente', result: 'Revertido' }
      ],
      createdAt: subDays(new Date(), 4).toISOString(),
      executedAt: subDays(new Date(), 4).toISOString(),
      revertedAt: subDays(new Date(), 3).toISOString(),
      revertedBy: 'Carlos López',
    }
  ];

  return decisions;
};

// === COMPONENTE ===

export function ERPAutonomousDecisionHistory({
  maxItems = 100,
  onDecisionClick,
  onRevert
}: ERPAutonomousDecisionHistoryProps) {
  // Estado
  const [decisions] = useState<AutonomousDecision[]>(generateMockDecisions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<AgentDomain | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<DecisionStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<DecisionType | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedDecision, setSelectedDecision] = useState<AutonomousDecision | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Filtrar decisiones
  const filteredDecisions = useMemo(() => {
    return decisions
      .filter(d => {
        if (selectedDomain !== 'all' && d.domain !== selectedDomain) return false;
        if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
        if (selectedType !== 'all' && d.type !== selectedType) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            d.title.toLowerCase().includes(query) ||
            d.description.toLowerCase().includes(query) ||
            d.agentName.toLowerCase().includes(query) ||
            d.reasoning.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .slice(0, maxItems);
  }, [decisions, selectedDomain, selectedStatus, selectedType, searchQuery, maxItems]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: decisions.length,
    executed: decisions.filter(d => d.status === 'executed').length,
    pending: decisions.filter(d => d.status === 'pending_approval').length,
    rejected: decisions.filter(d => d.status === 'rejected').length,
    reverted: decisions.filter(d => d.status === 'reverted').length,
    avgConfidence: Math.round(decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length)
  }), [decisions]);

  // Handlers
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = useCallback((exportFormat: 'json' | 'csv') => {
    const dateStr = formatDate(new Date(), 'yyyy-MM-dd');
    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(filteredDecisions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp-decisions-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Fecha', 'Dominio', 'Agente', 'Tipo', 'Estado', 'Título', 'Confianza', 'Impacto'];
      const rows = filteredDecisions.map(d => [
        d.id,
        formatDate(new Date(d.createdAt), 'yyyy-MM-dd HH:mm'),
        d.domain,
        d.agentName,
        d.type,
        d.status,
        d.title,
        `${d.confidence}%`,
        d.impact.value ? `${d.impact.value} ${d.impact.metric}` : 'N/A'
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp-decisions-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Exportado como ${exportFormat.toUpperCase()}`);
    setShowExportDialog(false);
  }, [filteredDecisions]);

  const getStatusBadge = (status: DecisionStatus) => {
    const config = {
      executed: { color: 'bg-green-500', icon: CheckCircle, label: 'Ejecutado' },
      pending_approval: { color: 'bg-amber-500', icon: Clock, label: 'Pendiente' },
      rejected: { color: 'bg-destructive', icon: XCircle, label: 'Rechazado' },
      reverted: { color: 'bg-purple-500', icon: RotateCcw, label: 'Revertido' },
      failed: { color: 'bg-red-500', icon: AlertTriangle, label: 'Fallido' }
    };
    const { color, icon: Icon, label } = config[status];
    return (
      <Badge className={cn(color, 'text-white')}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getTypeBadge = (type: DecisionType) => {
    const config = {
      optimization: { color: 'border-green-500 text-green-500', label: 'Optimización' },
      prevention: { color: 'border-amber-500 text-amber-500', label: 'Prevención' },
      automation: { color: 'border-blue-500 text-blue-500', label: 'Automatización' },
      recommendation: { color: 'border-purple-500 text-purple-500', label: 'Recomendación' },
      escalation: { color: 'border-red-500 text-red-500', label: 'Escalación' }
    };
    const { color, label } = config[type];
    return <Badge variant="outline" className={color}>{label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Historial de Decisiones Autónomas
          </h3>
          <p className="text-sm text-muted-foreground">
            {stats.total} decisiones • {stats.avgConfidence}% confianza promedio
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.executed}</p>
            <p className="text-xs text-muted-foreground">Ejecutados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rechazados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.reverted}</p>
            <p className="text-xs text-muted-foreground">Revertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.avgConfidence}%</p>
            <p className="text-xs text-muted-foreground">Confianza</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar decisiones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as AgentDomain | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Dominio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(DOMAIN_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as DecisionStatus | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="executed">Ejecutado</SelectItem>
                <SelectItem value="pending_approval">Pendiente</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
                <SelectItem value="reverted">Revertido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DecisionType | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="optimization">Optimización</SelectItem>
                <SelectItem value="prevention">Prevención</SelectItem>
                <SelectItem value="automation">Automatización</SelectItem>
                <SelectItem value="recommendation">Recomendación</SelectItem>
                <SelectItem value="escalation">Escalación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de decisiones */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {filteredDecisions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No se encontraron decisiones</p>
              </CardContent>
            </Card>
          ) : (
            filteredDecisions.map((decision) => (
              <Collapsible
                key={decision.id}
                open={expandedIds.has(decision.id)}
                onOpenChange={() => toggleExpand(decision.id)}
              >
                <Card className={cn(
                  "transition-all",
                  decision.status === 'pending_approval' && "border-amber-500/50"
                )}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          {expandedIds.has(decision.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-sm">{decision.title}</h4>
                            {getStatusBadge(decision.status)}
                            {getTypeBadge(decision.type)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{decision.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              {decision.agentName}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {decision.confidence}% confianza
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(decision.createdAt), { locale: es, addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {decision.impact.value && (
                          <Badge variant="secondary" className="shrink-0">
                            {decision.impact.type === 'positive' && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
                            {decision.impact.value.toLocaleString()} {decision.impact.metric}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Razonamiento */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <h5 className="text-xs font-medium text-muted-foreground mb-1">Razonamiento de IA</h5>
                        <p className="text-sm">{decision.reasoning}</p>
                      </div>

                      {/* Acciones tomadas */}
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">Acciones</h5>
                        <div className="space-y-2">
                          {decision.actions.map((action, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded border bg-card">
                              <Zap className="h-4 w-4 text-primary" />
                              <span className="flex-1">{action.action}</span>
                              <Badge variant="outline">{action.target}</Badge>
                              {action.result && (
                                <Badge variant="secondary">{action.result}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setSelectedDecision(decision)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(decision.id);
                            toast.success('ID copiado');
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar ID
                        </Button>
                        {decision.status === 'executed' && onRevert && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-amber-500 border-amber-500 hover:bg-amber-500/10"
                            onClick={() => onRevert(decision.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Revertir
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialog de exportación */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Decisiones</DialogTitle>
            <DialogDescription>
              Exportar {filteredDecisions.length} decisiones filtradas
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button variant="outline" onClick={() => handleExport('json')} className="h-24 flex-col">
              <FileJson className="h-8 w-8 mb-2" />
              <span>JSON</span>
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')} className="h-24 flex-col">
              <FileSpreadsheet className="h-8 w-8 mb-2" />
              <span>CSV</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalles */}
      <Dialog open={!!selectedDecision} onOpenChange={() => setSelectedDecision(null)}>
        <DialogContent className="max-w-2xl">
          {selectedDecision && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedDecision.title}
                  {getStatusBadge(selectedDecision.status)}
                </DialogTitle>
                <DialogDescription>{selectedDecision.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Agente</p>
                    <p className="font-medium">{selectedDecision.agentName}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Confianza</p>
                    <p className="font-medium">{selectedDecision.confidence}%</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Razonamiento</p>
                  <p className="text-sm">{selectedDecision.reasoning}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Contexto</p>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(selectedDecision.context, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ERPAutonomousDecisionHistory;
