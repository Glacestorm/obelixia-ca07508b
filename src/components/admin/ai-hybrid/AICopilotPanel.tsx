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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAICopilot, type CopilotConversation, type CopilotMessage, type EntityContext } from '@/hooks/admin/ai-hybrid/useAICopilot';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import { es, ca, fr, enUS } from 'date-fns/locale';

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
    fetchConversations,
    loadConversation,
    sendMessage,
    newConversation,
    deleteConversation,
    exportConversation,
    updateSettings,
    setContext,
    getAvailableModels,
  } = useAICopilot();

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

            {/* Model selector */}
            <Select
              value={settings.model}
              onValueChange={(v) => updateSettings({ model: v })}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
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
                ))}
              </SelectContent>
            </Select>

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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configuración del Copilot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL Ollama (Local)</label>
                    <Input
                      value={settings.ollamaUrl}
                      onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Temperatura: {settings.temperature}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Máximo de tokens</label>
                    <Input
                      type="number"
                      value={settings.maxTokens}
                      onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) || 4000 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt del sistema (opcional)</label>
                    <Textarea
                      value={settings.systemPrompt || ''}
                      onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
                      placeholder="Instrucciones personalizadas para el asistente..."
                      rows={4}
                    />
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
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
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
