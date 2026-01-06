/**
 * Tab de Condiciones de Pago del Proveedor
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMaestros, PaymentTerm } from '@/hooks/erp/useMaestros';

export interface SupplierPayment {
  supplier_id: string;
  payment_terms_id: string | null;
  notes: string | null;
}

interface SupplierPaymentTabProps {
  supplierId: string;
}

export const SupplierPaymentTab: React.FC<SupplierPaymentTabProps> = ({
  supplierId
}) => {
  const { paymentTerms, paymentTermsLoading } = useMaestros();
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    payment_terms_id: '',
    notes: ''
  });

  useEffect(() => {
    const fetchPayment = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('supplier_payment')
          .select('*')
          .eq('supplier_id', supplierId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setPayment(data as SupplierPayment);
          setFormData({
            payment_terms_id: data.payment_terms_id || '',
            notes: data.notes || ''
          });
        }
      } catch (err) {
        console.error('[SupplierPaymentTab] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (supplierId) {
      fetchPayment();
    }
  }, [supplierId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        supplier_id: supplierId,
        payment_terms_id: formData.payment_terms_id || null,
        notes: formData.notes || null
      };

      if (payment) {
        const { error } = await supabase
          .from('supplier_payment')
          .update(dataToSave)
          .eq('supplier_id', supplierId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_payment')
          .insert([dataToSave] as any);

        if (error) throw error;
        setPayment(dataToSave);
      }

      toast.success('Condiciones de pago guardadas');
    } catch (err) {
      console.error('[SupplierPaymentTab] Save error:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || paymentTermsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <CreditCard className="h-5 w-5" />
        <span className="text-sm">Configura las condiciones de pago para este proveedor</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Condiciones de Pago</Label>
          <Select
            value={formData.payment_terms_id || '__none__'}
            onValueChange={(v) => setFormData({ ...formData, payment_terms_id: v === '__none__' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar condiciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin condiciones específicas</SelectItem>
              {paymentTerms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name} ({term.days} días)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Condiciones de pago por defecto para este proveedor
          </p>
        </div>

        <div className="space-y-2">
          <Label>Notas de Pago</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas sobre el pago a este proveedor..."
            rows={4}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
};

export default SupplierPaymentTab;
