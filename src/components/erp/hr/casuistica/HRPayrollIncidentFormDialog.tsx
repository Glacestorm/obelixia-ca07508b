/**
 * CASUISTICA-FECHAS-01 — Fase C3B1
 * Modal de alta de incidencias persistentes en `erp_hr_payroll_incidents`.
 *
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Reutilizado en modo `edit` para editar incidencias NO aplicadas.
 *
 * INVARIANTES:
 *  - Modo `create`: INSERT (vía `createPayrollIncident`).
 *  - Modo `edit`: UPDATE filtrado (vía `updatePayrollIncident`). Nunca .delete().
 *  - En `edit`, `incident_type` queda DESHABILITADO (no se puede cambiar).
 *  - Si la incidencia ya está aplicada (`applied_at`), submit deshabilitado.
 *  - No genera comunicaciones oficiales. Sólo marca flags pendientes.
 *  - No modifica el payload del motor de nómina.
 *  - Tipos especializados (IT/AT/EP, nacimiento, lactancia…) bloquean submit.
 */

import { useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Info, ShieldOff } from 'lucide-react';
import {
  calculateInclusiveDays,
  isInvertedRange,
} from '@/lib/hr/casuisticaDates';
import {
  usePayrollIncidentMutations,
  type NewPayrollIncidentInput,
  type OfficialCommunicationType,
  type PayrollIncidentCreatableType,
  type UpdatePayrollIncidentPatch,
} from '@/hooks/erp/hr/usePayrollIncidentMutations';
import type { PayrollIncidentRow } from '@/lib/hr/incidenciasTypes';

export type ExcludedSpecializedType =
  | 'it_enfermedad_comun'
  | 'it_accidente_no_laboral'
  | 'at_accidente_trabajo'
  | 'ep_enfermedad_profesional'
  | 'nacimiento_maternidad'
  | 'nacimiento_paternidad'
  | 'cuidado_menor'
  | 'corresponsabilidad'
  | 'lactancia';

type AnyType = PayrollIncidentCreatableType | ExcludedSpecializedType;

const EXCLUDED_TYPES: ReadonlyArray<ExcludedSpecializedType> = [
  'it_enfermedad_comun',
  'it_accidente_no_laboral',
  'at_accidente_trabajo',
  'ep_enfermedad_profesional',
  'nacimiento_maternidad',
  'nacimiento_paternidad',
  'cuidado_menor',
  'corresponsabilidad',
  'lactancia',
];

const EXCLUDED_LABEL: Record<ExcludedSpecializedType, string> = {
  it_enfermedad_comun: 'IT — Enfermedad común',
  it_accidente_no_laboral: 'IT — Accidente no laboral',
  at_accidente_trabajo: 'AT — Accidente de trabajo',
  ep_enfermedad_profesional: 'EP — Enfermedad profesional',
  nacimiento_maternidad: 'Nacimiento — Maternidad',
  nacimiento_paternidad: 'Nacimiento — Paternidad',
  cuidado_menor: 'Cuidado menor',
  corresponsabilidad: 'Corresponsabilidad',
  lactancia: 'Lactancia',
};

const CREATABLE_LABEL: Record<PayrollIncidentCreatableType, string> = {
  pnr: 'Permiso no retribuido (PNR)',
  reduccion_jornada_guarda_legal: 'Reducción de jornada — guarda legal',
  atrasos_regularizacion: 'Atrasos / regularización',
  desplazamiento_temporal: 'Desplazamiento temporal',
  suspension_empleo_sueldo: 'Suspensión de empleo y sueldo',
  otra: 'Otra',
};

function isExcluded(t: AnyType): t is ExcludedSpecializedType {
  return (EXCLUDED_TYPES as ReadonlyArray<string>).includes(t);
}

interface DefaultsByType {
  legal_review_required: boolean;
  requires_ss_action: boolean;
  requires_tax_adjustment: boolean;
  requires_external_filing: boolean;
  official_communication_type: OfficialCommunicationType;
  banner: string;
  metadataSeed?: Record<string, unknown>;
  showPercent?: boolean;
  showAmount?: boolean;
  extraFields?: Array<'destination_country' | 'destination_city' | 'reason' | 'origin_period'>;
}

