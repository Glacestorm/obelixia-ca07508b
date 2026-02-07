/**
 * AI Providers Panel
 * Gestión de proveedores de IA (locales y externos)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Server,
  Cloud,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  Zap,
  Globe,
  Lock,
  Key,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAIProviders, AIProvider, ProviderCredential } from '@/hooks/admin/ai-hybrid';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIProvidersPanelProps {
  className?: string;
}

export function AIProvidersPanel({ className }: AIProvidersPanelProps) {
  const {
    providers,
    credentials,
    isLoading,
    fetchProviders,
    fetchCredentials,
    addCredential,
    deleteCredential,
    testConnection,
  } = useAIProviders();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Form state for new credential
  const [newCredential, setNewCredential] = useState({
    providerId: '',
    name: '',
    apiKey: '',
    endpoint: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchProviders();
    fetchCredentials();
  }, []);

  const localProviders = providers.filter(p => p.provider_type === 'local');
  const cloudProviders = providers.filter(p => p.provider_type === 'external');

  const getProviderCredentials = (providerId: string) => 
    credentials.filter(c => c.provider_id === providerId);

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    const result = await testConnection(providerId);
    if (result?.success) {
      toast.success(`Conexión exitosa: ${result.latency_ms}ms`);
    } else {
      toast.error(`Error: ${result?.error || 'Conexión fallida'}`);
    }
    setTestingProvider(null);
  };

  const handleAddCredential = async () => {
    if (!newCredential.providerId || !newCredential.apiKey) {
      toast.error('Completa los campos requeridos');
      return;
    }

    await addCredential(newCredential.providerId, newCredential.apiKey, {
      isDefault: newCredential.isDefault,
    });

    setNewCredential({ providerId: '', name: '', apiKey: '', endpoint: '', isDefault: false });
    setIsAddDialogOpen(false);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    }
    return <XCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getProviderIcon = (provider: AIProvider) => {
    if (provider.provider_type === 'local') {
      return <Server className="h-5 w-5" />;
    }
    return <Cloud className="h-5 w-5" />;
  };

  const ProviderCard = ({ provider }: { provider: AIProvider }) => {
    const providerCreds = getProviderCredentials(provider.id);
    const hasCredentials = providerCreds.length > 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer',
          selectedProvider?.id === provider.id
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-border hover:border-primary/50'
        )}
        onClick={() => setSelectedProvider(provider)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-lg',
              provider.provider_type === 'local'
                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600'
                : 'bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-600'
            )}>
              {getProviderIcon(provider)}
            </div>
            <div>
              <h4 className="font-semibold text-sm">{provider.name}</h4>
              <p className="text-xs text-muted-foreground">{provider.provider_type}</p>
            </div>
          </div>
          {getStatusBadge(provider.is_active)}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge 
            variant={provider.provider_type === 'local' ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {provider.provider_type === 'local' ? (
              <><Lock className="h-3 w-3 mr-1" /> Local</>
            ) : (
              <><Globe className="h-3 w-3 mr-1" /> Cloud</>
            )}
          </Badge>
          {hasCredentials && (
            <Badge variant="default" className="text-xs bg-emerald-500">
              <CheckCircle className="h-3 w-3 mr-1" /> Configurado
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{providerCreds.length} credencial{providerCreds.length !== 1 ? 'es' : ''}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              handleTestConnection(provider.id);
            }}
            disabled={testingProvider === provider.id}
          >
            <RefreshCw className={cn(
              "h-3 w-3 mr-1",
              testingProvider === provider.id && "animate-spin"
            )} />
            Test
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Proveedores de IA</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona proveedores locales y en la nube
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Añadir Credencial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Credencial</DialogTitle>
              <DialogDescription>
                Configura las credenciales para un proveedor de IA
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={newCredential.providerId}
                  onValueChange={(v) => setNewCredential(prev => ({ ...prev, providerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          {p.provider_type === 'local' ? <Server className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key (opcional para locales)</Label>
                <div className="relative">
                  <Input
                    type={showSecrets['new'] ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={newCredential.apiKey}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowSecrets(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showSecrets['new'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newCredential.isDefault}
                  onCheckedChange={(c) => setNewCredential(prev => ({ ...prev, isDefault: c }))}
                />
                <Label>Establecer como predeterminado</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCredential}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Local vs Cloud */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <Cpu className="h-4 w-4" />
            Todos ({providers.length})
          </TabsTrigger>
          <TabsTrigger value="local" className="gap-2">
            <Server className="h-4 w-4" />
            Locales ({localProviders.length})
          </TabsTrigger>
          <TabsTrigger value="cloud" className="gap-2">
            <Cloud className="h-4 w-4" />
            Cloud ({cloudProviders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="local" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {localProviders.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="cloud" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cloudProviders.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Provider Details */}
      <AnimatePresence mode="wait">
        {selectedProvider && (
          <motion.div
            key={selectedProvider.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-3 rounded-xl',
                      selectedProvider.provider_type === 'local'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-violet-600 text-white'
                    )}>
                      {getProviderIcon(selectedProvider)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedProvider.name}</CardTitle>
                      <CardDescription>
                        {selectedProvider.provider_type === 'local' ? 'Proveedor Local' : 'Proveedor Cloud'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedProvider(null)}>
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capabilities */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Capacidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.capabilities?.map((cap, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                    {(!selectedProvider.capabilities || selectedProvider.capabilities.length === 0) && (
                      <span className="text-sm text-muted-foreground">Sin capacidades definidas</span>
                    )}
                  </div>
                </div>

                {/* Models */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Modelos Disponibles</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider.supported_models?.map((model, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {model.name}
                      </Badge>
                    ))}
                    {(!selectedProvider.supported_models || selectedProvider.supported_models.length === 0) && (
                      <span className="text-sm text-muted-foreground">Sin modelos definidos</span>
                    )}
                  </div>
                </div>

                {/* Credentials */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Credenciales</h4>
                  {getProviderCredentials(selectedProvider.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay credenciales configuradas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getProviderCredentials(selectedProvider.id).map(cred => (
                        <div
                          key={cred.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Credencial #{cred.id.slice(0, 8)}</span>
                            {cred.is_default && (
                              <Badge variant="default" className="text-xs">
                                Predeterminado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cred.is_active ? 'secondary' : 'destructive'} className="text-xs">
                              {cred.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deleteCredential(cred.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing Info */}
                {selectedProvider.pricing_info && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Precios</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Tipo de facturación</p>
                        <p className="text-sm font-medium">
                          {selectedProvider.pricing_info.billing_type}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Moneda</p>
                        <p className="text-sm font-medium">
                          {selectedProvider.pricing_info.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AIProvidersPanel;
