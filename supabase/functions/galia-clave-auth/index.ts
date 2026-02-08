import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GALIA Cl@ve Authentication Edge Function
 * Integración con sistema de autenticación Cl@ve del gobierno español
 * 
 * Cl@ve es el sistema de identificación electrónica para ciudadanos españoles
 * que permite autenticarse con DNIe, Cl@ve PIN, Cl@ve Permanente o certificado digital
 */

interface ClaveAuthRequest {
  action: 'initiate' | 'callback' | 'verify' | 'get_user_data' | 'logout';
  redirect_uri?: string;
  auth_level?: 'basic' | 'advanced' | 'high'; // Niveles de seguridad eIDAS
  nif?: string;
  code?: string;
  state?: string;
  metadata?: Record<string, unknown>;
}

interface ClaveUserData {
  nif: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email?: string;
  nivel_aseguramiento: 'bajo' | 'sustancial' | 'alto'; // eIDAS levels
  metodo_autenticacion: 'dnie' | 'clave_pin' | 'clave_permanente' | 'certificado';
  fecha_nacimiento?: string;
  nacionalidad?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, redirect_uri, auth_level, nif, code, state, metadata } = await req.json() as ClaveAuthRequest;

    console.log(`[galia-clave-auth] Processing action: ${action}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'initiate': {
        // Generar URL de autenticación Cl@ve
        // En producción, esto conectaría con el endpoint real de Cl@ve
        const claveState = crypto.randomUUID();
        const claveNonce = crypto.randomUUID();
        
        // Guardar estado para verificación posterior
        const { error: stateError } = await supabase
          .from('galia_clave_sessions')
          .insert({
            state: claveState,
            nonce: claveNonce,
            redirect_uri: redirect_uri || '/galia/portal',
            auth_level: auth_level || 'basic',
            status: 'pending',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
          });

        if (stateError) {
          console.error('[galia-clave-auth] Error saving session state:', stateError);
        }

        // URL de Cl@ve (simulada para desarrollo)
        // En producción: https://clave.gob.es/clave-openid-connect
        const claveAuthUrl = new URL('https://clave.gob.es/clave-openid-connect/auth');
        claveAuthUrl.searchParams.set('response_type', 'code');
        claveAuthUrl.searchParams.set('client_id', Deno.env.get('CLAVE_CLIENT_ID') || 'GALIA_DEV');
        claveAuthUrl.searchParams.set('redirect_uri', redirect_uri || `${req.headers.get('origin')}/galia/clave-callback`);
        claveAuthUrl.searchParams.set('scope', 'openid profile email');
        claveAuthUrl.searchParams.set('state', claveState);
        claveAuthUrl.searchParams.set('nonce', claveNonce);
        claveAuthUrl.searchParams.set('acr_values', auth_level === 'high' ? 'urn:clave:loa:high' : 'urn:clave:loa:basic');

        result = {
          auth_url: claveAuthUrl.toString(),
          state: claveState,
          message: 'Redirigir al usuario a la URL de autenticación Cl@ve',
          expires_in: 600, // 10 minutos
          instructions: {
            step1: 'Redirigir usuario a auth_url',
            step2: 'Usuario completa autenticación en Cl@ve',
            step3: 'Cl@ve redirige a redirect_uri con code y state',
            step4: 'Llamar a action:callback con code y state recibidos'
          }
        };
        break;
      }

      case 'callback': {
        if (!code || !state) {
          throw new Error('Se requiere code y state del callback de Cl@ve');
        }

        // Verificar que el state existe y no ha expirado
        const { data: sessionData, error: sessionError } = await supabase
          .from('galia_clave_sessions')
          .select('*')
          .eq('state', state)
          .eq('status', 'pending')
          .single();

        if (sessionError || !sessionData) {
          throw new Error('Sesión de autenticación inválida o expirada');
        }

        // Intercambiar código por token (simulado)
        // En producción: POST a https://clave.gob.es/clave-openid-connect/token
        const mockUserData: ClaveUserData = {
          nif: nif || 'DEMO12345678A',
          nombre: 'Usuario',
          apellido1: 'Demo',
          apellido2: 'Cl@ve',
          email: 'usuario@demo.galia.es',
          nivel_aseguramiento: 'sustancial',
          metodo_autenticacion: 'clave_pin',
          nacionalidad: 'ES'
        };

        // Actualizar sesión
        await supabase
          .from('galia_clave_sessions')
          .update({
            status: 'authenticated',
            user_data: mockUserData,
            authenticated_at: new Date().toISOString()
          })
          .eq('state', state);

        // Buscar o crear beneficiario en GALIA
        let beneficiarioId: string | null = null;
        const { data: existingBenef } = await supabase
          .from('galia_beneficiarios')
          .select('id')
          .eq('nif', mockUserData.nif)
          .single();

        if (existingBenef) {
          beneficiarioId = existingBenef.id;
        } else {
          // Crear nuevo beneficiario
          const { data: newBenef } = await supabase
            .from('galia_beneficiarios')
            .insert({
              nif: mockUserData.nif,
              nombre: `${mockUserData.nombre} ${mockUserData.apellido1} ${mockUserData.apellido2 || ''}`.trim(),
              tipo: 'persona_fisica',
              email: mockUserData.email,
              clave_auth_level: mockUserData.nivel_aseguramiento,
              metadata: { clave_verified: true, metodo: mockUserData.metodo_autenticacion }
            })
            .select('id')
            .single();
          
          if (newBenef) {
            beneficiarioId = newBenef.id;
          }
        }

        result = {
          authenticated: true,
          user: mockUserData,
          beneficiario_id: beneficiarioId,
          session_state: state,
          auth_level: mockUserData.nivel_aseguramiento,
          redirect_to: sessionData.redirect_uri
        };
        break;
      }

      case 'verify': {
        if (!state) {
          throw new Error('Se requiere state para verificar sesión');
        }

        const { data: session } = await supabase
          .from('galia_clave_sessions')
          .select('*')
          .eq('state', state)
          .single();

        if (!session) {
          result = { valid: false, message: 'Sesión no encontrada' };
        } else if (session.status !== 'authenticated') {
          result = { valid: false, message: 'Sesión no autenticada', status: session.status };
        } else if (new Date(session.expires_at) < new Date()) {
          result = { valid: false, message: 'Sesión expirada' };
        } else {
          result = {
            valid: true,
            user: session.user_data,
            auth_level: session.auth_level,
            authenticated_at: session.authenticated_at
          };
        }
        break;
      }

      case 'get_user_data': {
        if (!nif) {
          throw new Error('Se requiere NIF para obtener datos del usuario');
        }

        // Usar IA para enriquecer datos del ciudadano
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un asistente del sistema GALIA que ayuda a validar y enriquecer datos de ciudadanos españoles para solicitudes de subvenciones LEADER.
                
RESPONDE SIEMPRE EN JSON con este formato:
{
  "validacion_nif": { "valido": boolean, "tipo": "DNI|NIE|CIF", "formato_correcto": boolean },
  "perfil_sugerido": { "tipo_beneficiario": "persona_fisica|empresa|asociacion|ayuntamiento", "sector_probable": string },
  "requisitos_documentales": string[],
  "avisos": string[]
}`
              },
              {
                role: 'user',
                content: `Analiza este NIF y proporciona información para el portal GALIA: ${nif}`
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;

        let enrichedData;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          enrichedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
          enrichedData = { raw: content };
        }

        result = {
          nif,
          enriched_data: enrichedData,
          clave_methods_available: ['dnie', 'clave_pin', 'clave_permanente', 'certificado_digital'],
          required_auth_level: 'sustancial' // Para subvenciones se requiere nivel sustancial o alto
        };
        break;
      }

      case 'logout': {
        if (!state) {
          throw new Error('Se requiere state para cerrar sesión');
        }

        await supabase
          .from('galia_clave_sessions')
          .update({ status: 'logged_out', logged_out_at: new Date().toISOString() })
          .eq('state', state);

        result = {
          logged_out: true,
          message: 'Sesión Cl@ve cerrada correctamente',
          clave_logout_url: 'https://clave.gob.es/logout' // URL de logout de Cl@ve
        };
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-clave-auth] Action ${action} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-clave-auth] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
