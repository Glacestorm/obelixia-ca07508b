/**
 * ESNacimientoINSSPanel — Comunicación de Permiso por Nacimiento al INSS
 * LGSS Art. 177-182 — Prestación por nacimiento y cuidado de menor
 * Genera el expediente preparatorio para comunicar al INSS vía INSS Empresas
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Heart, FileText, Download, CheckCircle, Baby, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { HREmployeeSearchSelect, EmployeeOption } from '@/components/erp/hr/shared/HREmployeeSearchSelect';
import jsPDF from 'jspdf';

interface Props {
  companyId: string;
  employeeId?: string;
}

const TIPOS_PERMISO = [
  { value: 'gestante', label: 'Nacimiento — Progenitor/a gestante (16 semanas)' },
  { value: 'otro_progenitor', label: 'Nacimiento — Otro progenitor/a (16 semanas)' },
  { value: 'adopcion', label: 'Adopción / Acogimiento (16 semanas)' },
];

const DOCS_REQUERIDOS = [
  'Libro de familia / Certificado de nacimiento registral',
  'DNI del solicitante',
  'Resolución médica en caso de parto hospitalario prolongado',
  'Documento de cotización (RLC/TC2 del último mes)',
];

export function ESNacimientoINSSPanel({ companyId, employeeId }: Props) {
  const [selectedId, setSelectedId] = useState(employeeId ?? '');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [tipoPermiso, setTipoPermiso] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [fechaInicioSuspension, setFechaInicioSuspension] = useState('');
  const [nifRecienNacido, setNifRecienNacido] = useState('');
  const [partoMultiple, setPartoMultiple] = useState(false);
  const [numHijos, setNumHijos] = useState(1);
  const [docsDisponibles, setDocsDisponibles] = useState<boolean[]>(DOCS_REQUERIDOS.map(() => false));
  const [saving, setSaving] = useState(false);

  const salarioMensual = 2500; // Simulated

  const diasPrestacion = useMemo(() => {
    const base = 112; // 16 weeks
    if (partoMultiple && numHijos > 1) return base + (numHijos - 1) * 14;
    return base;
  }, [partoMultiple, numHijos]);

  const fechaReincorporacion = useMemo(() => {
    if (!fechaInicioSuspension) return '';
    const d = new Date(fechaInicioSuspension);
    d.setDate(d.getDate() + diasPrestacion);
    return d.toISOString().split('T')[0];
  }, [fechaInicioSuspension, diasPrestacion]);

  const baseReguladora = useMemo(() => salarioMensual / 30, [salarioMensual]);
  const prestacionTotal = useMemo(() => baseReguladora * diasPrestacion, [baseReguladora, diasPrestacion]);

  const isFormComplete = selectedId && tipoPermiso && fechaNacimiento && fechaInicioSuspension;

  const handleSelectEmployee = useCallback((id: string, emp?: EmployeeOption) => {
    setSelectedId(id);
    setSelectedEmployee(emp ?? null);
  }, []);

  const toggleDoc = useCallback((idx: number) => {
    setDocsDisponibles(prev => prev.map((v, i) => i === idx ? !v : v));
  }, []);

  const handleGenerarExpediente = useCallback(async () => {
    if (!isFormComplete) { toast.error('Completa todos los campos obligatorios'); return; }
    setSaving(true);
    try {
      const tipoLabel = TIPOS_PERMISO.find(t => t.value === tipoPermiso)?.label ?? tipoPermiso;

      // 1) Create payroll incident
      const { error: incErr } = await supabase
        .from('erp_hr_payroll_incidents')
        .insert({
          employee_id: selectedId,
          company_id: companyId,
          incident_type: 'leave',
          concept_code: 'ES_NACIMIENTO',
          description: `Permiso nacimiento INSS - ${tipoLabel} desde ${fechaInicioSuspension}`,
          tributa_irpf: false,
          cotiza_ss: false,
          requires_external_filing: true,
        } as any);
      if (incErr) throw incErr;

      // 2) Update employee status to on_leave
      const { error: empErr } = await supabase
        .from('erp_hr_employees')
        .update({ status: 'on_leave' })
        .eq('id', selectedId);
      if (empErr) throw empErr;

      toast.success('Expediente generado. Presentar en sede INSS Empresas junto con la documentación requerida.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al generar expediente');
    } finally {
      setSaving(false);
    }
  }, [isFormComplete, selectedId, companyId, tipoPermiso, fechaInicioSuspension]);

  const handleDescargarPDF = useCallback(() => {
    if (!selectedEmployee || !isFormComplete) { toast.error('Completa el formulario primero'); return; }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPEDIENTE PREPARATORIO — PERMISO POR NACIMIENTO', pw / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Comunicación al INSS vía Sede Electrónica', pw / 2, y, { align: 'center' });
    y += 15;

    const lines = [
      `Empleado/a: ${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
      `Tipo: ${TIPOS_PERMISO.find(t => t.value === tipoPermiso)?.label ?? tipoPermiso}`,
      `Fecha nacimiento/adopción: ${fechaNacimiento}`,
      `Inicio suspensión: ${fechaInicioSuspension}`,
      `Reincorporación prevista: ${fechaReincorporacion}`,
      `Días de prestación: ${diasPrestacion}`,
      `Base reguladora diaria: ${baseReguladora.toFixed(2)} €`,
      `Prestación total estimada: ${prestacionTotal.toFixed(2)} €`,
      partoMultiple ? `Parto múltiple: ${numHijos} hijos/as` : '',
      nifRecienNacido ? `NIF recién nacido/a: ${nifRecienNacido}` : '',
    ].filter(Boolean);

    doc.setFontSize(11);
    lines.forEach(line => {
      doc.text(line, 20, y);
      y += 7;
    });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Documentación requerida:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    DOCS_REQUERIDOS.forEach((d, i) => {
      const check = docsDisponibles[i] ? '✓' : '☐';
      doc.text(`${check} ${d}`, 25, y);
      y += 6;
    });

    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Documento preparatorio — el envío oficial se realiza en sede INSS Empresas', pw / 2, y, { align: 'center' });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expediente-nacimiento-${selectedEmployee.last_name}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF descargado');
  }, [selectedEmployee, isFormComplete, tipoPermiso, fechaNacimiento, fechaInicioSuspension, fechaReincorporacion, diasPrestacion, baseReguladora, prestacionTotal, partoMultiple, numHijos, nifRecienNacido, docsDisponibles]);

  return (
    <div className="space-y-4">
      {/* 1. CONTEXTO LEGAL */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-blue-600" />
            LGSS Art. 177-182 — Prestación por Nacimiento y Cuidado de Menor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>Duración: <strong>16 semanas</strong> para cada progenitor/a (ampliable en partos múltiples).</p>
          <p>Prestación: <strong>100% de la base reguladora</strong> — a cargo del INSS.</p>
          <p>La empresa comunica la suspensión del contrato al INSS vía sede electrónica.</p>
          <div className="flex gap-2 flex-wrap mt-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
              Tramitación vía INSS Sede Electrónica
            </Badge>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">
              Dry-run preparatorio — envío real en sede INSS
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 2. FORMULARIO */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Baby className="h-4 w-4" /> Alta de Prestación
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
              <Label className="text-xs">Tipo de permiso</Label>
              <Select value={tipoPermiso} onValueChange={setTipoPermiso}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_PERMISO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de nacimiento/adopción</Label>
              <Input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha inicio suspensión</Label>
              <Input type="date" value={fechaInicioSuspension} onChange={e => setFechaInicioSuspension(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha prevista reincorporación</Label>
              <Input value={fechaReincorporacion || '—'} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">NIF del/la recién nacido/a (si aplica)</Label>
              <Input value={nifRecienNacido} onChange={e => setNifRecienNacido(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Switch checked={partoMultiple} onCheckedChange={setPartoMultiple} id="parto-multiple" />
            <Label htmlFor="parto-multiple" className="text-xs">¿Parto múltiple?</Label>
            {partoMultiple && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Nº hijos/as:</Label>
                <Input
                  type="number"
                  min={2}
                  max={6}
                  value={numHijos}
                  onChange={e => setNumHijos(parseInt(e.target.value) || 2)}
                  className="w-16 h-8"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. DOCUMENTACIÓN REQUERIDA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documentación Requerida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DOCS_REQUERIDOS.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Switch
                checked={docsDisponibles[idx]}
                onCheckedChange={() => toggleDoc(idx)}
                id={`doc-${idx}`}
              />
              <Label htmlFor={`doc-${idx}`} className="text-xs flex items-center gap-1.5">
                {docsDisponibles[idx]
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                }
                {doc}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. RESUMEN DEL EXPEDIENTE */}
      {isFormComplete && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" /> Resumen del Expediente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Empleado/a</p>
                <p className="text-sm font-semibold">
                  {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Período suspensión</p>
                <p className="text-sm font-semibold">{fechaInicioSuspension} — {fechaReincorporacion}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Días de prestación</p>
                <p className="text-sm font-semibold">{diasPrestacion}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Base reguladora diaria</p>
                <p className="text-sm font-semibold">{baseReguladora.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Prestación total estimada</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">{prestacionTotal.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. BOTONES */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleGenerarExpediente} disabled={saving || !isFormComplete}>
          <FileText className="h-4 w-4 mr-1" />
          Generar expediente preparatorio
        </Button>
        <Button variant="outline" onClick={handleDescargarPDF} disabled={!isFormComplete}>
          <Download className="h-4 w-4 mr-1" />
          Descargar resumen PDF
        </Button>
      </div>
    </div>
  );
}

export default ESNacimientoINSSPanel;
