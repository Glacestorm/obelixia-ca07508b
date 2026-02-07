/**
 * AI Copilot Panel - Interfaz estilo Open WebUI
 * Chat empresarial con historial, modelos y contexto
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Plus,
  Send,
  Loader2,
  Settings,
  Trash2,
  Download,
  FileText,
  Server,
  Cloud,
  Bot,
  User,
  Search,
  MoreVertical,
  Copy,
  ChevronLeft,
  Sparkles,
  Building2,
  Users,
  FileBarChart,
  Briefcase,
  Link,
  Save,
  RotateCcw,
  Clock,
  History,
  Bell,
  Languages,
  Eye,
  EyeOff,
  Gauge,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAICopilot, type CopilotConversation, type CopilotMessage, type EntityContext, type RoutingInfo } from '@/hooks/admin/ai-hybrid/useAICopilot';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import { es, ca, fr, enUS } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Shield, Zap, DollarSign, Brain } from 'lucide-react';

interface AICopilotPanelProps {
  className?: string;
  initialContext?: EntityContext;
  embedded?: boolean;
}

export function AICopilotPanel({ className, initialContext, embedded = false }: AICopilotPanelProps) {
  const { t, language } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(!embedded);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    entityContext,
    settings,
    lastRoutingDecision,
    settingsModified,
    fetchConversations,
    loadConversation,
    sendMessage,
    newConversation,
    deleteConversation,
    exportConversation,
    updateSettings,
    saveSettings,
    resetSettings,
    setContext,
    getAvailableModels,
  } = useAICopilot();

  // Handle save settings
  const handleSaveSettings = () => {
    if (saveSettings()) {
      toast.success('Configuración guardada correctamente');
      setSettingsOpen(false);
    } else {
      toast.error('Error al guardar la configuración');
    }
  };

  // Handle reset settings
  const handleResetSettings = () => {
    resetSettings();
    toast.info('Configuración restablecida a valores por defecto');
  };

  const dateLocales: Record<string, Locale> = { es, ca, fr, en: enUS };

  // Set initial context
  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
    }
  }, [initialContext, setContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle export
  const handleExport = async (format: 'markdown' | 'json') => {
    if (!currentConversation) return;
    
    const content = await exportConversation(currentConversation.id, format);
    if (content) {
      const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${currentConversation.id}.${format === 'markdown' ? 'md' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Conversación exportada');
    }
  };

  // Copy message
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado al portapapeles');
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableModels = getAvailableModels();

  // Context icon helper
  const getContextIcon = (type?: string) => {
    switch (type) {
      case 'company': return <Building2 className="h-4 w-4" />;
      case 'contact': return <Users className="h-4 w-4" />;
      case 'invoice': return <FileBarChart className="h-4 w-4" />;
      case 'contract': return <Briefcase className="h-4 w-4" />;
      default: return <Link className="h-4 w-4" />;
    }
  };

  // Sidebar content
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* New conversation button */}
      <div className="p-3">
        <Button onClick={newConversation} className="w-full gap-2" variant="default">
          <Plus className="h-4 w-4" />
          Nueva conversación
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Separator />

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay conversaciones
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors',
                  currentConversation?.id === conv.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => loadConversation(conv.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), { 
                      addSuffix: true, 
                      locale: dateLocales[language] || enUS 
                    })}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport('markdown'); }}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar MD
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport('json'); }}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar - Desktop */}
      {!embedded && (
        <div className={cn(
          'hidden lg:flex flex-col border-r bg-muted/30 transition-all duration-300',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}>
          <SidebarContent />
        </div>
      )}

      {/* Sidebar - Mobile */}
      {!embedded && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden absolute top-2 left-2 z-10">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 border-b bg-background">
          <div className="flex items-center gap-2">
            {!embedded && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Copilot</h3>
                <p className="text-xs text-muted-foreground">
                  {currentConversation?.title || 'Nueva conversación'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Context indicator */}
            {entityContext && (
              <Badge variant="outline" className="gap-1.5 hidden sm:flex">
                {getContextIcon(entityContext.type)}
                <span className="truncate max-w-[120px]">{entityContext.name || entityContext.id}</span>
              </Badge>
            )}

            {/* Model selector - filtered by provider type */}
            {(() => {
              // Filter models based on selected provider type
              const filteredModels = settings.providerType === 'local' 
                ? availableModels.filter(m => m.type === 'local')
                : settings.providerType === 'external'
                  ? availableModels.filter(m => m.type === 'external' || m.id === 'auto')
                  : availableModels; // 'auto' shows all

              // Check if current model is valid for the filter
              const currentModelValid = filteredModels.some(m => m.id === settings.model);
              const displayModel = currentModelValid ? settings.model : (filteredModels[0]?.id || 'auto');
              
              // Auto-update model if current is not valid for provider type
              if (!currentModelValid && filteredModels.length > 0 && settings.model !== displayModel) {
                // Defer the update to avoid render loop
                setTimeout(() => updateSettings({ model: filteredModels[0]?.id || 'auto' }), 0);
              }

              return (
                <Select
                  value={displayModel}
                  onValueChange={(v) => updateSettings({ model: v })}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Seleccionar modelo">
                      {(() => {
                        const currentModel = filteredModels.find(m => m.id === displayModel);
                        if (!currentModel) return 'Seleccionar modelo';
                        return (
                          <div className="flex items-center gap-2">
                            {currentModel.type === 'local' ? (
                              <Server className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Cloud className="h-3 w-3 text-blue-500" />
                            )}
                            <span className="truncate">{currentModel.name}</span>
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredModels.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No hay modelos locales disponibles
                      </div>
                    ) : (
                      filteredModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            {model.type === 'local' ? (
                              <Server className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Cloud className="h-3 w-3 text-blue-500" />
                            )}
                            <span className="truncate">{model.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              );
            })()}

            {/* Provider type */}
            <Select
              value={settings.providerType}
              onValueChange={(v: 'local' | 'external' | 'auto') => updateSettings({ providerType: v })}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="external">Cloud</SelectItem>
              </SelectContent>
            </Select>

            {/* Settings */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración del Copilot
                    {settingsModified && (
                      <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500">
                        Sin guardar
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6 py-4">
                    
                    {/* Smart Routing Section */}
                    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-500" />
                          <Label className="font-medium">Smart Routing (Auto)</Label>
                        </div>
                        <Switch
                          checked={settings.enableSmartRouting}
                          onCheckedChange={(v) => updateSettings({ enableSmartRouting: v })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selecciona automáticamente el mejor modelo según el tipo de pregunta y nivel de sensibilidad.
                      </p>

                      {settings.enableSmartRouting && (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-emerald-500" />
                              <Label className="text-xs">Priorizar Seguridad</Label>
                              <Switch
                                checked={settings.prioritizeSecurity}
                                onCheckedChange={(v) => updateSettings({ prioritizeSecurity: v, prioritizeCost: false, prioritizeSpeed: false })}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-amber-500" />
                              <Label className="text-xs">Priorizar Coste</Label>
                              <Switch
                                checked={settings.prioritizeCost}
                                onCheckedChange={(v) => updateSettings({ prioritizeCost: v, prioritizeSecurity: false, prioritizeSpeed: false })}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-blue-500" />
                              <Label className="text-xs">Priorizar Velocidad</Label>
                              <Switch
                                checked={settings.prioritizeSpeed}
                                onCheckedChange={(v) => updateSettings({ prioritizeSpeed: v, prioritizeSecurity: false, prioritizeCost: false })}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <Label className="text-xs">Mostrar Info Routing</Label>
                              <Switch
                                checked={settings.showRoutingInfo}
                                onCheckedChange={(v) => updateSettings({ showRoutingInfo: v })}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Clasificación de Datos por Defecto</Label>
                            <Select
                              value={settings.dataClassification}
                              onValueChange={(v: 'public' | 'internal' | 'confidential' | 'restricted') => updateSettings({ dataClassification: v })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">Público</SelectItem>
                                <SelectItem value="internal">Interno</SelectItem>
                                <SelectItem value="confidential">Confidencial</SelectItem>
                                <SelectItem value="restricted">Restringido</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Permitir IA externa para datos sensibles</Label>
                            <Switch
                              checked={settings.allowExternalForSensitive}
                              onCheckedChange={(v) => updateSettings({ allowExternalForSensitive: v })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Connection Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-emerald-500" />
                        <Label className="font-medium">Conexión IA Local</Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">URL Ollama (Local o Servidor en Red)</Label>
                        <Input
                          value={settings.ollamaUrl}
                          onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
                          placeholder="http://localhost:11434 o http://192.168.1.100:11434"
                        />
                        {typeof window !== 'undefined' && window.location.protocol === 'https:' && settings.ollamaUrl.trim().toLowerCase().startsWith('http://') ? (
                          <p className="text-xs text-muted-foreground">
                            Estás abriendo el Copilot en HTTPS, pero esta URL es HTTP: el navegador la bloqueará. Usa un endpoint HTTPS (proxy TLS) para Ollama.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Introduce la URL de tu servidor Ollama local o remoto.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Timeout (segundos)</Label>
                          <Input
                            type="number"
                            min={10}
                            max={300}
                            value={settings.requestTimeout}
                            onChange={(e) => updateSettings({ requestTimeout: parseInt(e.target.value) || 60 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Reintentos máximos</Label>
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            value={settings.maxRetries}
                            onChange={(e) => updateSettings({ maxRetries: parseInt(e.target.value) || 2 })}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Model Parameters */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-blue-500" />
                        <Label className="font-medium">Parámetros del Modelo</Label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Temperatura</Label>
                          <span className="text-xs text-muted-foreground">{settings.temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.temperature}
                          onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                          className="w-full accent-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Valores bajos = respuestas más precisas. Valores altos = respuestas más creativas.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Máximo de tokens</Label>
                        <Input
                          type="number"
                          min={256}
                          max={32000}
                          value={settings.maxTokens}
                          onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) || 4000 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Prompt del sistema (opcional)</Label>
                        <Textarea
                          value={settings.systemPrompt || ''}
                          onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
                          placeholder="Instrucciones personalizadas para el asistente..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* History & Memory */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-orange-500" />
                        <Label className="font-medium">Historial y Memoria</Label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Guardar historial</Label>
                            <p className="text-xs text-muted-foreground">Conservar conversaciones</p>
                          </div>
                          <Switch
                            checked={settings.enableHistory}
                            onCheckedChange={(v) => updateSettings({ enableHistory: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs">Memoria de contexto</Label>
                            <p className="text-xs text-muted-foreground">Recordar mensajes previos</p>
                          </div>
                          <Switch
                            checked={settings.enableContextMemory}
                            onCheckedChange={(v) => updateSettings({ enableContextMemory: v })}
                          />
                        </div>
                      </div>

                      {settings.enableHistory && (
                        <div className="space-y-2">
                          <Label className="text-xs">Máximo de conversaciones en historial</Label>
                          <Input
                            type="number"
                            min={10}
                            max={500}
                            value={settings.maxHistoryConversations}
                            onChange={(e) => updateSettings({ maxHistoryConversations: parseInt(e.target.value) || 50 })}
                          />
                        </div>
                      )}

                      {settings.enableContextMemory && (
                        <div className="space-y-2">
                          <Label className="text-xs">Mensajes a recordar (ventana de contexto)</Label>
                          <Input
                            type="number"
                            min={2}
                            max={50}
                            value={settings.contextWindowSize}
                            onChange={(e) => updateSettings({ contextWindowSize: parseInt(e.target.value) || 10 })}
                          />
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* UI & Behavior */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-pink-500" />
                        <Label className="font-medium">Interfaz y Comportamiento</Label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Acciones rápidas</Label>
                          <Switch
                            checked={settings.enableQuickActions}
                            onCheckedChange={(v) => updateSettings({ enableQuickActions: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Notificar al completar</Label>
                          <Switch
                            checked={settings.notifyOnComplete}
                            onCheckedChange={(v) => updateSettings({ notifyOnComplete: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Modo compacto</Label>
                          <Switch
                            checked={settings.compactMode}
                            onCheckedChange={(v) => updateSettings({ compactMode: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Streaming</Label>
                          <Switch
                            checked={settings.streamingEnabled}
                            onCheckedChange={(v) => updateSettings({ streamingEnabled: v })}
                            disabled // TODO: implement streaming
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Idioma por defecto</Label>
                        <Select
                          value={settings.defaultLanguage}
                          onValueChange={(v: 'es' | 'en' | 'ca' | 'fr') => updateSettings({ defaultLanguage: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ca">Català</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer with Save/Reset buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetSettings}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restablecer
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveSettings}
                      className="gap-2"
                      disabled={!settingsModified}
                    >
                      <Save className="h-4 w-4" />
                      Guardar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Context button */}
            <Dialog open={contextDialogOpen} onOpenChange={setContextDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Link className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contexto de Entidad</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Vincula una entidad (cliente, factura, contrato...) para proporcionar contexto al asistente.
                  </p>
                  {entityContext ? (
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-2">
                        {getContextIcon(entityContext.type)}
                        <div>
                          <p className="font-medium">{entityContext.name || entityContext.id}</p>
                          <p className="text-xs text-muted-foreground">{entityContext.type}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => { setContext(null); setContextDialogOpen(false); }}
                      >
                        Desvincular
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-center py-4 text-muted-foreground">
                      No hay contexto vinculado. Selecciona una entidad desde CRM o ERP.
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 mb-4">
                  <Sparkles className="h-12 w-12 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Copilot Empresarial</h3>
                <p className="text-muted-foreground max-w-md">
                  Tu asistente inteligente para CRM y ERP. Pregunta sobre clientes, facturas, contratos, análisis de datos y más.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {[
                    '¿Cuáles son mis mejores clientes?',
                    'Genera un informe de ventas',
                    'Analiza esta factura',
                    '¿Qué contratos vencen pronto?',
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputValue(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      'max-w-[80%] rounded-2xl p-4 group',
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                      
                      {msg.role === 'assistant' && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/50">
                          <Badge variant="outline" className="text-xs gap-1">
                            {msg.provider_type === 'local' ? (
                              <Server className="h-3 w-3" />
                            ) : (
                              <Cloud className="h-3 w-3" />
                            )}
                            {msg.model || settings.model}
                          </Badge>
                          {msg.tokens_used && (
                            <span className="text-xs text-muted-foreground">
                              {msg.tokens_used} tokens
                            </span>
                          )}
                          {/* Smart Routing Indicator */}
                          {msg.routing_decision && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs gap-1 cursor-help">
                                    <Brain className="h-3 w-3 text-violet-500" />
                                    {Math.round(msg.routing_decision.totalScore)}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-2 text-xs">
                                    <p className="font-medium">Smart Routing</p>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="flex items-center gap-1">
                                        <Shield className="h-3 w-3 text-emerald-500" />
                                        Seguridad: {Math.round(msg.routing_decision.securityScore)}%
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3 text-amber-500" />
                                        Coste: {Math.round(msg.routing_decision.costScore)}%
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-blue-500" />
                                        Latencia: {Math.round(msg.routing_decision.latencyScore)}%
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-violet-500" />
                                        Capacidad: {Math.round(msg.routing_decision.capabilityScore)}%
                                      </div>
                                    </div>
                                    {msg.routing_decision.reason && (
                                      <p className="text-muted-foreground">{msg.routing_decision.reason}</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => copyMessage(msg.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="min-h-[60px] max-h-[200px] pr-12 resize-none"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {settings.providerType === 'local' ? (
                <span className="flex items-center justify-center gap-1">
                  <Server className="h-3 w-3" /> Procesamiento local (privado)
                </span>
              ) : settings.providerType === 'external' ? (
                <span className="flex items-center justify-center gap-1">
                  <Cloud className="h-3 w-3" /> Procesamiento en la nube
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" /> Enrutamiento automático según datos
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AICopilotPanel;
