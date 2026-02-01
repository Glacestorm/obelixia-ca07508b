/**
 * HRBenefitEnrollmentDialog - Inscribir empleado en beneficio
 */

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Save, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Benefit {
  id: string;
  benefit_name: string;
  benefit_type: string;
  monthly_cost_company: number;
  monthly_cost_employee: number;
  max_beneficiaries: number;
}

interface HRBenefitEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  benefit: Benefit | null;
  onSuccess?: () => void;
}

export function HRBenefitEnrollmentDialog({
  open,
  onOpenChange,
  companyId,
  benefit,
  onSuccess
}: HRBenefitEnrollmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    coverage_level: 'individual',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      resetForm();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_employees?company_id=eq.${companyId}&is_active=eq.true&select=id,first_name,last_name&order=first_name`;
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        }
      });
      
      if (response.ok) {
        const data: Array<{ id: string; first_name: string; last_name: string }> = await response.json();
        setEmployees(data.map(e => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`
        })));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      coverage_level: 'individual',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !benefit) {
      toast.error('Seleccione un empleado');
      return;
    }

    setLoading(true);
    try {
      const enrollmentData = {
        employee_id: formData.employee_id,
        benefit_id: benefit.id,
        enrollment_date: formData.enrollment_date,
        status: 'pending',
        employee_contribution: benefit.monthly_cost_employee,
        company_contribution: benefit.monthly_cost_company,
        coverage_level: formData.coverage_level,
        notes: formData.notes || null,
        beneficiaries: []
      };

      const { error } = await supabase
        .from('erp_hr_employee_benefits')
        .insert([enrollmentData]);

      if (error) throw error;

      toast.success('Inscripción registrada correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error enrolling employee:', error);
      if (error.code === '23505') {
        toast.error('El empleado ya está inscrito en este beneficio');
      } else {
        toast.error('Error al registrar la inscripción');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!benefit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Inscribir en Beneficio
          </DialogTitle>
          <DialogDescription>
            {benefit.benefit_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Coste Empresa:</span>
                <span className="ml-2 font-medium">€{benefit.monthly_cost_company}/mes</span>
              </div>
              <div>
                <span className="text-muted-foreground">Coste Empleado:</span>
                <span className="ml-2 font-medium">€{benefit.monthly_cost_employee}/mes</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Empleado *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, employee_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Inscripción</Label>
            <Input
              type="date"
              value={formData.enrollment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, enrollment_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Nivel de Cobertura</Label>
            <Select
              value={formData.coverage_level}
              onValueChange={(v) => setFormData(prev => ({ ...prev, coverage_level: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="familiar">Familiar</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Inscribir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRBenefitEnrollmentDialog;
