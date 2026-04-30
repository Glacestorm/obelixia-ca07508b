import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import type { RawStagingRowInput } from '@/hooks/erp/hr/useTicNacSalaryTableStagingActions';

export interface StagingRowEditFormProps {
  row: StagingRowSummary;
  isPending?: boolean;
  onCancel: () => void;
  onSubmit: (patch: Partial<RawStagingRowInput>) => void;
}

const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function StagingRowEditForm({ row, isPending, onCancel, onSubmit }: StagingRowEditFormProps) {
  const [form, setForm] = useState<Record<string, unknown>>({
    year: row.year,
    area_code: (row as any).area_code ?? '',
    area_name: (row as any).area_name ?? '',
    professional_group: row.professional_group,
    level: row.level ?? '',
    category: row.category ?? '',
    concept_literal_from_agreement: row.concept_literal_from_agreement,
    normalized_concept_key: row.normalized_concept_key,
    payroll_label: (row as any).payroll_label ?? '',
    payslip_label: row.payslip_label,
    salary_base_annual: (row as any).salary_base_annual ?? '',
    salary_base_monthly: (row as any).salary_base_monthly ?? '',
    extra_pay_amount: (row as any).extra_pay_amount ?? '',
    plus_convenio_annual: (row as any).plus_convenio_annual ?? '',
    plus_convenio_monthly: (row as any).plus_convenio_monthly ?? '',
    plus_transport: (row as any).plus_transport ?? '',
    plus_antiguedad: (row as any).plus_antiguedad ?? '',
    other_amount: (row as any).other_amount ?? '',
    source_page: row.source_page,
    source_excerpt: row.source_excerpt,
    review_notes: (row as any).review_notes ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    const patch: Partial<RawStagingRowInput> = {
      year: Number(form.year) || row.year,
      area_code: (form.area_code as string) || null,
      area_name: (form.area_name as string) || null,
      professional_group: String(form.professional_group),
      level: (form.level as string) || null,
      category: (form.category as string) || null,
      concept_literal_from_agreement: String(form.concept_literal_from_agreement),
      normalized_concept_key: String(form.normalized_concept_key),
      payroll_label: String(form.payroll_label),
      payslip_label: String(form.payslip_label),
      salary_base_annual: num(form.salary_base_annual),
      salary_base_monthly: num(form.salary_base_monthly),
      extra_pay_amount: num(form.extra_pay_amount),
      plus_convenio_annual: num(form.plus_convenio_annual),
      plus_convenio_monthly: num(form.plus_convenio_monthly),
      plus_transport: num(form.plus_transport),
      plus_antiguedad: num(form.plus_antiguedad),
      other_amount: num(form.other_amount),
      source_page: String(form.source_page),
      source_excerpt: String(form.source_excerpt),
      review_notes: (form.review_notes as string) || null,
    };
    onSubmit(patch);
  };

  const Field = ({ k, label, type = 'text' }: { k: string; label: string; type?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={(form[k] as string | number) ?? ''} onChange={set(k)} type={type} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field k="year" label="Año" type="number" />
        <Field k="area_code" label="Área (código)" />
        <Field k="area_name" label="Área (nombre)" />
        <Field k="professional_group" label="Grupo profesional" />
        <Field k="level" label="Nivel" />
        <Field k="category" label="Categoría" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field k="concept_literal_from_agreement" label="Literal del convenio" />
        <Field k="normalized_concept_key" label="Clave normalizada" />
        <Field k="payroll_label" label="Etiqueta nómina (interna)" />
        <Field k="payslip_label" label="Etiqueta payslip (visible)" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field k="salary_base_annual" label="Salario base anual" type="number" />
        <Field k="salary_base_monthly" label="Salario base mensual" type="number" />
        <Field k="extra_pay_amount" label="Paga extra" type="number" />
        <Field k="plus_convenio_annual" label="Plus convenio anual" type="number" />
        <Field k="plus_convenio_monthly" label="Plus convenio mensual" type="number" />
        <Field k="plus_transport" label="Plus transporte" type="number" />
        <Field k="plus_antiguedad" label="Plus antigüedad" type="number" />
        <Field k="other_amount" label="Otros" type="number" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field k="source_page" label="Página fuente" />
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Extracto fuente</Label>
          <Textarea
            value={(form.source_excerpt as string) ?? ''}
            onChange={set('source_excerpt')}
            rows={3}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Notas de revisión</Label>
          <Textarea
            value={(form.review_notes as string) ?? ''}
            onChange={set('review_notes')}
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={isPending} data-testid="staging-edit-save">
          Guardar propuesta
        </Button>
      </div>
    </div>
  );
}

export default StagingRowEditForm;