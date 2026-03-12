/**
 * HRAdminRequestForm — Dynamic form based on request_type
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, FileText } from 'lucide-react';
import { type AdminRequestType, getRequestTypeLabel } from '@/hooks/admin/hr/useAdminPortal';

const REQUEST_TYPES: AdminRequestType[] = [
  'employee_registration', 'contract_modification', 'schedule_change',
  'salary_change', 'monthly_incidents', 'sick_leave', 'work_accident',
  'unpaid_leave', 'birth_leave', 'vacation', 'termination',
  'settlement', 'company_certificate', 'document_submission',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSubmit: (data: any) => Promise<any>;
}

function MetadataFields({ type, metadata, onChange }: { type: AdminRequestType; metadata: Record<string, any>; onChange: (m: Record<string, any>) => void }) {
  const set = (k: string, v: any) => onChange({ ...metadata, [k]: v });

  switch (type) {
    case 'employee_registration':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Nombre completo</Label><Input placeholder="Nombre y apellidos" value={metadata.nombre || ''} onChange={e => set('nombre', e.target.value)} /></div>
          <div><Label className="text-xs">Puesto</Label><Input placeholder="Puesto" value={metadata.puesto || ''} onChange={e => set('puesto', e.target.value)} /></div>
          <div><Label className="text-xs">Departamento</Label><Input placeholder="Departamento" value={metadata.departamento || ''} onChange={e => set('departamento', e.target.value)} /></div>
          <div><Label className="text-xs">Fecha inicio</Label><Input type="date" value={metadata.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} /></div>
          <div><Label className="text-xs">Jornada</Label><Select value={metadata.jornada || ''} onValueChange={v => set('jornada', v)}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="completa">Completa</SelectItem><SelectItem value="parcial">Parcial</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs">Salario bruto anual</Label><Input type="number" placeholder="€" value={metadata.salario_bruto || ''} onChange={e => set('salario_bruto', e.target.value)} /></div>
        </div>
      );
    case 'salary_change':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Salario actual</Label><Input type="number" placeholder="€" value={metadata.salario_actual || ''} onChange={e => set('salario_actual', e.target.value)} /></div>
          <div><Label className="text-xs">Salario nuevo</Label><Input type="number" placeholder="€" value={metadata.salario_nuevo || ''} onChange={e => set('salario_nuevo', e.target.value)} /></div>
          <div><Label className="text-xs">Fecha efecto</Label><Input type="date" value={metadata.fecha_efecto || ''} onChange={e => set('fecha_efecto', e.target.value)} /></div>
          <div><Label className="text-xs">Motivo</Label><Input placeholder="Motivo" value={metadata.motivo || ''} onChange={e => set('motivo', e.target.value)} /></div>
        </div>
      );
    case 'schedule_change':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Jornada actual</Label><Input value={metadata.jornada_actual || ''} onChange={e => set('jornada_actual', e.target.value)} /></div>
          <div><Label className="text-xs">Jornada nueva</Label><Input value={metadata.jornada_nueva || ''} onChange={e => set('jornada_nueva', e.target.value)} /></div>
          <div><Label className="text-xs">Fecha efecto</Label><Input type="date" value={metadata.fecha_efecto || ''} onChange={e => set('fecha_efecto', e.target.value)} /></div>
          <div><Label className="text-xs">Motivo</Label><Input placeholder="Motivo" value={metadata.motivo || ''} onChange={e => set('motivo', e.target.value)} /></div>
        </div>
      );
    case 'sick_leave':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha inicio</Label><Input type="date" value={metadata.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} /></div>
          <div><Label className="text-xs">Fecha fin estimada</Label><Input type="date" value={metadata.fecha_fin_estimada || ''} onChange={e => set('fecha_fin_estimada', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Diagnóstico genérico</Label><Input placeholder="Diagnóstico" value={metadata.diagnostico || ''} onChange={e => set('diagnostico', e.target.value)} /></div>
        </div>
      );
    case 'vacation':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha inicio</Label><Input type="date" value={metadata.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} /></div>
          <div><Label className="text-xs">Fecha fin</Label><Input type="date" value={metadata.fecha_fin || ''} onChange={e => set('fecha_fin', e.target.value)} /></div>
          <div><Label className="text-xs">Días solicitados</Label><Input type="number" value={metadata.dias || ''} onChange={e => set('dias', e.target.value)} /></div>
        </div>
      );
    case 'termination':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha efecto</Label><Input type="date" value={metadata.fecha_efecto || ''} onChange={e => set('fecha_efecto', e.target.value)} /></div>
          <div><Label className="text-xs">Tipo de baja</Label><Select value={metadata.tipo_baja || ''} onValueChange={v => set('tipo_baja', v)}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="voluntary">Voluntaria</SelectItem><SelectItem value="dismissal">Despido</SelectItem><SelectItem value="end_contract">Fin contrato</SelectItem></SelectContent></Select></div>
          <div className="col-span-2"><Label className="text-xs">Motivo</Label><Textarea placeholder="Motivo de la baja" value={metadata.motivo || ''} onChange={e => set('motivo', e.target.value)} /></div>
        </div>
      );
    case 'company_certificate':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Tipo de certificado</Label><Select value={metadata.tipo_certificado || ''} onValueChange={v => set('tipo_certificado', v)}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="empresa">Certificado empresa</SelectItem><SelectItem value="retenciones">Retenciones</SelectItem><SelectItem value="vida_laboral">Vida laboral</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs">Destinatario</Label><Input placeholder="Destinatario" value={metadata.destinatario || ''} onChange={e => set('destinatario', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Motivo</Label><Input placeholder="Motivo de la solicitud" value={metadata.motivo || ''} onChange={e => set('motivo', e.target.value)} /></div>
        </div>
      );
    case 'work_accident':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha accidente</Label><Input type="date" value={metadata.fecha || ''} onChange={e => set('fecha', e.target.value)} /></div>
          <div><Label className="text-xs">Centro de trabajo</Label><Input placeholder="Centro" value={metadata.centro_trabajo || ''} onChange={e => set('centro_trabajo', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Descripción</Label><Textarea placeholder="Descripción del accidente" value={metadata.descripcion || ''} onChange={e => set('descripcion', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Testigos</Label><Input placeholder="Nombres de testigos" value={metadata.testigos || ''} onChange={e => set('testigos', e.target.value)} /></div>
        </div>
      );
    case 'birth_leave':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha nacimiento</Label><Input type="date" value={metadata.fecha_nacimiento || ''} onChange={e => set('fecha_nacimiento', e.target.value)} /></div>
          <div><Label className="text-xs">Tipo</Label><Select value={metadata.tipo || ''} onValueChange={v => set('tipo', v)}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="paternity">Paternidad</SelectItem><SelectItem value="maternity">Maternidad</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs">Semanas</Label><Input type="number" value={metadata.semanas || ''} onChange={e => set('semanas', e.target.value)} /></div>
        </div>
      );
    default:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Fecha efecto</Label><Input type="date" value={metadata.fecha_efecto || ''} onChange={e => set('fecha_efecto', e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">Observaciones</Label><Textarea placeholder="Detalles adicionales" value={metadata.observaciones || ''} onChange={e => set('observaciones', e.target.value)} /></div>
        </div>
      );
  }
}

export function HRAdminRequestForm({ open, onOpenChange, companyId, onSubmit }: Props) {
  const [requestType, setRequestType] = useState<AdminRequestType | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [employeeId, setEmployeeId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!requestType || !subject) return;
    setSubmitting(true);
    try {
      await onSubmit({
        employee_id: employeeId || '00000000-0000-0000-0000-000000000000',
        request_type: requestType,
        subject,
        description,
        priority,
        metadata,
      });
      // Reset
      setRequestType('');
      setSubject('');
      setDescription('');
      setPriority('normal');
      setEmployeeId('');
      setMetadata({});
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nueva Solicitud Administrativa
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Type */}
            <div>
              <Label>Tipo de solicitud *</Label>
              <Select value={requestType} onValueChange={v => { setRequestType(v as AdminRequestType); setMetadata({}); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{getRequestTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <Label>Asunto *</Label>
              <Input placeholder="Asunto de la solicitud" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            {/* Priority */}
            <div>
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Descripción</Label>
              <Textarea placeholder="Información adicional" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            {/* Dynamic fields */}
            {requestType && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-semibold">Datos específicos — {getRequestTypeLabel(requestType)}</Label>
                  <div className="mt-2">
                    <MetadataFields type={requestType} metadata={metadata} onChange={setMetadata} />
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!requestType || !subject || submitting} className="gap-2">
                <Send className="h-4 w-4" />
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
