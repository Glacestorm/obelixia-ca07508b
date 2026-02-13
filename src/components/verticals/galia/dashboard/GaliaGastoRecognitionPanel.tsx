/**
 * GALIA - Panel de Reconocimiento de Gastos
 * OCR para extracción de facturas y clasificación presupuestaria
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, AlertCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export function GaliaGastoRecognitionPanel() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = () => {
    setIsProcessing(true);
    // Simulación de proceso OCR
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('3 facturas procesadas y clasificadas');
    }, 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Reconocimiento de Gastos
          </CardTitle>
          <Button size="sm" onClick={handleUpload} disabled={isProcessing}>
            {isProcessing ? 'Procesando...' : 'Subir Facturas'}
            <Upload className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto OCR</TableHead>
              <TableHead>Partida LEADER</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Suministros Ind. SL</TableCell>
              <TableCell>12/01/2026</TableCell>
              <TableCell className="text-xs text-muted-foreground">Tractor John Deere 5100M</TableCell>
              <TableCell><Badge variant="outline">Maquinaria</Badge></TableCell>
              <TableCell className="text-right">45.000 €</TableCell>
              <TableCell className="text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Reformas Pepe</TableCell>
              <TableCell>15/01/2026</TableCell>
              <TableCell className="text-xs text-muted-foreground">Adecuación nave ganadera</TableCell>
              <TableCell><Badge variant="outline">Obra Civil</Badge></TableCell>
              <TableCell className="text-right">12.500 €</TableCell>
              <TableCell className="text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
            </TableRow>
            <TableRow className="bg-destructive/5">
              <TableCell className="font-medium">Informática Local</TableCell>
              <TableCell>20/01/2026</TableCell>
              <TableCell className="text-xs text-muted-foreground">Portátil HP + Impresora</TableCell>
              <TableCell><Badge variant="outline">Equipamiento</Badge></TableCell>
              <TableCell className="text-right">1.200 €</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1 text-destructive text-xs font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Efectivo?
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default GaliaGastoRecognitionPanel;
