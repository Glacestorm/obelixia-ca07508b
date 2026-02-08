/**
 * useGaliaClaveAuth - Hook para autenticación con Cl@ve
 * Sistema de identificación electrónica del gobierno español
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClaveUserData {
  nif: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email?: string;
  nivel_aseguramiento: 'bajo' | 'sustancial' | 'alto';
  metodo_autenticacion: 'dnie' | 'clave_pin' | 'clave_permanente' | 'certificado';
  fecha_nacimiento?: string;
  nacionalidad?: string;
}

export interface ClaveSession {
  authenticated: boolean;
  user: ClaveUserData | null;
  beneficiario_id: string | null;
  session_state: string | null;
  auth_level: string | null;
}

export function useGaliaClaveAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<ClaveSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === INICIAR AUTENTICACIÓN ===
  const initiateAuth = useCallback(async (
    redirectUri?: string,
    authLevel: 'basic' | 'advanced' | 'high' = 'basic'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-clave-auth',
        {
          body: {
            action: 'initiate',
            redirect_uri: redirectUri,
            auth_level: authLevel
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        // Guardar state en localStorage para recuperarlo en callback
        if (data.data.state) {
          localStorage.setItem('galia_clave_state', data.data.state);
        }
        
        toast.info('Redirigiendo a Cl@ve...', {
          description: 'Completa la autenticación en la ventana de Cl@ve'
        });

        return data.data;
      }

      throw new Error('Error iniciando autenticación Cl@ve');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al iniciar Cl@ve', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PROCESAR CALLBACK ===
  const handleCallback = useCallback(async (code: string, state: string, nif?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar que el state coincide
      const savedState = localStorage.getItem('galia_clave_state');
      if (savedState !== state) {
        throw new Error('Estado de sesión inválido - posible ataque CSRF');
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-clave-auth',
        {
          body: {
            action: 'callback',
            code,
            state,
            nif
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data.data.authenticated) {
        const newSession: ClaveSession = {
          authenticated: true,
          user: data.data.user,
          beneficiario_id: data.data.beneficiario_id,
          session_state: state,
          auth_level: data.data.auth_level
        };

        setSession(newSession);
        localStorage.removeItem('galia_clave_state');
        
        toast.success('¡Autenticación exitosa!', {
          description: `Bienvenido/a ${data.data.user.nombre}`
        });

        return newSession;
      }

      throw new Error('Error procesando respuesta de Cl@ve');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en autenticación', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR SESIÓN ===
  const verifySession = useCallback(async (state?: string) => {
    const sessionState = state || session?.session_state;
    if (!sessionState) return false;

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-clave-auth',
        {
          body: {
            action: 'verify',
            state: sessionState
          }
        }
      );

      if (fnError) throw fnError;

      return data?.success && data.data.valid;
    } catch {
      return false;
    }
  }, [session]);

  // === OBTENER DATOS DEL USUARIO ===
  const getUserData = useCallback(async (nif: string) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-clave-auth',
        {
          body: {
            action: 'get_user_data',
            nif
          }
        }
      );

      if (fnError) throw fnError;

      return data?.success ? data.data : null;
    } catch (err) {
      console.error('[useGaliaClaveAuth] getUserData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CERRAR SESIÓN ===
  const logout = useCallback(async () => {
    if (!session?.session_state) {
      setSession(null);
      return true;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-clave-auth',
        {
          body: {
            action: 'logout',
            state: session.session_state
          }
        }
      );

      if (fnError) throw fnError;

      setSession(null);
      toast.info('Sesión Cl@ve cerrada');
      
      return true;
    } catch (err) {
      console.error('[useGaliaClaveAuth] logout error:', err);
      setSession(null);
      return true;
    }
  }, [session]);

  // === MÉTODOS DE AUTENTICACIÓN DISPONIBLES ===
  const getAuthMethods = useCallback(() => {
    return [
      {
        id: 'dnie',
        name: 'DNI electrónico',
        description: 'Autenticación con DNI electrónico y lector',
        icon: '💳',
        level: 'high'
      },
      {
        id: 'clave_pin',
        name: 'Cl@ve PIN',
        description: 'PIN de un solo uso enviado por SMS',
        icon: '📱',
        level: 'basic'
      },
      {
        id: 'clave_permanente',
        name: 'Cl@ve Permanente',
        description: 'Usuario y contraseña + código SMS',
        icon: '🔐',
        level: 'advanced'
      },
      {
        id: 'certificado',
        name: 'Certificado Digital',
        description: 'Certificado FNMT o equivalente',
        icon: '📜',
        level: 'high'
      }
    ];
  }, []);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: session?.authenticated ?? false,
    user: session?.user ?? null,
    beneficiarioId: session?.beneficiario_id ?? null,
    authLevel: session?.auth_level ?? null,
    // Acciones
    initiateAuth,
    handleCallback,
    verifySession,
    getUserData,
    logout,
    getAuthMethods
  };
}

export default useGaliaClaveAuth;
