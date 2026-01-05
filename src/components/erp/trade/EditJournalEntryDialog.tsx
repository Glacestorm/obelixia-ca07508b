/**
 * EditJournalEntryDialog - Diálogo para editar asientos contables
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Search,
  Loader2
} from 'lucide-react';
import { useERPJournalEntries, JournalEntry, JournalEntryLine } from '@/hooks/erp/useERPJournalEntries';
import { useERPAccounting } from '@/hooks/erp/useERPAccounting';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EditJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  onSaved?: () => void;
}

interface EditableLine {
  id?: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

export function EditJournalEntryDialog({
  open,
  onOpenChange,
  entryId,
  onSaved
}: EditJournalEntryDialogProps) {
  const { currentCompany } = useERPContext();
  const { fetchEntry, updateEntry, isLoading: isLoadingEntry } = useERPJournalEntries();
  const { chartOfAccounts, fetchChartOfAccounts, isLoading: isLoadingAccounts } = useERPAccounting();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);

  // Cargar asiento
  useEffect(() => {
    if (open && entryId) {
      fetchEntry(entryId).then((data) => {
        if (data) {
          setEntry(data);
          setDescription(data.description || '');
          setReference(data.reference || '');
          setLines((data.lines || []).map(line => ({
            id: line.id,
            account_id: line.account_id,
            account_code: line.account_code || '',
            account_name: line.account_name || '',
            debit_amount: line.debit_amount,
            credit_amount: line.credit_amount,
            description: line.description || ''
          })));
        }
      });
      fetchChartOfAccounts();
    }
  }, [open, entryId, fetchEntry, fetchChartOfAccounts]);

  // Cuentas filtradas
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return chartOfAccounts.filter(a => a.accepts_entries !== false).slice(0, 20);
    const term = accountSearch.toLowerCase();
    return chartOfAccounts
      .filter(a => a.accepts_entries !== false && (
        a.account_code?.toLowerCase().includes(term) ||
        a.account_name?.toLowerCase().includes(term)
      ))
      .slice(0, 20);
  }, [chartOfAccounts, accountSearch]);

  // Totales
  const totals = useMemo(() => {
    const debit = lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const credit = lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
    const diff = Math.abs(debit - credit);
    const isBalanced = diff < 0.01;
    return { debit, credit, diff, isBalanced };
  }, [lines]);

  // Añadir línea
  const handleAddLine = () => {
    setLines([...lines, {
      account_id: '',
      account_code: '',
      account_name: '',
      debit_amount: 0,
      credit_amount: 0,
      description: ''
    }]);
  };

  // Eliminar línea
  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Actualizar línea
  const handleLineChange = (index: number, field: keyof EditableLine, value: any) => {
    setLines(lines.map((line, i) => {
      if (i !== index) return line;
      return { ...line, [field]: value };
    }));
  };

  // Seleccionar cuenta
  const handleSelectAccount = (index: number, account: any) => {
    setLines(lines.map((line, i) => {
      if (i !== index) return line;
      return {
        ...line,
        account_id: account.id,
        account_code: account.account_code,
        account_name: account.account_name
      };
    }));
    setEditingLineIndex(null);
    setAccountSearch('');
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!entry) return;

    // Validaciones
    if (!totals.isBalanced) {
      toast.error('El asiento no está cuadrado');
      return;
    }

    if (lines.length < 2) {
      toast.error('El asiento debe tener al menos 2 líneas');
      return;
    }

    const invalidLines = lines.filter(l => !l.account_id);
    if (invalidLines.length > 0) {
      toast.error('Todas las líneas deben tener una cuenta seleccionada');
      return;
    }

    setIsSaving(true);
    try {
      const linesToSave = lines.map((line, index) => ({
        id: line.id,
        line_number: index + 1,
        account_id: line.account_id,
        account_code: line.account_code,
        account_name: line.account_name,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        description: line.description
      }));

      const result = await updateEntry(entryId, {
        description,
        reference
      }, linesToSave);

      if (result) {
        onOpenChange(false);
        onSaved?.();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Formateo
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const isLoading = isLoadingEntry || isLoadingAccounts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Asiento
            {entry && (
              <Badge variant="outline" className="font-mono">
                {entry.entry_number}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Modifica las líneas del asiento. El asiento debe estar cuadrado para guardar.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entry?.is_posted ? (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-700 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
            <span>Este asiento está contabilizado y no puede editarse. Use anulación.</span>
          </div>
        ) : (
          <>
            {/* Campos generales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del asiento"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Referencia externa"
                />
              </div>
            </div>

            {/* Tabla de líneas */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <Label>Líneas del asiento</Label>
                <Button variant="outline" size="sm" onClick={handleAddLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir línea
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Cuenta</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-32">Descripción</TableHead>
                      <TableHead className="w-28 text-right">Debe</TableHead>
                      <TableHead className="w-28 text-right">Haber</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Popover
                            open={editingLineIndex === index}
                            onOpenChange={(open) => {
                              if (open) setEditingLineIndex(index);
                              else setEditingLineIndex(null);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "w-full justify-start font-mono text-xs",
                                  !line.account_code && "text-muted-foreground"
                                )}
                              >
                                {line.account_code || 'Seleccionar...'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Buscar cuenta..."
                                  value={accountSearch}
                                  onValueChange={setAccountSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>No hay cuentas</CommandEmpty>
                                  <CommandGroup>
                                    {filteredAccounts.map((account) => (
                                      <CommandItem
                                        key={account.id}
                                        value={`${account.account_code} ${account.account_name}`}
                                        onSelect={() => handleSelectAccount(index, account)}
                                      >
                                        <span className="font-mono text-xs mr-2">
                                          {account.account_code}
                                        </span>
                                        <span className="text-sm truncate">
                                          {account.account_name}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">
                          {line.account_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Desc."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.debit_amount || ''}
                            onChange={(e) => handleLineChange(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right font-mono text-xs"
                            step="0.01"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.credit_amount || ''}
                            onChange={(e) => handleLineChange(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right font-mono text-xs"
                            step="0.01"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveLine(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Totales */}
              <div className="flex items-center justify-between mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total Debe:</span>
                    <span className="font-mono font-medium text-blue-600">
                      {formatNumber(totals.debit)} €
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total Haber:</span>
                    <span className="font-mono font-medium text-green-600">
                      {formatNumber(totals.credit)} €
                    </span>
                  </div>
                </div>
                <div>
                  {totals.isBalanced ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Cuadrado
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Descuadre: {formatNumber(totals.diff)} €
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !totals.isBalanced || lines.length < 2}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar cambios
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EditJournalEntryDialog;
