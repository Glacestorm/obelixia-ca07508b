/**
 * Hook para AI Copilot - Interfaz estilo Open WebUI
 * Gestión de conversaciones, modelos y contexto con Smart Routing
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIProviders } from './useAIProviders';

// === TYPES ===
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  model?: string;
  provider_type?: 'local' | 'external';
  tokens_used?: number;
  routing_decision?: RoutingInfo;
}

export interface RoutingInfo {
  selectedProvider: string;
  selectedModel: string;
  providerType: 'local' | 'external';
  securityScore: number;
  costScore: number;
  latencyScore: number;
  capabilityScore: number;
  totalScore: number;
  reason?: string;
}

export interface CopilotConversation {
  id: string;
  user_id: string;
  title: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  model_used?: string;
  provider_type?: 'local' | 'external';
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface EntityContext {
  type: string;
  id: string;
  name?: string;
  data?: Record<string, unknown>;
}

export interface CopilotSettings {
  model: string;
  providerType: 'local' | 'external' | 'auto';
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  ollamaUrl: string;
  // Smart Routing Settings
  enableSmartRouting: boolean;
  prioritizeSecurity: boolean;
  prioritizeCost: boolean;
  prioritizeSpeed: boolean;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  allowExternalForSensitive: boolean;
  // Advanced Settings
  requestTimeout: number;           // Timeout en segundos
  maxRetries: number;               // Intentos de reintento
  enableHistory: boolean;           // Guardar historial
  maxHistoryConversations: number;  // Máximo de conversaciones en historial
  enableContextMemory: boolean;     // Recordar contexto entre mensajes
  contextWindowSize: number;        // Número de mensajes a recordar
  enableQuickActions: boolean;      // Mostrar acciones rápidas
  streamingEnabled: boolean;        // Respuestas en streaming
  autoSaveInterval: number;         // Intervalo de autoguardado (segundos)
  notifyOnComplete: boolean;        // Notificar cuando termine
  defaultLanguage: 'es' | 'en' | 'ca' | 'fr';  // Idioma por defecto
  showRoutingInfo: boolean;         // Mostrar info de enrutamiento
  compactMode: boolean;             // Modo compacto UI
}

// === STORAGE KEY ===
const COPILOT_SETTINGS_KEY = 'ai_copilot_settings';

// === DEFAULT SETTINGS ===
const DEFAULT_SETTINGS: CopilotSettings = {
  model: 'auto',
  providerType: 'auto',
  temperature: 0.7,
  maxTokens: 4000,
  ollamaUrl: 'http://localhost:11434',
  enableSmartRouting: true,
  prioritizeSecurity: true,
  prioritizeCost: false,
  prioritizeSpeed: false,
  dataClassification: 'internal',
  allowExternalForSensitive: false,
  // Advanced defaults
  requestTimeout: 60,
  maxRetries: 2,
  enableHistory: true,
  maxHistoryConversations: 50,
  enableContextMemory: true,
  contextWindowSize: 10,
  enableQuickActions: true,
  streamingEnabled: false,
  autoSaveInterval: 30,
  notifyOnComplete: true,
  defaultLanguage: 'es',
  showRoutingInfo: true,
  compactMode: false,
};

// === QUESTION ANALYSIS ===
interface QuestionAnalysis {
  category: 'general' | 'financial' | 'legal' | 'technical' | 'sensitive' | 'creative';
  complexity: 'simple' | 'moderate' | 'complex';
  requiresContext: boolean;
  suggestedDataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  suggestedCapabilities: string[];
  estimatedTokens: number;
}

// === SCORING WEIGHTS ===
const DEFAULT_WEIGHTS = {
  security: 0.40,
  cost: 0.30,
  latency: 0.15,
  capability: 0.15,
};

// === LOAD SETTINGS FROM STORAGE ===
const loadStoredSettings = (): CopilotSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(COPILOT_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('[useAICopilot] Error loading settings:', err);
  }
  return DEFAULT_SETTINGS;
};

// === HOOK ===
export function useAICopilot() {
  // State
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<CopilotConversation | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [entityContext, setEntityContext] = useState<EntityContext | null>(null);
  const [lastRoutingDecision, setLastRoutingDecision] = useState<RoutingInfo | null>(null);
  const [settingsModified, setSettingsModified] = useState(false);
  const [settings, setSettings] = useState<CopilotSettings>(loadStoredSettings);

  const abortRef = useRef<AbortController | null>(null);
  const { providers, getProviderModels } = useAIProviders();

  // === ANALYZE QUESTION ===
  const analyzeQuestion = useCallback((question: string): QuestionAnalysis => {
    const lowerQ = question.toLowerCase();
    
    // Detect category
    let category: QuestionAnalysis['category'] = 'general';
    let suggestedClassification: QuestionAnalysis['suggestedDataClassification'] = 'internal';
    const capabilities: string[] = ['text-generation'];

    // Financial/Accounting keywords
    const financialKeywords = ['factura', 'invoice', 'pago', 'payment', 'balance', 'contabilidad', 'impuesto', 'tax', 'iva', 'irpf', 'nómina', 'payroll', 'cuenta', 'account', 'cobro', 'deuda', 'presupuesto', 'budget'];
    if (financialKeywords.some(k => lowerQ.includes(k))) {
      category = 'financial';
      suggestedClassification = 'confidential';
      capabilities.push('financial-analysis', 'data-processing');
    }

    // Legal keywords
    const legalKeywords = ['contrato', 'contract', 'legal', 'ley', 'normativa', 'rgpd', 'gdpr', 'lopdgdd', 'clausula', 'término', 'acuerdo', 'agreement', 'demanda', 'litigio'];
    if (legalKeywords.some(k => lowerQ.includes(k))) {
      category = 'legal';
      suggestedClassification = 'confidential';
      capabilities.push('legal-analysis', 'compliance');
    }

    // Sensitive data keywords
    const sensitiveKeywords = ['contraseña', 'password', 'dni', 'nif', 'cif', 'cuenta bancaria', 'bank account', 'salario', 'salary', 'personal', 'privado', 'secret', 'confidencial'];
    if (sensitiveKeywords.some(k => lowerQ.includes(k))) {
      category = 'sensitive';
      suggestedClassification = 'restricted';
    }

    // Technical keywords
    const technicalKeywords = ['código', 'code', 'api', 'integración', 'integration', 'base de datos', 'database', 'sql', 'error', 'bug', 'configuración', 'setup'];
    if (technicalKeywords.some(k => lowerQ.includes(k))) {
      category = 'technical';
      capabilities.push('code-generation', 'technical-analysis');
    }

    // Creative keywords
    const creativeKeywords = ['genera', 'generate', 'crea', 'create', 'escribe', 'write', 'redacta', 'diseña', 'design', 'email', 'correo', 'carta', 'letter', 'propuesta', 'proposal'];
    if (creativeKeywords.some(k => lowerQ.includes(k))) {
      category = 'creative';
      capabilities.push('creative-writing', 'content-generation');
    }

    // Detect complexity
    const wordCount = question.split(/\s+/).length;
    let complexity: QuestionAnalysis['complexity'] = 'simple';
    if (wordCount > 50 || question.includes('?') && question.split('?').length > 2) {
      complexity = 'complex';
    } else if (wordCount > 20) {
      complexity = 'moderate';
    }

    // Estimate tokens
    const estimatedTokens = Math.ceil(wordCount * 1.3) + (complexity === 'complex' ? 2000 : complexity === 'moderate' ? 1000 : 500);

    return {
      category,
      complexity,
      requiresContext: category !== 'general',
      suggestedDataClassification: suggestedClassification,
      suggestedCapabilities: capabilities,
      estimatedTokens,
    };
  }, []);

  // === SELECT BEST MODEL ===
  const selectBestModel = useCallback((analysis: QuestionAnalysis, _settings: CopilotSettings): { model: string; provider: string; type: 'local' | 'external'; scores: RoutingInfo } => {
    // Available models with their characteristics
    const modelOptions: Array<{
      id: string;
      name: string;
      provider: string;
      type: 'local' | 'external';
      capabilities: string[];
      costScore: number;
      latencyScore: number;
      capabilityScore: number;
    }> = [
      {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        provider: 'Google',
        type: 'external',
        capabilities: ['text-generation', 'creative-writing', 'technical-analysis', 'code-generation'],
        costScore: 85,
        latencyScore: 95,
        capabilityScore: 90,
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'Google',
        type: 'external',
        capabilities: ['text-generation', 'creative-writing', 'data-processing'],
        costScore: 90,
        latencyScore: 90,
        capabilityScore: 85,
      },
      {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'Google',
        type: 'external',
        capabilities: ['text-generation', 'creative-writing', 'technical-analysis', 'code-generation', 'legal-analysis', 'financial-analysis'],
        costScore: 60,
        latencyScore: 70,
        capabilityScore: 98,
      },
      {
        id: 'openai/gpt-5',
        name: 'GPT-5',
        provider: 'OpenAI',
        type: 'external',
        capabilities: ['text-generation', 'creative-writing', 'technical-analysis', 'code-generation', 'legal-analysis', 'financial-analysis', 'compliance'],
        costScore: 40,
        latencyScore: 60,
        capabilityScore: 100,
      },
      {
        id: 'openai/gpt-5-mini',
        name: 'GPT-5 Mini',
        provider: 'OpenAI',
        type: 'external',
        capabilities: ['text-generation', 'creative-writing', 'content-generation'],
        costScore: 80,
        latencyScore: 85,
        capabilityScore: 80,
      },
    ];

    // Add local models from providers
    const localProviders = providers.filter(p => p.provider_type === 'local' && p.is_active);
    for (const lp of localProviders) {
      for (const m of lp.supported_models || []) {
        modelOptions.push({
          id: m.id,
          name: m.name,
          provider: lp.name,
          type: 'local',
          capabilities: ['text-generation', 'creative-writing'],
          costScore: 100, // Free
          latencyScore: 70, // Depends on hardware
          capabilityScore: 70,
        });
      }
    }

    // Calculate weights based on settings
    const weights = { ...DEFAULT_WEIGHTS };
    if (_settings.prioritizeSecurity) {
      weights.security = 0.50;
      weights.cost = 0.20;
      weights.latency = 0.15;
      weights.capability = 0.15;
    }
    if (_settings.prioritizeCost) {
      weights.cost = 0.45;
      weights.security = 0.30;
      weights.latency = 0.15;
      weights.capability = 0.10;
    }
    if (_settings.prioritizeSpeed) {
      weights.latency = 0.40;
      weights.security = 0.25;
      weights.cost = 0.20;
      weights.capability = 0.15;
    }

    // Score each model
    const scoredModels = modelOptions.map(model => {
      // Security score: local is always 100, external depends on data classification
      let securityScore = model.type === 'local' ? 100 : 80;
      if (model.type === 'external') {
        if (analysis.suggestedDataClassification === 'restricted') {
          securityScore = _settings.allowExternalForSensitive ? 30 : 0;
        } else if (analysis.suggestedDataClassification === 'confidential') {
          securityScore = _settings.allowExternalForSensitive ? 50 : 20;
        }
      }

      // Capability score: check if model has required capabilities
      const hasAllCapabilities = analysis.suggestedCapabilities.every(c => model.capabilities.includes(c));
      const capabilityMatch = analysis.suggestedCapabilities.filter(c => model.capabilities.includes(c)).length / analysis.suggestedCapabilities.length;
      const adjustedCapabilityScore = model.capabilityScore * capabilityMatch;

      // Total score
      const totalScore = 
        securityScore * weights.security +
        model.costScore * weights.cost +
        model.latencyScore * weights.latency +
        adjustedCapabilityScore * weights.capability;

      return {
        ...model,
        securityScore,
        adjustedCapabilityScore,
        totalScore,
        hasAllCapabilities,
      };
    });

    // Filter out models with 0 security for restricted data
    const validModels = scoredModels.filter(m => 
      !(analysis.suggestedDataClassification === 'restricted' && m.type === 'external' && !_settings.allowExternalForSensitive)
    );

    // Sort by total score
    validModels.sort((a, b) => b.totalScore - a.totalScore);

    const best = validModels[0] || scoredModels[0];

    return {
      model: best.id,
      provider: best.provider,
      type: best.type,
      scores: {
        selectedProvider: best.provider,
        selectedModel: best.id,
        providerType: best.type,
        securityScore: best.securityScore,
        costScore: best.costScore,
        latencyScore: best.latencyScore,
        capabilityScore: best.adjustedCapabilityScore,
        totalScore: best.totalScore,
        reason: `Seleccionado por ${best.hasAllCapabilities ? 'compatibilidad total' : 'mejor puntuación'} (${Math.round(best.totalScore)}%)`,
      },
    };
  }, [providers]);

  // === FETCH CONVERSATIONS ===
  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { action: 'list_conversations' }
      });

      if (error) throw error;
      if (data?.success) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('[useAICopilot] fetchConversations error:', err);
    }
  }, []);

  // === LOAD CONVERSATION ===
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { 
          action: 'get_conversation',
          conversation_id: conversationId 
        }
      });

      if (error) throw error;
      if (data?.success) {
        setCurrentConversation(data.conversation);
        setMessages(data.messages);
        
        if (data.conversation.entity_type && data.conversation.entity_id) {
          setEntityContext({
            type: data.conversation.entity_type,
            id: data.conversation.entity_id,
            name: data.conversation.entity_name,
          });
        }
      }
    } catch (err) {
      console.error('[useAICopilot] loadConversation error:', err);
      toast.error('Error al cargar la conversación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CALL LOCAL OLLAMA VIA EDGE FUNCTION (bypasses browser CSP/CORS restrictions) ===
  const callLocalViaEdgeFunction = useCallback(async (
    ollamaMessages: Array<{ role: string; content: string }>,
    model: string,
    ollamaUrl: string,
    temperature: number
  ): Promise<{ response: string; tokensUsed: number } | null> => {
    console.log(`[useAICopilot] Calling local Ollama via Edge Function: ${ollamaUrl} with model ${model}`);

    try {
      const { data, error } = await supabase.functions.invoke('crm-ai-local-bridge', {
        body: {
          action: 'chat',
          model,
          messages: ollamaMessages,
          ollamaUrl,
          temperature,
          maxTokens: settings.maxTokens,
          timeout: settings.requestTimeout * 1000,
        },
      });

      if (error) {
        console.error('[useAICopilot] Edge function invoke error:', error);
        throw new Error(`Error de red al contactar el backend: ${error.message}`);
      }

      if (!data?.success) {
        const errMsg = data?.error || 'Error desconocido del backend';
        throw new Error(errMsg);
      }

      const content = data.response || '';
      if (!content) {
        throw new Error('Ollama devolvió una respuesta vacía');
      }

      console.log(`[useAICopilot] Local Ollama response via Edge Function received (${content.length} chars)`);

      return {
        response: content,
        tokensUsed: data.usage?.total_tokens || 0,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useAICopilot] Local via Edge Function error:', err);
      throw new Error(msg);
    }
  }, [settings.maxTokens, settings.requestTimeout]);

  // === SEND MESSAGE ===
  const sendMessage = useCallback(async (content: string): Promise<string | null> => {
    if (!content.trim()) return null;

    // Analyze question for smart routing
    const analysis = analyzeQuestion(content);

    // Defaults
    let selectedModel = settings.model;
    let routingDecision: RoutingInfo | null = null;
    let useLocalProvider = settings.providerType === 'local';

    // If providerType is explicitly "local", treat it as a HARD constraint.
    // Smart routing must NOT override this.
    if (settings.providerType === 'local') {
      const defaultLocalModel =
        providers.find(
          (p: any) =>
            p?.provider_type === 'local' &&
            p?.is_active &&
            Array.isArray(p?.supported_models) &&
            p.supported_models.length > 0
        )?.supported_models?.[0]?.id || 'llama3.2';

      const requested = settings.model;
      const requestedIsCloudLike = requested === 'auto' || requested.includes('/');

      selectedModel = requestedIsCloudLike ? defaultLocalModel : requested;
      useLocalProvider = true;

      routingDecision = {
        selectedProvider: 'Ollama Local',
        selectedModel,
        providerType: 'local',
        securityScore: 100,
        costScore: 100,
        latencyScore: 70,
        capabilityScore: 75,
        totalScore: 90,
        reason: 'Forzado por selección de proveedor: Local',
      };
      setLastRoutingDecision(routingDecision);
    }

    // Smart routing if enabled and model/provider are "auto" (only when not forced local)
    if (settings.providerType !== 'local' && settings.enableSmartRouting && (settings.model === 'auto' || settings.providerType === 'auto')) {
      const routing = selectBestModel(analysis, settings);
      selectedModel = routing.model;
      routingDecision = routing.scores;
      useLocalProvider = routing.type === 'local';
      setLastRoutingDecision(routingDecision);

      console.log(`[useAICopilot] Smart Routing: ${routing.model} (${routing.type}) - Score: ${Math.round(routing.scores.totalScore)}%`);
    }

    // Optimistic update
    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const allMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content }
      ];

      // Build system prompt
      const systemPrompt = settings.systemPrompt || `Eres un asistente de IA empresarial avanzado integrado en un sistema CRM/ERP.
Responde de forma profesional y concisa en español.`;

      const messagesWithSystem = [
        { role: 'system', content: systemPrompt },
        ...allMessages
      ];

      let responseData: {
        response: string;
        model: string;
        source: 'local' | 'external';
        tokens?: { prompt: number; completion: number };
        conversation_id?: string;
      };

      // === LOCAL PROVIDER: Call Ollama via Edge Function (bypasses CSP) ===
      if (useLocalProvider) {
        console.log(`[useAICopilot] Using LOCAL provider via backend: ${selectedModel} at ${settings.ollamaUrl}`);
        
        try {
          const localResult = await callLocalViaEdgeFunction(
            messagesWithSystem,
            selectedModel,
            settings.ollamaUrl,
            settings.temperature
          );

          if (!localResult) {
            throw new Error('No response from local Ollama');
          }

          responseData = {
            response: localResult.response,
            model: selectedModel,
            source: 'local',
            tokens: { prompt: 0, completion: localResult.tokensUsed },
          };

          // Save to database via edge function (without AI call)
          try {
            const { data: saveData } = await supabase.functions.invoke('ai-copilot-chat', {
              body: {
                action: 'save_local_message',
                conversation_id: currentConversation?.id,
                user_message: content,
                assistant_message: localResult.response,
                model: selectedModel,
                provider_type: 'local',
                tokens_used: localResult.tokensUsed,
                entity_context: entityContext,
              }
            });
            
            if (saveData?.conversation_id) {
              responseData.conversation_id = saveData.conversation_id;
            }
          } catch (saveErr) {
            console.warn('[useAICopilot] Failed to save local message to DB:', saveErr);
            // Continue anyway - the message was already processed
          }
        } catch (localErr) {
          console.error('[useAICopilot] Local Ollama failed:', localErr);
          
          // If local fails and fallback is allowed (ONLY when providerType is Auto), try external
          if (settings.providerType === 'auto' && settings.enableSmartRouting) {
            console.log('[useAICopilot] Falling back to external provider...');
            toast.warning('IA local no disponible, usando proveedor externo...');

            // Fall through to external provider
            useLocalProvider = false;
            selectedModel = 'google/gemini-2.5-flash';
          } else {
            // Respect explicit user intent: do NOT silently switch to cloud when user selected "Local"
            throw new Error(
              `IA local no disponible: ${localErr instanceof Error ? localErr.message : 'Error de conexión'}. ` +
              `Verifica que Ollama esté ejecutándose y que el navegador pueda acceder a ${settings.ollamaUrl}`
            );
          }
        }
      }

      // === EXTERNAL PROVIDER: Use Edge Function ===
      if (!useLocalProvider || !responseData!) {
        console.log(`[useAICopilot] Using EXTERNAL provider: ${selectedModel}`);
        
        const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
          body: {
            action: 'chat',
            conversation_id: currentConversation?.id,
            messages: allMessages,
            model: selectedModel === 'auto' ? 'google/gemini-2.5-flash' : selectedModel,
            provider_type: 'external',
            entity_context: entityContext,
            system_prompt: settings.systemPrompt,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
            routing_info: routingDecision,
            question_analysis: analysis,
          }
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'Error en la respuesta');
        }

        responseData = {
          response: data.response,
          model: data.model,
          source: 'external',
          tokens: data.tokens,
          conversation_id: data.conversation_id,
        };
      }

      // Add assistant message with routing info
      const assistantMessage: CopilotMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseData.response,
        created_at: new Date().toISOString(),
        model: responseData.model,
        provider_type: responseData.source,
        tokens_used: (responseData.tokens?.prompt || 0) + (responseData.tokens?.completion || 0),
        routing_decision: routingDecision || {
          selectedProvider: responseData.source === 'local' ? 'Ollama Local' : 'Lovable AI',
          selectedModel: responseData.model,
          providerType: responseData.source,
          securityScore: responseData.source === 'local' ? 100 : 80,
          costScore: responseData.source === 'local' ? 100 : 70,
          latencyScore: 80,
          capabilityScore: 85,
          totalScore: responseData.source === 'local' ? 90 : 78,
          reason: responseData.source === 'local' ? 'Procesado localmente' : 'Proveedor externo',
        },
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation if new
      if (!currentConversation && responseData.conversation_id) {
        setCurrentConversation({
          id: responseData.conversation_id,
          user_id: '',
          title: content.slice(0, 100),
          message_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          model_used: responseData.model,
          provider_type: responseData.source,
          entity_type: entityContext?.type,
          entity_id: entityContext?.id,
          entity_name: entityContext?.name,
        });
        fetchConversations();
      }

      return responseData.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[useAICopilot] sendMessage error:', errorMessage);
      
      // Keep the user's message visible; we only report the error via toast.
      // (Previously we removed the optimistic user message, which hid the real failure context.)
      
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast.error('Límite de solicitudes excedido. Intenta más tarde.');
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast.error('Créditos insuficientes. Añade créditos o usa IA local.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentConversation, entityContext, settings, providers, fetchConversations, analyzeQuestion, selectBestModel, callLocalViaEdgeFunction]);

  // === NEW CONVERSATION ===
  const newConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setEntityContext(null);
    setLastRoutingDecision(null);
  }, []);

  // === DELETE CONVERSATION ===
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { 
          action: 'delete_conversation',
          conversation_id: conversationId 
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          newConversation();
        }
        toast.success('Conversación eliminada');
      }
    } catch (err) {
      console.error('[useAICopilot] deleteConversation error:', err);
      toast.error('Error al eliminar la conversación');
    }
  }, [currentConversation, newConversation]);

  // === EXPORT CONVERSATION ===
  const exportConversation = useCallback(async (
    conversationId: string, 
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { 
          action: 'export_conversation',
          conversation_id: conversationId,
          entity_context: entityContext,
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        if (format === 'markdown') {
          return data.markdown;
        } else {
          return JSON.stringify({
            conversation: data.conversation,
            messages: data.messages
          }, null, 2);
        }
      }
      return null;
    } catch (err) {
      console.error('[useAICopilot] exportConversation error:', err);
      toast.error('Error al exportar la conversación');
      return null;
    }
  }, [entityContext]);

  // === CANCEL REQUEST ===
  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, []);

  // === UPDATE SETTINGS (without saving) ===
  const updateSettings = useCallback((updates: Partial<CopilotSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };

      // UX guardrail: if user selects Local provider, ensure a local model is selected
      if (updates.providerType === 'local') {
        const cloudLike = next.model === 'auto' || next.model.includes('/');
        if (cloudLike) next.model = 'llama3.2';
      }

      return next;
    });
    setSettingsModified(true);
  }, []);

  // === SAVE SETTINGS TO STORAGE ===
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem(COPILOT_SETTINGS_KEY, JSON.stringify(settings));
      setSettingsModified(false);
      return true;
    } catch (err) {
      console.error('[useAICopilot] Error saving settings:', err);
      return false;
    }
  }, [settings]);

  // === RESET SETTINGS TO DEFAULTS ===
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSettingsModified(true);
  }, []);

  // === SET ENTITY CONTEXT ===
  const setContext = useCallback((context: EntityContext | null) => {
    setEntityContext(context);
  }, []);

  // === GET AVAILABLE MODELS ===
  const getAvailableModels = useCallback(() => {
    const models: Array<{ id: string; name: string; provider: string; type: 'local' | 'external' }> = [];

    // Auto option
    models.push({ id: 'auto', name: '✨ Auto (Smart Routing)', provider: 'Sistema', type: 'external' });

    // External models
    models.push(
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', provider: 'Google', type: 'external' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', type: 'external' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', type: 'external' },
      { id: 'openai/gpt-5', name: 'GPT-5', provider: 'OpenAI', type: 'external' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', type: 'external' },
    );

    // Local models from providers
    const localProviders = providers.filter(p => p.provider_type === 'local');
    for (const provider of localProviders) {
      for (const model of provider.supported_models || []) {
        models.push({
          id: model.id,
          name: model.name,
          provider: provider.name,
          type: 'local',
        });
      }
    }

    return models;
  }, [providers]);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    entityContext,
    settings,
    lastRoutingDecision,
    settingsModified,

    // Actions
    fetchConversations,
    loadConversation,
    sendMessage,
    newConversation,
    deleteConversation,
    exportConversation,
    cancelRequest,
    updateSettings,
    saveSettings,
    resetSettings,
    setContext,
    getAvailableModels,
    analyzeQuestion,
  };
}

export default useAICopilot;
