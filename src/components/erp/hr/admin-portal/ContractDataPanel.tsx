/**
 * ContractDataPanel — SEPE/Contrat@-oriented data panel for contract process
 * V2-ES.6 Paso 1.1: Shows in admin request detail when request_type === 'contract_registration'
 *
 * Mirrors RegistrationDataPanel pattern (alta/afiliación).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  FileSignature, Save, Edit2, X, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useHRContractProcess,
  CONTRACT_PROCESS_STATUS_CONFIG,
  CONTRACT_PROCESS_STATUS_TRANSITIONS,
  type ContractProcessData,
  type ContractProcessStatus,
} from '@/hooks/erp/hr/useHRContractProcess';
import type { EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { computeContractDeadlines, type ContractDeadlineSummary } from '../shared/contractDeadlineEngine';
import { buildContrataPayload } from '../shared/contrataPayloadBuilder';
import { ContractDeadlineAlert } from '../shared/ContractDeadlineAlert';
import { ContrataPreIntegrationBadge } from '../shared/ContrataPreIntegrationBadge';
import { useContrataReadiness } from '@/hooks/erp/hr/useContrataReadiness';
import { useContractClosure } from '@/hooks/erp/hr/useContractClosure';
import { ContractClosureSection } from '../shared/ContractClosureSection';
import { useHRHolidayCalendar } from '@/hooks/erp/hr/useHRHolidayCalendar';

// ─── Contract type options (common Spanish codes) ────────────────────────────

const CONTRACT_TYPES = [
  { value: '100', label: '100 — Indefinido ordinario' },
  { value: '130', label: '130 — Indefinido personas con discapacidad' },
  { value: '150', label: '150 — Indefinido fijo-discontinuo' },
  { value: '189', label: '189 — Indefinido otros' },
  { value: '401', label: '401 — Temporal por circunstancias de producción' },
  { value: '402', label: '402 — Temporal por sustitución' },
  { value: '420', label: '420 — Temporal por circunstancias de producción (< 6 meses)' },
  { value: '501', label: '501 — Formación en alternancia' },
  { value: '502', label: '502 — Formación para obtención de práctica profesional' },
];

const DURATION_TYPES = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'formacion', label: 'Formación' },
  { value: 'practicas', label: 'Prácticas' },
];

const HOURS_TYPES = [
  { value: 'completa', label: 'Jornada completa' },
  { value: 'parcial', label: 'Jornada parcial' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  requestId: string;
  companyId: string;
  employeeId: string;
  linkedDocs?: EmployeeDocument[];
  onDeadlinesComputed?: (summary: ContractDeadlineSummary) => void;
}

export function ContractDataPanel({ requestId, companyId, employeeId, linkedDocs = [], onDeadlinesComputed }: Props) {
  const {
    contractData,
    loading,
    fetchContractData,
    upsertContractData,
    updateContractStatus,
    computeReadiness,
    persistDeadlineAndPayload,
    closeContractProcess,
    reopenContractProcess,
  } = useHRContractProcess(companyId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<ContractProcessData>>({});
  const [showRecommended, setShowRecommended] = useState(false);

  const { holidaySet } = useHRHolidayCalendar();

  // Fetch on mount
  useEffect(() => {
    fetchContractData(requestId);
  }, [requestId, fetchContractData]);

  // Compute deadlines
  const deadlineSummary = useMemo(() => {
    return computeContractDeadlines(contractData, holidaySet);
  }, [contractData, holidaySet]);

  // Compute payload readiness
  const payloadResult = useMemo(() => {
    return buildContrataPayload(contractData);
  }, [contractData]);

  // Notify parent of deadline changes
  useEffect(() => {
    onDeadlinesComputed?.(deadlineSummary);
  }, [deadlineSummary, onDeadlinesComputed]);

  // Persist deadline + payload on data change
  useEffect(() => {
    if (contractData && contractData.request_id === requestId) {
      persistDeadlineAndPayload(requestId, holidaySet);
    }
  }, [contractData?.contract_start_date, contractData?.contract_process_status, contractData?.contract_type_code]);

  // Readiness
  const readiness = useMemo(() => {
    return computeReadiness(linkedDocs.map(d => ({ document_type: d.document_type })));
  }, [computeReadiness, linkedDocs]);

  // V2-ES.6 Paso 2: Pre-integration readiness (memoized via hook)
  const { summary: preIntegrationSummary } = useContrataReadiness({
    contractData,
    docCompleteness: {
      percentage: readiness.docs.percentage,
      mandatoryComplete: readiness.docs.mandatoryComplete,
    },
    deadlineSummary,
  });

  // V2-ES.6 Paso 3: Closure readiness
  const closure = useContractClosure({
    contractData,
    docCompleteness: readiness.docs ? {
      percentage: readiness.docs.percentage,
      mandatoryComplete: readiness.docs.mandatoryComplete,
    } : null,
    deadlineSummary,
  });

  // Closure action handlers
  const handleClose = useCallback(async (notes?: string) => {
    if (!contractData) return { success: false, error: 'No data' };
    return closeContractProcess(requestId, {
      docReadinessPercent: readiness.docs?.percentage ?? 0,
      docMandatoryComplete: readiness.docs?.mandatoryComplete ?? false,
      deadlineSummary,
    }, notes);
  }, [contractData, requestId, closeContractProcess, readiness.docs, deadlineSummary]);

  const handleReopen = useCallback(async (reason?: string) => {
    return reopenContractProcess(requestId, reason);
  }, [requestId, reopenContractProcess]);


  const startEdit = useCallback(() => {
    setDraft({
      contract_type_code: contractData?.contract_type_code ?? '',
      contract_subtype: contractData?.contract_subtype ?? '',
      contract_start_date: contractData?.contract_start_date ?? '',
      contract_end_date: contractData?.contract_end_date ?? '',
      contract_duration_type: contractData?.contract_duration_type ?? '',
      working_hours_type: contractData?.working_hours_type ?? '',
      working_hours_percent: contractData?.working_hours_percent ?? null,
      weekly_hours: contractData?.weekly_hours ?? null,
      trial_period_days: contractData?.trial_period_days ?? null,
      occupation_code: contractData?.occupation_code ?? '',
      job_title: contractData?.job_title ?? '',
      workplace_address: contractData?.workplace_address ?? '',
      collective_agreement: contractData?.collective_agreement ?? '',
      salary_gross_annual: contractData?.salary_gross_annual ?? null,
      salary_base_monthly: contractData?.salary_base_monthly ?? null,
      num_extra_payments: contractData?.num_extra_payments ?? 2,
      dni_nie: contractData?.dni_nie ?? '',
      naf: contractData?.naf ?? '',
      ccc: contractData?.ccc ?? '',
      legal_entity: contractData?.legal_entity ?? '',
      is_conversion: contractData?.is_conversion ?? false,
      conversion_from_type: contractData?.conversion_from_type ?? '',
      validation_notes: contractData?.validation_notes ?? '',
    });
    setEditing(true);
  }, [contractData]);

  // Save
  const handleSave = useCallback(async () => {
    const result = await upsertContractData(requestId, employeeId, draft);
    if (result) setEditing(false);
  }, [requestId, employeeId, draft, upsertContractData]);

  // Status transition
  const handleStatusChange = useCallback(async (newStatus: ContractProcessStatus) => {
    await updateContractStatus(requestId, newStatus);
  }, [requestId, updateContractStatus]);

  const currentStatus = contractData?.contract_process_status ?? 'pending_data';
  const statusConfig = CONTRACT_PROCESS_STATUS_CONFIG[currentStatus as ContractProcessStatus];
  const allowedTransitions = CONTRACT_PROCESS_STATUS_TRANSITIONS[currentStatus as ContractProcessStatus] || [];

  if (loading && !contractData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Cargando datos de contratación…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Contratación — SEPE / Contrat@</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', statusConfig?.color)}>
              {statusConfig?.labelES || currentStatus}
            </Badge>
            {!editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Readiness progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Datos Contrat@: {readiness.data.requiredFilled}/{readiness.data.requiredCount} obligatorios
            </span>
            <span className="font-medium">{readiness.data.percentage}%</span>
          </div>
          <Progress value={readiness.data.percentage} className="h-1.5" />
        </div>

        {/* Deadline alert */}
        <ContractDeadlineAlert summary={deadlineSummary} />

        {/* V2-ES.6 Paso 2: Pre-integration readiness badge */}
        {!editing && <ContrataPreIntegrationBadge summary={preIntegrationSummary} showDetails />}

        {/* Status transitions */}
        {allowedTransitions.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1.5">
            {allowedTransitions.map(target => (
              <Button
                key={target}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleStatusChange(target)}
              >
                <ChevronRight className="h-3 w-3" />
                {CONTRACT_PROCESS_STATUS_CONFIG[target].labelES}
              </Button>
            ))}
          </div>
        )}

        {editing ? (
          /* ──── Edit mode ──── */
          <div className="space-y-4">
            {/* Required fields */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campos obligatorios</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de contrato *</Label>
                  <Select
                    value={draft.contract_type_code || ''}
                    onValueChange={v => setDraft(d => ({ ...d, contract_type_code: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value} className="text-xs">{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Fecha inicio *</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={draft.contract_start_date || ''}
                    onChange={e => setDraft(d => ({ ...d, contract_start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Duración *</Label>
                  <Select
                    value={draft.contract_duration_type || ''}
                    onValueChange={v => setDraft(d => ({ ...d, contract_duration_type: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {DURATION_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value} className="text-xs">{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tipo jornada *</Label>
                  <Select
                    value={draft.working_hours_type || ''}
                    onValueChange={v => setDraft(d => ({ ...d, working_hours_type: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {HOURS_TYPES.map(ht => (
                        <SelectItem key={ht.value} value={ht.value} className="text-xs">{ht.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Código CNO *</Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.occupation_code || ''}
                    onChange={e => setDraft(d => ({ ...d, occupation_code: e.target.value }))}
                    placeholder="Ej: 2611"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">DNI/NIE *</Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.dni_nie || ''}
                    onChange={e => setDraft(d => ({ ...d, dni_nie: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">NAF *</Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.naf || ''}
                    onChange={e => setDraft(d => ({ ...d, naf: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">CCC *</Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.ccc || ''}
                    onChange={e => setDraft(d => ({ ...d, ccc: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Recommended fields (collapsible) */}
            <div>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowRecommended(!showRecommended)}
              >
                {showRecommended ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Campos recomendados ({readiness.data.recommendedFilled}/{readiness.data.recommendedCount})
              </button>

              {showRecommended && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha fin</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={draft.contract_end_date || ''}
                      onChange={e => setDraft(d => ({ ...d, contract_end_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horas semanales</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={draft.weekly_hours ?? ''}
                      onChange={e => setDraft(d => ({ ...d, weekly_hours: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">% Jornada (parcial)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={draft.working_hours_percent ?? ''}
                      onChange={e => setDraft(d => ({ ...d, working_hours_percent: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Convenio colectivo</Label>
                    <Input
                      className="h-8 text-xs"
                      value={draft.collective_agreement || ''}
                      onChange={e => setDraft(d => ({ ...d, collective_agreement: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Puesto de trabajo</Label>
                    <Input
                      className="h-8 text-xs"
                      value={draft.job_title || ''}
                      onChange={e => setDraft(d => ({ ...d, job_title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Centro de trabajo</Label>
                    <Input
                      className="h-8 text-xs"
                      value={draft.workplace_address || ''}
                      onChange={e => setDraft(d => ({ ...d, workplace_address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Salario bruto anual</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={draft.salary_gross_annual ?? ''}
                      onChange={e => setDraft(d => ({ ...d, salary_gross_annual: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Período prueba (días)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={draft.trial_period_days ?? ''}
                      onChange={e => setDraft(d => ({ ...d, trial_period_days: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Entidad legal</Label>
                    <Input
                      className="h-8 text-xs"
                      value={draft.legal_entity || ''}
                      onChange={e => setDraft(d => ({ ...d, legal_entity: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Conversion toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={!!draft.is_conversion}
                onCheckedChange={v => setDraft(d => ({ ...d, is_conversion: v }))}
              />
              <Label className="text-xs">¿Es conversión de contrato?</Label>
            </div>
            {draft.is_conversion && (
              <div className="space-y-1">
                <Label className="text-xs">Tipo contrato anterior</Label>
                <Input
                  className="h-8 text-xs"
                  value={draft.conversion_from_type || ''}
                  onChange={e => setDraft(d => ({ ...d, conversion_from_type: e.target.value }))}
                  placeholder="Ej: 401"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notas de validación</Label>
              <Textarea
                className="text-xs min-h-[60px]"
                value={draft.validation_notes || ''}
                onChange={e => setDraft(d => ({ ...d, validation_notes: e.target.value }))}
                placeholder="Observaciones internas…"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                <Save className="h-3 w-3 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        ) : (
          /* ──── View mode ──── */
          <div className="space-y-3">
            {!contractData ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Sin datos de contratación</p>
                <Button size="sm" className="h-7 text-xs" onClick={startEdit}>
                  <FileSignature className="h-3 w-3 mr-1" /> Iniciar proceso
                </Button>
              </div>
            ) : (
              <>
                {/* Field summary */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {contractData.contract_type_code && (
                    <FieldRow label="Tipo contrato" value={CONTRACT_TYPES.find(c => c.value === contractData.contract_type_code)?.label || contractData.contract_type_code} />
                  )}
                  {contractData.contract_start_date && (
                    <FieldRow label="Fecha inicio" value={new Date(contractData.contract_start_date).toLocaleDateString('es')} />
                  )}
                  {contractData.contract_duration_type && (
                    <FieldRow label="Duración" value={DURATION_TYPES.find(d => d.value === contractData.contract_duration_type)?.label || contractData.contract_duration_type} />
                  )}
                  {contractData.working_hours_type && (
                    <FieldRow label="Jornada" value={HOURS_TYPES.find(h => h.value === contractData.working_hours_type)?.label || contractData.working_hours_type} />
                  )}
                  {contractData.occupation_code && (
                    <FieldRow label="CNO" value={contractData.occupation_code} />
                  )}
                  {contractData.dni_nie && (
                    <FieldRow label="DNI/NIE" value={contractData.dni_nie} />
                  )}
                  {contractData.naf && (
                    <FieldRow label="NAF" value={contractData.naf} />
                  )}
                  {contractData.ccc && (
                    <FieldRow label="CCC" value={contractData.ccc} />
                  )}
                  {contractData.job_title && (
                    <FieldRow label="Puesto" value={contractData.job_title} />
                  )}
                  {contractData.salary_gross_annual != null && (
                    <FieldRow label="Salario bruto" value={`${contractData.salary_gross_annual.toLocaleString('es')} €/año`} />
                  )}
                  {contractData.is_conversion && (
                    <FieldRow label="Conversión" value={`Desde ${contractData.conversion_from_type || '—'}`} />
                  )}
                </div>

                {/* Next actions */}
                {readiness.nextActions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      {readiness.nextActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs">
                          {readiness.overallReady
                            ? <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                            : <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
                          }
                          <span className="text-muted-foreground">{action}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Timestamps */}
                {(contractData.data_validated_at || contractData.submitted_at || contractData.confirmed_at) && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
                      {contractData.data_validated_at && (
                        <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />Datos validados: {new Date(contractData.data_validated_at).toLocaleDateString('es')}</span>
                      )}
                      {contractData.submitted_at && (
                        <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />Comunicado: {new Date(contractData.submitted_at).toLocaleDateString('es')}</span>
                      )}
                      {contractData.confirmed_at && (
                        <span><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5 text-emerald-600" />Confirmado: {new Date(contractData.confirmed_at).toLocaleDateString('es')}</span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
