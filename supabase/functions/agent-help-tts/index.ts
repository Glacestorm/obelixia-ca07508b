/**
 * Edge Function: Agent Help TTS (Text to Speech)
 * Convierte texto a voz para el chatbot de ayuda
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voice?: string;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    // Si no hay API key de OpenAI, devolver un mensaje indicando que TTS no está disponible
    if (!OPENAI_API_KEY) {
      console.log('[agent-help-tts] OpenAI API key not configured - TTS unavailable');
      return new Response(JSON.stringify({
        success: false,
        error: 'TTS not available',
        message: 'El servicio de voz no está configurado.'
      }), {
        status: 200, // No es un error crítico
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, voice = 'alloy' } = await req.json() as TTSRequest;

    if (!text || text.length === 0) {
      return new Response(JSON.stringify({
        error: 'Text is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limitar longitud del texto para evitar costos excesivos
    const maxLength = 4000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    console.log(`[agent-help-tts] Generating speech for ${truncatedText.length} characters`);

    // Llamar a OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncatedText,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[agent-help-tts] OpenAI error:', error);
      throw new Error('Failed to generate speech');
    }

    // Convertir a base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    console.log('[agent-help-tts] Speech generated successfully');

    return new Response(JSON.stringify({
      success: true,
      audioContent: base64Audio
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[agent-help-tts] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
