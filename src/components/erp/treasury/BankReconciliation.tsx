/**
 * BankReconciliation - Conciliación Bancaria
 * Conectado a datos reales de Supabase con demo data de ejemplo
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  CheckCircle, 
  Link,
  AlertTriangle,
  RefreshCw,
  FileUp,
  Search,
  Filter,
  Trash2,
  ArrowUpDown,
  Loader2,
  Plus,
  Eye,
  Unlink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UniversalImportExportPanel } from '../shared/UniversalImportExportPanel';

interface StatementLine {
  id: string;
  statement_id: string;
  transaction_date: string;
  value_date: string | null;
  description: string;
  reference: string | null;
  amount: number;
  balance_after: number | null;
  is_reconciled: boolean;
  matched_entity_type: string | null;
  matched_entity_id: string | null;
  match_score: number | null;
  created_at: string;
}

interface BankReconciliationProps {
  companyId: string;
}

// ============ DEMO DATA (ELIMINAR EN PRODUCCIÓN) ============
const DEMO_STATEMENT_LINES: Partial<StatementLine>[] = [
  {
    id: 'demo-1',
    transaction_date: '2025-01-28',
    value_date: '2025-01-28',
    description: 'TRANSFERENCIA CLIENTE TECNOLOGIA AVANZADA SL - FAC/2025/0045',
    reference: 'TRF-20250128-001',
    amount: 15420.50,
    balance_after: 125420.50,
    is_reconciled: true,
    matched_entity_type: 'invoice',
    matched_entity_id: 'fac-2025-0045',
    match_score: 98
  },
  {
    id: 'demo-2',
    transaction_date: '2025-01-27',
    value_date: '2025-01-27',
    description: 'PAGO NOMINAS ENERO 2025 - CONCEPTO VARIOS',
    reference: 'NOM-202501',
    amount: -45890.00,
    balance_after: 110000.00,
    is_reconciled: true,
    matched_entity_type: 'payroll',
    matched_entity_id: 'nom-2025-01',
    match_score: 100
  },
  {
    id: 'demo-3',
    transaction_date: '2025-01-26',
    value_date: '2025-01-26',
    description: 'RECIBO TELEFONICA MOVILES ESPAÑA - 652XXXXXX',
    reference: 'REC-TEL-001',
    amount: -189.45,
    balance_after: 155890.00,
    is_reconciled: false,
    matched_entity_type: null,
    matched_entity_id: null,
    match_score: null
  },
  {
    id: 'demo-4',
    transaction_date: '2025-01-25',
    value_date: '2025-01-25',
    description: 'COBRO PAYPAL - VENTAS ONLINE ENERO',
    reference: 'PP-20250125',
    amount: 3250.00,
    balance_after: 156079.45,
    is_reconciled: false,
    matched_entity_type: null,
    matched_entity_id: null,
    match_score: 45
  },
  {
    id: 'demo-5',
    transaction_date: '2025-01-24',
    value_date: '2025-01-24',
    description: 'PAGO PROVEEDOR SUMINISTROS INDUSTRIALES SA - PEDIDO 789',
    reference: 'PROV-SI-789',
    amount: -8750.00,
    balance_after: 152829.45,
    is_reconciled: true,
    matched_entity_type: 'purchase',
    matched_entity_id: 'ped-789',
    match_score: 95
  },
  {
    id: 'demo-6',
    transaction_date: '2025-01-23',
    value_date: '2025-01-23',
    description: 'INGRESO EFECTIVO CAJA - VENTAS DIA',
    reference: 'ING-EF-0123',
    amount: 1250.00,
    balance_after: 161579.45,
    is_reconciled: false,
    matched_entity_type: null,
    matched_entity_id: null,
    match_score: null
  },
  {
    id: 'demo-7',
    transaction_date: '2025-01-22',
    value_date: '2025-01-22',
    description: 'COMISION TARJETAS VISA COMERCIO',
    reference: 'COM-VISA-01',
    amount: -125.80,
    balance_after: 160329.45,
    is_reconciled: false,
    matched_entity_type: 'bank_fee',
    matched_entity_id: null,
    match_score: 75
  },
  {
    id: 'demo-8',
    transaction_date: '2025-01-21',
    value_date: '2025-01-21',
    description: 'TRANSFERENCIA CLIENTE CONSULTING GROUP BARCELONA',
    reference: 'TRF-CGB-002',
    amount: 28500.00,
    balance_after: 160455.25,
    is_reconciled: true,
    matched_entity_type: 'invoice',
    matched_entity_id: 'fac-2025-0032',
    match_score: 100
  },
  {
    id: 'demo-9',
    transaction_date: '2025-01-20',
    value_date: '2025-01-20',
    description: 'RECIBO SEGURIDAD SOCIAL TC1/TC2 ENERO',
    reference: 'SS-TC-202501',
    amount: -12450.00,
    balance_after: 131955.25,
    is_reconciled: true,
    matched_entity_type: 'tax',
    matched_entity_id: 'ss-2025-01',
    match_score: 100
  },
  {
    id: 'demo-10',
    transaction_date: '2025-01-19',
    value_date: '2025-01-19',
    description: 'DEVOLUCION CARGO DUPLICADO - PROVEEDOR XYZ',
    reference: 'DEV-XYZ-001',
    amount: 450.00,
    balance_after: 144405.25,
    is_reconciled: false,
    matched_entity_type: null,
    matched_entity_id: null,
    match_score: null
  }
];

export function BankReconciliation({ companyId }: BankReconciliationProps) {
  const [lines, setLines] = useState<StatementLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [useDemoData, setUseDemoData] = useState(false); // Carga datos reales por defecto

  // Fetch real data from Supabase
  const fetchLines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_bank_statement_lines')
        .select(`
          id, statement_id, transaction_date, value_date, description, 
          reference, amount, is_reconciled, 
          matched_entity_type, matched_entity_id, match_score, created_at
        `)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Si no hay datos reales, usar demo data
      if (!data || data.length === 0) {
        setLines(DEMO_STATEMENT_LINES as StatementLine[]);
        setUseDemoData(true);
      } else {
        // Map data to include balance_after as null since it's not in the table
        const mappedData = data.map((item: any) => ({
          ...item,
          balance_after: null
        })) as StatementLine[];
        setLines(mappedData);
        setUseDemoData(false);
      }
    } catch (err) {
      console.error('[BankReconciliation] Error:', err);
      // En caso de error, usar demo data
      setLines(DEMO_STATEMENT_LINES as StatementLine[]);
      setUseDemoData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLines();
  }, [fetchLines, companyId]);

  const runAutoReconciliation = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-auto-reconciliation', {
        body: {
          action: 'reconcile',
          company_id: companyId
        }
      });

      if (error) throw error;
      
      const matched = data?.matched || 0;
      toast.success(`Conciliación completada: ${matched} movimientos vinculados`);
      
      // Actualizar demo data simulando conciliación
      if (useDemoData) {
        setLines(prev => prev.map(line => {
          if (!line.is_reconciled && line.match_score && line.match_score > 70) {
            return { ...line, is_reconciled: true };
          }
          return line;
        }));
      } else {
        fetchLines();
      }
    } catch (err) {
      console.error('[BankReconciliation] Auto-reconciliation error:', err);
      toast.error('Error en conciliación automática');
    } finally {
      setReconciling(false);
    }
  };

  const manualReconcile = async (lineId: string) => {
    if (useDemoData) {
      setLines(prev => prev.map(line => 
        line.id === lineId ? { ...line, is_reconciled: true, match_score: 100 } : line
      ));
      toast.success('Movimiento conciliado manualmente');
      return;
    }

    try {
      const { error } = await supabase
        .from('erp_bank_statement_lines')
        .update({ is_reconciled: true })
        .eq('id', lineId);

      if (error) throw error;
      toast.success('Movimiento conciliado');
      fetchLines();
    } catch (err) {
      toast.error('Error al conciliar');
    }
  };

  const unreconcile = async (lineId: string) => {
    if (useDemoData) {
      setLines(prev => prev.map(line => 
        line.id === lineId ? { ...line, is_reconciled: false } : line
      ));
      toast.success('Conciliación deshecha');
      return;
    }

    try {
      const { error } = await supabase
        .from('erp_bank_statement_lines')
        .update({ is_reconciled: false, matched_entity_type: null, matched_entity_id: null })
        .eq('id', lineId);

      if (error) throw error;
      toast.success('Conciliación deshecha');
      fetchLines();
    } catch (err) {
      toast.error('Error al deshacer conciliación');
    }
  };

  const toggleLineSelection = (lineId: string) => {
    setSelectedLines(prev => 
      prev.includes(lineId) 
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  };

  const reconcileSelected = async () => {
    if (useDemoData) {
      setLines(prev => prev.map(line => 
        selectedLines.includes(line.id) ? { ...line, is_reconciled: true, match_score: 100 } : line
      ));
      setSelectedLines([]);
      toast.success(`${selectedLines.length} movimientos conciliados`);
      return;
    }

    for (const lineId of selectedLines) {
      await manualReconcile(lineId);
    }
    setSelectedLines([]);
  };

  // Filter and search
  const filteredLines = lines.filter(line => {
    const matchesSearch = 
      line.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'reconciled' && line.is_reconciled) ||
      (filterStatus === 'pending' && !line.is_reconciled);
    
    return matchesSearch && matchesFilter;
  });

  // Stats
  const pendingCount = lines.filter(l => !l.is_reconciled).length;
  const reconciledCount = lines.filter(l => l.is_reconciled).length;
  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  const pendingAmount = lines.filter(l => !l.is_reconciled).reduce((sum, l) => sum + l.amount, 0);

  const getMatchBadge = (line: StatementLine) => {
    if (line.is_reconciled) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          {line.match_score ? `${line.match_score}%` : 'OK'}
        </Badge>
      );
    }
    
    if (line.match_score) {
      if (line.match_score >= 80) {
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600">
            {line.match_score}% match
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {line.match_score}%
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Pendiente
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Demo indicator */}
      {useDemoData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Datos de demostración - Puedes eliminarlos después</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLines}
            className="text-amber-600 border-amber-500/30"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Recargar datos reales
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total movimientos</p>
          <p className="text-2xl font-bold">{lines.length}</p>
        </Card>
        <Card className="p-4 bg-green-500/5 border-green-500/20">
          <p className="text-xs text-muted-foreground">Conciliados</p>
          <p className="text-2xl font-bold text-green-600">{reconciledCount}</p>
        </Card>
        <Card className={cn("p-4", pendingCount > 0 && "bg-yellow-500/5 border-yellow-500/20")}>
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className={cn("text-2xl font-bold", pendingCount > 0 && "text-yellow-600")}>
            {pendingCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Importe pendiente</p>
          <p className={cn("text-2xl font-bold", pendingAmount >= 0 ? "text-green-600" : "text-destructive")}>
            € {Math.abs(pendingAmount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Actions & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileUp className="h-4 w-4 mr-2" />
                Importar Extracto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Importar Extracto Bancario</DialogTitle>
              </DialogHeader>
              <UniversalImportExportPanel 
                module="treasury"
                title="Importar Movimientos"
                description="OCR inteligente para extractos bancarios (PDF, CSV, OFX)"
                onImportComplete={() => {
                  fetchLines();
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Button onClick={runAutoReconciliation} disabled={reconciling}>
            {reconciling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link className="h-4 w-4 mr-2" />
            )}
            Conciliación Automática
          </Button>

          {selectedLines.length > 0 && (
            <Button variant="secondary" onClick={reconcileSelected}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Conciliar {selectedLines.length} seleccionados
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              className="pl-9 w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="reconciled">Conciliados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lines Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Movimientos Bancarios
            <Badge variant="outline" className="ml-2">{filteredLines.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Cargando movimientos...</p>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No hay movimientos bancarios</p>
              <p className="text-sm text-muted-foreground mt-1">Importa un extracto para comenzar</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredLines.map((line) => (
                  <div 
                    key={line.id} 
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      selectedLines.includes(line.id) && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={selectedLines.includes(line.id)}
                        onCheckedChange={() => toggleLineSelection(line.id)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{line.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(line.transaction_date), 'dd MMM yyyy', { locale: es })}
                          </p>
                          {line.reference && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {line.reference}
                            </p>
                          )}
                          {line.matched_entity_type && (
                            <Badge variant="outline" className="text-[10px]">
                              {line.matched_entity_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className={cn(
                            "font-bold text-base",
                            line.amount >= 0 ? "text-green-600" : "text-destructive"
                          )}>
                            {line.amount >= 0 ? '+' : ''}€ {line.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                          {line.balance_after && (
                            <p className="text-xs text-muted-foreground">
                              Saldo: € {line.balance_after.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        
                        {getMatchBadge(line)}
                        
                        <div className="flex items-center gap-1">
                          {line.is_reconciled ? (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => unreconcile(line.id)}
                              title="Deshacer conciliación"
                            >
                              <Unlink className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => manualReconcile(line.id)}
                              title="Conciliar manualmente"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Ver detalle">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BankReconciliation;
