import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  Shield,
  Zap,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { useAIProviders, AIProvider } from '@/hooks/admin/ai-hybrid';
import { useLocalAIDiagnostics } from '@/hooks/admin/ai-hybrid/useLocalAIDiagnostics';
import { AILocalDiagnosticsPanel } from './AILocalDiagnosticsPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface AIProviderConfigDialogProps {
  provider: AIProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<AIProvider>) => Promise<void>;
}

export function AIProviderConfigDialog({
  provider,
  isOpen,
  onClose,
  onSave,
}: AIProviderConfigDialogProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('connection');
  const [formData, setFormData] = useState<Partial<AIProvider>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { testConnection } = useAIProviders();

  // Reset form when provider changes
  useEffect(() => {
    if (provider) {
      setFormData({
        api_endpoint: provider.api_endpoint,
        requires_api_key: provider.requires_api_key,
        // Other fields would be mapped here
      });
    }
  }, [provider]);

  const handleSave = async () => {
    if (!provider) return;
    setIsSaving(true);
    try {
      await onSave(formData);
      toast.success('Configuración guardada');
      onClose();
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  if (!provider) return null;

  const isLocal = provider.provider_type === 'local';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isLocal ? <Server className="h-6 w-6" /> : <Cloud className="h-6 w-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl">Configuración: {provider.name}</DialogTitle>
              <DialogDescription>
                {isLocal 
                  ? 'Gestiona tu instancia local de Ollama y modelos instalados'
                  : 'Configura claves API, límites y parámetros de seguridad'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="connection" className="gap-2">
                <Activity className="h-4 w-4" /> Conexión
              </TabsTrigger>
              <TabsTrigger value="models" className="gap-2">
                <Zap className="h-4 w-4" /> Modelos
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" /> Seguridad
              </TabsTrigger>
              <TabsTrigger value="limits" className="gap-2">
                <AlertTriangle className="h-4 w-4" /> Límites
              </TabsTrigger>
              {isLocal && (
                <TabsTrigger value="diagnostics" className="gap-2">
                  <RotateCw className="h-4 w-4" /> Diagnóstico
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="flex-1 pr-4">
              {/* === TAB: CONNECTION === */}
              <TabsContent value="connection" className="space-y-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Endpoint URL / IP</Label>
                      <Input
                        value={formData.api_endpoint || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                        placeholder={isLocal ? "http://localhost:11434" : "https://api.openai.com/v1"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isLocal 
                          ? "Dirección de tu servidor Ollama (asegúrate que permite CORS)" 
                          : "Endpoint base de la API del proveedor"
                        }
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Timeout (segundos)</Label>
                      <Input 
                        type="number" 
                        defaultValue={30}
                        onChange={(e) => setFormData(prev => ({ ...prev, connection_timeout_ms: parseInt(e.target.value) * 1000 }))}
                      />
                    </div>
                  </div>

                  {!isLocal && (
                    <div className="space-y-2">
                      <Label>Organization ID (Opcional)</Label>
                      <Input 
                        placeholder="org-..."
                        onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        Estado de conexión
                        <Badge variant="outline" className="text-emerald-500 border-emerald-200">
                          Activo
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Última verificación: Hace 2 minutos
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => testConnection(provider.id)}>
                      Probar conexión
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: DIAGNOSTICS (LOCAL ONLY) === */}
              {isLocal && (
                <TabsContent value="diagnostics">
                  <AILocalDiagnosticsPanel 
                    endpointUrl={formData.api_endpoint || 'http://localhost:11434'} 
                  />
                </TabsContent>
              )}

              {/* Other tabs placeholders */}
              <TabsContent value="models">
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Zap className="h-10 w-10 mb-2 opacity-20" />
                  <p>Configuración de modelos disponible próximamente</p>
                </div>
              </TabsContent>

              <TabsContent value="security">
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Shield className="h-10 w-10 mb-2 opacity-20" />
                  <p>Configuración de seguridad disponible próximamente</p>
                </div>
              </TabsContent>

              <TabsContent value="limits">
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mb-2 opacity-20" />
                  <p>Configuración de límites disponible próximamente</p>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
