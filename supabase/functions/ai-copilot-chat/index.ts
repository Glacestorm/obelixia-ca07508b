import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ChatRequest {
  action: 'chat' | 'list_conversations' | 'get_conversation' | 'delete_conversation' | 'export_conversation';
  conversation_id?: string;
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  provider_type?: 'local' | 'external' | 'auto';
  entity_context?: {
    type: string;
    id: string;
    name?: string;
    data?: Record<string, unknown>;
  };
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  ollama_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json() as ChatRequest;
    const { 
      action, 
      conversation_id, 
      messages, 
      model: requestedModel,
      provider_type = 'auto',
      entity_context,
      system_prompt,
      temperature = 0.7,
      max_tokens = 4000,
      ollama_url = 'http://localhost:11434'
    } = body;

    // Normalize model - use a stable, supported model as default
    const supportedModels = [
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash-lite',
      'openai/gpt-5',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano'
    ];
    
    // Default to a known stable model if none provided or if invalid
    let model = requestedModel || 'google/gemini-2.5-flash';
    if (!supportedModels.includes(model)) {
      console.log(`[ai-copilot-chat] Model "${model}" not in supported list, falling back to google/gemini-2.5-flash`);
      model = 'google/gemini-2.5-flash';
    }

    console.log(`[ai-copilot-chat] Action: ${action}, Provider: ${provider_type}, Model: ${model}`);

    // === LIST CONVERSATIONS ===
    if (action === 'list_conversations') {
      const { data, error } = await supabase
        .from('ai_copilot_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        conversations: data || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === GET CONVERSATION ===
    if (action === 'get_conversation' && conversation_id) {
      const { data: conversation, error: convError } = await supabase
        .from('ai_copilot_conversations')
        .select('*')
        .eq('id', conversation_id)
        .single();

      if (convError) throw convError;

      const { data: messagesData, error: msgError } = await supabase
        .from('ai_copilot_messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      return new Response(JSON.stringify({
        success: true,
        conversation,
        messages: messagesData || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === DELETE CONVERSATION ===
    if (action === 'delete_conversation' && conversation_id) {
      await supabase
        .from('ai_copilot_messages')
        .delete()
        .eq('conversation_id', conversation_id);

      const { error } = await supabase
        .from('ai_copilot_conversations')
        .delete()
        .eq('id', conversation_id);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: 'Conversation deleted'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === EXPORT CONVERSATION ===
    if (action === 'export_conversation' && conversation_id) {
      const { data: conversation } = await supabase
        .from('ai_copilot_conversations')
        .select('*')
        .eq('id', conversation_id)
        .single();

      const { data: messagesData } = await supabase
        .from('ai_copilot_messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      // Generate markdown export
      let markdown = `# ${conversation?.title || 'Conversación'}\n\n`;
      markdown += `**Fecha:** ${new Date(conversation?.created_at).toLocaleString()}\n\n`;
      
      if (entity_context) {
        markdown += `**Contexto:** ${entity_context.type} - ${entity_context.name || entity_context.id}\n\n`;
      }
      
      markdown += `---\n\n`;

      for (const msg of messagesData || []) {
        const role = msg.role === 'user' ? '👤 Usuario' : '🤖 AI';
        markdown += `### ${role}\n\n${msg.content}\n\n---\n\n`;
      }

      return new Response(JSON.stringify({
        success: true,
        markdown,
        conversation,
        messages: messagesData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === CHAT ===
    if (action === 'chat' && messages && messages.length > 0) {
      let convId = conversation_id;
      
      // Create or update conversation
      if (!convId) {
        const firstUserMessage = messages.find(m => m.role === 'user')?.content || 'Nueva conversación';
        const title = firstUserMessage.slice(0, 100);

        // Normalize provider_type: 'auto' is not a valid DB value, default to 'external'
        const dbProviderType = provider_type === 'auto' ? 'external' : provider_type;

        const { data: newConv, error: createError } = await supabase
          .from('ai_copilot_conversations')
          .insert({
            user_id: userId,
            title,
            entity_type: entity_context?.type,
            entity_id: entity_context?.id,
            entity_name: entity_context?.name,
            model_used: model,
            provider_type: dbProviderType,
          })
          .select()
          .single();

        if (createError) throw createError;
        convId = newConv.id;
      }

      // Build system prompt
      let fullSystemPrompt = system_prompt || `Eres un asistente de IA empresarial avanzado integrado en un sistema CRM/ERP.

CAPACIDADES:
- Análisis de datos empresariales y financieros
- Consultas sobre clientes, proveedores, facturas, contratos
- Generación de informes y documentos
- Recomendaciones estratégicas basadas en datos
- Soporte para decisiones empresariales

CONTEXTO DEL SISTEMA:
- Responde de forma profesional y concisa
- Proporciona datos y análisis cuando sea posible
- Sugiere acciones concretas y prácticas
- Mantén la confidencialidad de los datos`;

      if (entity_context) {
        fullSystemPrompt += `\n\nCONTEXTO ACTUAL:
- Tipo de entidad: ${entity_context.type}
- ID: ${entity_context.id}
- Nombre: ${entity_context.name || 'N/A'}`;
        
        if (entity_context.data) {
          fullSystemPrompt += `\n- Datos adicionales: ${JSON.stringify(entity_context.data, null, 2)}`;
        }
      }

      const aiMessages = [
        { role: 'system', content: fullSystemPrompt },
        ...messages
      ];

      let response: string | undefined;
      let tokensUsed = { prompt: 0, completion: 0 };
      let actualModel = model;
      let source: 'local' | 'external' = 'external';

      // NOTE: Edge functions cannot reach localhost (Ollama runs on user's machine).
      // 'local' provider only makes sense when called from the browser directly.
      // In this cloud environment, we always use external providers.
      // If user explicitly requested 'local', log a warning but fall back gracefully.
      if (provider_type === 'local') {
        console.log(`[ai-copilot-chat] Local AI requested but not available in cloud environment. Falling back to external.`);
        // Don't throw - just continue to external provider
      }

      // Use external if local failed or external requested
      if (!response && LOVABLE_API_KEY) {
        const externalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: aiMessages,
            temperature,
            max_tokens,
          }),
        });

        if (!externalResponse.ok) {
          if (externalResponse.status === 429) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Límite de solicitudes excedido. Intenta más tarde.' 
            }), { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
          }
          if (externalResponse.status === 402) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Créditos insuficientes. Añade créditos para continuar.' 
            }), { 
              status: 402, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
          }
          throw new Error(`AI gateway error: ${externalResponse.status}`);
        }

        const externalData = await externalResponse.json();
        response = externalData.choices?.[0]?.message?.content;
        tokensUsed = externalData.usage || tokensUsed;
        source = 'external';
      }

      if (!response) {
        throw new Error('No se pudo obtener respuesta de ningún proveedor de IA');
      }

      // Save user message
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage?.role === 'user') {
        await supabase
          .from('ai_copilot_messages')
          .insert({
            conversation_id: convId,
            role: 'user',
            content: lastUserMessage.content,
          });
      }

      // Save assistant message
      await supabase
        .from('ai_copilot_messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          content: response,
          model: actualModel,
          provider_type: source,
          tokens_used: tokensUsed.prompt + tokensUsed.completion,
        });

      // Update conversation
      await supabase
        .from('ai_copilot_conversations')
        .update({
          updated_at: new Date().toISOString(),
          message_count: messages.length + 1,
          model_used: actualModel,
        })
        .eq('id', convId);

      return new Response(JSON.stringify({
        success: true,
        conversation_id: convId,
        response,
        model: actualModel,
        source,
        tokens: tokensUsed,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action or missing parameters'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-copilot-chat] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