function defaultsFor(type: PayrollIncidentCreatableType): DefaultsByType {
  switch (type) {
    case 'pnr':
      return {
        legal_review_required: false,
        requires_ss_action: true,
        requires_tax_adjustment: false,
        requires_external_filing: true,
        official_communication_type: 'AFI',
        banner:
          'Se marca como posible AFI pendiente, pero no se genera ni se envía ninguna comunicación oficial.',
      };
    case 'reduccion_jornada_guarda_legal':
      return {
        legal_review_required: true,
        requires_ss_action: true,
        requires_tax_adjustment: false,
        requires_external_filing: false,
        official_communication_type: null,
        banner:
          'Requiere revisión legal antes de aplicar efectos de cotización o salario.',
        metadataSeed: { legal_guardianship: true },
        showPercent: true,
      };
    case 'atrasos_regularizacion':
      return {
        legal_review_required: true,
        requires_ss_action: false,
        requires_tax_adjustment: true,
        requires_external_filing: false,
        official_communication_type: null,
        banner:
          'No calcula IRPF ni liquidación complementaria. Solo registra la incidencia.',
        metadataSeed: { settlement_type: 'atrasos' },
        showAmount: true,
        extraFields: ['origin_period', 'reason'],
      };
    case 'desplazamiento_temporal':
      return {
        legal_review_required: true,
        requires_ss_action: false,
        requires_tax_adjustment: false,
        requires_external_filing: true,
        official_communication_type: null,
        banner:
          'No genera A1/E101 ni comunicación oficial. Solo marca revisión pendiente.',
        metadataSeed: { tax_review_required: true },
        extraFields: ['destination_country', 'destination_city', 'reason'],
      };
    case 'suspension_empleo_sueldo':
      return {
        legal_review_required: true,
        requires_ss_action: false,
        requires_tax_adjustment: false,
        requires_external_filing: false,
        official_communication_type: null,
        banner:
          'No se mapea automáticamente a PNR ni modifica el cálculo de nómina.',
        metadataSeed: { salary_accrual: false, contribution_required: false },
        extraFields: ['reason'],
      };
    case 'otra':
    default:
      return {
        legal_review_required: true,
        requires_ss_action: false,
        requires_tax_adjustment: false,
        requires_external_filing: false,
        official_communication_type: null,
        banner: 'Tipo genérico pendiente de revisión.',
        showAmount: true,
        showPercent: true,
      };
  }
}

const COMM_OPTIONS: ReadonlyArray<{ value: 'NONE' | NonNullable<OfficialCommunicationType>; label: string }> = [
  { value: 'NONE', label: 'Ninguno' },
  { value: 'AFI', label: 'AFI' },
  { value: 'FDI', label: 'FDI' },
  { value: 'DELTA', label: 'DELTA' },
  { value: 'INSS', label: 'INSS' },
  { value: 'TGSS', label: 'TGSS' },
  { value: 'SEPE', label: 'SEPE' },
];

export interface HRPayrollIncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  defaultType?: PayrollIncidentCreatableType;
  onCreated?: (id: string) => void;
  /** CASUISTICA-FECHAS-01 — Fase C3C. */
  mode?: 'create' | 'edit';
  /** Sólo en mode='edit'. Carga inicial. */
  initialIncident?: PayrollIncidentRow;
  /** Callback tras edición exitosa. */
  onUpdated?: (id: string) => void;
  /** Inyectable en tests para stubear la mutación. */
  mutationsHook?: typeof usePayrollIncidentMutations;
}

