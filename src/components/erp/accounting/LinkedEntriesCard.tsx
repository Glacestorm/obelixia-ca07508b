/**
 * LinkedEntriesCard
 * Componente reutilizable para mostrar asientos contables vinculados a un documento
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BookOpen,
  ChevronDown,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useERPDocumentAccounting, DocumentType, LinkedEntry } from '@/hooks/erp/useERPDocumentAccounting';
import { useERPAutoAccounting } from '@/hooks/erp/useERPAutoAccounting';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LinkedEntriesCardProps {
  documentType: DocumentType;
  documentId: string;
  documentNumber?: string;
  onPostDocument?: () => Promise<void>;
  onViewEntry?: (entryId: string) => void;
  showPostButton?: boolean;
  className?: string;
}

export function LinkedEntriesCard({
  documentType,
  documentId,
  documentNumber,
  onPostDocument,
  onViewEntry,
  showPostButton = true,
  className
}: LinkedEntriesCardProps) {
  const [entries, setEntries] = useState<LinkedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entryId?: string; createReversal?: boolean }>({
    open: false
  });

  const { getDocumentEntries, postSalesInvoice, postSupplierInvoice } = useERPDocumentAccounting();
  const { deleteLinkedEntry, regenerateFromOperation } = useERPAutoAccounting();

  // Cargar asientos vinculados
  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const data = await getDocumentEntries(documentType, documentId);
      setEntries(data);
    } catch (err) {
      console.error('Error loading linked entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      loadEntries();
    }
  }, [documentId, documentType]);

  // Contabilizar documento
  const handlePostDocument = async () => {
    setIsPosting(true);
    try {
      if (onPostDocument) {
        await onPostDocument();
      } else {
        // Contabilización automática según tipo
        switch (documentType) {
          case 'sales_invoice':
            await postSalesInvoice(documentId, { autoPost: true });
            break;
          case 'supplier_invoice':
            await postSupplierInvoice(documentId, { autoPost: true });
            break;
        }
      }
      await loadEntries();
    } finally {
      setIsPosting(false);
    }
  };

  // Eliminar/Anular asiento
  const handleDeleteEntry = async () => {
    if (!deleteDialog.entryId) return;

    try {
      await deleteLinkedEntry(deleteDialog.entryId, {
        createReversal: deleteDialog.createReversal,
        reason: deleteDialog.createReversal ? 'Anulación desde documento' : 'Eliminación desde documento'
      });
      await loadEntries();
    } finally {
      setDeleteDialog({ open: false });
    }
  };

  // Regenerar asiento desde documento
  const handleRegenerate = async () => {
    setIsPosting(true);
    try {
      await regenerateFromOperation(documentType, documentId, {});
      await loadEntries();
    } finally {
      setIsPosting(false);
    }
  };

  // Estado del documento
  const hasPostedEntry = entries.some(e => e.is_posted && !e.is_reversed);
  const hasDraftEntry = entries.some(e => !e.is_posted && !e.is_reversed);
  const allReversed = entries.length > 0 && entries.every(e => e.is_reversed);

  const getDocumentTypeLabel = () => {
    switch (documentType) {
      case 'sales_invoice': return 'Factura de Venta';
      case 'supplier_invoice': return 'Factura de Proveedor';
      case 'sales_credit_note': return 'Abono de Venta';
      case 'purchase_credit_note': return 'Abono de Compra';
      case 'payment_received': return 'Cobro';
      case 'payment_made': return 'Pago';
      default: return 'Documento';
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Asientos Contables
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadEntries}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            {showPostButton && !hasPostedEntry && (
              <Button
                size="sm"
                onClick={handlePostDocument}
                disabled={isPosting}
                className="h-8"
              >
                {isPosting ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Contabilizar
              </Button>
            )}
          </div>
        </div>
        
        {/* Estado resumen */}
        <div className="flex items-center gap-2 mt-2">
          {hasPostedEntry && (
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Contabilizado
            </Badge>
          )}
          {hasDraftEntry && !hasPostedEntry && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
              <Clock className="h-3 w-3 mr-1" />
              Borrador
            </Badge>
          )}
          {allReversed && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              Anulado
            </Badge>
          )}
          {entries.length === 0 && !isLoading && (
            <Badge variant="outline" className="text-muted-foreground">
              Sin contabilizar
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay asientos vinculados</p>
            {showPostButton && (
              <p className="text-xs mt-1">
                Haz clic en "Contabilizar" para generar el asiento automáticamente
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Asiento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Diario</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className={entry.is_reversed ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {entry.entry_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {entry.journal_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(entry.total_debit)}
                    </TableCell>
                    <TableCell>
                      {entry.is_reversed ? (
                        <Badge variant="outline" className="text-red-600 text-xs">
                          Anulado
                        </Badge>
                      ) : entry.is_posted ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 text-xs">
                          Contabilizado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Borrador
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewEntry?.(entry.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver asiento
                          </DropdownMenuItem>
                          {!entry.is_reversed && !entry.is_posted && (
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                entryId: entry.id,
                                createReversal: false 
                              })}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                          {!entry.is_reversed && entry.is_posted && (
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                entryId: entry.id,
                                createReversal: true 
                              })}
                              className="text-destructive"
                            >
                              <Undo2 className="h-4 w-4 mr-2" />
                              Anular (contrasiento)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Acción de regenerar si hay errores */}
        {entries.length > 0 && hasDraftEntry && (
          <div className="mt-3 pt-3 border-t flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isPosting}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isPosting && 'animate-spin')} />
              Regenerar desde documento
            </Button>
          </div>
        )}
      </CardContent>

      {/* Dialog de confirmación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.createReversal ? '¿Anular asiento?' : '¿Eliminar asiento?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.createReversal
                ? 'Se creará un contrasiento para anular este asiento. Esta acción no se puede deshacer.'
                : 'El asiento será eliminado permanentemente. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDialog.createReversal ? 'Anular' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default LinkedEntriesCard;
