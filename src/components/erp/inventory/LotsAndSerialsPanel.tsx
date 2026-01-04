import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Package,
  Barcode,
  Calendar,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Lot {
  id: string;
  item_id: string;
  lot_number: string;
  expiration_date: string | null;
  manufacturing_date: string | null;
  is_blocked: boolean;
  created_at: string;
  item?: {
    code: string;
    name: string;
  };
}

interface Serial {
  id: string;
  item_id: string;
  serial_number: string;
  status: string;
  created_at: string;
  item?: {
    code: string;
    name: string;
  };
}

interface Item {
  id: string;
  code: string;
  name: string;
}

interface LotsAndSerialsPanelProps {
  companyId: string | null;
}

export function LotsAndSerialsPanel({ companyId }: LotsAndSerialsPanelProps) {
  const [activeTab, setActiveTab] = useState<'lots' | 'serials'>('lots');
  const [lots, setLots] = useState<Lot[]>([]);
  const [serials, setSerials] = useState<Serial[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'lot' | 'serial'>('lot');
  
  const [formData, setFormData] = useState({
    item_id: '',
    lot_number: '',
    serial_number: '',
    expiration_date: ''
  });

  const fetchItems = useCallback(async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('erp_items')
      .select('id, code, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    
    if (data) setItems(data);
  }, [companyId]);

  const fetchLots = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_lots')
        .select(`
          *,
          item:erp_items(code, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLots(data || []);
    } catch (err) {
      console.error('Error fetching lots:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchSerials = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_serials')
        .select(`
          *,
          item:erp_items(code, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSerials(data || []);
    } catch (err) {
      console.error('Error fetching serials:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (activeTab === 'lots') {
      fetchLots();
    } else {
      fetchSerials();
    }
  }, [activeTab, fetchLots, fetchSerials]);

  const handleCreateLot = async () => {
    if (!companyId || !formData.item_id || !formData.lot_number) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase
        .from('erp_lots')
        .insert({
          company_id: companyId,
          item_id: formData.item_id,
          lot_number: formData.lot_number,
          expiration_date: formData.expiration_date || null
        });

      if (error) throw error;
      
      toast.success('Lote creado correctamente');
      setShowDialog(false);
      setFormData({ item_id: '', lot_number: '', serial_number: '', expiration_date: '' });
      fetchLots();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear lote');
    }
  };

  const handleCreateSerial = async () => {
    if (!companyId || !formData.item_id || !formData.serial_number) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase
        .from('erp_serials')
        .insert({
          company_id: companyId,
          item_id: formData.item_id,
          serial_number: formData.serial_number,
          status: 'available'
        });

      if (error) throw error;
      
      toast.success('Número de serie creado correctamente');
      setShowDialog(false);
      setFormData({ item_id: '', lot_number: '', serial_number: '', expiration_date: '' });
      fetchSerials();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear número de serie');
    }
  };

  const handleDelete = async (type: 'lot' | 'serial', id: string) => {
    try {
      const table = type === 'lot' ? 'erp_lots' : 'erp_serials';
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;
      
      toast.success(`${type === 'lot' ? 'Lote' : 'Serie'} eliminado`);
      if (type === 'lot') fetchLots();
      else fetchSerials();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const openCreateDialog = (mode: 'lot' | 'serial') => {
    setDialogMode(mode);
    setFormData({ item_id: '', lot_number: '', serial_number: '', expiration_date: '' });
    setShowDialog(true);
  };

  const filteredLots = lots.filter(lot => 
    lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lot.item?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSerials = serials.filter(serial => 
    serial.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serial.item?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const days = differenceInDays(new Date(expirationDate), new Date());
    if (days < 0) return { label: 'Caducado', color: 'destructive' as const };
    if (days <= 30) return { label: 'Próximo', color: 'warning' as const };
    return { label: 'OK', color: 'secondary' as const };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lotes y Números de Serie
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openCreateDialog('lot')}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Lote
              </Button>
              <Button variant="outline" size="sm" onClick={() => openCreateDialog('serial')}>
                <Barcode className="h-4 w-4 mr-1" />
                Nueva Serie
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lots' | 'serials')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="lots" className="gap-2">
                  <Package className="h-4 w-4" />
                  Lotes ({lots.length})
                </TabsTrigger>
                <TabsTrigger value="serials" className="gap-2">
                  <Barcode className="h-4 w-4" />
                  Series ({serials.length})
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-[250px]"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => activeTab === 'lots' ? fetchLots() : fetchSerials()}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            <TabsContent value="lots" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código Lote</TableHead>
                        <TableHead>Artículo</TableHead>
                        <TableHead>Fecha Caducidad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLots.map((lot) => {
                        const expStatus = getExpirationStatus(lot.expiration_date);
                        return (
                          <TableRow key={lot.id}>
                            <TableCell className="font-mono font-medium">{lot.lot_number}</TableCell>
                            <TableCell>
                              <div>
                                <span className="font-mono text-xs text-muted-foreground mr-2">
                                  {lot.item?.code}
                                </span>
                                {lot.item?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {lot.expiration_date ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {format(new Date(lot.expiration_date), 'dd/MM/yyyy', { locale: es })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lot.is_blocked ? (
                                <Badge variant="destructive">Bloqueado</Badge>
                              ) : expStatus ? (
                                <Badge variant={expStatus.color === 'warning' ? 'outline' : expStatus.color}>
                                  {expStatus.color === 'destructive' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  {expStatus.label}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Activo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(lot.created_at), 'dd/MM/yyyy', { locale: es })}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete('lot', lot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredLots.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay lotes registrados
                    </div>
                  )}
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="serials" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número de Serie</TableHead>
                        <TableHead>Artículo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSerials.map((serial) => (
                        <TableRow key={serial.id}>
                          <TableCell className="font-mono font-medium">{serial.serial_number}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                {serial.item?.code}
                              </span>
                              {serial.item?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={serial.status === 'available' ? 'secondary' : 'outline'}>
                              {serial.status === 'available' ? 'Disponible' : 
                               serial.status === 'sold' ? 'Vendido' : 
                               serial.status === 'reserved' ? 'Reservado' : serial.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(serial.created_at), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete('serial', serial.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredSerials.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay números de serie registrados
                    </div>
                  )}
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'lot' ? 'Nuevo Lote' : 'Nuevo Número de Serie'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Artículo *</Label>
              <Select value={formData.item_id} onValueChange={(v) => setFormData(p => ({ ...p, item_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar artículo" />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dialogMode === 'lot' ? (
              <>
                <div className="space-y-2">
                  <Label>Código de Lote *</Label>
                  <Input
                    value={formData.lot_number}
                    onChange={(e) => setFormData(p => ({ ...p, lot_number: e.target.value }))}
                    placeholder="Ej: LOT-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Caducidad</Label>
                  <Input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData(p => ({ ...p, expiration_date: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Número de Serie *</Label>
                <Input
                  value={formData.serial_number}
                  onChange={(e) => setFormData(p => ({ ...p, serial_number: e.target.value }))}
                  placeholder="Ej: SN-ABC123456"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={dialogMode === 'lot' ? handleCreateLot : handleCreateSerial}>
              Crear {dialogMode === 'lot' ? 'Lote' : 'Serie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LotsAndSerialsPanel;
