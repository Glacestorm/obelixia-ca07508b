/**
 * GALIA - Tabla de gastos justificados
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileText } from 'lucide-react';
import { GastoJustificacion, PARTIDAS_PRESUPUESTARIAS } from './types';

interface GastosTableProps {
  gastos: GastoJustificacion[];
  onRemove: (id: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function GastosTable({ gastos, onRemove }: GastosTableProps) {
  if (gastos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No hay gastos registrados</p>
          <p className="text-sm text-muted-foreground mt-1">
            Añade gastos desde la pestaña "Añadir gasto"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gastos registrados</CardTitle>
        <CardDescription>{gastos.length} gasto(s) en total</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Partida</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map(gasto => {
                const partida = PARTIDAS_PRESUPUESTARIAS.find(p => p.id === gasto.partida);
                return (
                  <TableRow key={gasto.id}>
                    <TableCell className="font-medium">{gasto.numeroFactura}</TableCell>
                    <TableCell>{gasto.fechaFactura}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{gasto.proveedor}</div>
                        {gasto.nifProveedor && (
                          <div className="text-xs text-muted-foreground">{gasto.nifProveedor}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partida?.elegible ? 'default' : 'secondary'} className="text-xs">
                        {partida?.nombre.split(' ')[0]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(gasto.baseImponible)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(gasto.iva)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(gasto.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {gasto.medioPago}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(gasto.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
