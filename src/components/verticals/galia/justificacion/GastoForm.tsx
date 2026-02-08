/**
 * GALIA - Formulario de nuevo gasto
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Building2, Euro, CreditCard } from 'lucide-react';
import { GastoJustificacion, PARTIDAS_PRESUPUESTARIAS } from './types';

interface GastoFormProps {
  nuevoGasto: Partial<GastoJustificacion>;
  setNuevoGasto: (value: React.SetStateAction<Partial<GastoJustificacion>>) => void;
  onAdd: () => void;
}

export function GastoForm({ nuevoGasto, setNuevoGasto, onAdd }: GastoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nuevo gasto justificado</CardTitle>
        <CardDescription>
          Introduce los datos de la factura y el pago correspondiente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Datos de factura */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Datos de la factura
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroFactura">Nº Factura *</Label>
              <Input
                id="numeroFactura"
                placeholder="F-2026-001"
                value={nuevoGasto.numeroFactura || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, numeroFactura: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFactura">Fecha factura *</Label>
              <Input
                id="fechaFactura"
                type="date"
                value={nuevoGasto.fechaFactura || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, fechaFactura: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partida">Partida presupuestaria *</Label>
              <Select 
                value={nuevoGasto.partida}
                onValueChange={(value) => setNuevoGasto(prev => ({ ...prev, partida: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {PARTIDAS_PRESUPUESTARIAS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className={!p.elegible ? 'text-muted-foreground' : ''}>
                        {p.nombre}
                        {!p.elegible && ' (no elegible)'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Datos del proveedor */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Datos del proveedor
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proveedor">Nombre/Razón social *</Label>
              <Input
                id="proveedor"
                placeholder="Empresa Proveedora S.L."
                value={nuevoGasto.proveedor || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, proveedor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nifProveedor">NIF/CIF</Label>
              <Input
                id="nifProveedor"
                placeholder="B12345678"
                value={nuevoGasto.nifProveedor || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, nifProveedor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concepto">Concepto</Label>
              <Input
                id="concepto"
                placeholder="Descripción del bien/servicio"
                value={nuevoGasto.concepto || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, concepto: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Importes */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Importes
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseImponible">Base imponible (€)</Label>
              <Input
                id="baseImponible"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={nuevoGasto.baseImponible || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, baseImponible: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iva">IVA (€)</Label>
              <Input
                id="iva"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={nuevoGasto.iva || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, iva: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                {((nuevoGasto.baseImponible || 0) + (nuevoGasto.iva || 0)).toFixed(2)} €
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Datos de pago */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Datos del pago
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaPago">Fecha de pago</Label>
              <Input
                id="fechaPago"
                type="date"
                value={nuevoGasto.fechaPago || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, fechaPago: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medioPago">Medio de pago</Label>
              <Select 
                value={nuevoGasto.medioPago}
                onValueChange={(value: 'transferencia' | 'domiciliacion' | 'tarjeta' | 'efectivo') => 
                  setNuevoGasto(prev => ({ ...prev, medioPago: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                  <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="efectivo">Efectivo (máx. 1.000€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas adicionales..."
                className="h-10 min-h-[40px]"
                value={nuevoGasto.observaciones || ''}
                onChange={(e) => setNuevoGasto(prev => ({ ...prev, observaciones: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Button onClick={onAdd} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Añadir gasto
        </Button>
      </CardContent>
    </Card>
  );
}
