/**
 * Diálogo para convertir cotización ganadora a Orden de Compra
 * Phase 4: RFQ → PO conversion
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  ShoppingCart, 
  CalendarDays, 
  Package,
  CheckCircle
} from 'lucide-react';
import { useERPRFQ, type RFQ, type SupplierQuote, type SupplierQuoteLine } from '@/hooks/erp/useERPRFQ';
import { useERPPurchases } from '@/hooks/erp/useERPPurchases';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface ConvertToPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: RFQ | null;
  onSuccess?: () => void;
}

export function ConvertToPODialog({ 
  open, 
  onOpenChange, 
  rfq,
  onSuccess 
}: ConvertToPODialogProps) {
  const { fetchQuotesByRFQ, fetchQuoteLines } = useERPRFQ();
  const { createPurchaseOrder } = useERPPurchases();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [winnerQuote, setWinnerQuote] = useState<SupplierQuote | null>(null);
  const [quoteLines, setQuoteLines] = useState<SupplierQuoteLine[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  
  // PO form fields
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');

  // Load winner quote when dialog opens
  useEffect(() => {
    if (open && rfq?.id && rfq.status === 'awarded') {
      loadWinnerQuote();
    }
  }, [open, rfq?.id, rfq?.status]);

  const loadWinnerQuote = async () => {
    if (!rfq?.id) return;
    
    setIsLoading(true);
    try {
      const quotes = await fetchQuotesByRFQ(rfq.id);
      const winner = quotes.find(q => q.is_winner);
      
      if (winner) {
        setWinnerQuote(winner);
        const lines = await fetchQuoteLines(winner.id);
        setQuoteLines(lines);
        // Select all lines by default
        setSelectedLines(new Set(lines.map(l => l.id)));
        
        // Set expected date from quote delivery days
        if (winner.delivery_days) {
          const date = new Date();
          date.setDate(date.getDate() + winner.delivery_days);
          setExpectedDate(date.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error loading winner quote:', error);
      toast.error('Error al cargar cotización ganadora');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLine = (lineId: string) => {
    const newSelected = new Set(selectedLines);
    if (newSelected.has(lineId)) {
      newSelected.delete(lineId);
    } else {
      newSelected.add(lineId);
    }
    setSelectedLines(newSelected);
  };

  const toggleAllLines = () => {
    if (selectedLines.size === quoteLines.length) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(quoteLines.map(l => l.id)));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const calculateTotals = () => {
    const selectedLinesData = quoteLines.filter(l => selectedLines.has(l.id));
    const subtotal = selectedLinesData.reduce((sum, l) => sum + l.subtotal, 0);
    const taxAmount = selectedLinesData.reduce((sum, l) => sum + (l.subtotal * l.tax_rate / 100), 0);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleConvert = async () => {
    if (!winnerQuote || selectedLines.size === 0) {
      toast.error('Selecciona al menos una línea');
      return;
    }

    setIsSaving(true);
    try {
      const totals = calculateTotals();
      const selectedLinesData = quoteLines.filter(l => selectedLines.has(l.id));
      
      const poLines = selectedLinesData.map((line, idx) => ({
        line_number: idx + 1,
        item_id: line.product_id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
        tax_rate: line.tax_rate,
        subtotal: line.subtotal,
        received_qty: 0
      }));

      const result = await createPurchaseOrder(
        {
          supplier_id: winnerQuote.supplier_id,
          order_date: new Date().toISOString().split('T')[0],
          expected_date: expectedDate || undefined,
          status: 'draft',
          currency: winnerQuote.currency || 'EUR',
          exchange_rate: 1,
          subtotal: totals.subtotal,
          tax_total: totals.taxAmount,
          total: totals.total,
          notes: notes || `Generado desde RFQ ${rfq?.rfq_number} - Cotización ${winnerQuote.quote_number || winnerQuote.id.slice(0, 8)}`
        },
        poLines
      );

      if (result) {
        toast.success('Orden de compra creada exitosamente');
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error creating PO:', error);
      toast.error('Error al crear orden de compra');
    } finally {
      setIsSaving(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Convertir a Orden de Compra
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !winnerQuote ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontró cotización ganadora para este RFQ
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="space-y-6 p-1">
              {/* Winner Quote Summary */}
              <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Cotización Ganadora
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>
                    <p className="font-medium">{winnerQuote.supplier_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nº Cotización:</span>
                    <p className="font-medium">{winnerQuote.quote_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Condiciones pago:</span>
                    <p className="font-medium">{winnerQuote.payment_terms || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plazo entrega:</span>
                    <p className="font-medium">{winnerQuote.delivery_days ? `${winnerQuote.delivery_days} días` : '-'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PO Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedDate" className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Fecha entrega prevista
                  </Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales para la orden de compra..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Lines Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    Líneas a incluir ({selectedLines.size} de {quoteLines.length})
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={toggleAllLines}
                  >
                    {selectedLines.size === quoteLines.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                </div>
                
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Unit.</TableHead>
                        <TableHead className="text-right">Dto %</TableHead>
                        <TableHead className="text-right">IVA %</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteLines.map((line) => (
                        <TableRow 
                          key={line.id}
                          className={selectedLines.has(line.id) ? '' : 'opacity-50'}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLines.has(line.id)}
                              onCheckedChange={() => toggleLine(line.id)}
                            />
                          </TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">{line.quantity} {line.unit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                          <TableCell className="text-right">{line.discount_percent}%</TableCell>
                          <TableCell className="text-right">{line.tax_rate}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(line.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impuestos:</span>
                      <span>{formatCurrency(totals.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>Total orden:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConvert}
            disabled={isSaving || isLoading || !winnerQuote || selectedLines.size === 0}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            <ShoppingCart className="h-4 w-4" />
            Crear Orden de Compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConvertToPODialog;
