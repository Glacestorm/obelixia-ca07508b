/**
 * ShipmentForm - Formulario de creación/edición de envíos
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  Plus,
  Trash2,
  Calculator,
  Sparkles,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPLogistics, LogisticsShipment, LogisticsCarrier } from '@/hooks/erp/useERPLogistics';

interface PackageLine {
  id: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  description: string;
}

interface ShipmentFormProps {
  carriers: LogisticsCarrier[];
  shipment?: LogisticsShipment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShipmentForm({ carriers, shipment, onClose, onSuccess }: ShipmentFormProps) {
  const { createShipment, updateShipment } = useERPLogistics();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAccounting, setAutoAccounting] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    carrier_id: shipment?.carrier_id || '',
    service_type: shipment?.service_type || 'standard',
    // Origin
    origin_name: shipment?.origin_name || '',
    origin_address: shipment?.origin_address || '',
    origin_city: shipment?.origin_city || '',
    origin_postal_code: shipment?.origin_postal_code || '',
    origin_country: shipment?.origin_country || 'ES',
    origin_phone: shipment?.origin_phone || '',
    origin_email: shipment?.origin_email || '',
    // Destination
    destination_name: shipment?.destination_name || '',
    destination_address: shipment?.destination_address || '',
    destination_city: shipment?.destination_city || '',
    destination_postal_code: shipment?.destination_postal_code || '',
    destination_country: shipment?.destination_country || 'ES',
    destination_phone: shipment?.destination_phone || '',
    destination_email: shipment?.destination_email || '',
    // Options
    cash_on_delivery: shipment?.cash_on_delivery || 0,
    insurance_value: shipment?.insurance_value || 0,
    notes: shipment?.notes || '',
  });

  const [packages, setPackages] = useState<PackageLine[]>([
    { id: '1', weight: 1, length: 30, width: 20, height: 10, description: 'Bulto 1' },
  ]);

  const activeCarriers = carriers.filter((c) => c.is_active);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addPackage = () => {
    setPackages((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        weight: 1,
        length: 30,
        width: 20,
        height: 10,
        description: `Bulto ${prev.length + 1}`,
      },
    ]);
  };

  const removePackage = (id: string) => {
    if (packages.length > 1) {
      setPackages((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const updatePackage = (id: string, field: keyof PackageLine, value: string | number) => {
    setPackages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const calculateTotals = () => {
    const totalWeight = packages.reduce((sum, p) => sum + p.weight, 0);
    const totalVolume = packages.reduce(
      (sum, p) => sum + (p.length * p.width * p.height) / 1000000,
      0
    );
    return { totalWeight, totalVolume, totalPackages: packages.length };
  };

  const handleSubmit = async () => {
    if (!formData.carrier_id) {
      toast.error('Selecciona una operadora');
      return;
    }
    if (!formData.destination_name || !formData.destination_address) {
      toast.error('Completa los datos del destinatario');
      return;
    }

    setIsSubmitting(true);
    try {
      const totals = calculateTotals();
      const shipmentData = {
        ...formData,
        total_packages: totals.totalPackages,
        total_weight: totals.totalWeight,
        status: 'draft' as const,
        accounting_mode: autoAccounting ? 'auto' as const : 'manual' as const,
      };

      if (shipment?.id) {
        await updateShipment(shipment.id, shipmentData);
        toast.success('Envío actualizado correctamente');
      } else {
        await createShipment(shipmentData);
        toast.success('Envío creado correctamente');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving shipment:', error);
      toast.error('Error al guardar el envío');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">
            {shipment ? 'Editar Envío' : 'Nuevo Envío'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura los detalles del envío
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Carrier Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Operadora y Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operadora *</Label>
                  <Select
                    value={formData.carrier_id}
                    onValueChange={(v) => handleInputChange('carrier_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar operadora" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCarriers.map((carrier) => (
                        <SelectItem key={carrier.id} value={carrier.id}>
                          <div className="flex items-center gap-2">
                            <span>{carrier.carrier_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {carrier.carrier_type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Servicio</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(v) => handleInputChange('service_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Estándar (48-72h)</SelectItem>
                      <SelectItem value="express">Express (24h)</SelectItem>
                      <SelectItem value="urgent">Urgente (Mismo día)</SelectItem>
                      <SelectItem value="economy">Económico (5-7 días)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Origin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                Origen (Remitente)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre/Empresa</Label>
                  <Input
                    value={formData.origin_name}
                    onChange={(e) => handleInputChange('origin_name', e.target.value)}
                    placeholder="Mi Empresa S.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.origin_phone}
                    onChange={(e) => handleInputChange('origin_phone', e.target.value)}
                    placeholder="600123456"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.origin_address}
                  onChange={(e) => handleInputChange('origin_address', e.target.value)}
                  placeholder="Calle Principal 123"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={formData.origin_city}
                    onChange={(e) => handleInputChange('origin_city', e.target.value)}
                    placeholder="Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input
                    value={formData.origin_postal_code}
                    onChange={(e) => handleInputChange('origin_postal_code', e.target.value)}
                    placeholder="28001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Select
                    value={formData.origin_country}
                    onValueChange={(v) => handleInputChange('origin_country', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">España</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="FR">Francia</SelectItem>
                      <SelectItem value="DE">Alemania</SelectItem>
                      <SelectItem value="IT">Italia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destination */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                Destino (Destinatario) *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre/Empresa *</Label>
                  <Input
                    value={formData.destination_name}
                    onChange={(e) => handleInputChange('destination_name', e.target.value)}
                    placeholder="Cliente S.A."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.destination_phone}
                    onChange={(e) => handleInputChange('destination_phone', e.target.value)}
                    placeholder="600987654"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección *</Label>
                <Input
                  value={formData.destination_address}
                  onChange={(e) => handleInputChange('destination_address', e.target.value)}
                  placeholder="Avenida Secundaria 456"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad *</Label>
                  <Input
                    value={formData.destination_city}
                    onChange={(e) => handleInputChange('destination_city', e.target.value)}
                    placeholder="Barcelona"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal *</Label>
                  <Input
                    value={formData.destination_postal_code}
                    onChange={(e) => handleInputChange('destination_postal_code', e.target.value)}
                    placeholder="08001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Select
                    value={formData.destination_country}
                    onValueChange={(v) => handleInputChange('destination_country', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">España</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="FR">Francia</SelectItem>
                      <SelectItem value="DE">Alemania</SelectItem>
                      <SelectItem value="IT">Italia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email (para notificaciones)</Label>
                <Input
                  type="email"
                  value={formData.destination_email}
                  onChange={(e) => handleInputChange('destination_email', e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Packages */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Bultos ({packages.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addPackage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir Bulto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm font-medium w-16">Bulto {index + 1}</span>
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    <div>
                      <Label className="text-xs">Peso (kg)</Label>
                      <Input
                        type="number"
                        value={pkg.weight}
                        onChange={(e) => updatePackage(pkg.id, 'weight', Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Largo (cm)</Label>
                      <Input
                        type="number"
                        value={pkg.length}
                        onChange={(e) => updatePackage(pkg.id, 'length', Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ancho (cm)</Label>
                      <Input
                        type="number"
                        value={pkg.width}
                        onChange={(e) => updatePackage(pkg.id, 'width', Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Alto (cm)</Label>
                      <Input
                        type="number"
                        value={pkg.height}
                        onChange={(e) => updatePackage(pkg.id, 'height', Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={pkg.description}
                        onChange={(e) => updatePackage(pkg.id, 'description', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removePackage(pkg.id)}
                    disabled={packages.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Opciones Adicionales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contrareembolso (€)</Label>
                  <Input
                    type="number"
                    value={formData.cash_on_delivery}
                    onChange={(e) => handleInputChange('cash_on_delivery', Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Declarado (€)</Label>
                  <Input
                    type="number"
                    value={formData.insurance_value}
                    onChange={(e) => handleInputChange('insurance_value', Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Instrucciones especiales de entrega..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bultos:</span>
                <span className="font-medium">{totals.totalPackages}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Peso Total:</span>
                <span className="font-medium">{totals.totalWeight.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volumen:</span>
                <span className="font-medium">{totals.totalVolume.toFixed(3)} m³</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="text-sm">Contabilizar Auto</Label>
                </div>
                <Switch checked={autoAccounting} onCheckedChange={setAutoAccounting} />
              </div>
              <p className="text-xs text-muted-foreground">
                {autoAccounting
                  ? 'Se generará asiento contable automáticamente al confirmar'
                  : 'El asiento se generará manualmente'}
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Guardando...' : shipment ? 'Actualizar' : 'Crear Envío'}
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ShipmentForm;
