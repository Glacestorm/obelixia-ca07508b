/**
 * OperationAccountingPanel - Panel para mostrar asientos vinculados a operaciones
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BookOpen,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useERPAutoAccounting } from '@/hooks/erp/useERPAutoAccounting';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { EditJournalEntryDialog } from './EditJournalEntryDialog';
import { DeleteEntryConfirmDialog } from './DeleteEntryConfirmDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LinkedEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string | null;
  reference: string | null;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  is_reversed: boolean;
  created_at: string;
  journal_name?: string;
}

interface OperationAccountingPanelProps {
  sourceType: 'commercial_discount' | 'factoring' | 'confirming' | 'letter_of_credit' | 'guarantee';
  sourceId: string;
  operationData?: {
    amount?: number;
    interestAmount?: number;
    commissionAmount?: number;
    expenses?: number;
    netAmount?: number;
    currency?: string;
  };
  onAccountingChange?: () => void;
  className?: string;
  showGenerateButton?: boolean;
}

export function OperationAccountingPanel({
  sourceType,
  sourceId,
  operationData,
  onAccountingChange,
  className,
  showGenerateButton = true
}: OperationAccountingPanelProps) {
  const { currentCompany } = useERPContext();
  const {
    getLinkedEntries,
    generateEntry,
    createAndLinkJournalEntry,
    deleteLinkedEntry,
    regenerateFromOperation,
    isLoading
  } = useERPAutoAccounting();

  const [entries, setEntries] = useState<LinkedEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LinkedEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LinkedEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Cargar asientos vinculados
  const fetchLinkedEntries = useCallback(async () => {
    if (!sourceId) return;

    setIsLoadingEntries(true);
    try {
      const data = await getLinkedEntries(sourceType, sourceId);
      setEntries(data || []);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [sourceType, sourceId, getLinkedEntries]);

  useEffect(() => {
    fetchLinkedEntries();
  }, [fetchLinkedEntries]);

  // Generar asiento automáticamente
  const handleGenerateEntry = async () => {
    if (!operationData?.amount) return;

    setIsGenerating(true);
    try {
      // Mapear sourceType a operationCategory y operationType
      const operationConfig = getOperationConfig();

      const result = await generateEntry(
        operationConfig.category,
        operationConfig.type,
        operationConfig.transactionType,
        {
          amount: operationData.amount,
          interest_amount: operationData.interestAmount || 0,
          commission_amount: operationData.commissionAmount || 0,
          expenses: operationData.expenses || 0,
          net_amount: operationData.netAmount || 0,
          currency: operationData.currency || 'EUR'
        }
      );

      if (result?.entry) {
        await createAndLinkJournalEntry(result.entry, sourceType, sourceId, {
          autoPost: result.auto_post
        });
        fetchLinkedEntries();
        onAccountingChange?.();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Configuración por tipo de operación
  const getOperationConfig = () => {
    switch (sourceType) {
      case 'commercial_discount':
        return { category: 'trade_finance', type: 'commercial_discount', transactionType: 'discount', title: 'Descuento Comercial' };
      case 'factoring':
        return { category: 'trade_finance', type: 'factoring', transactionType: 'advance', title: 'Factoring' };
      case 'confirming':
        return { category: 'trade_finance', type: 'confirming', transactionType: 'payment', title: 'Confirming' };
      case 'letter_of_credit':
        return { category: 'trade_finance', type: 'documentary_credit', transactionType: 'opening', title: 'Crédito Documentario' };
      case 'guarantee':
        return { category: 'trade_finance', type: 'guarantee', transactionType: 'constitution', title: 'Aval Bancario' };
      default:
        return { category: 'trade_finance', type: 'other', transactionType: 'other', title: 'Operación' };
    }
  };

  const operationConfig = getOperationConfig();

  // Regenerar desde operación
  const handleRegenerate = async () => {
    if (!operationData) return;
    setIsGenerating(true);
    try {
      await regenerateFromOperation(sourceType, sourceId, operationData);
      fetchLinkedEntries();
      onAccountingChange?.();
    } finally {
      setIsGenerating(false);
    }
  };

  // Editar asiento
  const handleEdit = (entry: LinkedEntry) => {
    if (entry.is_posted) return; // Solo borradores editables
    setEditingEntry(entry);
    setShowEditDialog(true);
  };

  // Eliminar/Anular asiento
  const handleDelete = (entry: LinkedEntry) => {
    setDeletingEntry(entry);
    setShowDeleteDialog(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async (createReversal: boolean, reason?: string) => {
    if (!deletingEntry) return;

    const success = await deleteLinkedEntry(deletingEntry.id, {
      createReversal,
      reason
    });

    if (success) {
      setShowDeleteDialog(false);
      setDeletingEntry(null);
      fetchLinkedEntries();
      onAccountingChange?.();
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

  // Estado de contabilización
  const getStatusBadge = (entry: LinkedEntry) => {
    if (entry.is_reversed) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          <XCircle className="h-3 w-3 mr-1" />
          Anulado
        </Badge>
      );
    }
    if (entry.is_posted) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Contabilizado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Borrador
      </Badge>
    );
  };

  const hasEntries = entries.length > 0;
  const hasDraftEntries = entries.some(e => !e.is_posted && !e.is_reversed);
  const allPosted = entries.length > 0 && entries.every(e => e.is_posted || e.is_reversed);

  return (
    <>
      <Card className={cn('border-dashed', className)}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">
                Contabilidad - {operationConfig.title}
              </CardTitle>
              {hasEntries && (
                <Badge variant="secondary" className="ml-2">
                  {entries.length} asiento{entries.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {allPosted && hasEntries && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Contabilizado
                </Badge>
              )}
              {hasDraftEntries && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pendiente
                </Badge>
              )}
              {!hasEntries && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  Sin contabilizar
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            {showGenerateButton && !hasEntries && (
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateEntry}
                disabled={isGenerating || !operationData?.amount}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Generar Asiento
              </Button>
            )}

            {hasEntries && hasDraftEntries && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Regenerar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recalcular asientos desde datos de la operación</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLinkedEntries}
              disabled={isLoadingEntries}
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingEntries && "animate-spin")} />
            </Button>
          </div>

          {/* Tabla de asientos */}
          {hasEntries ? (
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Número</TableHead>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-24 text-right">Importe</TableHead>
                    <TableHead className="w-28">Estado</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={cn(
                        entry.is_reversed && 'opacity-50 line-through'
                      )}
                    >
                      <TableCell className="font-mono text-sm">
                        {entry.entry_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(entry.entry_date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {entry.description || '-'}
                          {entry.journal_name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({entry.journal_name})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(entry.total_debit)} €
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {/* Ver detalle */}}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalle</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {!entry.is_posted && !entry.is_reversed && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEdit(entry)}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(entry)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}

                          {entry.is_posted && !entry.is_reversed && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(entry)}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Anular</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay asientos contables vinculados</p>
              <p className="text-xs mt-1">Genera un asiento automático o crea uno manualmente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      {editingEntry && (
        <EditJournalEntryDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          entryId={editingEntry.id}
          onSaved={() => {
            fetchLinkedEntries();
            onAccountingChange?.();
          }}
        />
      )}

      {deletingEntry && (
        <DeleteEntryConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          entry={deletingEntry}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

export default OperationAccountingPanel;
