/**
 * HRUnionMembershipDialog - Registro de afiliación sindical
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HREmployeeSearchSelect } from '../shared/HREmployeeSearchSelect';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface HRUnionMembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

const UNIONS = [
  { value: 'CCOO', label: 'CCOO - Comisiones Obreras' },
  { value: 'UGT', label: 'UGT - Unión General de Trabajadores' },
  { value: 'USO', label: 'USO - Unión Sindical Obrera' },
  { value: 'CGT', label: 'CGT - Confederación General del Trabajo' },
  { value: 'ELA', label: 'ELA - Eusko Langileen Alkartasuna' },
  { value: 'LAB', label: 'LAB - Langile Abertzaleen Batzordeak' },
  { value: 'CSIF', label: 'CSIF - Central Sindical Independiente' },
  { value: 'OTHER', label: 'Otro sindicato' },
];

export function HRUnionMembershipDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess
}: HRUnionMembershipDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    union: '',
    membershipDate: new Date().toISOString().split('T')[0],
    monthlyFee: '15.00',
    payrollDeduction: true,
    membershipNumber: '',
    notes: ''
  });

  const handleSubmit = async () => {
    if (!form.employeeId || !form.union) {
      toast.error('Selecciona empleado y sindicato');
      return;
    }

    setLoading(true);
    try {
      // Simular guardado - aquí iría la lógica real con supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Afiliación sindical registrada correctamente');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setForm({
        employeeId: '',
        union: '',
        membershipDate: new Date().toISOString().split('T')[0],
        monthlyFee: '15.00',
        payrollDeduction: true,
        membershipNumber: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error registering union membership:', error);
      toast.error('Error al registrar la afiliación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registrar Afiliación Sindical
          </DialogTitle>
          <DialogDescription>
            Registra la afiliación de un empleado a una organización sindical
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Empleado *</Label>
            <HREmployeeSearchSelect
              companyId={companyId}
              value={form.employeeId}
              onValueChange={(id) => setForm({ ...form, employeeId: id })}
              placeholder="Buscar empleado..."
            />
          </div>

          <div className="space-y-2">
            <Label>Sindicato *</Label>
            <Select value={form.union} onValueChange={(v) => setForm({ ...form, union: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sindicato" />
              </SelectTrigger>
              <SelectContent>
                {UNIONS.map(union => (
                  <SelectItem key={union.value} value={union.value}>
                    {union.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Afiliación</Label>
              <Input
                type="date"
                value={form.membershipDate}
                onChange={(e) => setForm({ ...form, membershipDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cuota Mensual (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monthlyFee}
                onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nº Afiliado (opcional)</Label>
            <Input
              value={form.membershipNumber}
              onChange={(e) => setForm({ ...form, membershipNumber: e.target.value })}
              placeholder="Número de afiliación sindical"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="payrollDeduction"
              checked={form.payrollDeduction}
              onCheckedChange={(checked) => setForm({ ...form, payrollDeduction: checked as boolean })}
            />
            <Label htmlFor="payrollDeduction" className="text-sm font-normal cursor-pointer">
              Retener cuota sindical en nómina
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar Afiliación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRUnionMembershipDialog;
