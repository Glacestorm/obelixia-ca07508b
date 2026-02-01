/**
 * HRContractFormDialog - Crear/Editar contratos laborales
 */

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HRContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  contractId?: string;
  employeeId?: string;
  onSaved?: () => void;
}

const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'formacion', label: 'Formación y Aprendizaje' },
  { value: 'practicas', label: 'Prácticas' },
  { value: 'obra_servicio', label: 'Obra o Servicio' },
  { value: 'interinidad', label: 'Interinidad' },
  { value: 'relevo', label: 'Relevo' }
];

const WORKDAY_TYPES = [
  { value: 'completa', label: 'Jornada Completa' },
  { value: 'parcial', label: 'Jornada Parcial' },
  { value: 'reducida', label: 'Jornada Reducida' }
];

export function HRContractFormDialog({
  open,
  onOpenChange,
  companyId,
  contractId,
  employeeId,
  onSaved
}: HRContractFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    contract_type: 'indefinido',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    probation_end_date: '',
    base_salary: '',
    annual_salary: '',
    working_hours: '40',
    workday_type: 'completa',
    category: '',
    professional_group: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (contractId) {
        fetchContract();
      } else {
        resetForm();
      }
    }
  }, [open, contractId]);

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
        const employeeData: Array<{ id: string; first_name: string; last_name: string }> = await response.json();
        setEmployees(employeeData.map(e => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`
        })));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchContract = async () => {
    if (!contractId) return;
    
    const { data } = await supabase
      .from('erp_hr_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (data) {
      setFormData({
        employee_id: data.employee_id || '',
        contract_type: data.contract_type || 'indefinido',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        probation_end_date: data.probation_end_date || '',
        base_salary: data.base_salary?.toString() || '',
        annual_salary: data.annual_salary?.toString() || '',
        working_hours: data.working_hours?.toString() || '40',
        workday_type: data.workday_type || 'completa',
        category: data.category || '',
        professional_group: data.professional_group || '',
        notes: data.notes || ''
      });
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: employeeId || '',
      contract_type: 'indefinido',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      probation_end_date: '',
      base_salary: '',
      annual_salary: '',
      working_hours: '40',
      workday_type: 'completa',
      category: '',
      professional_group: '',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.start_date) {
      toast.error('Empleado y fecha de inicio son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const contractData = {
        company_id: companyId,
        employee_id: formData.employee_id,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        probation_end_date: formData.probation_end_date || null,
        base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
        annual_salary: formData.annual_salary ? parseFloat(formData.annual_salary) : null,
        working_hours: parseFloat(formData.working_hours) || 40,
        workday_type: formData.workday_type,
        category: formData.category || null,
        professional_group: formData.professional_group || null,
        notes: formData.notes || null
      };

      if (contractId) {
        const { error } = await supabase
          .from('erp_hr_contracts')
          .update(contractData)
          .eq('id', contractId);
        if (error) throw error;
        toast.success('Contrato actualizado');
      } else {
        const { error } = await supabase
          .from('erp_hr_contracts')
          .insert([contractData]);
        if (error) throw error;
        toast.success('Contrato creado');
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Error al guardar el contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {contractId ? 'Editar Contrato' : 'Nuevo Contrato'}
          </DialogTitle>
          <DialogDescription>
            Complete los datos del contrato laboral
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Tipo de Contrato *</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, contract_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin Período Prueba</Label>
                <Input
                  type="date"
                  value={formData.probation_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, probation_end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Salario Base Mensual (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_salary: e.target.value }))}
                  placeholder="2500.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Anual (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.annual_salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_salary: e.target.value }))}
                  placeholder="35000.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Horas Semanales</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.working_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, working_hours: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo Jornada</Label>
                <Select
                  value={formData.workday_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, workday_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKDAY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría Profesional</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ej: Técnico"
                />
              </div>
              <div className="space-y-2">
                <Label>Grupo Profesional</Label>
                <Input
                  value={formData.professional_group}
                  onChange={(e) => setFormData(prev => ({ ...prev, professional_group: e.target.value }))}
                  placeholder="Ej: 2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

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
            {contractId ? 'Actualizar' : 'Crear Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRContractFormDialog;
