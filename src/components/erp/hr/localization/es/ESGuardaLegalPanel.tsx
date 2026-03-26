/**
 * ESGuardaLegalPanel — Gestión de Reducción de Jornada por Guarda Legal
 * Art. 37.6 ET — Cuidado de hijo/a menor de 12 años o familiar a cargo
 * Actualiza coeficiente_parcialidad del empleado y genera incidencia de nómina
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Scale, Clock, ArrowDown, RotateCcw, Info, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { HREmployeeSearchSelect, EmployeeOption } from '@/components/erp/hr/shared/HREmployeeSearchSelect';

interface Props {
  companyId: string;
  employeeId?: string;
}

const MOTIVOS = [
  { value: 'menor_12', label: 'Cuidado hijo/a menor de 12 años' },
  { value: 'discapacidad', label: 'Cuidado familiar con discapacidad' },
  { value: 'familiar_2grado', label: 'Familiar hasta 2º grado sin autonomía' },
];

const PORCENTAJES = [
  { value: '12.5', label: '12.5%' },
  { value: '25', label: '25%' },
  { value: '33', label: '33%' },
  { value: '50', label: '50%' },
];

interface IncidentRow {
  id: string;
  description: string | null;
  created_at: string | null;
  status: string | null;
}

export function ESGuardaLegalPanel({ companyId, employeeId }: Props) {
  const [selectedId, setSelectedId] = useState(employeeId ?? '');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [motivo, setMotivo] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaRevision, setFechaRevision] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [historial, setHistorial] = useState<IncidentRow[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Simulated current hours — in production this would come from contract data
  const jornadaActual = 40;
  const salarioBase = 2500; // Simulated monthly salary

  const coeficiente = useMemo(() => {
    if (!porcentaje) return 1;
    return 1 - parseFloat(porcentaje) / 100;
  }, [porcentaje]);

  const salarioReducido = useMemo(() => salarioBase * coeficiente, [salarioBase, coeficiente]);
  const diferencia = useMemo(() => salarioReducido - salarioBase, [salarioReducido, salarioBase]);

  // Fetch history for selected employee
  const fetchHistorial = useCallback(async () => {
    if (!selectedId) { setHistorial([]); return; }
    setLoadingHistorial(true);
    try {
      const { data, error } = await (supabase as any)
        .from('erp_hr_payroll_incidents')
        .select('id, description, created_at, status')
        .eq('employee_id', selectedId)
        .eq('concept_code', 'ES_REDUCCION_JORNADA')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistorial((data ?? []) as IncidentRow[]);
    } catch {
      // silent
    } finally {
      setLoadingHistorial(false);
    }
  }, [selectedId]);

  useEffect(() => { fetchHistorial(); }, [fetchHistorial]);

  const handleSelectEmployee = useCallback((id: string, emp?: EmployeeOption) => {
    setSelectedId(id);
    setSelectedEmployee(emp ?? null);
  }, []);

  const handleAplicar = useCallback(async () => {
    if (!selectedId || !motivo || !porcentaje || !fechaInicio) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    setSaving(true);
    try {
      // 1) Update coeficiente_parcialidad
      const { error: updErr } = await (supabase as any)
        .from('erp_hr_employee_es_labor_data')
        .update({ coeficiente_parcialidad: coeficiente })
        .eq('employee_id', selectedId)
        .eq('company_id', companyId);
      if (updErr) throw updErr;

      // 2) Create payroll incident
      const motivoLabel = MOTIVOS.find(m => m.value === motivo)?.label ?? motivo;
      const { error: incErr } = await (supabase as any)
        .from('erp_hr_payroll_incidents')
        .insert({
          employee_id: selectedId,
          company_id: companyId,
          incident_type: 'adjustment',
          concept_code: 'ES_REDUCCION_JORNADA',
          description: `Reducción jornada guarda legal (${motivoLabel}) - ${porcentaje}% desde ${fechaInicio}`,
          requires_ss_action: true,
          requires_tax_adjustment: true,
        } as any);
      if (incErr) throw incErr;

      toast.success('Reducción aplicada. Se ha actualizado el contrato y generado la incidencia de nómina.');
      fetchHistorial();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al aplicar reducción');
    } finally {
      setSaving(false);
    }
  }, [selectedId, motivo, porcentaje, fechaInicio, coeficiente, companyId, fetchHistorial]);

  const handleRestablecer = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('erp_hr_employee_es_labor_data')
        .update({ coeficiente_parcialidad: 1.0 })
        .eq('employee_id', selectedId)
        .eq('company_id', companyId);
      if (error) throw error;
      toast.success('Jornada restablecida a tiempo completo (coeficiente 1.0)');
      setPorcentaje('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al restablecer');
    } finally {
      setSaving(false);
    }
  }, [selectedId, companyId]);

  return (
    <div className="space-y-4">
      {/* 1. INFORMACIÓN LEGAL */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Art. 37.6 Estatuto de los Trabajadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>El trabajador/a puede reducir su jornada entre <strong>1/8 y 1/2</strong> de la duración.</p>
          <p>La reducción es <strong>proporcional al salario</strong>.</p>
          <p>Motivos: cuidado directo de menor de 12 años, persona con discapacidad, familiar hasta 2º grado que no pueda valerse por sí mismo.</p>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
            Derecho individual e intransferible
          </Badge>
        </CardContent>
      </Card>

      {/* 2. FORMULARIO */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Solicitud de Reducción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Empleado/a</Label>
              <HREmployeeSearchSelect
                value={selectedId}
                onValueChange={handleSelectEmployee}
                companyId={companyId}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Jornada actual (h/semana)</Label>
              <Input type="number" value={jornadaActual} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Porcentaje de reducción</Label>
              <Select value={porcentaje} onValueChange={setPorcentaje}>
                <SelectTrigger><SelectValue placeholder="Seleccionar %" /></SelectTrigger>
                <SelectContent>
                  {PORCENTAJES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nuevo coeficiente de parcialidad</Label>
              <Input value={coeficiente.toFixed(4)} readOnly className="bg-muted font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de inicio</Label>
              <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de revisión (opcional)</Label>
              <Input type="date" value={fechaRevision} onChange={e => setFechaRevision(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. IMPACTO EN NÓMINA */}
      {porcentaje && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" /> Impacto en Nómina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Salario base actual</p>
                <p className="text-sm font-semibold">{salarioBase.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Salario reducido</p>
                <p className="text-sm font-semibold text-amber-600">{salarioReducido.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Cotización SS (base reducida)</p>
                <p className="text-sm font-semibold">{(salarioReducido * 0.0635).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Reducción mensual</p>
                <p className="text-sm font-bold text-destructive">{diferencia.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. BOTONES */}
      <div className="flex gap-2">
        <Button onClick={handleAplicar} disabled={saving || !selectedId || !motivo || !porcentaje || !fechaInicio}>
          <ArrowDown className="h-4 w-4 mr-1" />
          Aplicar reducción
        </Button>
        <Button variant="outline" onClick={handleRestablecer} disabled={saving || !selectedId}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Restablecer jornada completa
        </Button>
      </div>

      {/* 5. HISTORIAL */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> Historial de Reducciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedId ? (
            <p className="text-xs text-muted-foreground text-center py-4">Selecciona un empleado para ver el historial</p>
          ) : loadingHistorial ? (
            <p className="text-xs text-muted-foreground text-center py-4">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sin reducciones registradas</p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{h.created_at ? new Date(h.created_at).toLocaleDateString('es-ES') : '—'}</TableCell>
                      <TableCell className="text-xs">{h.description ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{h.status ?? 'pending'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ESGuardaLegalPanel;
