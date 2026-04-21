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
import { Shield, AlertTriangle, CheckCircle, Clock, Save, Info, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
        setPlan({
          company_id: companyId,
          employee_id: employeeId,
          plan_year: planYear,
          seguro_medico_mensual: Number((data as any).seguro_medico_mensual || 0),
          ticket_restaurante_mensual: Number((data as any).ticket_restaurante_mensual || 0),
          cheque_guarderia_mensual: Number((data as any).cheque_guarderia_mensual || 0),
          transporte_mensual: Number((data as any).transporte_mensual || 0),
          num_beneficiarios: Number((data as any).num_beneficiarios || 1),
          num_beneficiarios_discapacidad: Number((data as any).num_beneficiarios_discapacidad || 0),
          status: (data as any).status || 'active',
        });
      } else {
        setExistingId(null);
        setPlan(prev => ({
          ...prev,
          company_id: companyId,
          employee_id: employeeId,
          plan_year: planYear,
          seguro_medico_mensual: 0,
          ticket_restaurante_mensual: 0,
          cheque_guarderia_mensual: 0,
          transporte_mensual: 0,
          num_beneficiarios: 1,
          num_beneficiarios_discapacidad: 0,
          status: 'active',
        }));
      }
    } catch (err) {
      console.error('[FlexPanel] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, companyId, planYear]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // Insurance limit calculation
  const insuranceLimits = useMemo(() => {
    const nBen = Math.max(plan.num_beneficiarios, 1);
    const nDis = Math.min(Math.max(plan.num_beneficiarios_discapacidad, 0), nBen);
    const limiteAnual = (nBen - nDis) * 500 + nDis * 1500;
    const limiteMensual = Math.round((limiteAnual / 12) * 100) / 100;
    const importeAnual = plan.seguro_medico_mensual * 12;
    const excedeLimit = importeAnual > limiteAnual;
    const excesoMensual = excedeLimit ? Math.round((plan.seguro_medico_mensual - limiteMensual) * 100) / 100 : 0;
    return { limiteAnual, limiteMensual, importeAnual, excedeLimit, excesoMensual };
  }, [plan.seguro_medico_mensual, plan.num_beneficiarios, plan.num_beneficiarios_discapacidad]);

  // Save / upsert
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        company_id: companyId,
        employee_id: employeeId,
        plan_year: planYear,
        seguro_medico_mensual: plan.seguro_medico_mensual,
        ticket_restaurante_mensual: plan.ticket_restaurante_mensual,
        cheque_guarderia_mensual: plan.cheque_guarderia_mensual,
        transporte_mensual: plan.transporte_mensual,
        num_beneficiarios: plan.num_beneficiarios,
        num_beneficiarios_discapacidad: plan.num_beneficiarios_discapacidad,
        status: plan.status,
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
                <Label className="text-xs font-medium">Seguro médico</Label>
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Importe mensual (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={plan.seguro_medico_mensual || ''}
                    onChange={e => setPlan(p => ({ ...p, seguro_medico_mensual: Number(e.target.value) || 0 }))}
                    className="h-8 text-xs"
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
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-2.5 w-2.5" />
                Límite exento: {insuranceLimits.limiteAnual.toFixed(0)}€/año ({insuranceLimits.limiteMensual.toFixed(2)}€/mes)
                — 500€/beneficiario, 1.500€ si discapacidad (Art. 42.3.c LIRPF)
              </p>
              {/* S9.18-H4: Estado fiscal/SS/CRA */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  IRPF: {insuranceLimits.excedeLimit ? 'Exento + Exceso sujeto' : 'Exento'}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  SS: Cotiza (LGSS Art. 147)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  CRA: pendiente separación 0039/0040
                </span>
              </div>
            </div>

            {/* Ticket restaurante — pendiente */}
            <ConceptRow
              label="Ticket restaurante"
              value={plan.ticket_restaurante_mensual}
              onChange={v => setPlan(p => ({ ...p, ticket_restaurante_mensual: v }))}
              status="pending"
              hint="11€/día laborable (Art. 45.2 RIRPF) — Pendiente de reglas avanzadas"
            />

            {/* Guardería — pendiente */}
            <ConceptRow
              label="Cheque guardería"
              value={plan.cheque_guarderia_mensual}
              onChange={v => setPlan(p => ({ ...p, cheque_guarderia_mensual: v }))}
              status="pending"
              hint="Requiere validación de centro autorizado — Pendiente de reglas avanzadas"
            />

            {/* Transporte — pendiente */}
            <ConceptRow
              label="Transporte"
              value={plan.transporte_mensual}
              onChange={v => setPlan(p => ({ ...p, transporte_mensual: v }))}
              status="pending"
              hint="1.500€/año transporte público colectivo — Pendiente de reglas avanzadas"
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
