/**
 * B13.5C — Compute preview dialog. Routes through useAgreementImpactPreviews.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { useAgreementImpactPreviews } from '@/hooks/erp/hr/useAgreementImpactPreviews';

type Hook = ReturnType<typeof useAgreementImpactPreviews>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hook: Pick<Hook, 'computeScope' | 'computeImpactPreview'>;
  defaultAgreementId?: string;
  defaultVersionId?: string;
  defaultCompanyId?: string;
}

export function AgreementImpactComputeDialog({
  open,
  onOpenChange,
  hook,
  defaultAgreementId,
  defaultVersionId,
  defaultCompanyId,
}: Props) {
  const [agreementId, setAgreementId] = useState(defaultAgreementId ?? '');
  const [versionId, setVersionId] = useState(defaultVersionId ?? '');
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? '');
  const [employeeId, setEmployeeId] = useState('');
  const [contractId, setContractId] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [asOfDate, setAsOfDate] = useState('');
  const [arrearsFrom, setArrearsFrom] = useState('');
  const [arrearsTo, setArrearsTo] = useState('');
  const [employerMult, setEmployerMult] = useState('1.32');
  const [requireRuntime, setRequireRuntime] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function onCompute() {
    if (!agreementId || !versionId || !companyId) return;
    setSubmitting(true);
    const options = {
      target_year: targetYear,
      as_of_date: asOfDate || undefined,
      arrears_from: arrearsFrom || undefined,
      arrears_to: arrearsTo || undefined,
      employer_cost_multiplier: employerMult ? Number(employerMult) : undefined,
      require_runtime_setting: requireRuntime,
    };
    if (employeeId || contractId) {
      await hook.computeImpactPreview({
        agreement_id: agreementId,
        version_id: versionId,
        company_id: companyId,
        employee_id: employeeId || undefined,
        contract_id: contractId || undefined,
        options,
      });
    } else {
      await hook.computeScope({
        agreement_id: agreementId,
        version_id: versionId,
        company_id: companyId,
        options,
      });
    }
    setSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calcular preview de impacto</DialogTitle>
          <DialogDescription>
            Este cálculo no modifica nóminas ni empleados. Solo genera preview de impacto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>agreement_id</Label>
            <Input value={agreementId} onChange={(e) => setAgreementId(e.target.value)} />
          </div>
          <div>
            <Label>version_id</Label>
            <Input value={versionId} onChange={(e) => setVersionId(e.target.value)} />
          </div>
          <div>
            <Label>company_id</Label>
            <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
          </div>
          <div>
            <Label>employee_id (opcional)</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </div>
          <div>
            <Label>contract_id (opcional)</Label>
            <Input value={contractId} onChange={(e) => setContractId(e.target.value)} />
          </div>
          <div>
            <Label>target_year</Label>
            <Input
              type="number"
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>as_of_date</Label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
          <div>
            <Label>arrears_from</Label>
            <Input type="date" value={arrearsFrom} onChange={(e) => setArrearsFrom(e.target.value)} />
          </div>
          <div>
            <Label>arrears_to</Label>
            <Input type="date" value={arrearsTo} onChange={(e) => setArrearsTo(e.target.value)} />
          </div>
          <div>
            <Label>employer_cost_multiplier</Label>
            <Input value={employerMult} onChange={(e) => setEmployerMult(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox
              id="require-runtime"
              checked={requireRuntime}
              onCheckedChange={(v) => setRequireRuntime(Boolean(v))}
            />
            <Label htmlFor="require-runtime">require_runtime_setting</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onCompute} disabled={submitting || !agreementId || !versionId || !companyId}>
            Calcular preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgreementImpactComputeDialog;