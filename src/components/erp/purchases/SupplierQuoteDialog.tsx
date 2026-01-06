/**
 * Diálogo para registrar cotización de proveedor
 * Fase 2: Formulario para ingresar cotizaciones recibidas
 */

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Receipt,
  Save,
  Calculator
} from 'lucide-react';
import { useERPRFQ, type RFQ, type RFQLine, type SupplierQuote, type CreateQuoteInput } from '@/hooks/erp/useERPRFQ';
import { useERPPurchases } from '@/hooks/erp/useERPPurchases';
import { toast } from 'sonner';

interface SupplierQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: RFQ | null;
  quote?: SupplierQuote | null;
  onSuccess?: () => void;
}

interface QuoteLine {
  id: string;
  rfq_line_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  is_alternative: boolean;
}

export function SupplierQuoteDialog({ 
  open, 
  onOpenChange, 
  rfq,
  quote,
  onSuccess 
}: SupplierQuoteDialogProps) {
  const { createQuote, fetchRFQLines, isLoading } = useERPRFQ();
  const { fetchSuppliers } = useERPPurchases();
  
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [rfqLines, setRfqLines] = useState<RFQLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryDays, setDeliveryDays] = useState<number | ''>('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([]);

  const isEditMode = !!quote;

  // Load data when dialog opens
  useEffect(() => {
    if (open && rfq) {
      loadData();
    }
  }, [open, rfq]);

  const loadData = async () => {
    const [suppliersData, linesData] = await Promise.all([
      fetchSuppliers(),
      rfq ? fetchRFQLines(rfq.id) : Promise.resolve([])
    ]);
    
    setSuppliers(suppliersData.filter((s: { is_active?: boolean }) => s.is_active !== false));
    setRfqLines(linesData);
    
    // Initialize lines from RFQ lines if creating new quote
    if (!quote && linesData.length > 0) {
      setLines(linesData.map(l => ({
        id: crypto.randomUUID(),
        rfq_line_id: l.id,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.target_price || 0,
        discount_percent: 0,
        tax_rate: 21,
        is_alternative: false,
      })));
    }

    // Filter to invited suppliers if available
    if (rfq?.invited_suppliers && rfq.invited_suppliers.length > 0) {
      const invitedSet = new Set(rfq.invited_suppliers);
      setSuppliers(prev => prev.filter(s => invitedSet.has(s.id)));
    }
  };

  const resetForm = () => {
    setSupplierId('');
    setQuoteNumber('');
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setValidityDate('');
    setPaymentTerms('');
    setDeliveryDays('');
    setDeliveryTerms('');
    setNotes('');
    setLines([]);
  };

  const addLine = () => {
    setLines([...lines, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'UND',
      unit_price: 0,
      discount_percent: 0,
      tax_rate: 21,
      is_alternative: false,
    }]);
  };

  const updateLine = (id: string, field: keyof QuoteLine, value: unknown) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const calculateLineSubtotal = (line: QuoteLine) => {
    return line.quantity * line.unit_price * (1 - line.discount_percent / 100);
  };

  const calculateLineTax = (line: QuoteLine) => {
    return calculateLineSubtotal(line) * (line.tax_rate / 100);
  };

  const totals = lines.reduce((acc, line) => {
    const subtotal = calculateLineSubtotal(line);
    const tax = calculateLineTax(line);
    return {
      subtotal: acc.subtotal + subtotal,
      tax: acc.tax + tax,
      total: acc.total + subtotal + tax
    };
  }, { subtotal: 0, tax: 0, total: 0 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleSave = async () => {
    if (!rfq) {
      toast.error('No hay RFQ seleccionado');
      return;
    }

    if (!supplierId) {
      toast.error('Selecciona un proveedor');
      return;
    }

    if (lines.length === 0) {
      toast.error('Agrega al menos una línea de cotización');
      return;
    }

    const hasInvalidLines = lines.some(l => !l.description.trim() || l.unit_price <= 0);
    if (hasInvalidLines) {
      toast.error('Verifica que todas las líneas tengan descripción y precio');
      return;
    }

    setIsSaving(true);
    try {
      const input: CreateQuoteInput = {
        rfq_id: rfq.id,
        supplier_id: supplierId,
        quote_number: quoteNumber.trim() || undefined,
        quote_date: quoteDate,
        validity_date: validityDate || undefined,
        payment_terms: paymentTerms.trim() || undefined,
        delivery_days: deliveryDays ? Number(deliveryDays) : undefined,
        delivery_terms: deliveryTerms.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map(l => ({
          rfq_line_id: l.rfq_line_id,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tax_rate: l.tax_rate,
          subtotal: calculateLineSubtotal(l),
          is_alternative: l.is_alternative,
        })),
      };

      const result = await createQuote(input);
      
      if (result) {
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!rfq) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isEditMode ? 'Editar Cotización' : 'Registrar Cotización de Proveedor'}
          </DialogTitle>
          <DialogDescription>
            RFQ: <span className="font-mono font-medium">{rfq.rfq_number}</span> - {rfq.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Información del proveedor y cotización */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteNumber">Nº Cotización Proveedor</Label>
                <Input
                  id="quoteNumber"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="Referencia del proveedor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteDate">Fecha Cotización</Label>
                <Input
                  id="quoteDate"
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validityDate">Válida hasta</Label>
                <Input
                  id="validityDate"
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Condiciones de pago</Label>
                <Input
                  id="paymentTerms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ej: 30 días"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDays">Días de entrega</Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  min="0"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Días"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="deliveryTerms">Condiciones de entrega</Label>
                <Input
                  id="deliveryTerms"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="Ej: CIF, FOB, etc."
                />
              </div>
            </div>

            {/* Líneas de cotización */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Líneas de cotización *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar línea
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Descripción</TableHead>
                      <TableHead className="w-[80px]">Cantidad</TableHead>
                      <TableHead className="w-[70px]">Unidad</TableHead>
                      <TableHead className="w-[100px]">Precio Unit.</TableHead>
                      <TableHead className="w-[80px]">Dto. %</TableHead>
                      <TableHead className="w-[80px]">IVA %</TableHead>
                      <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          Agrega líneas de cotización
                        </TableCell>
                      </TableRow>
                    ) : (
                      lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                              placeholder="Descripción"
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
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.unit}
                              onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={line.discount_percent}
                              onChange={(e) => updateLine(line.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={line.tax_rate}
                              onChange={(e) => updateLine(line.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(calculateLineSubtotal(line))}
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

              {/* Totales */}
              {lines.length > 0 && (
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA:</span>
                      <span className="font-mono">{formatCurrency(totals.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span className="font-mono text-lg">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones sobre la cotización..."
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
            onClick={handleSave} 
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
                Guardar cotización
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplierQuoteDialog;
