/**
 * ShipmentsManager - Gestión completa de envíos
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Printer,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useERPLogistics, LogisticsShipment, LogisticsCarrier } from '@/hooks/erp/useERPLogistics';
import { ShipmentForm } from './ShipmentForm';
import { ShipmentTracking } from './ShipmentTracking';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-600', icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-600', icon: <CheckCircle className="h-3 w-3" /> },
  picked_up: { label: 'Recogido', color: 'bg-purple-500/20 text-purple-600', icon: <Truck className="h-3 w-3" /> },
  in_transit: { label: 'En tránsito', color: 'bg-indigo-500/20 text-indigo-600', icon: <Truck className="h-3 w-3" /> },
  out_for_delivery: { label: 'En reparto', color: 'bg-orange-500/20 text-orange-600', icon: <MapPin className="h-3 w-3" /> },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-600', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: 'Fallido', color: 'bg-red-500/20 text-red-600', icon: <XCircle className="h-3 w-3" /> },
  returned: { label: 'Devuelto', color: 'bg-gray-500/20 text-gray-600', icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-600', icon: <XCircle className="h-3 w-3" /> },
};

interface ShipmentsManagerProps {
  carriers: LogisticsCarrier[];
}

export function ShipmentsManager({ carriers }: ShipmentsManagerProps) {
  const { shipments, isLoading, fetchShipments, updateShipment } = useERPLogistics();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<LogisticsShipment | null>(null);
  const [showTracking, setShowTracking] = useState(false);

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const matchesSearch =
        shipment.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.destination_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.destination_city?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
      const matchesCarrier = carrierFilter === 'all' || shipment.carrier_id === carrierFilter;

      return matchesSearch && matchesStatus && matchesCarrier;
    });
  }, [shipments, searchTerm, statusFilter, carrierFilter]);

  const getCarrierName = (carrierId: string) => {
    const carrier = carriers.find((c) => c.id === carrierId);
    return carrier?.carrier_name || 'Desconocido';
  };

  const handleViewTracking = (shipment: LogisticsShipment) => {
    setSelectedShipment(shipment);
    setShowTracking(true);
  };

  const handlePrintLabel = async (shipment: LogisticsShipment) => {
    // TODO: Implementar generación de etiqueta PDF
    console.log('Imprimir etiqueta:', shipment.id);
  };

  const handleConfirmShipment = async (shipment: LogisticsShipment) => {
    await updateShipment(shipment.id, { status: 'confirmed' });
  };

  if (showForm) {
    return (
      <ShipmentForm
        carriers={carriers}
        shipment={selectedShipment}
        onClose={() => {
          setShowForm(false);
          setSelectedShipment(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setSelectedShipment(null);
          fetchShipments();
        }}
      />
    );
  }

  if (showTracking && selectedShipment) {
    return (
      <ShipmentTracking
        shipment={selectedShipment}
        carrier={carriers.find((c) => c.id === selectedShipment.carrier_id)}
        onClose={() => {
          setShowTracking(false);
          setSelectedShipment(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Envíos</h2>
          <p className="text-sm text-muted-foreground">
            {filteredShipments.length} envíos encontrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchShipments()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Envío
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº envío, tracking, destinatario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="w-[180px]">
                <Truck className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Operadora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las operadoras</SelectItem>
                {carriers.map((carrier) => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    {carrier.carrier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Envío</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Operadora</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Bultos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando envíos...
                  </TableCell>
                </TableRow>
              ) : filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay envíos que coincidan con los filtros</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map((shipment) => {
                  const status = statusConfig[shipment.status] || statusConfig.draft;
                  return (
                    <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {shipment.shipment_number}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {shipment.tracking_number || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCarrierName(shipment.carrier_id)}</Badge>
                      </TableCell>
                      <TableCell>{shipment.destination_name || '-'}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {shipment.destination_city}
                          {shipment.destination_postal_code && ` (${shipment.destination_postal_code})`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{shipment.total_packages || 1}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.icon}
                          <span className="ml-1">{status.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {shipment.created_at &&
                          format(new Date(shipment.created_at), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTracking(shipment)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Tracking
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintLabel(shipment)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimir Etiqueta
                            </DropdownMenuItem>
                            {shipment.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleConfirmShipment(shipment)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Envío
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedShipment(shipment);
                                setShowForm(true);
                              }}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

export default ShipmentsManager;
