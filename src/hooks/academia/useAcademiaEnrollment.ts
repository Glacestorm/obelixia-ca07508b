/**
 * useAcademiaEnrollment - Hook para gestionar inscripciones a cursos de la academia
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AcademiaEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string | null;
  progress_percentage: number;
  completed_at: string | null;
}

export function useAcademiaEnrollment() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enrollment, setEnrollment] = useState<AcademiaEnrollment | null>(null);

  const checkEnrollment = useCallback(async (courseId: string) => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('academia_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      const result = data as AcademiaEnrollment | null;
      setEnrollment(result);
      return result;
    } catch (err) {
      console.error('[useAcademiaEnrollment] checkEnrollment error:', err);
      return null;
    }
  }, [user?.id]);

  const enrollFree = useCallback(async (courseId: string) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para inscribirte');
      return null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('academia_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setEnrollment(data as AcademiaEnrollment);
      toast.success('¡Inscripción completada!');
      return data;
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.info('Ya estás inscrito en este curso');
        await checkEnrollment(courseId);
      } else {
        console.error('[useAcademiaEnrollment] enrollFree error:', err);
        toast.error('Error al inscribirse');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkEnrollment]);

  const startCheckout = useCallback(async (courseId: string, courseTitle: string, price: number) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para comprar el curso');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-academia-checkout', {
        body: { courseId, courseTitle, price },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('[useAcademiaEnrollment] startCheckout error:', err);
      toast.error('Error al iniciar el pago');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const verifyPayment = useCallback(async (sessionId: string, courseId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-academia-payment', {
        body: { sessionId, courseId },
      });

      if (error) throw error;
      if (data?.success) {
        setEnrollment({ 
          id: data.enrollmentId, 
          user_id: user?.id || '', 
          course_id: courseId, 
          status: 'active',
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0,
          completed_at: null,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useAcademiaEnrollment] verifyPayment error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    enrollment,
    loading,
    checkEnrollment,
    enrollFree,
    startCheckout,
    verifyPayment,
  };
}
