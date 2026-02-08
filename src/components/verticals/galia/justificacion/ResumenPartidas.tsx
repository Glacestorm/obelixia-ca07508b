/**
 * GALIA - Resumen por partidas
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ResumenPartida, JustificacionTotales } from './types';

interface ResumenPartidasProps {
  resumenPartidas: ResumenPartida[];
  totales: JustificacionTotales;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function ResumenPartidas({ resumenPartidas, totales }: ResumenPartidasProps) {
  return (
    <div className="space-y-6">
      {/* Totales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen general</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total base imponible:</span>
                <span className="font-medium">{formatCurrency(totales.baseTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total IVA:</span>
                <span className="font-medium">{formatCurrency(totales.ivaTotal)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-medium">Total justificado:</span>
                <span className="font-bold">{formatCurrency(totales.totalJustificado)}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gasto elegible:</span>
                <span className="font-medium text-primary">{formatCurrency(totales.elegibleTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ayuda estimada:</span>
                <span className="font-medium text-emerald-600">{formatCurrency(totales.ayudaCalculada)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ejecución</span>
                  <span>{totales.porcentajeEjecucion.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(totales.porcentajeEjecucion, 100)} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Por partidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desglose por partidas</CardTitle>
          <CardDescription>Comparativa presupuestado vs justificado</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partida</TableHead>
                  <TableHead className="text-right">Presupuestado</TableHead>
                  <TableHead className="text-right">Justificado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="text-right">% Ejecución</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenPartidas.map(partida => (
                  <TableRow key={partida.partida}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {partida.elegible ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm">{partida.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(partida.presupuestado)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(partida.justificado)}</TableCell>
                    <TableCell className={`text-right ${partida.diferencia < 0 ? 'text-amber-600' : ''}`}>
                      {formatCurrency(partida.diferencia)}
                    </TableCell>
                    <TableCell className="text-right">{partida.porcentaje.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge 
                        variant={partida.porcentaje >= 100 ? 'default' : partida.porcentaje >= 50 ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {partida.porcentaje >= 100 ? 'Completo' : partida.porcentaje >= 50 ? 'En progreso' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
