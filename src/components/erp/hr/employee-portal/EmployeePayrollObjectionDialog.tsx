/**
 * EmployeePayrollObjectionDialog — Reportar incidencia / Solicitar revisión interna (S9.22).
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2, Send } from 'lucide-react';
import { usePayrollObjections, type ObjectionCategory } from '@/hooks/erp/hr/usePayrollObjections';
import { PAYROLL_LEGAL_NOTICES } from '@/lib/hr/payroll/legalNotices';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollRecordId: string;
  employeeId: string;
  companyId: string;
  onCreated?: () => void;
}

const CATEGORIES: Array<{ value: ObjectionCategory; label: string }> = [
  { value: 'concepto_incorrecto', label: 'Concepto incorrecto' },
  { value: 'importe_incorrecto', label: 'Importe incorrecto' },
  { value: 'concepto_faltante', label: 'Concepto faltante' },
  { value: 'datos_personales', label: 'Datos personales' },
  { value: 'otro', label: 'Otro' },
];

export function EmployeePayrollObjectionDialog({
  open, onOpenChange, payrollRecordId, employeeId, companyId, onCreated,
}: Props) {
  const { create, submitting } = usePayrollObjections({ payrollRecordId, employeeId, companyId });
  const [category, setCategory] = useState<ObjectionCategory>('importe_incorrecto');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => { setCategory('importe_incorrecto'); setSubject(''); setDescription(''); };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return;
    const result = await create({ payrollRecordId, category, subject, description });
    if (result) {
      reset();
      onOpenChange(false);
      onCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reportar incidencia / Solicitar revisión interna</DialogTitle>
          <DialogDescription>
            Tu solicitud llegará a RRHH para revisión interna. Sin adjuntos en esta versión.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 dark:text-amber-100 leading-snug">
            {PAYROLL_LEGAL_NOTICES.INTERNAL_REVIEW_SCOPE}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs">Categoría</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ObjectionCategory)}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs">Asunto</Label>
            <Input
              id="subject" value={subject} maxLength={120}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Falta plus de transporte"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Descripción</Label>
            <Textarea
              id="description" value={description} rows={5} maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe con detalle el concepto y el importe que crees incorrecto…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !description.trim()}
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar incidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}