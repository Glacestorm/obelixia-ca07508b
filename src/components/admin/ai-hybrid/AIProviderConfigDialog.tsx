import { useState, useEffect, useCallback } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
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
  Eye,
  EyeOff,
  Key,
  Globe,
  Clock,
  DollarSign,
  Loader2,
  Info,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { useAIProviders, AIProvider } from '@/hooks/admin/ai-hybrid';
import { AILocalDiagnosticsPanel } from './AILocalDiagnosticsPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type LocalAIMode = 'local' | 'remote';

interface ProviderConfig {
  api_endpoint: string;
  api_key?: string;
  organization_id?: string;
  timeout_seconds: number;
  max_retries: number;
  priority: number;
  daily_cost_limit?: number;
  enabled_models: string[];
  trust_level: 'untrusted' | 'basic' | 'trusted' | 'verified';
  require_api_key: boolean;
  free_tier_info?: string;
  // Local AI specific
  local_mode: LocalAIMode;
  remote_server_url?: string;
}

interface AIProviderConfigDialogProps {
  provider: AIProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<AIProvider>) => Promise<void>;
}

// Provider-specific default configurations
const PROVIDER_DEFAULTS: Record<string, Partial<ProviderConfig>> = {
  'ollama': {
    api_endpoint: 'http://localhost:11434',
    require_api_key: false,
    free_tier_info: 'Ollama es completamente gratuito. Puedes usarlo en local (descargando) o conectándote a un servidor en red.',
    local_mode: 'local',
  },
  'openai': {
    api_endpoint: 'https://api.openai.com/v1',
    require_api_key: false,
    free_tier_info: 'OpenAI ofrece $5 de crédito gratuito para nuevas cuentas. Puedes probar sin API key usando Lovable AI.',
  },
  'anthropic': {
    api_endpoint: 'https://api.anthropic.com/v1',
    require_api_key: false,
    free_tier_info: 'Anthropic ofrece créditos gratuitos de prueba. También disponible a través de Lovable AI sin API key.',
  },
  'google': {
    api_endpoint: 'https://generativelanguage.googleapis.com/v1',
    require_api_key: false,
    free_tier_info: 'Google Gemini tiene un tier gratuito generoso. Accesible también vía Lovable AI.',
  },
  'deepseek': {
    api_endpoint: 'https://api.deepseek.com/v1',
    require_api_key: false,
    free_tier_info: 'DeepSeek ofrece créditos gratuitos y es muy económico para producción.',
  },
  'lovable': {
    api_endpoint: 'https://ai.gateway.lovable.dev/v1',
    require_api_key: false,
    free_tier_info: 'Lovable AI está incluido con tu proyecto. Sin necesidad de API key adicional.',
  },
  'groq': {
    api_endpoint: 'https://api.groq.com/openai/v1',
    require_api_key: false,
    free_tier_info: 'Groq ofrece un tier gratuito muy generoso con alta velocidad.',
  },
  'mistral': {
    api_endpoint: 'https://api.mistral.ai/v1',
    require_api_key: false,
    free_tier_info: 'Mistral AI ofrece modelos gratuitos como "mistral-small" con límites razonables.',
  },
  'cohere': {
    api_endpoint: 'https://api.cohere.ai/v1',
    require_api_key: false,
    free_tier_info: 'Cohere tiene un tier gratuito para desarrollo con 1000 llamadas/mes.',
  },
  'huggingface': {
    api_endpoint: 'https://api-inference.huggingface.co',
    require_api_key: false,
    free_tier_info: 'HuggingFace ofrece inferencia gratuita para modelos públicos.',
  },
};

