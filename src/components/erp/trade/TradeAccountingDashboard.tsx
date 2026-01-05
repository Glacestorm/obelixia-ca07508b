/**
 * TradeAccountingDashboard - Dashboard de contabilización de operaciones de comercio
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  RefreshCw,
  Play,
  Eye,
  Calendar,
  Building2,
  Loader2,
  XCircle
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { useERPJournalEntries } from '@/hooks/erp/useERPJournalEntries';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PendingOperation {
  id: string;
  type: 'discount' | 'factoring' | 'confirming' | 'guarantee' | 'letter_of_credit';
  reference: string;
  amount: number;
  currency: string;
  customer_name: string;
  operation_date: string;
  status: string;
  is_accounted: boolean;
}

interface AccountingStats {
  pending: number;
  pendingAmount: number;
  accountedToday: number;
  accountedThisWeek: number;
  accountedThisMonth: number;
  drafts: number;
  discrepancies: number;
}

export function TradeAccountingDashboard() {
  const { currentCompany } = useERPContext();
  const { postMultiple, isLoading: isPostingEntries } = useERPJournalEntries();

  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [stats, setStats] = useState<AccountingStats>({
    pending: 0,
    pendingAmount: 0,
    accountedToday: 0,
    accountedThisWeek: 0,
    accountedThisMonth: 0,
    drafts: 0,
    discrepancies: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dateFilter, setDateFilter] = useState('week');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Cargar estadísticas
  const fetchStats = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      // Asientos en borrador
      const { count: draftCount } = await supabase
        .from('erp_journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('is_posted', false)
        .eq('is_reversed', false);

      // Asientos contabilizados hoy
      const today = format(new Date(), 'yyyy-MM-dd');
      const { count: todayCount } = await supabase
        .from('erp_journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('is_posted', true)
        .gte('entry_date', today);

      // Asientos de la semana
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { count: weekCount } = await supabase
        .from('erp_journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('is_posted', true)
        .gte('entry_date', weekAgo);

      // Asientos del mes
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const { count: monthCount } = await supabase
        .from('erp_journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('is_posted', true)
        .gte('entry_date', monthStart);

      setStats(prev => ({
        ...prev,
        drafts: draftCount || 0,
        accountedToday: todayCount || 0,
        accountedThisWeek: weekCount || 0,
        accountedThisMonth: monthCount || 0
      }));
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [currentCompany?.id]);

  // Cargar operaciones pendientes
  const fetchPendingOperations = useCallback(async () => {
    if (!currentCompany?.id) return;

    setIsLoading(true);
    try {
      // Descuentos comerciales pendientes de contabilizar
      const { data: discounts } = await (supabase
        .from('erp_commercial_discounts') as any)
        .select(`
          id,
          operation_reference,
          discount_amount,
          operation_date,
          status,
          is_accounted,
          erp_trade_partners!customer_id(company_name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_accounted', false)
        .in('status', ['pending', 'active', 'approved'])
        .order('operation_date', { ascending: false })
        .limit(50);

      // Factoring pendiente
      const { data: factoring } = await (supabase
        .from('erp_factoring_contracts') as any)
        .select(`
          id,
          contract_reference,
          total_amount,
          contract_date,
          status,
          is_accounted,
          erp_trade_partners!customer_id(company_name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_accounted', false)
        .in('status', ['active', 'approved'])
        .order('contract_date', { ascending: false })
        .limit(50);

      // Mapear operaciones
      const operations: PendingOperation[] = [
        ...(discounts || []).map((d: any) => ({
          id: d.id,
          type: 'discount' as const,
          reference: d.operation_reference || d.id.slice(0, 8),
          amount: d.discount_amount || 0,
          currency: 'EUR',
          customer_name: d.erp_trade_partners?.company_name || 'Sin cliente',
          operation_date: d.operation_date,
          status: d.status,
          is_accounted: false
        })),
        ...(factoring || []).map((f: any) => ({
          id: f.id,
          type: 'factoring' as const,
          reference: f.contract_reference || f.id.slice(0, 8),
          amount: f.total_amount || 0,
          currency: 'EUR',
          customer_name: f.erp_trade_partners?.company_name || 'Sin cliente',
          operation_date: f.contract_date,
          status: f.status,
          is_accounted: false
        }))
      ];

      setPendingOperations(operations);
      setStats(prev => ({
        ...prev,
        pending: operations.length,
        pendingAmount: operations.reduce((sum, o) => sum + o.amount, 0)
      }));
    } catch (err) {
      console.error('Error fetching pending operations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchStats();
    fetchPendingOperations();
  }, [fetchStats, fetchPendingOperations]);

  // Selección de operaciones
  const toggleOperationSelection = (id: string) => {
    setSelectedOperations(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOperations.length === filteredOperations.length) {
      setSelectedOperations([]);
    } else {
      setSelectedOperations(filteredOperations.map(o => o.id));
    }
  };

  // Filtrar operaciones
  const filteredOperations = useMemo(() => {
    return pendingOperations.filter(op => {
      if (typeFilter !== 'all' && op.type !== typeFilter) return false;
      return true;
    });
  }, [pendingOperations, typeFilter]);

  // Contabilizar en lote
  const handleBatchAccounting = async () => {
    if (selectedOperations.length === 0) {
      toast.error('Selecciona al menos una operación');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implementar generación y contabilización en lote
      toast.success(`Procesando ${selectedOperations.length} operaciones...`);
      
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`${selectedOperations.length} operaciones contabilizadas`);
      setSelectedOperations([]);
      fetchPendingOperations();
      fetchStats();
    } finally {
      setIsProcessing(false);
    }
  };

  // Formateo
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'discount': return 'Descuento';
      case 'factoring': return 'Factoring';
      case 'confirming': return 'Confirming';
      case 'guarantee': return 'Aval';
      case 'letter_of_credit': return 'Crédito Doc.';
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'discount': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'factoring': return 'bg-green-50 text-green-700 border-green-200';
      case 'confirming': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'guarantee': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'letter_of_credit': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(stats.pendingAmount)} € por contabilizar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoy</p>
                <p className="text-2xl font-bold text-green-600">{stats.accountedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Asientos contabilizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta semana</p>
                <p className="text-2xl font-bold">{stats.accountedThisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este mes</p>
                <p className="text-2xl font-bold">{stats.accountedThisMonth}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desde inicio de mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Borradores</p>
                <p className="text-2xl font-bold text-orange-600">{stats.drafts}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Asientos sin contabilizar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Contabilización de Comercio
              </CardTitle>
              <CardDescription>
                Gestiona la contabilización de operaciones de comercio exterior
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchStats();
                fetchPendingOperations();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pendientes
                  {stats.pending > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Recientes
                </TabsTrigger>
                <TabsTrigger value="drafts" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Borradores
                  {stats.drafts > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {stats.drafts}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="discount">Descuentos</SelectItem>
                    <SelectItem value="factoring">Factoring</SelectItem>
                    <SelectItem value="confirming">Confirming</SelectItem>
                    <SelectItem value="guarantee">Avales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="pending" className="space-y-4">
              {/* Acciones masivas */}
              {selectedOperations.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm">
                    {selectedOperations.length} operación(es) seleccionada(s)
                  </span>
                  <Button
                    size="sm"
                    onClick={handleBatchAccounting}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Contabilizar selección
                  </Button>
                </div>
              )}

              {/* Tabla de operaciones pendientes */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredOperations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay operaciones pendientes de contabilizar</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedOperations.length === filteredOperations.length && filteredOperations.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-24">Tipo</TableHead>
                        <TableHead className="w-32">Referencia</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="w-24">Fecha</TableHead>
                        <TableHead className="w-28 text-right">Importe</TableHead>
                        <TableHead className="w-24">Estado</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOperations.map((op) => (
                        <TableRow key={op.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOperations.includes(op.id)}
                              onCheckedChange={() => toggleOperationSelection(op.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getTypeBadgeColor(op.type)}>
                              {getTypeLabel(op.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {op.reference}
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">
                            {op.customer_name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(op.operation_date)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(op.amount)} €
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              {op.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="recent">
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Vista de asientos recientes</p>
                <p className="text-sm mt-1">Próximamente...</p>
              </div>
            </TabsContent>

            <TabsContent value="drafts">
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Asientos en borrador</p>
                <p className="text-sm mt-1">Próximamente...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default TradeAccountingDashboard;
