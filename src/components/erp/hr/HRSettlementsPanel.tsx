/**
 * HRSettlementsPanel - Panel de Gestión de Finiquitos con Validación Multinivel
 * Sistema completo: Persistencia + IA + Legal + RRHH
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserX,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Calculator,
  Scale,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Brain,
  Gavel,
  BadgeCheck,
  CreditCard,
  Eye,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useSettlements, Settlement, SettlementStatus } from '@/hooks/admin/useSettlements';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { HRSeveranceCalculatorDialog } from './HRSeveranceCalculatorDialog';

interface HRSettlementsPanelProps {
  companyId: string;
}

const STATUS_CONFIG: Record<SettlementStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  calculated: { label: 'Calculado', color: 'bg-blue-500/20 text-blue-700', icon: <Calculator className="h-3 w-3" /> },
  pending_ai_validation: { label: 'Validando IA', color: 'bg-purple-500/20 text-purple-700', icon: <Brain className="h-3 w-3" /> },
  pending_legal_validation: { label: 'Pendiente Legal', color: 'bg-amber-500/20 text-amber-700', icon: <Gavel className="h-3 w-3" /> },
  pending_hr_approval: { label: 'Pendiente RRHH', color: 'bg-orange-500/20 text-orange-700', icon: <BadgeCheck className="h-3 w-3" /> },
  approved: { label: 'Aprobado', color: 'bg-green-500/20 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rechazado', color: 'bg-destructive/20 text-destructive', icon: <XCircle className="h-3 w-3" /> },
  paid: { label: 'Pagado', color: 'bg-emerald-500/20 text-emerald-700', icon: <CreditCard className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
};

const TERMINATION_TYPES: Record<string, string> = {
  voluntary: 'Baja voluntaria',
  objective: 'Despido objetivo',
  disciplinary: 'Despido disciplinario',
  disciplinary_improcedent: 'Despido improcedente',
  collective: 'Despido colectivo (ERE)',
  end_contract: 'Fin de contrato',
  mutual_agreement: 'Mutuo acuerdo',
  retirement: 'Jubilación',
  death: 'Fallecimiento',
};

export function HRSettlementsPanel({ companyId }: HRSettlementsPanelProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  const {
    isLoading,
    settlements,
    metrics,
    loadSettlements,
    loadMetrics,
    calculateWithAI,
    submitLegalValidation,
    submitHRApproval,
    markAsPaid,
  } = useSettlements(companyId);

  // Filter settlements by tab and search
  const filteredSettlements = useMemo(() => {
    let filtered = settlements;

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(s => 
        ['pending_ai_validation', 'pending_legal_validation', 'pending_hr_approval'].includes(s.status)
      );
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(s => s.status === activeTab);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const empName = `${s.employee?.first_name || ''} ${s.employee?.last_name || ''}`.toLowerCase();
        return empName.includes(query) || 
               s.termination_type.toLowerCase().includes(query);
      });
    }

    return filtered;
  }, [settlements, activeTab, searchQuery]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const handleRefresh = () => {
    loadSettlements();
    loadMetrics();
  };

  const getEmployeeName = (settlement: Settlement) => {
    if (settlement.employee) {
      return `${settlement.employee.first_name} ${settlement.employee.last_name}`;
    }
    const snapshot = settlement.employee_snapshot as Record<string, unknown>;
    return `${snapshot?.first_name || ''} ${snapshot?.last_name || ''}`.trim() || 'Sin nombre';
  };

  const handleCalculate = async (settlementId: string) => {
    await calculateWithAI(settlementId);
  };

  const handleLegalApprove = async (settlementId: string) => {
    await submitLegalValidation(settlementId, true, 'Validación legal aprobada');
  };

  const handleLegalReject = async (settlementId: string) => {
    await submitLegalValidation(settlementId, false, 'Incumplimiento normativo detectado');
  };

  const handleHRApprove = async (settlementId: string) => {
    await submitHRApproval(settlementId, true, 'Aprobado por RRHH');
  };

  const handleHRReject = async (settlementId: string) => {
    await submitHRApproval(settlementId, false, 'Rechazado por RRHH');
  };

  const handleMarkPaid = async (settlementId: string) => {
    await markAsPaid(settlementId, new Date().toISOString().split('T')[0], 'Transferencia');
  };

  return (
    <div className="space-y-6">
      {/* Header with KPIs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserX className="h-6 w-6 text-destructive" />
            Gestión de Finiquitos
          </h2>
          <p className="text-muted-foreground">
            Sistema de liquidaciones con validación IA → Legal → RRHH
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={() => setShowCalculatorDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Finiquito
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{metrics.total_settlements}</div>
              <p className="text-sm text-muted-foreground">Total finiquitos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{metrics.pending_validation}</div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
              <p className="text-sm text-muted-foreground">Aprobados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.total_net)}</div>
              <p className="text-sm text-muted-foreground">Total Neto</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{metrics.avg_processing_days.toFixed(1)}d</div>
              <p className="text-sm text-muted-foreground">Tiempo medio</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Flow Indicator */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">1. Validación IA</p>
                  <p className="text-muted-foreground text-xs">Cálculo automático</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gavel className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">2. Revisión Legal</p>
                  <p className="text-muted-foreground text-xs">Compliance normativo</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <BadgeCheck className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">3. Aprobación RRHH</p>
                  <p className="text-muted-foreground text-xs">Autorización final</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lista de Finiquitos</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">
                Pendientes
                {metrics && metrics.pending_validation > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                    {metrics.pending_validation}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Aprobados</TabsTrigger>
              <TabsTrigger value="paid">Pagados</TabsTrigger>
              <TabsTrigger value="rejected">Rechazados</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSettlements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay finiquitos en esta categoría</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha Baja</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Validaciones</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSettlements.map((settlement) => {
                      const statusConfig = STATUS_CONFIG[settlement.status];
                      return (
                        <TableRow key={settlement.id}>
                          <TableCell className="font-medium">
                            {getEmployeeName(settlement)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {TERMINATION_TYPES[settlement.termination_type] || settlement.termination_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(settlement.termination_date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(settlement.gross_total)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(settlement.net_total)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", statusConfig.color)}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* AI Validation */}
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center",
                                settlement.ai_validation_status === 'approved' 
                                  ? "bg-green-500/20" 
                                  : settlement.ai_validation_status === 'rejected'
                                  ? "bg-destructive/20"
                                  : "bg-muted"
                              )}>
                                <Brain className={cn(
                                  "h-3 w-3",
                                  settlement.ai_validation_status === 'approved' 
                                    ? "text-green-600" 
                                    : settlement.ai_validation_status === 'rejected'
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )} />
                              </div>
                              {/* Legal Validation */}
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center",
                                settlement.legal_validation_status === 'approved' 
                                  ? "bg-green-500/20" 
                                  : settlement.legal_validation_status === 'rejected'
                                  ? "bg-destructive/20"
                                  : "bg-muted"
                              )}>
                                <Gavel className={cn(
                                  "h-3 w-3",
                                  settlement.legal_validation_status === 'approved' 
                                    ? "text-green-600" 
                                    : settlement.legal_validation_status === 'rejected'
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )} />
                              </div>
                              {/* HR Approval */}
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center",
                                settlement.hr_approval_status === 'approved' 
                                  ? "bg-green-500/20" 
                                  : settlement.hr_approval_status === 'rejected'
                                  ? "bg-destructive/20"
                                  : "bg-muted"
                              )}>
                                <BadgeCheck className={cn(
                                  "h-3 w-3",
                                  settlement.hr_approval_status === 'approved' 
                                    ? "text-green-600" 
                                    : settlement.hr_approval_status === 'rejected'
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedSettlement(settlement)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                
                                {settlement.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleCalculate(settlement.id)}>
                                    <Calculator className="h-4 w-4 mr-2" />
                                    Calcular con IA
                                  </DropdownMenuItem>
                                )}

                                {settlement.status === 'pending_legal_validation' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleLegalApprove(settlement.id)}>
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                      Aprobar Legal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleLegalReject(settlement.id)}>
                                      <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                      Rechazar Legal
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {settlement.status === 'pending_hr_approval' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleHRApprove(settlement.id)}>
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                      Aprobar RRHH
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleHRReject(settlement.id)}>
                                      <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                      Rechazar RRHH
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {settlement.status === 'approved' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleMarkPaid(settlement.id)}>
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Marcar como pagado
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Calculator Dialog */}
      <HRSeveranceCalculatorDialog
        open={showCalculatorDialog}
        onOpenChange={setShowCalculatorDialog}
        companyId={companyId}
      />
    </div>
  );
}

export default HRSettlementsPanel;