export function AIProviderConfigDialog({
  provider,
  isOpen,
  onClose,
  onSave,
}: AIProviderConfigDialogProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('connection');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [isTestingRemote, setIsTestingRemote] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [localTestResult, setLocalTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [remoteTestResult, setRemoteTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const { testConnection, addCredential } = useAIProviders();

  // Form state
  const [config, setConfig] = useState<ProviderConfig>({
    api_endpoint: '',
    api_key: '',
    organization_id: '',
    timeout_seconds: 30,
    max_retries: 3,
    priority: 5,
    daily_cost_limit: undefined,
    enabled_models: [],
    trust_level: 'basic',
    require_api_key: false,
    free_tier_info: '',
    local_mode: 'local',
    remote_server_url: '',
  });

  // Get provider key for defaults
  const getProviderKey = useCallback((p: AIProvider | null): string => {
    if (!p) return '';
    const name = p.name.toLowerCase();
    if (name.includes('ollama')) return 'ollama';
    if (name.includes('openai') || name.includes('gpt')) return 'openai';
    if (name.includes('anthropic') || name.includes('claude')) return 'anthropic';
    if (name.includes('google') || name.includes('gemini')) return 'google';
    if (name.includes('deepseek')) return 'deepseek';
    if (name.includes('lovable')) return 'lovable';
    if (name.includes('groq')) return 'groq';
    if (name.includes('mistral')) return 'mistral';
    if (name.includes('cohere')) return 'cohere';
    if (name.includes('huggingface') || name.includes('hf')) return 'huggingface';
    return '';
  }, []);

  // Reset form when provider changes
  // Detect mode from endpoint URL
  const detectModeFromEndpoint = useCallback((endpoint: string): LocalAIMode => {
    if (!endpoint) return 'local';
    const url = endpoint.toLowerCase();
    // If it's localhost or 127.0.0.1, it's local mode
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'local';
    }
    // Otherwise it's a remote server
    return 'remote';
  }, []);

  // Reset form when provider changes - LOAD PERSISTED MODE
  useEffect(() => {
    if (provider) {
      const providerKey = getProviderKey(provider);
      const defaults = PROVIDER_DEFAULTS[providerKey] || {};
      
      // Detect mode from saved endpoint
      const savedEndpoint = provider.api_endpoint || defaults.api_endpoint || '';
      const detectedMode = providerKey === 'ollama' ? detectModeFromEndpoint(savedEndpoint) : 'local';
      
      setConfig({
        api_endpoint: savedEndpoint,
        api_key: '',
        organization_id: '',
        timeout_seconds: 30,
        max_retries: 3,
        priority: 5,
        daily_cost_limit: undefined,
        enabled_models: provider.supported_models?.map(m => m.name || m.id) || [],
        trust_level: 'basic',
        require_api_key: defaults.require_api_key ?? false,
        free_tier_info: defaults.free_tier_info || '',
        // Load mode from saved endpoint
        local_mode: detectedMode,
        // If remote mode, save the URL as remote_server_url
        remote_server_url: detectedMode === 'remote' ? savedEndpoint : '',
      });
      setTestResult(null);
      setLocalTestResult(null);
      setRemoteTestResult(null);
      setActiveTab('connection');
    }
  }, [provider, getProviderKey, detectModeFromEndpoint]);

  // Test connection for a specific endpoint
  const handleTestConnection = async (endpointToTest?: string) => {
    if (!provider) return;
    
    const endpoint = endpointToTest || config.api_endpoint;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(provider.id, endpoint);
      setTestResult({
        success: result?.success || false,
        message: result?.success 
          ? `Conexión exitosa a ${endpoint}` 
          : (result?.error || 'Error de conexión'),
        latency: result?.latency_ms,
      });
      
      if (result?.success) {
        toast.success(`Test exitoso: ${endpoint} (${result.latency_ms}ms)`);
      } else {
        toast.error(`Test fallido: ${result?.error || 'Sin respuesta'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setTestResult({
        success: false,
        message: errorMsg,
      });
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Test local connection (localhost)
  const handleTestLocalConnection = async () => {
    if (!provider) return;
    
    const localEndpoint = 'http://localhost:11434';
    setIsTestingLocal(true);
    setLocalTestResult(null);
    
    try {
      const result = await testConnection(provider.id, localEndpoint);
      setLocalTestResult({
        success: result?.success || false,
        message: result?.success 
          ? `Conexión local exitosa` 
          : (result?.error || 'Ollama no detectado en localhost'),
        latency: result?.latency_ms,
      });
      
      if (result?.success) {
        toast.success(`IA Local conectada (${result.latency_ms}ms)`);
      }
    } catch (error) {
      setLocalTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsTestingLocal(false);
    }
  };

  // Test remote server connection
  const handleTestRemoteConnection = async () => {
    if (!provider) return;
    
    const remoteEndpoint = config.remote_server_url || config.api_endpoint;
    if (!remoteEndpoint || remoteEndpoint.includes('localhost')) {
      toast.error('Introduce una IP/URL de servidor remoto válida');
      return;
    }
    
    setIsTestingRemote(true);
    setRemoteTestResult(null);
    
    try {
      const result = await testConnection(provider.id, remoteEndpoint);
      setRemoteTestResult({
        success: result?.success || false,
        message: result?.success 
          ? `Servidor remoto conectado` 
          : (result?.error || 'No se pudo conectar al servidor'),
        latency: result?.latency_ms,
      });
      
      if (result?.success) {
        toast.success(`Servidor remoto conectado (${result.latency_ms}ms)`);
      } else {
        toast.error(`No se pudo conectar: ${result?.error || 'Sin respuesta'}`);
      }
    } catch (error) {
      setRemoteTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsTestingRemote(false);
    }
  };

  const handleSave = async () => {
    if (!provider) return;
    setIsSaving(true);
    try {
      // Save provider config with local mode info in metadata
      await onSave({
        api_endpoint: config.api_endpoint,
        requires_api_key: config.require_api_key,
        is_active: true,
        // Store local mode preference in config (can be extended to database later)
      });
      
      // If API key provided, save credential
      if (config.api_key && config.api_key.trim()) {
        await addCredential(provider.id, config.api_key, {
          isDefault: true,
        });
      }
      
      // Show appropriate success message
      if (isLocal) {
        const modeLabel = config.local_mode === 'local' ? 'modo local' : 'servidor remoto';
        toast.success(`Configuración guardada - ${modeLabel} (${config.api_endpoint})`);
      } else {
        toast.success('Configuración guardada correctamente');
      }
      onClose();
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  if (!provider) return null;

  const isLocal = provider.provider_type === 'local';
  const providerKey = getProviderKey(provider);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              isLocal 
                ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600" 
                : "bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-600"
            )}>
              {isLocal ? <Server className="h-6 w-6" /> : <Cloud className="h-6 w-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {provider.name}
                <Badge variant={isLocal ? "secondary" : "outline"} className="text-xs">
                  {isLocal ? 'Local' : 'Cloud'}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {isLocal 
                  ? 'Configura tu servidor Ollama local para procesamiento privado'
                  : 'Configura el proveedor de IA en la nube'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className={cn("grid w-full mb-4 flex-shrink-0", isLocal ? "grid-cols-5" : "grid-cols-4")}>
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
              <DollarSign className="h-4 w-4" /> Límites
            </TabsTrigger>
            {isLocal && (
              <TabsTrigger value="diagnostics" className="gap-2">
                <RotateCw className="h-4 w-4" /> Diagnóstico
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 pr-4" style={{ maxHeight: 'calc(85vh - 220px)' }}>
              {/* === TAB: CONNECTION === */}
              <TabsContent value="connection" className="space-y-6">
                {/* Free tier info banner */}
                {config.free_tier_info && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-primary">Opciones gratuitas disponibles</p>
                      <p className="text-sm text-muted-foreground">{config.free_tier_info}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-4">
                  {/* Local AI Mode Selector - Only for local providers */}
                  {isLocal && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Modo de conexión
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Local Mode */}
                        <div className={cn(
                          "flex flex-col rounded-lg border-2 transition-all overflow-hidden",
                          config.local_mode === 'local'
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        )}>
                          <button
                            type="button"
                            onClick={() => setConfig(prev => ({ 
                              ...prev, 
                              local_mode: 'local',
                              api_endpoint: 'http://localhost:11434'
                            }))}
                            className="flex flex-col items-center gap-2 p-4"
                          >
                            <div className={cn(
                              "p-3 rounded-full",
                              config.local_mode === 'local' ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Cpu className={cn(
                                "h-6 w-6",
                                config.local_mode === 'local' ? "text-primary" : "text-muted-foreground"
                              )} />
                            </div>
                            <div className="text-center">
                              <p className={cn(
                                "font-medium text-sm",
                                config.local_mode === 'local' && "text-primary"
                              )}>IA Local</p>
                              <p className="text-xs text-muted-foreground">
                                Descarga y usa en este PC
                              </p>
                            </div>
                            {config.local_mode === 'local' && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                <CheckCircle className="h-3 w-3 mr-1" /> Seleccionado
                              </Badge>
                            )}
                          </button>
                          
                          {/* Test result for local */}
                          {localTestResult && (
                            <div className={cn(
                              "px-3 py-2 text-xs border-t",
                              localTestResult.success 
                                ? "bg-success/10 text-success border-success/20" 
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            )}>
                              {localTestResult.success 
                                ? `✓ Conectado (${localTestResult.latency}ms)` 
                                : `✗ ${localTestResult.message}`
                              }
                            </div>
                          )}
                          
                          {/* Test button for local */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-none border-t text-xs h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestLocalConnection();
                            }}
                            disabled={isTestingLocal}
                          >
                            {isTestingLocal ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Probando...</>
                            ) : (
                              <><Activity className="h-3 w-3 mr-1" /> Test Local</>
                            )}
                          </Button>
                        </div>

                        {/* Remote Server Mode */}
                        <div className={cn(
                          "flex flex-col rounded-lg border-2 transition-all overflow-hidden",
                          config.local_mode === 'remote'
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        )}>
                          <button
                            type="button"
                            onClick={() => setConfig(prev => ({ 
                              ...prev, 
                              local_mode: 'remote',
                              api_endpoint: prev.remote_server_url || 'http://192.168.1.100:11434'
                            }))}
                            className="flex flex-col items-center gap-2 p-4"
                          >
                            <div className={cn(
                              "p-3 rounded-full",
                              config.local_mode === 'remote' ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Globe className={cn(
                                "h-6 w-6",
                                config.local_mode === 'remote' ? "text-primary" : "text-muted-foreground"
                              )} />
                            </div>
                            <div className="text-center">
                              <p className={cn(
                                "font-medium text-sm",
                                config.local_mode === 'remote' && "text-primary"
                              )}>Servidor en Red</p>
                              <p className="text-xs text-muted-foreground">
                                Conecta a un servidor Ollama
                              </p>
                            </div>
                            {config.local_mode === 'remote' && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                <CheckCircle className="h-3 w-3 mr-1" /> Seleccionado
                              </Badge>
                            )}
                          </button>
                          
                          {/* Remote server URL input when remote selected */}
                          {config.local_mode === 'remote' && (
                            <div className="px-3 py-2 border-t bg-muted/30">
                              <Input
                                value={config.remote_server_url || config.api_endpoint}
                                onChange={(e) => setConfig(prev => ({ 
                                  ...prev, 
                                  remote_server_url: e.target.value,
                                  api_endpoint: e.target.value
                                }))}
                                placeholder="http://192.168.1.100:11434"
                                className="h-8 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          
                          {/* Test result for remote */}
                          {remoteTestResult && (
                            <div className={cn(
                              "px-3 py-2 text-xs border-t",
                              remoteTestResult.success 
                                ? "bg-success/10 text-success border-success/20" 
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            )}>
                              {remoteTestResult.success 
                                ? `✓ Conectado (${remoteTestResult.latency}ms)` 
                                : `✗ ${remoteTestResult.message}`
                              }
                            </div>
                          )}
                          
                          {/* Test button for remote */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-none border-t text-xs h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestRemoteConnection();
                            }}
                            disabled={isTestingRemote || config.local_mode !== 'remote'}
                          >
                            {isTestingRemote ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Probando...</>
                            ) : (
                              <><Globe className="h-3 w-3 mr-1" /> Test Servidor</>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Info about selected mode */}
                      <div className={cn(
                        "p-3 rounded-lg text-sm",
                        config.local_mode === 'local' 
                          ? "bg-success/10 border border-success/20" 
                          : "bg-info/10 border border-info/20"
                      )}>
                        {config.local_mode === 'local' ? (
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-success mt-0.5" />
                            <div>
                              <p className="font-medium text-success">Modo Local Seleccionado</p>
                              <p className="text-muted-foreground text-xs mt-1">
                                Ollama se ejecutará en este equipo. Necesitas tenerlo instalado y descargado.
                                Ve a la pestaña "Diagnóstico" para descargar e instalar modelos.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-info mt-0.5" />
                            <div>
                              <p className="font-medium text-info">Servidor Remoto Seleccionado</p>
                              <p className="text-muted-foreground text-xs mt-1">
                                Conecta a un servidor Ollama en tu red local o intranet. 
                                Introduce la IP o hostname del servidor donde está instalado Ollama.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Endpoint URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {isLocal && config.local_mode === 'remote' ? 'Dirección del Servidor' : 'Endpoint URL / IP'}
                    </Label>
                    <Input
                      value={config.api_endpoint}
                      onChange={(e) => {
                        setConfig(prev => ({ 
                          ...prev, 
                          api_endpoint: e.target.value,
                          ...(isLocal && config.local_mode === 'remote' ? { remote_server_url: e.target.value } : {})
                        }));
                      }}
                      placeholder={
                        isLocal 
                          ? (config.local_mode === 'remote' ? "http://192.168.1.100:11434" : "http://localhost:11434")
                          : "https://api.provider.com/v1"
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {isLocal 
                        ? (config.local_mode === 'remote' 
                            ? "IP o hostname del servidor Ollama en tu red (ej: http://192.168.1.100:11434 o http://mi-servidor:11434)" 
                            : "Ollama se ejecutará en localhost (http://localhost:11434)"
                          )
                        : "Endpoint base de la API del proveedor"
                      }
                    </p>
                  </div>

                  {/* API Key - Optional */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Key
                        <Badge variant="outline" className="text-xs ml-2">
                          {config.require_api_key ? 'Requerido' : 'Opcional'}
                        </Badge>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.require_api_key}
                          onCheckedChange={(c) => setConfig(prev => ({ ...prev, require_api_key: c }))}
                        />
                        <span className="text-xs text-muted-foreground">Requiere API Key</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={config.api_key}
                        onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                        placeholder={config.require_api_key ? "sk-..." : "(Opcional) sk-..."}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLocal 
                        ? "Ollama no requiere API key. Déjalo vacío para uso local o servidor en red." 
                        : "Si no proporcionas una API key, se usará Lovable AI como fallback cuando esté disponible."
                      }
                    </p>
                  </div>

                  {/* Organization ID - Cloud only */}
                  {!isLocal && (
                    <div className="space-y-2">
                      <Label>Organization ID (Opcional)</Label>
                      <Input 
                        value={config.organization_id}
                        onChange={(e) => setConfig(prev => ({ ...prev, organization_id: e.target.value }))}
                        placeholder="org-..."
                      />
                    </div>
                  )}

                  {/* Connection settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Timeout (segundos)
                      </Label>
                      <Input 
                        type="number"
                        min={5}
                        max={300}
                        value={config.timeout_seconds}
                        onChange={(e) => setConfig(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reintentos máximos</Label>
                      <Input 
                        type="number"
                        min={0}
                        max={10}
                        value={config.max_retries}
                        onChange={(e) => setConfig(prev => ({ ...prev, max_retries: parseInt(e.target.value) || 3 }))}
                      />
                    </div>
                  </div>

                  {/* Connection test */}
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    testResult?.success ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30" :
                    testResult === null ? "bg-muted/30" :
                    "bg-destructive/10 border-destructive/30"
                  )}>
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        Estado de conexión
                        {testResult?.success && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Conectado {testResult.latency && `(${testResult.latency}ms)`}
                          </Badge>
                        )}
                        {testResult && !testResult.success && (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {testResult?.message || 'Prueba la conexión para verificar la configuración'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTestConnection()}
                      disabled={isTesting || !config.api_endpoint}
                    >
                      {isTesting ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Probando...</>
                      ) : (
                        <><RotateCw className="h-4 w-4 mr-1" /> Probar conexión</>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: MODELS === */}
              <TabsContent value="models" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Modelos disponibles</h4>
                      <p className="text-sm text-muted-foreground">
                        Selecciona los modelos que deseas habilitar
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleTestConnection()}>
                      <RotateCw className="h-4 w-4 mr-1" /> Actualizar lista
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {provider.supported_models && provider.supported_models.length > 0 ? (
                      provider.supported_models.map((model, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={config.enabled_models.includes(model.name || model.id || '')}
                              onCheckedChange={(c) => {
                                const modelName = model.name || model.id || '';
                                setConfig(prev => ({
                                  ...prev,
                                  enabled_models: c 
                                    ? [...prev.enabled_models, modelName]
                                    : prev.enabled_models.filter(m => m !== modelName)
                                }));
                              }}
                            />
                            <div>
                              <p className="font-medium text-sm">{model.name || model.id}</p>
                              <p className="text-xs text-muted-foreground">{model.context_window || 'N/A'} tokens contexto</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {model.cost_per_1k_input ? `$${model.cost_per_1k_input}/1K` : 'Gratuito'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Zap className="h-10 w-10 mb-2 opacity-20" />
                        <p>Conecta primero para ver los modelos disponibles</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: SECURITY === */}
              <TabsContent value="security" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nivel de confianza</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Define qué tipo de datos se pueden enviar a este proveedor
                    </p>
                    <Select 
                      value={config.trust_level} 
                      onValueChange={(v) => setConfig(prev => ({ ...prev, trust_level: v as ProviderConfig['trust_level'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="untrusted">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-destructive" />
                            No confiable - Solo datos públicos
                          </div>
                        </SelectItem>
                        <SelectItem value="basic">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            Básico - Datos internos anonimizados
                          </div>
                        </SelectItem>
                        <SelectItem value="trusted">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            Confiable - Datos confidenciales permitidos
                          </div>
                        </SelectItem>
                        <SelectItem value="verified">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            Verificado - Acceso completo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridad de enrutamiento (1-10)</Label>
                    <Slider
                      value={[config.priority]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, priority: v }))}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Menor prioridad</span>
                      <span className="font-medium">{config.priority}</span>
                      <span>Mayor prioridad</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: LIMITS === */}
              <TabsContent value="limits" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Límite de coste diario (USD)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={config.daily_cost_limit || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, daily_cost_limit: parseFloat(e.target.value) || undefined }))}
                      placeholder="Sin límite"
                    />
                    <p className="text-xs text-muted-foreground">
                      Déjalo vacío para sin límite. El sistema pausará las solicitudes al alcanzar el límite.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Uso estimado</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Hoy</p>
                        <p className="font-medium">$0.00</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Esta semana</p>
                        <p className="font-medium">$0.00</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Este mes</p>
                        <p className="font-medium">$0.00</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: DIAGNOSTICS (LOCAL ONLY) === */}
              {isLocal && (
                <TabsContent value="diagnostics">
                  <AILocalDiagnosticsPanel 
                    endpointUrl={config.api_endpoint || 'http://localhost:11434'} 
                  />
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando...</>
            ) : (
              'Guardar configuración'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
