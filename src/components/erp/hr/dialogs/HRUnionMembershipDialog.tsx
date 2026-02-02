/**
 * HRUnionMembershipDialog - Registro de afiliación sindical
 * Con soporte para tipo de representante, mandato y estado
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { HREmployeeSearchSelect } from '../shared/HREmployeeSearchSelect';
import { toast } from 'sonner';
import { Users, UserCheck } from 'lucide-react';

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

const REPRESENTATIVE_TYPES = [
  { value: 'none', label: 'No es representante' },
  { value: 'delegado_personal', label: 'Delegado de Personal' },
  { value: 'comite_empresa', label: 'Miembro del Comité de Empresa' },
  { value: 'delegado_sindical', label: 'Delegado Sindical' },
  { value: 'seccion_sindical', label: 'Sección Sindical' },
  { value: 'delegado_prevencion', label: 'Delegado de Prevención' },
];

const MEMBERSHIP_STATUS = [
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'inactive', label: 'Baja' },
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
    status: 'active',
    // Campos de representante
    isRepresentative: false,
    representativeType: 'none',
    mandateStartDate: '',
    mandateEndDate: '',
    creditHoursMonthly: '15',
    notes: ''
  });

  const handleSubmit = async () => {
    if (!form.employeeId || !form.union) {
      toast.error('Selecciona empleado y sindicato');
      return;
    }

    if (form.isRepresentative && form.representativeType === 'none') {
      toast.error('Selecciona el tipo de representante');
      return;
    }

    if (form.isRepresentative && (!form.mandateStartDate || !form.mandateEndDate)) {
      toast.error('Las fechas de mandato son obligatorias para representantes');
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
        status: 'active',
        isRepresentative: false,
        representativeType: 'none',
        mandateStartDate: '',
        mandateEndDate: '',
        creditHoursMonthly: '15',
        notes: ''
      });
    } catch (error) {
      console.error('Error registering union membership:', error);
      toast.error('Error al registrar la afiliación');
    } finally {
      setLoading(false);
    }
  };

  // Calcular horas de crédito según tipo
  const getCreditHoursLabel = () => {
    switch (form.representativeType) {
      case 'delegado_personal':
      case 'delegado_sindical':
        return '15 horas/mes (plantilla ≤100)';
      case 'comite_empresa':
        return '20 horas/mes (plantilla 101-250)';
      case 'delegado_prevencion':
        return 'Según convenio';
      default:
        return 'Según ET Art. 68';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          {/* Datos básicos de afiliación */}
          <div className="space-y-2">
            <Label>Empleado *</Label>
            <HREmployeeSearchSelect
              companyId={companyId}
              value={form.employeeId}
              onValueChange={(id) => setForm({ ...form, employeeId: id })}
              placeholder="Buscar empleado..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERSHIP_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <Separator />

          {/* Sección de representante */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRepresentative"
                checked={form.isRepresentative}
                onCheckedChange={(checked) => setForm({ 
                  ...form, 
                  isRepresentative: checked as boolean,
                  representativeType: checked ? 'delegado_personal' : 'none'
                })}
              />
              <Label htmlFor="isRepresentative" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Es representante de los trabajadores
              </Label>
            </div>

            {form.isRepresentative && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Tipo de Representante *</Label>
                  <Select 
                    value={form.representativeType} 
                    onValueChange={(v) => setForm({ ...form, representativeType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPRESENTATIVE_TYPES.filter(t => t.value !== 'none').map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio Mandato *</Label>
                    <Input
                      type="date"
                      value={form.mandateStartDate}
                      onChange={(e) => setForm({ ...form, mandateStartDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin Mandato *</Label>
                    <Input
                      type="date"
                      value={form.mandateEndDate}
                      onChange={(e) => setForm({ ...form, mandateEndDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Crédito Horario Mensual</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      className="w-24"
                      value={form.creditHoursMonthly}
                      onChange={(e) => setForm({ ...form, creditHoursMonthly: e.target.value })}
                    />
                    <span className="text-sm text-muted-foreground">horas</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{getCreditHoursLabel()}</p>
                </div>
              </div>
            )}
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
