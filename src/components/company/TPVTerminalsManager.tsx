import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TPVTerminal {
  id: string;
  company_id: string;
  terminal_id: string;
  provider: string;
  monthly_volume: number;
  commission_rate: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  companyId: string;
}

export function TPVTerminalsManager({ companyId }: Props) {
  const [terminals, setTerminals] = useState<TPVTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTerminal, setEditingTerminal] = useState<TPVTerminal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    terminal_id: '',
    provider: '',
    monthly_volume: 0,
    commission_rate: 0,
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    fetchTerminals();
  }, [companyId]);

  const fetchTerminals = async () => {
    try {
      setLoading(true);
      const { data: terminalsData, error: terminalsError } = await supabase
        .from('company_tpv_terminals')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (terminalsError) throw terminalsError;
      setTerminals((terminalsData as TPVTerminal[]) || []);
    } catch (error) {
      console.error('Error fetching terminals:', error);
      toast.error('Error al cargar terminales TPV');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        terminal_id: formData.terminal_id,
        provider: formData.provider,
        monthly_volume: formData.monthly_volume,
        commission_rate: formData.commission_rate,
        status: formData.is_active ? 'active' : 'inactive',
        notes: formData.notes || null,
      };

      if (editingTerminal) {
        const { error } = await supabase
          .from('company_tpv_terminals')
          .update(dataToSave)
          .eq('id', editingTerminal.id);

        if (error) throw error;
        toast.success('Terminal actualizado');
      } else {
        const { error } = await supabase
          .from('company_tpv_terminals')
          .insert({
            company_id: companyId,
            ...dataToSave,
          });

        if (error) throw error;
        toast.success('Terminal añadido');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTerminals();
    } catch (error) {
      console.error('Error saving terminal:', error);
      toast.error('Error al guardar terminal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este terminal?')) return;

    try {
      const { error } = await supabase
        .from('company_tpv_terminals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Terminal eliminado');
      fetchTerminals();
    } catch (error) {
      console.error('Error deleting terminal:', error);
      toast.error('Error al eliminar terminal');
    }
  };

  const handleEdit = (terminal: TPVTerminal) => {
    setEditingTerminal(terminal);
    setFormData({
      terminal_id: terminal.terminal_id || '',
      provider: terminal.provider || '',
      monthly_volume: terminal.monthly_volume || 0,
      commission_rate: terminal.commission_rate || 0,
      is_active: terminal.status === 'active',
      notes: terminal.notes || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      terminal_id: '',
      provider: '',
      monthly_volume: 0,
      commission_rate: 0,
      is_active: true,
      notes: '',
    });
    setEditingTerminal(null);
  };

  const getTotalMonthlyVolume = () => {
    return terminals.reduce((sum, terminal) => sum + (terminal.monthly_volume || 0), 0);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Gestión de terminales y comisiones
        </p>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs">
              <Plus className="mr-1.5 h-3 w-3" />
              Añadir
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTerminal ? 'Editar' : 'Añadir'} Terminal TPV
                </DialogTitle>
                <DialogDescription>
                  Configura el terminal y su comisión
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="terminal_id">Identificador</Label>
                    <Input
                      id="terminal_id"
                      value={formData.terminal_id}
                      onChange={(e) => setFormData({ ...formData, terminal_id: e.target.value })}
                      placeholder="Ej: TPV-001"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">Proveedor</Label>
                    <Input
                      id="provider"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      placeholder="Ej: Creand, Morabanc..."
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_volume">Volumen Mensual (€)</Label>
                    <Input
                      id="monthly_volume"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthly_volume}
                      onChange={(e) => setFormData({ ...formData, monthly_volume: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission_rate">Comisión (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observaciones sobre el terminal..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Terminal activo</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTerminal ? 'Actualizar' : 'Añadir'}
                  </Button>
                </div>
              </form>
            </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <p className="text-center text-xs text-muted-foreground py-3">Cargando...</p>
      ) : terminals.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground mb-2">No hay terminales TPV</p>
          <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)} className="h-7 text-xs">
            <Plus className="mr-1.5 h-3 w-3" />
            Añadir Primero
          </Button>
        </div>
        ) : (
          <>
            <Accordion type="single" collapsible className="w-full">
              {terminals.map((terminal) => {
                const isActive = terminal.status === 'active';
                return (
                  <AccordionItem key={terminal.id} value={terminal.id} className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center justify-between w-full pr-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] h-4">
                            {isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <span className="font-medium text-xs">{terminal.terminal_id || 'Sin ID'}</span>
                          <span className="text-[10px] text-muted-foreground">{terminal.provider || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]">
                            {(terminal.monthly_volume || 0).toLocaleString('es-ES', { 
                              style: 'currency', 
                              currency: 'EUR',
                              notation: 'compact',
                              maximumFractionDigits: 0
                            })}/mes
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {terminal.commission_rate || 0}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded border p-1.5">
                            <p className="text-[9px] text-muted-foreground">Vol. Mensual</p>
                            <p className="font-medium">
                              {(terminal.monthly_volume || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                          </div>
                          <div className="rounded border p-1.5">
                            <p className="text-[9px] text-muted-foreground">Vol. Anual (est.)</p>
                            <p className="font-medium text-muted-foreground">
                              {((terminal.monthly_volume || 0) * 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                          </div>
                        </div>
                        {terminal.notes && (
                          <p className="text-[10px] text-muted-foreground italic">{terminal.notes}</p>
                        )}
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(terminal)}
                            className="h-6 text-[10px] px-2"
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(terminal.id)}
                            className="h-6 text-[10px] px-2"
                          >
                            <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            <div className="mt-4 flex justify-between border-t pt-4">
              <span className="font-semibold">Volumen Mensual Total TPV:</span>
              <span className="font-bold text-green-600">
                {getTotalMonthlyVolume().toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </>
        )}
    </div>
  );
}
