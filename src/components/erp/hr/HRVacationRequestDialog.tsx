/**
 * HRVacationRequestDialog - Dialog para solicitar vacaciones/permisos
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarIcon, AlertTriangle, CheckCircle, Users, Info, Clock, FileText, Upload } from 'lucide-react';
import { format, differenceInDays, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LeaveType {
  id: string;
  code: string;
  name: string;
  jurisdiction: string;
  days_entitled: number | null;
  is_calendar_days: boolean;
  requires_documentation: boolean;
  legal_reference: string | null;
  description: string | null;
}

interface ConflictInfo {
  hasConflict: boolean;
  conflictPercentage: number;
  conflictEmployees: string[];
  maxAllowed: number;
  message: string;
}

interface VacationBalance {
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
}

interface HRVacationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  employeeName?: string;
  jurisdiction?: string;
  onSubmit?: (data: any) => void;
}

const DEMO_LEAVE_TYPES: LeaveType[] = [
  { id: '1', code: 'vacation', name: 'Vacaciones anuales', jurisdiction: 'ES', days_entitled: 30, is_calendar_days: true, requires_documentation: false, legal_reference: 'Art. 38.1 ET', description: 'Vacaciones anuales retribuidas' },
  { id: '2', code: 'marriage', name: 'Matrimonio', jurisdiction: 'ES', days_entitled: 15, is_calendar_days: true, requires_documentation: true, legal_reference: 'Art. 37.3.a ET', description: 'Permiso por matrimonio' },
  { id: '3', code: 'death_1st', name: 'Fallecimiento 1º grado', jurisdiction: 'ES', days_entitled: 4, is_calendar_days: true, requires_documentation: true, legal_reference: 'Art. 37.3.b ET', description: 'Fallecimiento de familiar' },
  { id: '4', code: 'moving', name: 'Traslado domicilio', jurisdiction: 'ES', days_entitled: 1, is_calendar_days: false, requires_documentation: false, legal_reference: 'Art. 37.3.c ET', description: 'Cambio de domicilio' },
  { id: '5', code: 'personal', name: 'Asuntos propios', jurisdiction: 'ES', days_entitled: null, is_calendar_days: false, requires_documentation: false, legal_reference: 'Convenio', description: 'Según convenio' },
];

const DEMO_BALANCE: VacationBalance = { entitled: 30, used: 10, pending: 5, remaining: 15 };

export function HRVacationRequestDialog({ open, onOpenChange, employeeName = 'Usuario', jurisdiction = 'ES', onSubmit }: HRVacationRequestDialogProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(DEMO_LEAVE_TYPES);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [balance] = useState<VacationBalance>(DEMO_BALANCE);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      const { data } = await supabase.from('erp_hr_leave_types').select('*').eq('jurisdiction', jurisdiction).eq('is_active', true).order('sort_order');
      if (data && data.length > 0) setLeaveTypes(data as LeaveType[]);
    };
    if (open) fetchLeaveTypes();
  }, [open, jurisdiction]);

  const calculateDays = useCallback(() => {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;
    let days = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      if (selectedType?.is_calendar_days || !isWeekend(current)) days++;
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [startDate, endDate, isHalfDay, selectedType]);

  const daysRequested = calculateDays();

  const checkConflicts = useCallback(async () => {
    if (!startDate || !endDate) { setConflictInfo(null); return; }
    const totalEmployeesInDept = 10;
    const employeesOnLeave = 2;
    const maxPercentage = 30;
    const conflictPercentage = ((employeesOnLeave + 1) / totalEmployeesInDept) * 100;
    const hasConflict = conflictPercentage > maxPercentage;
    setConflictInfo({
      hasConflict,
      conflictPercentage: Math.round(conflictPercentage),
      conflictEmployees: hasConflict ? ['Juan Martínez', 'Ana Fernández'] : [],
      maxAllowed: maxPercentage,
      message: hasConflict ? `El ${Math.round(conflictPercentage)}% del departamento estaría ausente (máx: ${maxPercentage}%)` : `${employeesOnLeave} compañeros de vacaciones (${Math.round(conflictPercentage)}% equipo)`
    });
    const warnings: string[] = [];
    const daysInAdvance = differenceInDays(startDate, new Date());
    if (daysInAdvance < 15) warnings.push(`Solo ${daysInAdvance} días de antelación (recomendado: 15)`);
    if (selectedType?.code === 'vacation' && daysRequested > balance.remaining) warnings.push(`Supera saldo disponible (${balance.remaining}d)`);
    setValidationWarnings(warnings);
  }, [startDate, endDate, selectedType, daysRequested, balance.remaining]);

  useEffect(() => { checkConflicts(); }, [checkConflicts]);

  const handleSubmit = async () => {
    if (!selectedType || !startDate || !endDate) { toast.error('Completa todos los campos'); return; }
    if (conflictInfo?.hasConflict) { toast.error('No se puede solicitar por conflicto'); return; }
    setIsSubmitting(true);
    try {
      const requestData = {
        leave_type_code: selectedType.code,
        jurisdiction,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        days_requested: daysRequested,
        is_half_day: isHalfDay,
        half_day_period: isHalfDay ? halfDayPeriod : null,
        status: 'pending',
        notes,
        validation_warnings: validationWarnings,
      };
      toast.success('Solicitud enviada correctamente');
      onSubmit?.(requestData);
      onOpenChange(false);
    } catch (error) {
      toast.success('Solicitud enviada (demo)');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setSelectedType(null);
      setStartDate(undefined);
      setEndDate(undefined);
      setIsHalfDay(false);
      setNotes('');
      setConflictInfo(null);
      setValidationWarnings([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" />Solicitar Vacaciones/Permiso</DialogTitle>
          <DialogDescription>Solicitud para: <strong>{employeeName}</strong></DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo vacaciones 2026</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-2xl font-bold text-primary">{balance.remaining}</span>
                      <span className="text-sm text-muted-foreground">días disponibles</span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><span>Disfrutados:</span><Badge variant="secondary">{balance.used}d</Badge></div>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1"><span>Pendientes:</span><Badge variant="outline">{balance.pending}d</Badge></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Tipo de permiso *</Label>
              <Select value={selectedType?.id || ''} onValueChange={(id) => setSelectedType(leaveTypes.find(t => t.id === id) || null)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span>{type.name}</span>
                        {type.days_entitled && <Badge variant="outline" className="text-xs">{type.days_entitled}d</Badge>}
                        {type.requires_documentation && <FileText className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && <p className="text-xs text-muted-foreground mt-1">{selectedType.description} {selectedType.legal_reference && <span className="text-primary">({selectedType.legal_reference})</span>}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha inicio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); if (!endDate || (date && endDate < date)) setEndDate(date); }} locale={es} disabled={(date) => date < new Date()} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Fecha fin *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !endDate && "text-muted-foreground")} disabled={!startDate}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={es} disabled={(date) => startDate ? date < startDate : true} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div><Label>Media jornada</Label><p className="text-xs text-muted-foreground">Solo para un día</p></div>
              <Switch checked={isHalfDay} onCheckedChange={setIsHalfDay} disabled={!startDate || !endDate || startDate.getTime() !== endDate.getTime()} />
            </div>

            {isHalfDay && (
              <Select value={halfDayPeriod} onValueChange={(v) => setHalfDayPeriod(v as 'morning' | 'afternoon')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Mañana</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                </SelectContent>
              </Select>
            )}

            {startDate && endDate && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Días solicitados</span></div>
                    <Badge className={cn("text-lg px-3 py-1", daysRequested > balance.remaining ? "bg-destructive" : "bg-primary")}>{daysRequested} {daysRequested === 1 ? 'día' : 'días'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{selectedType?.is_calendar_days ? 'Días naturales' : 'Días laborables'} • {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM yyyy", { locale: es })}</p>
                </CardContent>
              </Card>
            )}

            {conflictInfo && (
              <Alert variant={conflictInfo.hasConflict ? "destructive" : "default"}>
                <div className="flex items-start gap-2">
                  {conflictInfo.hasConflict ? <AlertTriangle className="h-4 w-4 mt-0.5" /> : <Users className="h-4 w-4 mt-0.5" />}
                  <AlertDescription className="text-sm">{conflictInfo.message}</AlertDescription>
                </div>
              </Alert>
            )}

            {validationWarnings.length > 0 && (
              <Alert><Info className="h-4 w-4" /><AlertDescription><ul className="list-disc list-inside text-sm">{validationWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul></AlertDescription></Alert>
            )}

            {selectedType?.requires_documentation && (
              <Alert><FileText className="h-4 w-4" /><AlertDescription className="text-sm">Este permiso requiere documentación.<Button variant="link" size="sm" className="ml-2 h-auto p-0"><Upload className="h-3 w-3 mr-1" />Adjuntar</Button></AlertDescription></Alert>
            )}

            <div><Label>Observaciones</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Información adicional..." className="mt-1" rows={3} /></div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selectedType || !startDate || !endDate || isSubmitting || conflictInfo?.hasConflict}>
            {isSubmitting ? 'Enviando...' : <><CheckCircle className="h-4 w-4 mr-1" />Enviar Solicitud</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRVacationRequestDialog;
