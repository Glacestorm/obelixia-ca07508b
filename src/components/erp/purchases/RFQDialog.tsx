/**
 * Diálogo para crear/editar RFQ (Solicitud de Cotización)
 * Fase 2: Formulario completo con líneas
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Package,
  Calendar,
  Users,
  Save,
  Send
} from 'lucide-react';
import { useERPRFQ, type RFQ, type RFQLine, type CreateRFQInput } from '@/hooks/erp/useERPRFQ';
import { useERPPurchases } from '@/hooks/erp/useERPPurchases';
import { toast } from 'sonner';

interface RFQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq?: RFQ | null;
  onSuccess?: () => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  target_price: number | null;
  specifications: string;
  is_required: boolean;
}

const defaultLine: Omit<LineItem, 'id'> = {
  description: '',
  quantity: 1,
  unit: 'UND',
  target_price: null,
  specifications: '',
  is_required: true,
};

export function RFQDialog({ open, onOpenChange, rfq, onSuccess }: RFQDialogProps) {
  const { createRFQ, fetchRFQLines, isLoading } = useERPRFQ();
  const { fetchSuppliers } = useERPPurchases();
  
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [responseDeadline, setResponseDeadline] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);

  const isEditMode = !!rfq;

  // Load suppliers
  useEffect(() => {
    if (open) {
      loadSuppliers();
    }
  }, [open]);

  // Load RFQ data if editing
  useEffect(() => {
    if (open && rfq) {
      setTitle(rfq.title);
      setDescription(rfq.description || '');
      setPriority(rfq.priority);
      setResponseDeadline(rfq.response_deadline || '');
      setExpectedDeliveryDate(rfq.expected_delivery_date || '');
      setNotes(rfq.notes || '');
      setSelectedSuppliers(rfq.invited_suppliers || []);
      loadRFQLines(rfq.id);
    } else if (open) {
      resetForm();
    }
  }, [open, rfq]);

  const loadSuppliers = async () => {
    const data = await fetchSuppliers();
    setSuppliers(data.filter((s: { is_active?: boolean }) => s.is_active !== false));
  };

  const loadRFQLines = async (rfqId: string) => {
    const data = await fetchRFQLines(rfqId);
    setLines(data.map(l => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      target_price: l.target_price ?? null,
      specifications: l.specifications || '',
      is_required: l.is_required,
    })));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setResponseDeadline('');
    setExpectedDeliveryDate('');
    setNotes('');
    setSelectedSuppliers([]);
    setLines([]);
  };

  const addLine = () => {
    setLines([...lines, { ...defaultLine, id: crypto.randomUUID() }]);
  };

  const updateLine = (id: string, field: keyof LineItem, value: unknown) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSave = async (sendAfterSave = false) => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (lines.length === 0) {
      toast.error('Agrega al menos un producto/servicio');
      return;
    }

    setIsSaving(true);
    try {
      const input: CreateRFQInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        response_deadline: responseDeadline || undefined,
        expected_delivery_date: expectedDeliveryDate || undefined,
        invited_suppliers: selectedSuppliers.length > 0 ? selectedSuppliers : undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l, i) => ({
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          target_price: l.target_price ?? undefined,
          specifications: l.specifications || undefined,
          is_required: l.is_required,
          order_index: i,
        })),
      };

      const result = await createRFQ(input);
      
      if (result) {
        onOpenChange(false);
        onSuccess?.();
        if (sendAfterSave) {
          toast.info('Funcionalidad de envío se implementará en la siguiente fase');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? 'Editar Solicitud de Cotización' : 'Nueva Solicitud de Cotización'}
          </DialogTitle>
          <DialogDescription>
            Crea una solicitud para recibir cotizaciones de proveedores
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Información básica */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Cotización de materiales de oficina"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción general de lo que necesitas..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseDeadline" className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Fecha límite de respuesta
                </Label>
                <Input
                  id="responseDeadline"
                  type="date"
                  value={responseDeadline}
                  onChange={(e) => setResponseDeadline(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDelivery" className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Fecha esperada de entrega
                </Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Proveedores */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Proveedores a invitar
              </Label>
              <div className="border rounded-lg p-3 max-h-[120px] overflow-y-auto">
                {suppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No hay proveedores registrados
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {suppliers.map((s) => (
                      <label 
                        key={s.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1"
                      >
                        <Checkbox
                          checked={selectedSuppliers.includes(s.id)}
                          onCheckedChange={() => toggleSupplier(s.id)}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedSuppliers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSuppliers.length} proveedor(es) seleccionado(s)
                </p>
              )}
            </div>

            {/* Líneas de productos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos/Servicios *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar línea
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Descripción</TableHead>
                      <TableHead className="w-[80px]">Cantidad</TableHead>
                      <TableHead className="w-[80px]">Unidad</TableHead>
                      <TableHead className="w-[100px]">Precio Obj.</TableHead>
                      <TableHead className="w-[60px]">Req.</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Agrega productos o servicios a cotizar
                        </TableCell>
                      </TableRow>
                    ) : (
                      lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                              placeholder="Descripción del producto/servicio"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 1)}
                              className="h-8 w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.unit}
                              onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                              placeholder="UND"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.target_price ?? ''}
                              onChange={(e) => updateLine(line.id, 'target_price', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="€"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={line.is_required}
                              onCheckedChange={(checked) => updateLine(line.id, 'is_required', !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales, condiciones, etc."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={() => handleSave(false)} 
            disabled={isSaving || isLoading}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar borrador
              </>
            )}
          </Button>
          <Button 
            onClick={() => handleSave(true)} 
            disabled={isSaving || isLoading}
            variant="default"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Guardar y enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RFQDialog;
