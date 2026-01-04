import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Package, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw,
  FileText,
  ArrowRightLeft,
  ClipboardList,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StockMovement {
  id: string;
  item_id: string;
  warehouse_id: string;
  movement_type: string;
  reference_type: string | null;
  reference_id: string | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
  movement_date: string;
  created_at: string;
  item?: {
    code: string;
    name: string;
  };
  warehouse?: {
    name: string;
  };
}

interface Item {
  id: string;
  code: string;
  name: string;
}

interface StockTraceabilityPanelProps {
  companyId: string | null;
}

const movementTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  purchase_in: { label: 'Entrada Compra', icon: <ArrowDownCircle className="h-4 w-4" />, color: 'bg-green-500' },
  sale_out: { label: 'Salida Venta', icon: <ArrowUpCircle className="h-4 w-4" />, color: 'bg-red-500' },
  transfer_in: { label: 'Entrada Traspaso', icon: <ArrowRightLeft className="h-4 w-4" />, color: 'bg-blue-500' },
  transfer_out: { label: 'Salida Traspaso', icon: <ArrowRightLeft className="h-4 w-4" />, color: 'bg-orange-500' },
  adjust: { label: 'Ajuste', icon: <ClipboardList className="h-4 w-4" />, color: 'bg-yellow-500' },
  inventory: { label: 'Inventario', icon: <ClipboardList className="h-4 w-4" />, color: 'bg-purple-500' },
  in: { label: 'Entrada', icon: <ArrowDownCircle className="h-4 w-4" />, color: 'bg-green-500' },
  out: { label: 'Salida', icon: <ArrowUpCircle className="h-4 w-4" />, color: 'bg-red-500' },
};

export function StockTraceabilityPanel({ companyId }: StockTraceabilityPanelProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('erp_items')
      .select('id, code, name')
      .eq('company_id', companyId)
      .order('name');
    
    if (data) setItems(data);
  }, [companyId]);

  const fetchMovements = useCallback(async () => {
    if (!companyId || !selectedItemId) {
      setMovements([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_stock_movements')
        .select(`
          *,
          item:erp_items(code, name),
          warehouse:erp_warehouses(name)
        `)
        .eq('company_id', companyId)
        .eq('item_id', selectedItemId)
        .order('movement_date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setMovements(data || []);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedItemId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === selectedItemId);

  const calculateRunningBalance = () => {
    let balance = 0;
    return [...movements].reverse().map(m => {
      balance += m.quantity;
      return { ...m, runningBalance: balance };
    }).reverse();
  };

  const movementsWithBalance = selectedItemId ? calculateRunningBalance() : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Trazabilidad de Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Seleccionar artículo" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {filteredItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                      {item.name}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchMovements} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {selectedItem && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">Código: {selectedItem.code}</p>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {movementsWithBalance[0]?.runningBalance || 0} uds
              </Badge>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedItemId ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Coste</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsWithBalance.map((movement) => {
                    const config = movementTypeConfig[movement.movement_type] || {
                      label: movement.movement_type,
                      icon: <FileText className="h-4 w-4" />,
                      color: 'bg-gray-500'
                    };
                    
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm">
                          {format(new Date(movement.movement_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1 rounded text-white", config.color)}>
                              {config.icon}
                            </div>
                            <span className="text-sm">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {movement.warehouse?.name || '-'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          movement.quantity > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {movement.unit_cost?.toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {movement.runningBalance}
                        </TableCell>
                        <TableCell>
                          {movement.reference_type && movement.reference_id && (
                            <Button variant="ghost" size="sm" className="h-7 gap-1">
                              <ExternalLink className="h-3 w-3" />
                              <span className="text-xs">{movement.reference_type}</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {movements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay movimientos para este artículo
                </div>
              )}
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Selecciona un artículo para ver su trazabilidad
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StockTraceabilityPanel;