export function HRPayrollIncidentFormDialog({
  open,
  onOpenChange,
  companyId,
  employeeId,
  periodYear,
  periodMonth,
  defaultType,
  onCreated,
  mode = 'create',
  initialIncident,
  onUpdated,
  mutationsHook,
}: HRPayrollIncidentFormDialogProps) {
  const useMutations = mutationsHook ?? usePayrollIncidentMutations;
  const {
    createPayrollIncident,
    updatePayrollIncident,
    isCreating,
    isUpdating,
  } = useMutations({
    companyId,
    employeeId,
    periodYear,
    periodMonth,
    onSuccess: (id) => {
      onCreated?.(id);
      onOpenChange(false);
    },
  });

  const isEdit = mode === 'edit';
  const initialType: AnyType =
    isEdit && initialIncident?.incident_type
      ? (initialIncident.incident_type as AnyType)
      : (defaultType ?? 'pnr');

  const initialMeta = (initialIncident?.metadata ?? {}) as Record<string, unknown>;

  const [type, setType] = useState<AnyType>(initialType);
  const [appliesFrom, setAppliesFrom] = useState(
    isEdit ? (initialIncident?.applies_from ?? '') : '',
  );
  const [appliesTo, setAppliesTo] = useState(
    isEdit ? (initialIncident?.applies_to ?? '') : '',
  );
  const [amount, setAmount] = useState<string>(
    isEdit && initialIncident?.amount != null ? String(initialIncident.amount) : '',
  );
  const [percent, setPercent] = useState<string>(
    isEdit && initialIncident?.percent != null ? String(initialIncident.percent) : '',
  );
  const [notes, setNotes] = useState(isEdit ? (initialIncident?.notes ?? '') : '');

  // Flags (controlables por usuario, defaults sembrados al cambiar de tipo)
  const [legalReview, setLegalReview] = useState(
    isEdit ? Boolean(initialIncident?.legal_review_required) : false,
  );
  const [reqSS, setReqSS] = useState(
    isEdit ? Boolean(initialIncident?.requires_ss_action) : false,
  );
  const [reqTax, setReqTax] = useState(
    isEdit ? Boolean(initialIncident?.requires_tax_adjustment) : false,
  );
  const [reqFiling, setReqFiling] = useState(
    isEdit ? Boolean(initialIncident?.requires_external_filing) : false,
  );
  const [comm, setComm] = useState<'NONE' | NonNullable<OfficialCommunicationType>>(
    isEdit && initialIncident?.official_communication_type
      ? (initialIncident.official_communication_type as NonNullable<OfficialCommunicationType>)
      : 'NONE',
  );

  // Metadata extra
  const [destCountry, setDestCountry] = useState(
    isEdit ? String(initialMeta.destination_country ?? '') : '',
  );
  const [destCity, setDestCity] = useState(
    isEdit ? String(initialMeta.destination_city ?? '') : '',
  );
  const [reason, setReason] = useState(
    isEdit ? String(initialMeta.reason ?? '') : '',
  );
  const [originPeriod, setOriginPeriod] = useState(
    isEdit ? String(initialMeta.origin_period_from ?? '') : '',
  );

  const isApplied = Boolean(initialIncident?.applied_at);
  const isCancelled = Boolean(initialIncident?.deleted_at);

  const excluded = isExcluded(type);
  const creatableType = excluded ? null : (type as PayrollIncidentCreatableType);
  const cfg = useMemo(
    () => (creatableType ? defaultsFor(creatableType) : null),
    [creatableType],
  );

  // Re-sembrar defaults al cambiar de tipo creatable.
  // En modo edición NO re-sembramos: respetamos los valores actuales del registro.
  useEffect(() => {
    if (!cfg || isEdit) return;
    setLegalReview(cfg.legal_review_required);
    setReqSS(cfg.requires_ss_action);
    setReqTax(cfg.requires_tax_adjustment);
    setReqFiling(cfg.requires_external_filing);
    setComm(cfg.official_communication_type ?? 'NONE');
  }, [cfg, isEdit]);

  // Reset al cerrar (sólo en modo create; en edit no tiene sentido).
  useEffect(() => {
    if (!open && !isEdit) {
      setType(defaultType ?? 'pnr');
      setAppliesFrom('');
      setAppliesTo('');
      setAmount('');
      setPercent('');
      setNotes('');
      setDestCountry('');
      setDestCity('');
      setReason('');
      setOriginPeriod('');
    }
  }, [open, defaultType, isEdit]);

  const days = useMemo(
    () => calculateInclusiveDays(appliesFrom, appliesTo),
    [appliesFrom, appliesTo],
  );
  const inverted = isInvertedRange(appliesFrom, appliesTo);

  // Validación
  const errors: string[] = [];
  if (!type) errors.push('Selecciona un tipo de proceso.');
  if (excluded) {
    errors.push(
      'Este proceso debe gestionarse desde el módulo especializado correspondiente para conservar su trazabilidad legal.',
    );
  }
  if (!appliesFrom) errors.push('Fecha de inicio obligatoria.');
  if (!appliesTo) errors.push('Fecha de fin obligatoria.');
  if (inverted) errors.push('La fecha de fin no puede ser anterior a la de inicio.');
  const amountNum = amount === '' ? null : Number(amount);
  const percentNum = percent === '' ? null : Number(percent);
  if (amountNum !== null && (Number.isNaN(amountNum) || amountNum < 0)) {
    errors.push('El importe debe ser >= 0.');
  }
  if (percentNum !== null && (Number.isNaN(percentNum) || percentNum < 0 || percentNum > 100)) {
    errors.push('El porcentaje debe estar entre 0 y 100.');
  }
  if (isEdit && isApplied) {
    errors.push('Incidencia aplicada a nómina. Requiere flujo de recálculo en fase posterior.');
  }
  if (isEdit && isCancelled) {
    errors.push('Incidencia cancelada. No se puede editar.');
  }

  const busy = isCreating || isUpdating;
  const canSubmit = errors.length === 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit || !creatableType || !cfg) return;

    const metadata: Record<string, unknown> = isEdit
      ? { ...initialMeta }
      : { ...(cfg.metadataSeed ?? {}) };
    if (cfg.extraFields?.includes('destination_country') && destCountry) {
      metadata.destination_country = destCountry;
    }
    if (cfg.extraFields?.includes('destination_city') && destCity) {
      metadata.destination_city = destCity;
    }
    if (cfg.extraFields?.includes('reason') && reason) {
      metadata.reason = reason;
    }
    if (cfg.extraFields?.includes('origin_period') && originPeriod) {
      metadata.origin_period_from = originPeriod;
    }

    if (isEdit && initialIncident?.id) {
      const patch: UpdatePayrollIncidentPatch = {
        applies_from: appliesFrom,
        applies_to: appliesTo,
        units: days,
        amount: amountNum,
        percent: percentNum,
        notes: notes || null,
        metadata,
        requires_ss_action: reqSS,
        requires_tax_adjustment: reqTax,
        requires_external_filing: reqFiling,
        legal_review_required: legalReview,
        official_communication_type: comm === 'NONE' ? null : comm,
      };
      const res = await updatePayrollIncident(initialIncident.id, patch);
      if (res) {
        onUpdated?.(res.id);
        onOpenChange(false);
      }
      return;
    }

    const input: NewPayrollIncidentInput = {
      incident_type: creatableType,
      applies_from: appliesFrom,
      applies_to: appliesTo,
      units: days,
      amount: amountNum,
      percent: percentNum,
      notes: notes || null,
      metadata,
      requires_ss_action: reqSS,
      requires_tax_adjustment: reqTax,
      requires_external_filing: reqFiling,
      legal_review_required: legalReview,
      official_communication_type: comm === 'NONE' ? null : comm,
    };

    await createPayrollIncident(input);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 pt-6 pb-4">
          <DialogHeader className="pr-8 space-y-1.5">
            <DialogTitle className="text-lg leading-tight">
              {isEdit ? 'Editar proceso persistido' : 'Añadir proceso persistido'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isEdit
                ? 'Edita los datos de una incidencia no aplicada. No se aplica a la nómina ni se envían comunicaciones oficiales.'
                : 'Crea una incidencia entre fechas asociada al periodo en curso. No se aplica a la nómina ni se envían comunicaciones oficiales.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4">
        {/* Banner legal permanente — ámbar accesible WCAG AA */}
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <ShieldOff className="h-4 w-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <p className="leading-relaxed">
            Este registro no envía comunicaciones oficiales, no recalcula
            nóminas y no modifica el resultado de la nómina actual. Solo crea
            una incidencia persistida pendiente para revisión y fases
            posteriores.
          </p>
        </div>

        {isEdit && isApplied && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-100"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-700 dark:text-red-300" />
            <p>
              Incidencia aplicada a nómina. Requiere flujo de recálculo en fase
              posterior (C4). La edición está bloqueada.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {/* Tipo */}
          <div className="grid gap-1.5">
            <Label htmlFor="incident-type">
              Tipo de proceso<Req />
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AnyType)}
              disabled={isEdit}
            >
              <SelectTrigger id="incident-type" disabled={isEdit} aria-disabled={isEdit} aria-required="true">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Permitidos</SelectLabel>
                  {(Object.keys(CREATABLE_LABEL) as PayrollIncidentCreatableType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {CREATABLE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Módulos especializados (no se crean aquí)</SelectLabel>
                  {EXCLUDED_TYPES.map((k) => (
                    <SelectItem key={k} value={k}>
                      {EXCLUDED_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-[10px] text-muted-foreground">
                El tipo no es editable. Para cambiar de tipo, cancela esta
                incidencia y crea una nueva.
              </p>
            )}
          </div>

          {/* Aviso tipo excluido */}
          {excluded && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-100"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-700 dark:text-red-300" />
              <p>
                Este proceso debe gestionarse desde el módulo especializado
                correspondiente para conservar su trazabilidad legal.
              </p>
            </div>
          )}

          {/* Banner por tipo */}
          {cfg && (
            <div className="flex items-start gap-2.5 rounded-md border border-sky-300 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-100">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-sky-700 dark:text-sky-300" />
              <p>{cfg.banner}</p>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="applies-from">
                Fecha inicio<Req />
              </Label>
              <Input
                id="applies-from"
                type="date"
                aria-required="true"
                value={appliesFrom}
                onChange={(e) => setAppliesFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="applies-to">
                Fecha fin<Req />
              </Label>
              <Input
                id="applies-to"
                type="date"
                aria-required="true"
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="days-calc">Días calculados</Label>
            <Input
              id="days-calc"
              readOnly
              value={days === null ? '—' : String(days)}
              className="bg-muted/30"
            />
          </div>

          {/* Importe / porcentaje */}
          {(cfg?.showAmount ?? true) && (
            <div className="grid gap-1.5">
              <Label htmlFor="amount">
                Importe (€){type === 'atrasos_regularizacion' && <Req />}
              </Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                aria-required={type === 'atrasos_regularizacion' ? 'true' : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
          {(cfg?.showPercent ?? false) && (
            <div className="grid gap-1.5">
              <Label htmlFor="percent">
                Porcentaje (%){type === 'reduccion_jornada_guarda_legal' && <Req />}
              </Label>
              <Input
                id="percent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                aria-required={type === 'reduccion_jornada_guarda_legal' ? 'true' : undefined}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
          )}

          {/* Metadata extra */}
          {cfg?.extraFields?.includes('destination_country') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dest-country">País destino</Label>
                <Input
                  id="dest-country"
                  value={destCountry}
                  onChange={(e) => setDestCountry(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dest-city">Ciudad destino</Label>
                <Input
                  id="dest-city"
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                />
              </div>
            </div>
          )}
          {cfg?.extraFields?.includes('reason') && (
            <div className="grid gap-1.5">
              <Label htmlFor="reason">
                Motivo
                {(type === 'desplazamiento_temporal' || type === 'suspension_empleo_sueldo') && <Req />}
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
          {cfg?.extraFields?.includes('origin_period') && (
            <div className="grid gap-1.5">
              <Label htmlFor="origin-period">Periodo de origen (YYYY-MM)</Label>
              <Input
                id="origin-period"
                placeholder="2025-12"
                value={originPeriod}
                onChange={(e) => setOriginPeriod(e.target.value)}
              />
            </div>
          )}

          {/* Notas */}
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Flags */}
          <div className="rounded-md border border-border/60 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Flags legales / operativos
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <FlagRow id="f-legal" label="Revisión legal requerida" checked={legalReview} onChange={setLegalReview} />
              <FlagRow id="f-ss" label="Requiere acción SS" checked={reqSS} onChange={setReqSS} />
              <FlagRow id="f-tax" label="Requiere ajuste fiscal" checked={reqTax} onChange={setReqTax} />
              <FlagRow id="f-filing" label="Requiere comunicación externa" checked={reqFiling} onChange={setReqFiling} />
            </div>
            <div className="grid gap-1.5 pt-2">
              <Label htmlFor="comm-type" className="text-xs">
                Tipo de comunicación oficial (sólo marca pendiente)
              </Label>
              <Select
                value={comm}
                onValueChange={(v) => setComm(v as typeof comm)}
              >
                <SelectTrigger id="comm-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Errores agrupados */}
          {errors.length > 0 && (
            <div
              role="alert"
              aria-label="Errores de validación"
              className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700/60 dark:bg-red-950/30"
            >
              <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                Revisa los siguientes campos:
              </p>
              <ul className="text-xs text-red-800 dark:text-red-200 space-y-0.5 list-disc pl-5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isEdit
              ? isUpdating
                ? 'Guardando…'
                : 'Guardar cambios'
              : isCreating
                ? 'Creando…'
                : 'Crear incidencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Asterisco rojo accesible para campos obligatorios. */
function Req() {
  return <span aria-hidden="true" className="ml-0.5 text-red-600">*</span>;
}

function FlagRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-border/40 px-2 py-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default HRPayrollIncidentFormDialog;