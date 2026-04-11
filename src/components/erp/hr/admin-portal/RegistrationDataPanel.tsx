/**
 * RegistrationDataPanel — TGSS-oriented data validation panel for employee registration
 * V2-ES.5 Paso 1: Shows in admin request detail when request_type === 'employee_registration'
 *
 * Responsibilities:
 * - Display/edit TGSS pre-integration fields
 * - Validate data completeness
 * - Show readiness indicator combining data + doc checklist
 * - Manage registration-specific states
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEmployeeMasterPrefill, type PrefilledFieldSet } from '@/hooks/erp/hr/useEmployeeMasterPrefill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2, AlertTriangle, FileCheck, Save, ChevronRight,
  Shield, Building2, UserCheck, ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useHRRegistrationProcess,
  type RegistrationData,
  type RegistrationReadiness,
  REGISTRATION_STATUS_CONFIG,
  REGISTRATION_STATUS_TRANSITIONS,
  type RegistrationStatus,
} from '@/hooks/erp/hr/useHRRegistrationProcess';
import { RegistrationStatusBadge } from '../shared/RegistrationStatusBadge';
import { RegistrationDeadlineAlert } from '../shared/RegistrationDeadlineAlert';
import { computeRegistrationDeadlines } from '../shared/registrationDeadlineEngine';
import { buildTGSSPayload } from '../shared/tgssPayloadBuilder';
import { evaluatePreIntegrationReadiness } from '../shared/tgssPreIntegrationReadiness';
import { TGSSPreIntegrationBadge } from '../shared/TGSSPreIntegrationBadge';
import { RegistrationClosureSection } from '../shared/RegistrationClosureSection';
import { AltaAFITrackingCard } from '../shared/AltaAFITrackingCard';
import { useRegistrationClosure } from '@/hooks/erp/hr/useRegistrationClosure';
import { useHRHolidayCalendar } from '@/hooks/erp/hr/useHRHolidayCalendar';
import type { EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';

// ─── Contract types (ES) ─────────────────────────────────────────────────────

const ES_CONTRACT_TYPES = [
  { code: '100', label: '100 — Indefinido ordinario' },
  { code: '189', label: '189 — Indefinido fijo-discontinuo' },
  { code: '401', label: '401 — Temporal obra o servicio' },
  { code: '402', label: '402 — Temporal eventual' },
  { code: '410', label: '410 — Interinidad' },
  { code: '421', label: '421 — Prácticas' },
  { code: '420', label: '420 — Formación' },
  { code: '501', label: '501 — Duración determinada' },
  { code: '502', label: '502 — Sustitución' },
];

const ES_CONTRIBUTION_GROUPS = [
  { code: '1', label: '1 — Ingenieros y Licenciados' },
  { code: '2', label: '2 — Ingenieros Técnicos' },
  { code: '3', label: '3 — Jefes Administrativos' },
  { code: '4', label: '4 — Ayudantes no titulados' },
  { code: '5', label: '5 — Oficiales Administrativos' },
  { code: '6', label: '6 — Subalternos' },
  { code: '7', label: '7 — Auxiliares Administrativos' },
  { code: '8', label: '8 — Oficiales 1ª y 2ª' },
  { code: '9', label: '9 — Oficiales 3ª y Especialistas' },
  { code: '10', label: '10 — Peones' },
  { code: '11', label: '11 — Menores de 18 años' },
];

const ES_REGIMES = [
  { code: 'general', label: 'Régimen General' },
  { code: 'autonomos', label: 'Autónomos (RETA)' },
  { code: 'agrario', label: 'Agrario' },
  { code: 'mar', label: 'Trabajadores del Mar' },
  { code: 'mineria', label: 'Minería del Carbón' },
  { code: 'hogar', label: 'Empleados del Hogar' },
];

interface Props {
  requestId: string;
  companyId: string;
  employeeId: string;
  linkedDocs: EmployeeDocument[];
  /** V2-ES.5 Paso 2: Callback to lift deadline summary to parent */
  onDeadlinesComputed?: (summary: import('../shared/registrationDeadlineEngine').RegistrationDeadlineSummary) => void;
}

