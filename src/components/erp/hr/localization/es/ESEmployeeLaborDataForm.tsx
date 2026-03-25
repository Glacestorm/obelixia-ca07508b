/**
 * ESEmployeeLaborDataForm — Formulario datos laborales España
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, UserCheck } from 'lucide-react';
import { useESLocalization } from '@/hooks/erp/hr/useESLocalization';
import { HRCNOSelect } from '@/components/erp/hr/shared/HRCNOSelect';

interface Props {
  companyId: string;
  employeeId?: string;
}

const CCAA_OPTIONS = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla y León', 'Castilla-La Mancha', 'Cataluña', 'Extremadura',
  'Galicia', 'Madrid', 'Murcia', 'Navarra', 'País Vasco', 'La Rioja', 'C. Valenciana',
  'Ceuta', 'Melilla',
];

const REGIMEN_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'autonomo', label: 'Autónomo (RETA)' },
  { value: 'agrario', label: 'Agrario' },
  { value: 'mar', label: 'Mar' },
  { value: 'hogar', label: 'Hogar' },
];

export function ESEmployeeLaborDataForm({ companyId, employeeId }: Props) {
  const es = useESLocalization(companyId);
  const [form, setForm] = useState({
    naf: '',
    grupo_cotizacion: 1,
    cno_code: '',
    tipo_contrato_rd: '',
    comunidad_autonoma: '',
    provincia: '',
    regimen_ss: 'general',
    categoria_profesional: '',
    coeficiente_parcialidad: 1.0,
    fecha_alta_ss: '',
    epigrafe_at: '',
    situacion_familiar_irpf: 1,
    hijos_menores_25: 0,
    hijos_menores_3: 0,
    discapacidad_hijos: false,
    ascendientes_cargo: 0,
    reduccion_movilidad_geografica: false,
    pension_compensatoria: 0,
    anualidad_alimentos: 0,
    prolongacion_laboral: false,
    contrato_inferior_anual: false,
  });

  useEffect(() => {
    if (employeeId) {
      es.fetchLaborData(employeeId).then((data) => {
        if (data) {
          setForm({
            naf: data.naf || '',
            grupo_cotizacion: data.grupo_cotizacion || 1,
            cno_code: data.cno_code || '',
            tipo_contrato_rd: data.tipo_contrato_rd || '',
            comunidad_autonoma: data.comunidad_autonoma || '',
            provincia: data.provincia || '',
            regimen_ss: data.regimen_ss || 'general',
            categoria_profesional: data.categoria_profesional || '',
            coeficiente_parcialidad: data.coeficiente_parcialidad || 1.0,
            fecha_alta_ss: data.fecha_alta_ss || '',
            epigrafe_at: data.epigrafe_at || '',
            situacion_familiar_irpf: data.situacion_familiar_irpf || 1,
            hijos_menores_25: data.hijos_menores_25 || 0,
            hijos_menores_3: data.hijos_menores_3 || 0,
            discapacidad_hijos: data.discapacidad_hijos || false,
            ascendientes_cargo: data.ascendientes_cargo || 0,
            reduccion_movilidad_geografica: data.reduccion_movilidad_geografica || false,
            pension_compensatoria: data.pension_compensatoria || 0,
            anualidad_alimentos: data.anualidad_alimentos || 0,
            prolongacion_laboral: data.prolongacion_laboral || false,
            contrato_inferior_anual: data.contrato_inferior_anual || false,
          });
        }
      });
    }
  }, [employeeId]);

  const handleSave = async () => {
    if (!employeeId) return;
    await es.saveLaborData({ employee_id: employeeId, ...form });
  };

  if (!employeeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          Selecciona un empleado para ver sus datos laborales españoles.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          🇪🇸 Datos Laborales España
          <Badge variant="outline" className="text-xs">Plugin ES</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seguridad Social */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Seguridad Social</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">NAF (Nº Afiliación SS)</Label>
              <Input value={form.naf} onChange={e => setForm(p => ({ ...p, naf: e.target.value }))} placeholder="28/12345678/90" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grupo de Cotización</Label>
              <Select value={String(form.grupo_cotizacion)} onValueChange={v => setForm(p => ({ ...p, grupo_cotizacion: parseInt(v) }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
                    <SelectItem key={g} value={String(g)}>Grupo {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Régimen SS</Label>
              <Select value={form.regimen_ss} onValueChange={v => setForm(p => ({ ...p, regimen_ss: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIMEN_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha Alta SS</Label>
              <Input type="date" value={form.fecha_alta_ss} onChange={e => setForm(p => ({ ...p, fecha_alta_ss: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Epígrafe AT</Label>
              <Input value={form.epigrafe_at} onChange={e => setForm(p => ({ ...p, epigrafe_at: e.target.value }))} placeholder="CNAE / epígrafe" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coef. Parcialidad</Label>
              <Input type="number" step="0.01" min="0" max="1" value={form.coeficiente_parcialidad} onChange={e => setForm(p => ({ ...p, coeficiente_parcialidad: parseFloat(e.target.value) || 1 }))} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        {/* Contrato y clasificación */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Contrato y Clasificación</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo Contrato RD</Label>
              <Input value={form.tipo_contrato_rd} onChange={e => setForm(p => ({ ...p, tipo_contrato_rd: e.target.value }))} placeholder="100, 401..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CNO (Ocupación)</Label>
              <HRCNOSelect
                value={form.cno_code}
                onValueChange={(code) => setForm(p => ({ ...p, cno_code: code }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoría Profesional</Label>
              <Input value={form.categoria_profesional} onChange={e => setForm(p => ({ ...p, categoria_profesional: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Comunidad Autónoma</Label>
              <Select value={form.comunidad_autonoma} onValueChange={v => setForm(p => ({ ...p, comunidad_autonoma: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {CCAA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Provincia</Label>
              <Input value={form.provincia} onChange={e => setForm(p => ({ ...p, provincia: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        {/* IRPF - Situación familiar */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Situación Familiar IRPF</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Situación Familiar</Label>
              <Select value={String(form.situacion_familiar_irpf)} onValueChange={v => setForm(p => ({ ...p, situacion_familiar_irpf: parseInt(v) }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Soltero/a, viudo/a, separado/a</SelectItem>
                  <SelectItem value="2">2 — Cónyuge no rentas &gt; 1.500€</SelectItem>
                  <SelectItem value="3">3 — Resto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hijos &lt; 25 años</Label>
              <Input type="number" min="0" value={form.hijos_menores_25} onChange={e => setForm(p => ({ ...p, hijos_menores_25: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hijos &lt; 3 años</Label>
              <Input type="number" min="0" value={form.hijos_menores_3} onChange={e => setForm(p => ({ ...p, hijos_menores_3: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ascendientes a cargo</Label>
              <Input type="number" min="0" value={form.ascendientes_cargo} onChange={e => setForm(p => ({ ...p, ascendientes_cargo: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.discapacidad_hijos} onCheckedChange={v => setForm(p => ({ ...p, discapacidad_hijos: v }))} />
              <Label className="text-xs">Discapacidad hijos</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.reduccion_movilidad_geografica} onCheckedChange={v => setForm(p => ({ ...p, reduccion_movilidad_geografica: v }))} />
              <Label className="text-xs">Movilidad geográfica</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.prolongacion_laboral} onCheckedChange={v => setForm(p => ({ ...p, prolongacion_laboral: v }))} />
              <Label className="text-xs">Prolongación laboral</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.contrato_inferior_anual} onCheckedChange={v => setForm(p => ({ ...p, contrato_inferior_anual: v }))} />
              <Label className="text-xs">Contrato &lt; 1 año</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <Label className="text-xs">Pensión compensatoria (€/año)</Label>
              <Input type="number" min="0" value={form.pension_compensatoria} onChange={e => setForm(p => ({ ...p, pension_compensatoria: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Anualidad alimentos (€/año)</Label>
              <Input type="number" min="0" value={form.anualidad_alimentos} onChange={e => setForm(p => ({ ...p, anualidad_alimentos: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={es.isLoading} className="gap-2">
            <Save className="h-4 w-4" /> Guardar Datos ES
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
