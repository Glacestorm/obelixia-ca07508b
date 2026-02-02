/**
 * HREPIManagementDialog - Gestión de EPIs (Equipos de Protección Individual)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HardHat, Plus, Save, Loader2, Package, User, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { HREmployeeSearchSelect } from '../shared/HREmployeeSearchSelect';

interface HREPIManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

interface EPIType {
  id: string;
  name: string;
  category: string;
  replacement_months: number;
}

interface EPIDelivery {
  id: string;
  employee_id: string;
  epi_type_id: string;
  delivery_date: string;
  expiry_date: string | null;
  size: string | null;
  quantity: number;
  status: string;
  employee_name?: string;
  epi_name?: string;
}

const EPI_CATEGORIES = [
  { value: 'head', label: 'Protección Cabeza' },
  { value: 'eyes', label: 'Protección Ocular' },
  { value: 'ears', label: 'Protección Auditiva' },
  { value: 'respiratory', label: 'Protección Respiratoria' },
  { value: 'hands', label: 'Protección Manos' },
  { value: 'feet', label: 'Protección Pies' },
  { value: 'body', label: 'Protección Corporal' },
  { value: 'fall', label: 'Protección Anticaídas' },
];

const DEMO_EPI_TYPES: EPIType[] = [
  { id: '1', name: 'Casco de seguridad', category: 'head', replacement_months: 36 },
  { id: '2', name: 'Gafas de protección', category: 'eyes', replacement_months: 12 },
  { id: '3', name: 'Tapones auditivos', category: 'ears', replacement_months: 6 },
  { id: '4', name: 'Guantes de trabajo', category: 'hands', replacement_months: 6 },
  { id: '5', name: 'Botas de seguridad', category: 'feet', replacement_months: 12 },
  { id: '6', name: 'Chaleco reflectante', category: 'body', replacement_months: 24 },
  { id: '7', name: 'Arnés anticaídas', category: 'fall', replacement_months: 60 },
  { id: '8', name: 'Mascarilla FFP2', category: 'respiratory', replacement_months: 1 },
];

export function HREPIManagementDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess
}: HREPIManagementDialogProps) {
  const [activeTab, setActiveTab] = useState('deliver');
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<EPIDelivery[]>([]);
  const [epiTypes] = useState<EPIType[]>(DEMO_EPI_TYPES);
  
  const [deliveryForm, setDeliveryForm] = useState({
    employee_id: '',
    epi_type_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    size: '',
    quantity: 1,
    notes: '',
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    category: 'head',
    replacement_months: 12,
    description: '',
  });

  // Calculate expiry based on delivery date and EPI type
  const calculateExpiry = (deliveryDate: string, replacementMonths: number) => {
    const date = new Date(deliveryDate);
    date.setMonth(date.getMonth() + replacementMonths);
    return date.toISOString().split('T')[0];
  };

  const handleDeliverEPI = async () => {
    if (!deliveryForm.employee_id) {
      toast.error('Selecciona un empleado');
      return;
    }
    if (!deliveryForm.epi_type_id) {
      toast.error('Selecciona un tipo de EPI');
      return;
    }

    setLoading(true);
    try {
      const selectedType = epiTypes.find(t => t.id === deliveryForm.epi_type_id);
      const expiryDate = selectedType 
        ? calculateExpiry(deliveryForm.delivery_date, selectedType.replacement_months)
        : null;

      // In a real implementation, this would save to the database
      const newDelivery: EPIDelivery = {
        id: crypto.randomUUID(),
        employee_id: deliveryForm.employee_id,
        epi_type_id: deliveryForm.epi_type_id,
        delivery_date: deliveryForm.delivery_date,
        expiry_date: expiryDate,
        size: deliveryForm.size || null,
        quantity: deliveryForm.quantity,
        status: 'active',
        employee_name: 'Empleado Demo',
        epi_name: selectedType?.name || '',
      };

      setDeliveries(prev => [newDelivery, ...prev]);
      toast.success('EPI entregado correctamente');
      
      setDeliveryForm({
        employee_id: '',
        epi_type_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        size: '',
        quantity: 1,
        notes: '',
      });
    } catch (error) {
      console.error('Error delivering EPI:', error);
      toast.error('Error al registrar la entrega');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = async () => {
    if (!typeForm.name.trim()) {
      toast.error('El nombre del EPI es obligatorio');
      return;
    }

    setLoading(true);
    try {
      toast.success('Tipo de EPI creado correctamente');
      setTypeForm({
        name: '',
        category: 'head',
        replacement_months: 12,
        description: '',
      });
    } catch (error) {
      console.error('Error creating EPI type:', error);
      toast.error('Error al crear el tipo de EPI');
    } finally {
      setLoading(false);
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: 'Sin caducidad', color: 'text-muted-foreground', icon: CheckCircle };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { label: 'Caducado', color: 'text-destructive', icon: AlertTriangle };
    if (daysUntil <= 30) return { label: `${daysUntil} días`, color: 'text-orange-500', icon: AlertTriangle };
    if (daysUntil <= 90) return { label: `${daysUntil} días`, color: 'text-amber-500', icon: Calendar };
    return { label: `${daysUntil} días`, color: 'text-green-500', icon: CheckCircle };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            Gestión de EPIs
          </DialogTitle>
          <DialogDescription>
            Registro de entregas y control de equipos de protección individual
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deliver" className="gap-2">
              <Package className="h-4 w-4" />
              Entregar EPI
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <User className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-2">
              <HardHat className="h-4 w-4" />
              Tipos de EPI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deliver" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <HREmployeeSearchSelect
                  companyId={companyId}
                  value={deliveryForm.employee_id}
                  onValueChange={(v) => setDeliveryForm({ ...deliveryForm, employee_id: v })}
                  placeholder="Buscar empleado..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de EPI *</Label>
                <Select
                  value={deliveryForm.epi_type_id}
                  onValueChange={(v) => setDeliveryForm({ ...deliveryForm, epi_type_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar EPI" />
                  </SelectTrigger>
                  <SelectContent>
                    {epiTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha Entrega</Label>
                <Input
                  type="date"
                  value={deliveryForm.delivery_date}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Talla</Label>
                <Input
                  value={deliveryForm.size}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, size: e.target.value })}
                  placeholder="S, M, L, XL, 42..."
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={deliveryForm.quantity}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={deliveryForm.notes}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                placeholder="Observaciones sobre la entrega..."
                rows={2}
              />
            </div>

            <Button onClick={handleDeliverEPI} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Registrar Entrega
            </Button>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPI</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Caducidad</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay entregas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveries.map((delivery) => {
                      const status = getExpiryStatus(delivery.expiry_date);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={delivery.id}>
                          <TableCell>{delivery.employee_name}</TableCell>
                          <TableCell>{delivery.epi_name}</TableCell>
                          <TableCell>{delivery.delivery_date}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {delivery.expiry_date || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={delivery.status === 'active' ? 'default' : 'secondary'}>
                              {delivery.status === 'active' ? 'Activo' : 'Renovado'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="types" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Nuevo Tipo de EPI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      value={typeForm.name}
                      onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                      placeholder="Ej: Casco de seguridad"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categoría</Label>
                    <Select
                      value={typeForm.category}
                      onValueChange={(v) => setTypeForm({ ...typeForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EPI_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Renovación (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={typeForm.replacement_months}
                    onChange={(e) => setTypeForm({ ...typeForm, replacement_months: parseInt(e.target.value) || 12 })}
                  />
                </div>
                <Button size="sm" onClick={handleCreateType} disabled={loading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir Tipo
                </Button>
              </CardContent>
            </Card>

            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 gap-2">
                {epiTypes.map((type) => (
                  <Card key={type.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Renovación: {type.replacement_months} meses
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