export function RegistrationDataPanel({ requestId, companyId, employeeId, linkedDocs, onDeadlinesComputed }: Props) {
  const {
    registrationData,
    loading,
    fetchRegistrationData,
    upsertRegistrationData,
    updateRegistrationStatus,
    computeReadiness,
    persistDeadlineAndPayload,
    closeRegistration,
    reopenRegistration,
  } = useHRRegistrationProcess(companyId);
  const { holidaySet } = useHRHolidayCalendar();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<RegistrationData>>({});
  const [saving, setSaving] = useState(false);
  const [prefilledFields, setPrefilledFields] = useState<PrefilledFieldSet>(new Set());

  // H2.1: Master data prefill
  const { masterData, getRegistrationPrefill, mergeAdditive } = useEmployeeMasterPrefill(employeeId);

  // Fetch on mount
  useEffect(() => {
    fetchRegistrationData(requestId);
  }, [requestId, fetchRegistrationData]);

  // Sync form when data loads
  useEffect(() => {
    if (registrationData) {
      setFormData({ ...registrationData });
    }
  }, [registrationData]);

  const readiness: RegistrationReadiness = useMemo(() => {
    return computeReadiness(linkedDocs.map(d => ({ document_type: d.document_type })));
  }, [computeReadiness, linkedDocs]);

  const deadlineSummary = useMemo(() => {
    return computeRegistrationDeadlines(registrationData, holidaySet);
  }, [registrationData, holidaySet]);

  const tgssValidation = useMemo(() => {
    return buildTGSSPayload(registrationData);
  }, [registrationData]);

  const preIntegration = useMemo(() => {
    return evaluatePreIntegrationReadiness(registrationData, {
      docReadinessPercent: readiness.docs?.percentage ?? undefined,
      docMandatoryComplete: readiness.docs?.mandatoryComplete ?? undefined,
      deadlineSummary: deadlineSummary,
    });
  }, [registrationData, readiness.docs, deadlineSummary]);

  // V2-ES.5 Paso 4: Closure readiness
  const closure = useRegistrationClosure({
    registrationData,
    docCompleteness: readiness.docs,
    deadlineSummary,
  });

  const handleClose = useCallback(async (notes?: string) => {
    return closeRegistration(requestId, notes);
  }, [closeRegistration, requestId]);

  const handleReopen = useCallback(async (reason?: string) => {
    return reopenRegistration(requestId, reason);
  }, [reopenRegistration, requestId]);

  // Lift deadline summary to parent for executive summary integration
  const prevDeadlineRef = useRef(deadlineSummary.worstUrgency);
  useEffect(() => {
    if (onDeadlinesComputed && deadlineSummary.deadlines.length > 0) {
      onDeadlinesComputed(deadlineSummary);
    }
    prevDeadlineRef.current = deadlineSummary.worstUrgency;
  }, [deadlineSummary, onDeadlinesComputed]);

  const set = useCallback((k: string, v: any) => {
    setFormData(prev => ({ ...prev, [k]: v || null }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { id, request_id, company_id, employee_id, created_at, updated_at, ...updates } = formData as any;
      await upsertRegistrationData(requestId, employeeId, updates);
      setEditMode(false);
      // Persist computed deadline + payload state
      setTimeout(() => persistDeadlineAndPayload(requestId, holidaySet), 500);
    } finally {
      setSaving(false);
    }
  }, [formData, requestId, employeeId, upsertRegistrationData, persistDeadlineAndPayload, holidaySet]);

  const handleInitialize = useCallback(async () => {
    const initialData: Partial<RegistrationData> = {
      registration_status: 'pending_data' as any,
      regime: 'general',
    };
    // H2.1: Additive prefill from master data
    const prefill = getRegistrationPrefill();
    const { merged, prefilledKeys } = mergeAdditive(initialData, prefill);
    setPrefilledFields(prefilledKeys);
    
    await upsertRegistrationData(requestId, employeeId, merged);
    setEditMode(true);
  }, [requestId, employeeId, upsertRegistrationData, getRegistrationPrefill, mergeAdditive]);

  const handleAdvanceStatus = useCallback(async (newStatus: RegistrationStatus) => {
    await updateRegistrationStatus(requestId, newStatus);
  }, [requestId, updateRegistrationStatus]);

  // Not initialized yet
  if (!registrationData && !loading) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-6 text-center space-y-3">
          <UserCheck className="h-10 w-10 mx-auto text-primary/40" />
          <div>
            <p className="text-sm font-medium">Datos de alta / afiliación</p>
            <p className="text-xs text-muted-foreground mt-1">
              Inicializa los datos requeridos para la tramitación del alta ante la TGSS
            </p>
          </div>
          <Button size="sm" onClick={handleInitialize} className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> Iniciar proceso de alta
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Cargando datos de alta...</p>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = registrationData?.registration_status as RegistrationStatus || 'pending_data';
  const allowedTransitions = REGISTRATION_STATUS_TRANSITIONS[currentStatus] || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Alta / Afiliación TGSS
          </CardTitle>
          <RegistrationStatusBadge status={currentStatus} size="md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alta/AFI/TA2 Tracking Card */}
        {registrationData && (
          <AltaAFITrackingCard
            companyId={companyId}
            employeeId={employeeId}
            requestId={requestId}
            registrationStatus={currentStatus}
            afiArtifactId={(registrationData.payload_snapshot as any)?.linked_artifact_id ?? null}
            afiArtifactStatus={null}
            ta2Reference={registrationData.confirmed_reference}
            ta2ResponseType={registrationData.confirmed_at ? 'accepted' : null}
            ta2ReceptionDate={registrationData.confirmed_at}
            onTA2Registered={() => fetchRegistrationData(requestId)}
          />
        )}

        {/* Readiness Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Readiness general</span>
            <span className={cn(
              'font-medium',
              readiness.overallReady ? 'text-emerald-600' : 'text-amber-600'
            )}>
              {readiness.overallReady ? '✓ Listo para envío' : `${readiness.data.percentage}% datos`}
            </span>
          </div>
          <Progress
            value={readiness.data.percentage}
            className="h-1.5"
          />

          {/* Required fields checklist */}
          <div className="grid grid-cols-2 gap-1 mt-2">
            {readiness.data.requiredFields.map(f => (
              <div key={f.key} className="flex items-center gap-1 text-[10px]">
                {f.filled ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                )}
                <span className={cn(f.filled ? 'text-muted-foreground' : 'font-medium')}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Doc completeness inline */}
          {readiness.docs && (
            <div className="flex items-center gap-2 text-[10px] mt-1 pt-1 border-t">
              <FileCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="text-muted-foreground">
                Documentos: {readiness.docs.completedMandatory}/{readiness.docs.totalMandatory} obligatorios
              </span>
              {readiness.docs.mandatoryComplete ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">OK</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
                  Faltan {readiness.docs.mandatoryMissing.length}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Deadline alerts — inline */}
        <RegistrationDeadlineAlert summary={deadlineSummary} />

        {/* TGSS format errors (when data present but invalid) */}
        {!editMode && tgssValidation.formatErrors.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 space-y-1">
            <p className="text-[10px] font-medium text-amber-700">Errores de formato TGSS</p>
            {tgssValidation.formatErrors.map((fe, i) => (
              <p key={i} className="text-[10px] text-amber-600">• {fe.label}: {fe.error}</p>
            ))}
          </div>
        )}

        <Separator />

        {/* TGSS Data Form */}
        {editMode ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Datos para Sistema RED / TGSS</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1">
                  DNI/NIE *
                  {prefilledFields.has('dni_nie') && <span className="text-[9px] px-1 py-0 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pre-cargado</span>}
                </Label>
                <Input placeholder="12345678Z" value={formData.dni_nie || ''} onChange={e => set('dni_nie', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  NAF *
                  {prefilledFields.has('naf') && <span className="text-[9px] px-1 py-0 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pre-cargado</span>}
                </Label>
                <Input placeholder="Nº Afiliación SS" value={formData.naf || ''} onChange={e => set('naf', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Fecha de alta *</Label>
                <Input type="date" value={formData.registration_date || ''} onChange={e => set('registration_date', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  CCC *
                  {prefilledFields.has('ccc') && <span className="text-[9px] px-1 py-0 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pre-cargado</span>}
                </Label>
                <Input placeholder="Código Cuenta Cotización" value={formData.ccc || ''} onChange={e => set('ccc', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Tipo contrato *</Label>
                <Select value={formData.contract_type_code || ''} onValueChange={v => set('contract_type_code', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {ES_CONTRACT_TYPES.map(t => (
                      <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Grupo cotización *</Label>
                <Select value={formData.contribution_group || ''} onValueChange={v => set('contribution_group', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {ES_CONTRIBUTION_GROUPS.map(g => (
                      <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Régimen *</Label>
                <Select value={formData.regime || 'general'} onValueChange={v => set('regime', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ES_REGIMES.map(r => (
                      <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Coef. jornada</Label>
                <Input type="number" step="0.01" min="0" max="1" placeholder="1.00" value={formData.working_coefficient ?? ''} onChange={e => set('working_coefficient', e.target.value ? parseFloat(e.target.value) : null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Centro de trabajo</Label>
                <Input placeholder="Centro" value={formData.work_center || ''} onChange={e => set('work_center', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Entidad legal</Label>
                <Input placeholder="Razón social" value={formData.legal_entity || ''} onChange={e => set('legal_entity', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Código CNO</Label>
                <Input placeholder="Clasificación ocupación" value={formData.occupation_code || ''} onChange={e => set('occupation_code', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Convenio colectivo</Label>
                <Input placeholder="Convenio aplicable" value={formData.collective_agreement || ''} onChange={e => set('collective_agreement', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Periodo prueba (días)</Label>
                <Input type="number" placeholder="Días" value={formData.trial_period_days ?? ''} onChange={e => set('trial_period_days', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Fecha fin contrato</Label>
                <Input type="date" value={formData.contract_end_date || ''} onChange={e => set('contract_end_date', e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setFormData({ ...registrationData } as any); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Guardando...' : 'Guardar datos'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Read-only summary */}
            {registrationData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Datos TGSS registrados</p>
                  {currentStatus !== 'confirmed' && (
                    <Button variant="ghost" size="sm" onClick={() => setEditMode(true)} className="h-6 text-xs">
                      Editar
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {registrationData.dni_nie && <FieldRow label="DNI/NIE" value={registrationData.dni_nie} />}
                  {registrationData.naf && <FieldRow label="NAF" value={registrationData.naf} />}
                  {registrationData.registration_date && <FieldRow label="Fecha alta" value={new Date(registrationData.registration_date).toLocaleDateString('es')} />}
                  {registrationData.ccc && <FieldRow label="CCC" value={registrationData.ccc} />}
                  {registrationData.contract_type_code && <FieldRow label="Tipo contrato" value={ES_CONTRACT_TYPES.find(t => t.code === registrationData.contract_type_code)?.label || registrationData.contract_type_code} />}
                  {registrationData.contribution_group && <FieldRow label="Grupo cot." value={ES_CONTRIBUTION_GROUPS.find(g => g.code === registrationData.contribution_group)?.label || registrationData.contribution_group} />}
                  {registrationData.regime && <FieldRow label="Régimen" value={ES_REGIMES.find(r => r.code === registrationData.regime)?.label || registrationData.regime} />}
                  {registrationData.working_coefficient != null && <FieldRow label="Coef. jornada" value={String(registrationData.working_coefficient)} />}
                  {registrationData.work_center && <FieldRow label="Centro trabajo" value={registrationData.work_center} />}
                  {registrationData.legal_entity && <FieldRow label="Entidad legal" value={registrationData.legal_entity} />}
                </div>

                {/* V2-ES.5 Paso 3: Pre-integration readiness */}
                <div className="pt-1 border-t mt-1">
                  <TGSSPreIntegrationBadge
                    summary={preIntegration}
                    showDetails={preIntegration.consistency.errorCount > 0 || preIntegration.consistency.warningCount > 0}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Next Actions (merged from readiness + pre-integration) */}
        {!editMode && (() => {
          const allSteps = [
            ...readiness.nextActions,
            ...preIntegration.nextSteps.filter(s => !readiness.nextActions.some(a => a === s)),
          ];
          if (allSteps.length === 0) return null;
          return (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Próximos pasos</p>
                {allSteps.slice(0, 5).map((action, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <ChevronRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        {/* Status transition actions */}
        {allowedTransitions.length > 0 && !editMode && currentStatus !== 'confirmed' && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {allowedTransitions.map(nextStatus => {
                  const config = REGISTRATION_STATUS_CONFIG[nextStatus];
                  const isAdvance = nextStatus === 'ready_to_submit' || nextStatus === 'submitted' || nextStatus === 'confirmed';
                  const disabled = isAdvance && !readiness.overallReady && nextStatus === 'ready_to_submit';

                  return (
                    <Tooltip key={nextStatus}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isAdvance ? 'default' : 'outline'}
                          className="text-xs h-7 gap-1"
                          disabled={disabled}
                          onClick={() => handleAdvanceStatus(nextStatus)}
                        >
                          {config.labelES}
                        </Button>
                      </TooltipTrigger>
                      {disabled && (
                        <TooltipContent>
                          <p className="text-xs">Completa los datos y documentos obligatorios primero</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          </>
        )}

        {/* V2-ES.5 Paso 4: Operational closure */}
        {registrationData && !editMode && (
          <>
            <Separator />
            <RegistrationClosureSection
              canClose={closure.canClose}
              isClosed={closure.isClosed}
              isConfirmed={closure.isConfirmed}
              blockers={closure.blockers}
              warnings={closure.warnings}
              existingSnapshot={closure.existingSnapshot}
              closedAt={closure.closedAt}
              closureNotes={closure.closureNotes}
              onClose={handleClose}
              onReopen={handleReopen}
            />
          </>
        )}

        {/* Timestamps */}
        {registrationData && (registrationData.data_validated_at || registrationData.submitted_at || registrationData.confirmed_at) && (
          <>
            <Separator />
            <div className="space-y-1 text-[10px] text-muted-foreground">
              {registrationData.data_validated_at && (
                <p>✓ Datos validados: {new Date(registrationData.data_validated_at).toLocaleString('es')}</p>
              )}
              {registrationData.docs_validated_at && (
                <p>✓ Docs validados: {new Date(registrationData.docs_validated_at).toLocaleString('es')}</p>
              )}
              {registrationData.ready_at && (
                <p>✓ Listo para envío: {new Date(registrationData.ready_at).toLocaleString('es')}</p>
              )}
              {registrationData.submitted_at && (
                <p>✓ Enviado: {new Date(registrationData.submitted_at).toLocaleString('es')}</p>
              )}
              {registrationData.confirmed_at && (
                <p>✓ Confirmado: {new Date(registrationData.confirmed_at).toLocaleString('es')}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
