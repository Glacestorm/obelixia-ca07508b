/**
 * CarriersManager - Gestión de operadoras logísticas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  Plus,
  Search,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  Globe,
  Package,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERPLogistics, LogisticsCarrier, LogisticsCarrierAccount } from '@/hooks/erp/useERPLogistics';

interface CarriersManagerProps {
  carriers: LogisticsCarrier[];
  accounts: LogisticsCarrierAccount[];
}

export function CarriersManager({ carriers, accounts }: CarriersManagerProps) {
  const { updateCarrier, createCarrierAccount, updateCarrierAccount } = useERPLogistics();
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<LogisticsCarrier | null>(null);
  const [accountForm, setAccountForm] = useState({
    account_number: '',
    api_key: '',
    api_secret: '',
    api_endpoint: '',
    is_production: false,
  });

  const filteredCarriers = carriers.filter((carrier) =>
    carrier.carrier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    carrier.carrier_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCarrierAccount = (carrierId: string) => {
    return accounts.find((a) => a.carrier_id === carrierId);
  };

  const handleToggleActive = async (carrier: LogisticsCarrier) => {
    await updateCarrier(carrier.id, { is_active: !carrier.is_active });
    toast.success(`${carrier.carrier_name} ${!carrier.is_active ? 'activada' : 'desactivada'}`);
  };

  const handleConfigureCarrier = (carrier: LogisticsCarrier) => {
    const existingAccount = getCarrierAccount(carrier.id);
    setSelectedCarrier(carrier);
    setAccountForm({
      account_number: existingAccount?.account_number || '',
      api_key: existingAccount?.api_key || '',
      api_secret: existingAccount?.api_secret || '',
      api_endpoint: existingAccount?.api_endpoint || '',
      is_production: existingAccount?.is_production || false,
    });
    setShowConfigDialog(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedCarrier) return;

    try {
      const existingAccount = getCarrierAccount(selectedCarrier.id);
      
      if (existingAccount) {
        await updateCarrierAccount(existingAccount.id, accountForm);
      } else {
        await createCarrierAccount({
          carrier_id: selectedCarrier.id,
          ...accountForm,
          is_active: true,
        });
      }

      toast.success('Configuración guardada correctamente');
      setShowConfigDialog(false);
      setSelectedCarrier(null);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'national':
        return 'bg-blue-500/20 text-blue-600';
      case 'international':
        return 'bg-purple-500/20 text-purple-600';
      case 'express':
        return 'bg-orange-500/20 text-orange-600';
      case 'freight':
        return 'bg-green-500/20 text-green-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'national':
        return 'Nacional';
      case 'international':
        return 'Internacional';
      case 'express':
        return 'Express';
      case 'freight':
        return 'Mercancías';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Operadoras Logísticas</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona las conexiones con operadoras de transporte
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar operadora..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Carriers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCarriers.map((carrier) => {
          const account = getCarrierAccount(carrier.id);
          const isConfigured = !!account?.api_key;

          return (
            <Card
              key={carrier.id}
              className={`transition-all ${
                carrier.is_active ? 'border-primary/30' : 'opacity-60'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{carrier.carrier_name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        {carrier.carrier_code}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={carrier.is_active}
                    onCheckedChange={() => handleToggleActive(carrier)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Type Badge */}
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(carrier.carrier_type)}>
                    <Globe className="h-3 w-3 mr-1" />
                    {getTypeLabel(carrier.carrier_type)}
                  </Badge>
                  {carrier.supports_cod && (
                    <Badge variant="outline" className="text-xs">
                      Contrareembolso
                    </Badge>
                  )}
                </div>

                {/* Services */}
                {carrier.services_offered && carrier.services_offered.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {carrier.services_offered.slice(0, 3).map((service, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {carrier.services_offered.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{carrier.services_offered.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {isConfigured ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>API Configurada</span>
                      {account?.is_production && (
                        <Badge className="bg-green-500 text-white text-xs ml-1">PROD</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="h-3 w-3" />
                      <span>Sin configurar</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleConfigureCarrier(carrier)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                  {carrier.website_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(carrier.website_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Configurar {selectedCarrier?.carrier_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número de Cuenta / Cliente</Label>
              <Input
                value={accountForm.account_number}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, account_number: e.target.value }))
                }
                placeholder="Ej: 12345678"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={accountForm.api_key}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, api_key: e.target.value }))
                }
                placeholder="Tu API Key"
              />
            </div>

            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input
                type="password"
                value={accountForm.api_secret}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, api_secret: e.target.value }))
                }
                placeholder="Tu API Secret"
              />
            </div>

            <div className="space-y-2">
              <Label>Endpoint API (opcional)</Label>
              <Input
                value={accountForm.api_endpoint}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, api_endpoint: e.target.value }))
                }
                placeholder="https://api.operadora.com/v1"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <div>
                  <Label className="text-sm">Modo Producción</Label>
                  <p className="text-xs text-muted-foreground">
                    Activar para envíos reales
                  </p>
                </div>
              </div>
              <Switch
                checked={accountForm.is_production}
                onCheckedChange={(checked) =>
                  setAccountForm((prev) => ({ ...prev, is_production: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig}>
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CarriersManager;
