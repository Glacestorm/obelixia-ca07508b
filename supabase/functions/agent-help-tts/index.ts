/**
 * Agent Help TTS - Edge Function
 * Text-to-Speech con ElevenLabs
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

serve(async (req) => {
  // === CORS ===
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === VALIDATE API KEY ===
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const { text, voiceId, stability, similarityBoost } = await req.json() as TTSRequest;

    if (!text) {
      throw new Error('Text is required');
    }

    // Limitar texto a 5000 caracteres
    const truncatedText = text.slice(0, 5000);
    
    // Voz por defecto: Sarah (natural y clara)
    const selectedVoiceId = voiceId || 'EXAVITQu4vr4xnSDxMaL';

    console.log(`[agent-help-tts] Generating speech for ${truncatedText.length} chars`);

    // === CALL ELEVENLABS ===
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: similarityBoost ?? 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[agent-help-tts] ElevenLabs error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // === RETURN AUDIO ===
    const audioBuffer = await response.arrayBuffer();

    console.log(`[agent-help-tts] Generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('[agent-help-tts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
