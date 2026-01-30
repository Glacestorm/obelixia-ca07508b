/**
 * Intrastat Declaration Editor - Editor de líneas de declaración
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
} from 'lucide-react';
import { 
  useERPIntrastat, 
  IntrastatDeclaration, 
  IntrastatLine,
  EU_COUNTRIES,
  TRANSPORT_MODES,
  NATURE_OF_TRANSACTION,
} from '@/hooks/erp/useERPIntrastat';
import { IntrastatLineEditor } from './IntrastatLineEditor';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IntrastatDeclarationEditorProps {
  declaration: IntrastatDeclaration;
}

export function IntrastatDeclarationEditor({ declaration }: IntrastatDeclarationEditorProps) {
  const { lines, addLine, updateLine, deleteLine } = useERPIntrastat();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<IntrastatLine | null>(null);

  const declarationLines = lines.filter(l => l.declaration_id === declaration.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getCountryName = (code: string) => {
    return EU_COUNTRIES.find(c => c.code === code)?.name || code;
  };

  const getTransportName = (code: string) => {
    return TRANSPORT_MODES.find(t => t.code === code)?.name || code;
  };

  const getNatureTransactionName = (code: string) => {
    return NATURE_OF_TRANSACTION.find(n => n.code === code)?.name || code;
  };

  const handleAddLine = async (lineData: Partial<IntrastatLine>) => {
    await addLine(declaration.id, lineData);
    setShowAddDialog(false);
  };

  const handleUpdateLine = async (lineData: Partial<IntrastatLine>) => {
    if (editingLine) {
      await updateLine(editingLine.id, lineData);
      setEditingLine(null);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (confirm('¿Eliminar esta línea?')) {
      await deleteLine(lineId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Líneas</p>
          <p className="text-xl font-bold">{declaration.total_lines}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor factura</p>
          <p className="text-xl font-bold">{formatCurrency(declaration.total_value)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor estadístico</p>
          <p className="text-xl font-bold">{formatCurrency(declaration.total_statistical_value)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Masa neta</p>
          <p className="text-xl font-bold">{declaration.total_net_mass?.toFixed(2)} kg</p>
        </div>
      </div>

      {/* Add Line Button */}
      <div className="flex justify-end">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Añadir línea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva línea Intrastat</DialogTitle>
              <DialogDescription>
                Introduce los datos de la mercancía
              </DialogDescription>
            </DialogHeader>
            <IntrastatLineEditor
              direction={declaration.direction}
              onSave={handleAddLine}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Lines Table */}
      <ScrollArea className="h-[400px]">
        {declarationLines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay líneas en esta declaración</p>
            <p className="text-sm mt-1">Añade líneas con el botón superior</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Código CN8</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead className="text-right">Masa (kg)</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {declarationLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.line_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {line.commodity_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="truncate">{line.commodity_description}</p>
                      {line.partner_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {line.partner_name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCountryName(line.country_of_destination || line.country_of_origin || '')}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {getTransportName(line.transport_mode)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {line.net_mass.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(line.invoice_value)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingLine(line)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteLine(line.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={!!editingLine} onOpenChange={() => setEditingLine(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar línea #{editingLine?.line_number}</DialogTitle>
            <DialogDescription>
              Modifica los datos de la mercancía
            </DialogDescription>
          </DialogHeader>
          {editingLine && (
            <IntrastatLineEditor
              direction={declaration.direction}
              initialData={editingLine}
              onSave={handleUpdateLine}
              onCancel={() => setEditingLine(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IntrastatDeclarationEditor;
