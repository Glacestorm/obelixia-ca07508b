import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePayslipTexts(employeeId?: string) {
  return useQuery({
    queryKey: ['payslip-texts', employeeId ?? 'global'],
    queryFn: async () => {
      let query = supabase.from('erp_hr_payslip_texts').select('*').order('created_at', { ascending: false });
      if (employeeId) {
        query = query.or(`employee_id.eq.${employeeId},applies_to_all.eq.true`);
      } else {
        query = query.eq('applies_to_all', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePayslipText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: any) => {
      const { data, error } = await supabase.from('erp_hr_payslip_texts').insert(text).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslip-texts'] });
      toast.success('Texto de recibo creado');
    },
    onError: () => toast.error('Error al crear texto'),
  });
}

export function useUpdatePayslipText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('erp_hr_payslip_texts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslip-texts'] });
      toast.success('Texto actualizado');
    },
  });
}

export function useDeletePayslipText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('erp_hr_payslip_texts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslip-texts'] });
      toast.success('Texto eliminado');
    },
  });
}
