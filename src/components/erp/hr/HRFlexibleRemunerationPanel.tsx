/**
 * HRFlexibleRemunerationPanel — Editor de plan de retribución flexible ES
 * S9.18: Seguro médico end-to-end con split exento/exceso.
 * S9.18-H5: Soporte de importe anual total (entrada principal) + mensual derivado.
 *           Fuente: manual (única en esta fase). Convenio: pendiente de fuente real.
 * Restaurante, guardería y transporte: persistidos, pendientes de reglas avanzadas.
 * Fuente operativa: hr_es_flexible_remuneration_plans
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, CheckCircle, Clock, Save, Info, Building2, User, ArrowRightLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// S9.20: Modelo A (beneficio adicional) vs Modelo B (salary sacrifice)
type FlexApplicationMode = 'benefit_additional' | 'salary_sacrifice';

interface FlexConceptConfig {
  seguro_medico: { application_mode: FlexApplicationMode };
  ticket_restaurante: {
    application_mode: FlexApplicationMode;
    importe_dia: number;
    dias_mes: number;
    modalidad: 'comedor' | 'tarjeta_vale' | null;
  };
  cheque_guarderia: { application_mode: FlexApplicationMode };
  transporte: {
    application_mode: FlexApplicationMode;
    modalidad: 'publico_colectivo' | 'otro' | null;
  };
}

const DEFAULT_FLEX_CONFIG: FlexConceptConfig = {
  seguro_medico: { application_mode: 'benefit_additional' },
  ticket_restaurante: { application_mode: 'benefit_additional', importe_dia: 0, dias_mes: 0, modalidad: null },
  cheque_guarderia: { application_mode: 'benefit_additional' },
  transporte: { application_mode: 'benefit_additional', modalidad: null },
};

interface FlexPlan {
  id?: string;
  company_id: string;
  employee_id: string;
  plan_year: number;
  seguro_medico_mensual: number;
  seguro_medico_anual_total: number; // S9.18-H5: derivado o introducido
  ticket_restaurante_mensual: number;
  cheque_guarderia_mensual: number;
  transporte_mensual: number;
  num_beneficiarios: number;
  num_beneficiarios_discapacidad: number;
  status: string;
  // S9.18-H5: Fuente del dato del seguro médico
  // 'manual' = empresa lo introduce a mano
  // 'convenio' = vendría de tabla de convenio (no existe fuente real aún)
  // 'manual_overrides_convenio' = ambas fuentes y manual prevalece
  seguro_medico_source: 'manual' | 'convenio' | 'manual_overrides_convenio';
  // S9.20: configuración por concepto (Modelo A/B + datos específicos)
  concept_config: FlexConceptConfig;
}

interface HRFlexibleRemunerationPanelProps {
  employeeId: string;
  companyId: string;
  year?: number;
  compact?: boolean;
  onSave?: () => void;
  className?: string;
}

export function HRFlexibleRemunerationPanel({
  employeeId,
  companyId,
  year,
  compact = false,
  onSave,
  className,
}: HRFlexibleRemunerationPanelProps) {
  const currentYear = year ?? new Date().getFullYear();
  const [planYear, setPlanYear] = useState(currentYear);
  const [plan, setPlan] = useState<FlexPlan>({
    company_id: companyId,
    employee_id: employeeId,
    plan_year: planYear,
    seguro_medico_mensual: 0,
    seguro_medico_anual_total: 0,
    ticket_restaurante_mensual: 0,
    cheque_guarderia_mensual: 0,
    transporte_mensual: 0,
    num_beneficiarios: 1,
    num_beneficiarios_discapacidad: 0,
    status: 'active',
    seguro_medico_source: 'manual',
    concept_config: DEFAULT_FLEX_CONFIG,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  // S9.18-H5: Valor de convenio (si existiera). En esta fase, no hay fuente real.
  const [convenioValue, setConvenioValue] = useState<number | null>(null);

  // Fetch existing plan
  const fetchPlan = useCallback(async () => {
    if (!employeeId || !companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_es_flexible_remuneration_plans')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .eq('plan_year', planYear)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingId((data as any).id);
        // S9.18-H5: leer anual desde metadata si existe; si no, derivarlo del mensual
        const meta = ((data as any).metadata ?? {}) as Record<string, unknown>;
        const mensual = Number((data as any).seguro_medico_mensual || 0);
        const anualMeta = Number(meta.seguro_medico_anual_total ?? 0);
        const anualEfectivo = anualMeta > 0 ? anualMeta : Math.round(mensual * 12 * 100) / 100;
        const sourceMeta = (meta.seguro_medico_source as FlexPlan['seguro_medico_source']) || 'manual';
        // S9.20: leer concept_config desde metadata; merge con defaults para forward-compat
        const cfgMeta = (meta.concept_config as Partial<FlexConceptConfig>) || {};
        const conceptCfg: FlexConceptConfig = {
          seguro_medico: { ...DEFAULT_FLEX_CONFIG.seguro_medico, ...(cfgMeta.seguro_medico || {}) },
          ticket_restaurante: { ...DEFAULT_FLEX_CONFIG.ticket_restaurante, ...(cfgMeta.ticket_restaurante || {}) },
          cheque_guarderia: { ...DEFAULT_FLEX_CONFIG.cheque_guarderia, ...(cfgMeta.cheque_guarderia || {}) },
          transporte: { ...DEFAULT_FLEX_CONFIG.transporte, ...(cfgMeta.transporte || {}) },
        };
        setPlan({
          company_id: companyId,
          employee_id: employeeId,
          plan_year: planYear,
          seguro_medico_mensual: mensual,
          seguro_medico_anual_total: anualEfectivo,
          ticket_restaurante_mensual: Number((data as any).ticket_restaurante_mensual || 0),
          cheque_guarderia_mensual: Number((data as any).cheque_guarderia_mensual || 0),
          transporte_mensual: Number((data as any).transporte_mensual || 0),
          num_beneficiarios: Number((data as any).num_beneficiarios || 1),
          num_beneficiarios_discapacidad: Number((data as any).num_beneficiarios_discapacidad || 0),
          status: (data as any).status || 'active',
          seguro_medico_source: sourceMeta,
          concept_config: conceptCfg,
        });
      } else {
        setExistingId(null);
        setPlan(prev => ({
          ...prev,
          company_id: companyId,
          employee_id: employeeId,
          plan_year: planYear,
          seguro_medico_mensual: 0,
          seguro_medico_anual_total: 0,
          ticket_restaurante_mensual: 0,
          cheque_guarderia_mensual: 0,
          transporte_mensual: 0,
          num_beneficiarios: 1,
          num_beneficiarios_discapacidad: 0,
          status: 'active',
          seguro_medico_source: 'manual',
          concept_config: DEFAULT_FLEX_CONFIG,
        }));
      }
    } catch (err) {
      console.error('[FlexPanel] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, companyId, planYear]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // S9.18-H5: Buscar fuente de seguro médico en convenio (placeholder honesto).
  // En esta fase NO existe fuente real en convenio/mapping/tablas para seguro médico.
  // Se deja preparado: si en el futuro se añade, reemplazar este efecto por la
  // consulta correspondiente y setConvenioValue con el importe anual total.
  useEffect(() => {
    setConvenioValue(null); // Sin fuente real: siempre null en esta fase
  }, [employeeId, companyId, planYear]);

  // Insurance limit calculation
  const insuranceLimits = useMemo(() => {
    const nBen = Math.max(plan.num_beneficiarios, 1);
    const nDis = Math.min(Math.max(plan.num_beneficiarios_discapacidad, 0), nBen);
    const limiteAnual = (nBen - nDis) * 500 + nDis * 1500;
    const limiteMensual = Math.round((limiteAnual / 12) * 100) / 100;
    // S9.18-H5: anual total es la fuente principal; si está vacío, usar mensual*12 (compat)
    const importeAnual = plan.seguro_medico_anual_total > 0
      ? plan.seguro_medico_anual_total
      : Math.round(plan.seguro_medico_mensual * 12 * 100) / 100;
    const importeMensual = Math.round((importeAnual / 12) * 100) / 100;
    const excedeLimit = importeAnual > limiteAnual;
    const parteExentaMensual = Math.min(importeMensual, limiteMensual);
    const parteNoExentaMensual = excedeLimit ? Math.round((importeMensual - limiteMensual) * 100) / 100 : 0;
    return {
      limiteAnual,
      limiteMensual,
      importeAnual,
      importeMensual,
      excedeLimit,
      excesoMensual: parteNoExentaMensual,
      parteExentaMensual,
      parteNoExentaMensual,
    };
  }, [plan.seguro_medico_anual_total, plan.seguro_medico_mensual, plan.num_beneficiarios, plan.num_beneficiarios_discapacidad]);

  // S9.18-H5: Etiqueta de fuente para badge
  const sourceLabel = useMemo(() => {
    if (convenioValue !== null && plan.seguro_medico_anual_total > 0 && plan.seguro_medico_anual_total !== convenioValue) {
      return { label: 'Manual sobreescribe convenio', icon: Building2, variant: 'warning' as const };
    }
    if (convenioValue !== null && plan.seguro_medico_anual_total === 0) {
      return { label: 'Desde convenio', icon: Building2, variant: 'secondary' as const };
    }
    return { label: 'Manual empresa', icon: User, variant: 'outline' as const };
  }, [convenioValue, plan.seguro_medico_anual_total]);

  // Save / upsert
  const handleSave = async () => {
    setSaving(true);
    try {
      // S9.18-H5: derivar mensual desde anual total para mantener compatibilidad con
      // bridge actual (que sigue leyendo seguro_medico_mensual).
      const mensualDerivado = plan.seguro_medico_anual_total > 0
        ? Math.round((plan.seguro_medico_anual_total / 12) * 100) / 100
        : plan.seguro_medico_mensual;

      const payload: any = {
        company_id: companyId,
        employee_id: employeeId,
        plan_year: planYear,
        seguro_medico_mensual: mensualDerivado,
        ticket_restaurante_mensual: plan.ticket_restaurante_mensual,
        cheque_guarderia_mensual: plan.cheque_guarderia_mensual,
        transporte_mensual: plan.transporte_mensual,
        num_beneficiarios: plan.num_beneficiarios,
        num_beneficiarios_discapacidad: plan.num_beneficiarios_discapacidad,
        status: plan.status,
        // S9.18-H5: persistir anual total + fuente en metadata (sin migración SQL)
        metadata: {
          seguro_medico_anual_total: plan.seguro_medico_anual_total > 0
            ? plan.seguro_medico_anual_total
            : Math.round(mensualDerivado * 12 * 100) / 100,
          seguro_medico_source: plan.seguro_medico_source,
          // S9.20: persistir configuración por concepto (Modelo A/B + datos restaurante/transporte)
          concept_config: plan.concept_config,
          schema_version: 's9.20',
        },
      };

      if (existingId) {
        const { error } = await supabase
          .from('hr_es_flexible_remuneration_plans')
          .update(payload)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('hr_es_flexible_remuneration_plans')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setExistingId((data as any).id);
      }

      toast.success('Plan flexible guardado');
      onSave?.();
    } catch (err) {
      console.error('[FlexPanel] save error:', err);
      toast.error('Error al guardar el plan flexible');
    } finally {
      setSaving(false);
    }
  };

  const totalMensual = plan.seguro_medico_mensual + plan.ticket_restaurante_mensual +
    plan.cheque_guarderia_mensual + plan.transporte_mensual;

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Card className={cn('border-border/60', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Retribución Flexible ES</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(planYear)} onValueChange={v => setPlanYear(Number(v))}>
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={plan.status} onValueChange={v => setPlan(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Cargando plan...</p>
        ) : (
          <>
            {/* Seguro médico — end-to-end */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium">Seguro médico</Label>
                  <Badge variant={sourceLabel.variant} className="text-[10px] gap-1">
                    <sourceLabel.icon className="h-2.5 w-2.5" />
                    {sourceLabel.label}
                  </Badge>
                  <ModelToggle
                    value={plan.concept_config.seguro_medico.application_mode}
                    onChange={(mode) => setPlan(p => ({
                      ...p,
                      concept_config: {
                        ...p.concept_config,
                        seguro_medico: { application_mode: mode },
                      },
                    }))}
                  />
                </div>
                {plan.status === 'active' ? (
                  insuranceLimits.excedeLimit ? (
                    <Badge variant="warning" className="text-[10px]">
                      <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                      Exceso tributa {insuranceLimits.excesoMensual.toFixed(2)}€/mes
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle className="h-2.5 w-2.5 mr-1" />
                      Aplicado a nómina
                    </Badge>
                  )
                ) : (
                  <Badge variant="muted" className="text-[10px]">No activo</Badge>
                )}
              </div>
              {/* S9.18-H5: Importe anual total como entrada principal */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Importe ANUAL total (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={plan.seguro_medico_anual_total || ''}
                    onChange={e => {
                      const anual = Number(e.target.value) || 0;
                      const mensual = Math.round((anual / 12) * 100) / 100;
                      setPlan(p => ({
                        ...p,
                        seguro_medico_anual_total: anual,
                        seguro_medico_mensual: mensual,
                        // Si hay convenio y el manual difiere, marcamos override
                        seguro_medico_source:
                          convenioValue !== null && anual > 0 && anual !== convenioValue
                            ? 'manual_overrides_convenio'
                            : 'manual',
                      }));
                    }}
                    className="h-8 text-xs"
                    placeholder="p.ej. 1200"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Nº beneficiarios</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={plan.num_beneficiarios}
                    onChange={e => {
                      const v = Math.max(1, Number(e.target.value) || 1);
                      setPlan(p => ({
                        ...p,
                        num_beneficiarios: v,
                        num_beneficiarios_discapacidad: Math.min(p.num_beneficiarios_discapacidad, v),
                      }));
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Con discapacidad</Label>
                  <Input
                    type="number"
                    min={0}
                    max={plan.num_beneficiarios}
                    value={plan.num_beneficiarios_discapacidad}
                    onChange={e => setPlan(p => ({
                      ...p,
                      num_beneficiarios_discapacidad: Math.min(Math.max(0, Number(e.target.value) || 0), p.num_beneficiarios),
                    }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {/* S9.18-H5: Desglose visible anual / mensual / exento / no exento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-2 rounded-md bg-background/60 border border-border/40">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Mensual</span>
                  <span className="text-xs font-semibold tabular-nums">{insuranceLimits.importeMensual.toFixed(2)}€</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Límite/mes</span>
                  <span className="text-xs font-semibold tabular-nums">{insuranceLimits.limiteMensual.toFixed(2)}€</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Exento/mes</span>
                  <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {insuranceLimits.parteExentaMensual.toFixed(2)}€
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[9px] uppercase tracking-wide",
                    insuranceLimits.parteNoExentaMensual > 0
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}>No exento/mes</span>
                  <span className={cn(
                    "text-xs font-semibold tabular-nums",
                    insuranceLimits.parteNoExentaMensual > 0
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}>
                    {insuranceLimits.parteNoExentaMensual.toFixed(2)}€
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-2.5 w-2.5" />
                Límite exento: {insuranceLimits.limiteAnual.toFixed(0)}€/año ({insuranceLimits.limiteMensual.toFixed(2)}€/mes)
                — 500€/beneficiario, 1.500€ si discapacidad (Art. 42.3.c LIRPF)
              </p>
              {convenioValue === null && (
                <p className="text-[10px] text-muted-foreground italic">
                  Sin fuente de convenio disponible — origen efectivo: manual empresa.
                </p>
              )}
              {/* S9.18-H4: Estado fiscal/SS/CRA */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  IRPF: {insuranceLimits.excedeLimit ? 'Exento + Exceso sujeto' : 'Exento'}
                </span>
                <span className="text-[10px] font-medium text-primary">
                  SS: Cotiza (LGSS Art. 147)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  CRA: pendiente separación 0039/0040
                </span>
              </div>
            </div>

            {/* S9.20: Ticket restaurante — automatizado si datos completos */}
            <RestauranteCard
              importeDia={plan.concept_config.ticket_restaurante.importe_dia}
              diasMes={plan.concept_config.ticket_restaurante.dias_mes}
              modalidad={plan.concept_config.ticket_restaurante.modalidad}
              applicationMode={plan.concept_config.ticket_restaurante.application_mode}
              fallbackMensual={plan.ticket_restaurante_mensual}
              onChangeMode={(mode) => setPlan(p => ({
                ...p,
                concept_config: {
                  ...p.concept_config,
                  ticket_restaurante: { ...p.concept_config.ticket_restaurante, application_mode: mode },
                },
              }))}
              onChangeImporteDia={(v) => setPlan(p => ({
                ...p,
                concept_config: {
                  ...p.concept_config,
                  ticket_restaurante: { ...p.concept_config.ticket_restaurante, importe_dia: v },
                },
              }))}
              onChangeDiasMes={(v) => setPlan(p => ({
                ...p,
                concept_config: {
                  ...p.concept_config,
                  ticket_restaurante: { ...p.concept_config.ticket_restaurante, dias_mes: v },
                },
              }))}
              onChangeModalidad={(v) => setPlan(p => ({
                ...p,
                concept_config: {
                  ...p.concept_config,
                  ticket_restaurante: { ...p.concept_config.ticket_restaurante, modalidad: v },
                },
              }))}
              onChangeFallbackMensual={(v) => setPlan(p => ({ ...p, ticket_restaurante_mensual: v }))}
            />

            {/* Guardería — persistido + visible, NO automatizado en S9.20 */}
            <SimpleFlexCard
              label="Cheque guardería"
              value={plan.cheque_guarderia_mensual}
              applicationMode={plan.concept_config.cheque_guarderia.application_mode}
              onChangeValue={v => setPlan(p => ({ ...p, cheque_guarderia_mensual: v }))}
              onChangeMode={(mode) => setPlan(p => ({
                ...p,
                concept_config: { ...p.concept_config, cheque_guarderia: { application_mode: mode } },
              }))}
              hint="Requiere validación de centro autorizado — Persistido pero no automatizado en esta fase"
            />

            {/* Transporte — persistido + visible, NO automatizado en S9.20 */}
            <SimpleFlexCard
              label="Transporte"
              value={plan.transporte_mensual}
              applicationMode={plan.concept_config.transporte.application_mode}
              onChangeValue={v => setPlan(p => ({ ...p, transporte_mensual: v }))}
              onChangeMode={(mode) => setPlan(p => ({
                ...p,
                concept_config: {
                  ...p.concept_config,
                  transporte: { ...p.concept_config.transporte, application_mode: mode },
                },
              }))}
              hint="1.500€/año transporte público colectivo — Persistido pero no automatizado en esta fase"
            />

            {/* Total + Save */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Total mensual: <span className="font-medium text-foreground">{totalMensual.toFixed(2)}€</span>
              </p>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
                <Save className="h-3 w-3" />
                {saving ? 'Guardando...' : existingId ? 'Actualizar' : 'Crear plan'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-component for pending concepts
function ConceptRow({
  label,
  value,
  onChange,
  status,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  status: 'applied' | 'pending';
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">{label}</Label>
          <Badge variant="warning" className="text-[10px]">
            <Clock className="h-2.5 w-2.5 mr-1" />
            Pendiente de reglas
          </Badge>
        </div>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={value || ''}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="h-8 text-xs"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

export default HRFlexibleRemunerationPanel;
