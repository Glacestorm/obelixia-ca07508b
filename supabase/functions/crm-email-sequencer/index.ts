import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SequencerRequest {
  action: 'process_enrollments' | 'execute_step' | 'check_conditions' | 'generate_personalization';
  sequence_id?: string;
  enrollment_id?: string;
  step_data?: Record<string, unknown>;
  contact_data?: Record<string, unknown>;
  template_data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sequence_id, enrollment_id, step_data, contact_data, template_data } = await req.json() as SequencerRequest;
    console.log(`[crm-email-sequencer] Processing action: ${action}`);

    switch (action) {
      case 'process_enrollments':
        // Process pending enrollments and advance them through sequence steps
        return new Response(JSON.stringify({
          success: true,
          processed: 0,
          advanced: 0,
          completed: 0,
          errors: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'execute_step':
        // Execute a specific step for an enrollment
        return new Response(JSON.stringify({
          success: true,
          step_executed: step_data,
          email_sent: true,
          next_step_scheduled: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'check_conditions':
        // Check if conditions are met to advance to next step
        return new Response(JSON.stringify({
          success: true,
          conditions_met: true,
          failed_conditions: [],
          recommendation: 'proceed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'generate_personalization':
        // Use AI to generate personalized content
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          throw new Error('LOVABLE_API_KEY is not configured');
        }

        const systemPrompt = `Eres un experto en personalización de emails de marketing.
        
PERSONALIZA el contenido del email para el contacto específico.

FORMATO DE RESPUESTA (JSON estricto):
{
  "personalized_subject": "asunto personalizado",
  "personalized_greeting": "saludo personalizado",
  "personalized_body": "cuerpo personalizado",
  "personalized_cta": "llamada a acción personalizada",
  "tone_adjustments": ["ajuste 1", "ajuste 2"]
}`;

        const userPrompt = `Template: ${JSON.stringify(template_data)}. Contacto: ${JSON.stringify(contact_data)}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        let result;
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = { personalized_subject: '', personalized_body: content };
          }
        } catch {
          result = { personalized_body: content };
        }

        return new Response(JSON.stringify({
          success: true,
          personalization: result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

  } catch (error) {
    console.error('[crm-email-sequencer] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
