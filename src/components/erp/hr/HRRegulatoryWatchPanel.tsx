/**
 * HRRegulatoryWatchPanel - Panel de Vigilancia Normativa
 * Sistema de control de cambios regulatorios por jurisdicción
 * No aplica normativas hasta aprobación oficial (BOE, BOPA, etc.)
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Eye,
  FileText,
  Bell,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  ExternalLink,
  Plus,
  Check,
  X,
  BookOpen,
  Newspaper,
  Building2,
  Scale,
  Gavel,
  Users,
  FileSearch,
  Sparkles
} from 'lucide-react';
import { useRegulatoryWatch, RegulatoryWatchItem } from '@/hooks/admin/useRegulatoryWatch';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRRegulatoryWatchPanelProps {
  companyId: string;
}

const JURISDICTION_LABELS: Record<string, { label: string; flag: string; official: string }> = {
  ES: { label: 'España', flag: '🇪🇸', official: 'BOE' },
  AD: { label: 'Andorra', flag: '🇦🇩', official: 'BOPA' },
  EU: { label: 'Unión Europea', flag: '🇪🇺', official: 'DOUE' },
  PT: { label: 'Portugal', flag: '🇵🇹', official: 'Diário da República' },
  FR: { label: 'Francia', flag: '🇫🇷', official: 'Journal Officiel' },
  UK: { label: 'Reino Unido', flag: '🇬🇧', official: 'UK Gazette' },
  AE: { label: 'EAU', flag: '🇦🇪', official: 'Official Gazette' },
  US: { label: 'EEUU', flag: '🇺🇸', official: 'Federal Register' }
};

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  convenio_colectivo: { label: 'Convenio Colectivo', icon: Users },
  cno: { label: 'CNO', icon: FileSearch },
  salario_minimo: { label: 'Salario Mínimo', icon: Scale },
  seguridad_social: { label: 'Seguridad Social', icon: Building2 },
  irpf: { label: 'IRPF', icon: FileText },
  jornada: { label: 'Jornada Laboral', icon: Clock },
  vacaciones: { label: 'Vacaciones', icon: Calendar },
  contratacion: { label: 'Contratación', icon: FileText },
  despido: { label: 'Despido', icon: Gavel },
  formacion: { label: 'Formación', icon: BookOpen },
  prl: { label: 'PRL', icon: AlertTriangle },
  igualdad: { label: 'Igualdad', icon: Users },
  otro: { label: 'Otro', icon: FileText }
};

const SOURCE_LABELS: Record<string, string> = {
  press: 'Prensa',
  draft: 'Borrador oficial',
  proposal: 'Propuesta',
  rumor: 'Rumor/Filtración',
  union_communication: 'Comunicado sindical',
  ministry_announcement: 'Anuncio ministerial'
};

export function HRRegulatoryWatchPanel({ companyId }: HRRegulatoryWatchPanelProps) {
  const { user } = useAuth();
  const {
    items,
    alerts,
    config,
    isLoading,
    isChecking,
    pendingImplementations,
    upcomingEffective,
    unreadAlertsCount,
    updateConfig,
    runManualCheck,
    markAsApproved,
    implementRegulation,
    markAlertAsRead,
    dismissAlert,
    addManualItem
  } = useRegulatoryWatch(companyId);

  const [activeTab, setActiveTab] = useState('watch');
  const [selectedItem, setSelectedItem] = useState<RegulatoryWatchItem | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form states
  const [approvalForm, setApprovalForm] = useState({
    publication: '',
    publication_date: '',
    publication_number: '',
    publication_url: '',
    effective_date: ''
  });

  const [newItemForm, setNewItemForm] = useState({
    title: '',
    description: '',
    source_type: 'press' as const,
    source_url: '',
    category: 'convenio_colectivo',
    jurisdiction: 'ES',
    impact_level: 'medium' as const
  });

  // === HANDLERS ===
  const handleApprove = useCallback(async () => {
    if (!selectedItem) return;
    await markAsApproved(selectedItem.id, approvalForm);
    setShowApprovalDialog(false);
    setSelectedItem(null);
    setApprovalForm({
      publication: '',
      publication_date: '',
      publication_number: '',
      publication_url: '',
      effective_date: ''
    });
  }, [selectedItem, approvalForm, markAsApproved]);

  const handleImplement = useCallback(async (item: RegulatoryWatchItem) => {
    if (!user?.id) return;
    await implementRegulation(item.id, user.id);
  }, [user, implementRegulation]);

  const handleAddItem = useCallback(async () => {
    await addManualItem(newItemForm);
    setShowAddDialog(false);
    setNewItemForm({
      title: '',
      description: '',
      source_type: 'press',
      source_url: '',
      category: 'convenio_colectivo',
      jurisdiction: 'ES',
      impact_level: 'medium'
    });
  }, [newItemForm, addManualItem]);

  // === FILTERED ITEMS ===
  const filteredItems = filterStatus === 'all' 
    ? items 
    : items.filter(i => i.approval_status === filterStatus);

  // === RENDER HELPERS ===
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Aprobado</Badge>;
      case 'in_force':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">En vigor</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rechazado</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Medio</Badge>;
      case 'low':
        return <Badge variant="secondary">Bajo</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.filter(i => i.approval_status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">En vigilancia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingImplementations.length}</p>
                <p className="text-xs text-muted-foreground">Pendientes implementar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingEffective.length}</p>
                <p className="text-xs text-muted-foreground">Próximas 30 días</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <Bell className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadAlertsCount}</p>
                <p className="text-xs text-muted-foreground">Alertas sin leer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Vigilancia Normativa
            </CardTitle>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runManualCheck}
                      disabled={isChecking}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
                      {isChecking ? 'Chequeando...' : 'Chequear ahora'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ejecutar búsqueda manual de actualizaciones normativas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir manual
              </Button>

              <Button variant="ghost" size="icon" onClick={() => setShowConfigDialog(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {config?.last_check_at && (
            <p className="text-xs text-muted-foreground">
              Último chequeo: {formatDistanceToNow(new Date(config.last_check_at), { locale: es, addSuffix: true })}
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="watch" className="text-xs">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                En vigilancia
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Aprobadas
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs relative">
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                Alertas
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadAlertsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="implemented" className="text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Implementadas
              </TabsTrigger>
            </TabsList>

            {/* Tab: En vigilancia */}
            <TabsContent value="watch" className="mt-0">
              <div className="flex items-center gap-2 mb-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="approved">Aprobados</SelectItem>
                    <SelectItem value="rejected">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredItems.filter(i => i.approval_status === 'pending').map((item) => {
                    const CategoryIcon = CATEGORY_LABELS[item.category]?.icon || FileText;
                    const jurisdiction = JURISDICTION_LABELS[item.jurisdiction];

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-muted">
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{jurisdiction?.flag}</span>
                                <h4 className="font-medium text-sm">{item.title}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(item.approval_status)}
                                {getImpactBadge(item.impact_level)}
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORY_LABELS[item.category]?.label || item.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {SOURCE_LABELS[item.source_type]}
                                </Badge>
                              </div>
                              {item.requires_contract_update && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  Requiere actualización de contratos
                                </div>
                              )}
                              {item.requires_payroll_recalc && (
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  Requiere recálculo de nóminas
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <p className="text-xs text-muted-foreground">
                              Detectado {formatDistanceToNow(new Date(item.detected_at), { locale: es, addSuffix: true })}
                            </p>
                            <div className="flex items-center gap-1">
                              {item.source_url && (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setApprovalForm(prev => ({
                                    ...prev,
                                    publication: jurisdiction?.official || ''
                                  }));
                                  setShowApprovalDialog(true);
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Marcar aprobado
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredItems.filter(i => i.approval_status === 'pending').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Eye className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No hay normativas pendientes de vigilancia</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Aprobadas */}
            <TabsContent value="approved" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {items.filter(i => i.approval_status === 'approved' || i.approval_status === 'in_force').map((item) => {
                    const CategoryIcon = CATEGORY_LABELS[item.category]?.icon || FileText;
                    const jurisdiction = JURISDICTION_LABELS[item.jurisdiction];
                    const daysUntilEffective = item.effective_date
                      ? Math.ceil((new Date(item.effective_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-lg border bg-card transition-colors",
                          item.implementation_status === 'completed' && "bg-green-500/5 border-green-500/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-green-500/10">
                              <CategoryIcon className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{jurisdiction?.flag}</span>
                                <h4 className="font-medium text-sm">{item.title}</h4>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <span>{item.official_publication} - {item.official_publication_number}</span>
                                {item.official_publication_url && (
                                  <a 
                                    href={item.official_publication_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Ver publicación
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(item.approval_status)}
                                {item.implementation_status === 'completed' ? (
                                  <Badge className="bg-green-500">Implementado</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600">Pendiente implementar</Badge>
                                )}
                                {daysUntilEffective !== null && daysUntilEffective > 0 && (
                                  <Badge variant="outline" className="text-blue-600">
                                    <Clock className="h-3 w-3 mr-1" />
                                    En vigor en {daysUntilEffective} días
                                  </Badge>
                                )}
                                {daysUntilEffective !== null && daysUntilEffective <= 0 && (
                                  <Badge className="bg-blue-500">
                                    <Check className="h-3 w-3 mr-1" />
                                    En vigor
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {item.effective_date && (
                              <p className="text-xs text-muted-foreground">
                                Efectivo desde: {format(new Date(item.effective_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                            {item.implementation_status !== 'completed' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleImplement(item)}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
                                Implementar
                              </Button>
                            )}
                            {item.knowledge_base_id && (
                              <Badge variant="outline" className="text-green-600">
                                <BookOpen className="h-3 w-3 mr-1" />
                                En base de conocimiento
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {items.filter(i => i.approval_status === 'approved' || i.approval_status === 'in_force').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No hay normativas aprobadas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Alertas */}
            <TabsContent value="alerts" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        !alert.is_read && "bg-primary/5 border-primary/20",
                        alert.severity === 'critical' && "bg-destructive/5 border-destructive/20",
                        alert.severity === 'warning' && "bg-amber-500/5 border-amber-500/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {alert.severity === 'critical' && (
                            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                          )}
                          {alert.severity === 'warning' && (
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          )}
                          {alert.severity === 'info' && (
                            <Bell className="h-5 w-5 text-primary mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                            {alert.action_required && (
                              <p className="text-xs text-amber-600 mt-2">
                                <strong>Acción requerida:</strong> {alert.action_required}
                              </p>
                            )}
                            {alert.action_deadline && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Fecha límite: {format(new Date(alert.action_deadline), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!alert.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markAlertAsRead(alert.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No hay alertas pendientes</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Implementadas */}
            <TabsContent value="implemented" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {items.filter(i => i.implementation_status === 'completed').map((item) => {
                    const CategoryIcon = CATEGORY_LABELS[item.category]?.icon || FileText;
                    const jurisdiction = JURISDICTION_LABELS[item.jurisdiction];

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border bg-green-500/5 border-green-500/20"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                              <CategoryIcon className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span>{jurisdiction?.flag}</span>
                                <h4 className="font-medium text-sm">{item.title}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.official_publication} ({item.official_publication_date})
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-green-500">Implementado</Badge>
                                {item.knowledge_base_id && (
                                  <Badge variant="outline" className="text-green-600">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    Base de conocimiento
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Implementado {item.implemented_at && formatDistanceToNow(new Date(item.implemented_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {items.filter(i => i.implementation_status === 'completed').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No hay normativas implementadas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog: Marcar como aprobado */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-green-600" />
              Marcar como aprobado oficialmente
            </DialogTitle>
            <DialogDescription>
              Indica los datos de la publicación oficial para activar la implementación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Publicación oficial *</Label>
              <Input
                value={approvalForm.publication}
                onChange={(e) => setApprovalForm(prev => ({ ...prev, publication: e.target.value }))}
                placeholder="BOE, BOPA, DOGC..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de publicación *</Label>
                <Input
                  type="date"
                  value={approvalForm.publication_date}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, publication_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input
                  value={approvalForm.publication_number}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, publication_number: e.target.value }))}
                  placeholder="Ej: BOE-A-2026-1234"
                />
              </div>
            </div>

            <div>
              <Label>URL de la publicación</Label>
              <Input
                value={approvalForm.publication_url}
                onChange={(e) => setApprovalForm(prev => ({ ...prev, publication_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Fecha de entrada en vigor *</Label>
              <Input
                type="date"
                value={approvalForm.effective_date}
                onChange={(e) => setApprovalForm(prev => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={!approvalForm.publication || !approvalForm.publication_date || !approvalForm.effective_date}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Añadir manualmente */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Añadir normativa manualmente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={newItemForm.title}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la normativa"
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={newItemForm.description}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción o resumen..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select
                  value={newItemForm.category}
                  onValueChange={(v) => setNewItemForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jurisdicción</Label>
                <Select
                  value={newItemForm.jurisdiction}
                  onValueChange={(v) => setNewItemForm(prev => ({ ...prev, jurisdiction: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(JURISDICTION_LABELS).map(([key, { label, flag }]) => (
                      <SelectItem key={key} value={key}>{flag} {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de fuente</Label>
                <Select
                  value={newItemForm.source_type}
                  onValueChange={(v) => setNewItemForm(prev => ({ ...prev, source_type: v as typeof newItemForm.source_type }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impacto</Label>
                <Select
                  value={newItemForm.impact_level}
                  onValueChange={(v) => setNewItemForm(prev => ({ ...prev, impact_level: v as typeof newItemForm.impact_level }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bajo</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>URL de la fuente</Label>
              <Input
                value={newItemForm.source_url}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, source_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={!newItemForm.title}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configuración */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de vigilancia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Modo de chequeo */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Modo de chequeo</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-check">Chequeo automático</Label>
                <Switch
                  id="auto-check"
                  checked={config?.auto_check_enabled ?? true}
                  onCheckedChange={(checked) => updateConfig({ auto_check_enabled: checked })}
                />
              </div>
                <Select
                  value={config?.check_frequency || 'daily'}
                  onValueChange={(v) => updateConfig({ check_frequency: v as 'hourly' | 'daily' | 'weekly' | 'manual' })}
                >
                  <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Cada hora</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="manual">Solo manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Fuentes oficiales */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Fuentes oficiales a vigilar</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">🇪🇸 BOE</span>
                  <Switch
                    checked={config?.watch_boe ?? true}
                    onCheckedChange={(checked) => updateConfig({ watch_boe: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">🇦🇩 BOPA</span>
                  <Switch
                    checked={config?.watch_bopa ?? false}
                    onCheckedChange={(checked) => updateConfig({ watch_bopa: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">🇪🇺 DOUE</span>
                  <Switch
                    checked={config?.watch_eu_official_journal ?? false}
                    onCheckedChange={(checked) => updateConfig({ watch_eu_official_journal: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">📰 Prensa</span>
                  <Switch
                    checked={config?.watch_press ?? true}
                    onCheckedChange={(checked) => updateConfig({ watch_press: checked })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notificaciones */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Notificaciones</h4>
              <div className="flex items-center justify-between">
                <Label>Al detectar nueva normativa</Label>
                <Switch
                  checked={config?.notify_on_detection ?? true}
                  onCheckedChange={(checked) => updateConfig({ notify_on_detection: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Al aprobarse oficialmente</Label>
                <Switch
                  checked={config?.notify_on_approval ?? true}
                  onCheckedChange={(checked) => updateConfig({ notify_on_approval: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowConfigDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRRegulatoryWatchPanel;
