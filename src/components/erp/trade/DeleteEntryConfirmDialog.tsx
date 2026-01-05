/**
 * DeleteEntryConfirmDialog - Diálogo para confirmar eliminación/anulación de asientos
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Trash2,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string | null;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  is_reversed: boolean;
}

interface DeleteEntryConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LinkedEntry;
  onConfirm: (createReversal: boolean, reason?: string) => Promise<void>;
}

export function DeleteEntryConfirmDialog({
  open,
  onOpenChange,
  entry,
  onConfirm
}: DeleteEntryConfirmDialogProps) {
  const [deleteMode, setDeleteMode] = useState<'delete' | 'reverse'>(
    entry.is_posted ? 'reverse' : 'delete'
  );
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(deleteMode === 'reverse', reason || undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const isPosted = entry.is_posted;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isPosted ? 'Anular Asiento' : 'Eliminar Asiento'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {isPosted
                  ? 'Este asiento está contabilizado. Solo puede anularse creando un contraasiento.'
                  : '¿Estás seguro de que deseas eliminar este asiento?'}
              </p>

              {/* Info del asiento */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Número:</span>
                  <Badge variant="outline" className="font-mono">
                    {entry.entry_number}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Importe:</span>
                  <span className="font-mono font-medium">
                    {formatNumber(entry.total_debit)} €
                  </span>
                </div>
                {entry.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Descripción:</span>
                    <p className="text-sm mt-1">{entry.description}</p>
                  </div>
                )}
              </div>

              {/* Modo de eliminación (solo para borradores) */}
              {!isPosted && (
                <div className="space-y-3">
                  <Label>Acción a realizar:</Label>
                  <RadioGroup
                    value={deleteMode}
                    onValueChange={(value) => setDeleteMode(value as 'delete' | 'reverse')}
                  >
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="delete" id="delete" className="mt-0.5" />
                      <div className="space-y-1">
                        <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          Eliminar definitivamente
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          El asiento se eliminará de forma permanente. Esta acción no se puede deshacer.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="reverse" id="reverse" className="mt-0.5" />
                      <div className="space-y-1">
                        <Label htmlFor="reverse" className="flex items-center gap-2 cursor-pointer">
                          <RotateCcw className="h-4 w-4 text-yellow-600" />
                          Anular con contraasiento
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Se creará un asiento inverso. Mantiene el historial contable.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Motivo (obligatorio para anulación) */}
              {(isPosted || deleteMode === 'reverse') && (
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Motivo de anulación
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Indica el motivo de la anulación..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || ((isPosted || deleteMode === 'reverse') && !reason.trim())}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : deleteMode === 'reverse' || isPosted ? (
              <RotateCcw className="h-4 w-4 mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            {deleteMode === 'reverse' || isPosted ? 'Anular' : 'Eliminar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteEntryConfirmDialog;
