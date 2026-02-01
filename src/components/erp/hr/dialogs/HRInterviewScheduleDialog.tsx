/**
 * HRInterviewScheduleDialog - Dialog para agendar entrevistas con candidatos
 */

import { useState } from 'react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Video, MapPin, Users, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CandidateInfo {
  id: string;
  name: string;
  email: string;
  position?: string;
}

interface HRInterviewScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateInfo | null;
  jobTitle?: string;
  companyId?: string;
  onScheduled?: () => void;
  onInterviewScheduled?: () => void;
}

const INTERVIEW_TYPES = [
  { id: 'phone', name: 'Telefónica', icon: '📞' },
  { id: 'video', name: 'Videoconferencia', icon: '💻' },
  { id: 'presential', name: 'Presencial', icon: '🏢' },
  { id: 'technical', name: 'Técnica', icon: '⚙️' },
  { id: 'group', name: 'Grupal', icon: '👥' },
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const DURATIONS = [
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h 30min' },
  { value: '120', label: '2 horas' },
];

export function HRInterviewScheduleDialog({
  open,
  onOpenChange,
  candidate,
  jobTitle,
  companyId,
  onScheduled
}: HRInterviewScheduleDialogProps) {
  const [interviewType, setInterviewType] = useState('video');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [interviewers, setInterviewers] = useState('');
  const [notes, setNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!candidate || !date || !time) {
      toast.error('Por favor completa fecha y hora');
      return;
    }

    setIsScheduling(true);
    try {
      // Simular creación de entrevista
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Entrevista agendada correctamente', {
        description: sendNotification 
          ? `Se ha enviado notificación a ${candidate.email}`
          : undefined
      });
      
      onScheduled?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast.error('Error al agendar entrevista');
    } finally {
      setIsScheduling(false);
    }
  };

  const resetForm = () => {
    setInterviewType('video');
    setDate('');
    setTime('');
    setDuration('60');
    setLocation('');
    setInterviewers('');
    setNotes('');
  };

  // Calcular fecha mínima (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendar Entrevista
          </DialogTitle>
          <DialogDescription>
            Programa una entrevista con {candidate.name}
            {(jobTitle || candidate.position) && <span className="block mt-1 text-xs">Posición: {jobTitle || candidate.position}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de entrevista */}
          <div className="space-y-2">
            <Label>Tipo de Entrevista</Label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_TYPES.slice(0, 3).map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant={interviewType === type.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInterviewType(type.id)}
                  className="h-auto py-2 flex flex-col gap-1"
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-xs">{type.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona hora" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duración</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ubicación/Link según tipo */}
          <div className="space-y-2">
            <Label htmlFor="location">
              {interviewType === 'video' ? 'Link de videoconferencia' : 
               interviewType === 'phone' ? 'Teléfono de contacto' : 
               'Ubicación'}
            </Label>
            <div className="relative">
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={
                  interviewType === 'video' ? 'https://meet.google.com/...' :
                  interviewType === 'phone' ? '+34 XXX XXX XXX' :
                  'Dirección de la oficina'
                }
                className="pl-10"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {interviewType === 'video' ? <Video className="h-4 w-4" /> :
                 interviewType === 'presential' ? <MapPin className="h-4 w-4" /> :
                 <Clock className="h-4 w-4" />}
              </div>
            </div>
          </div>

          {/* Entrevistadores */}
          <div className="space-y-2">
            <Label htmlFor="interviewers">Entrevistadores</Label>
            <div className="relative">
              <Input
                id="interviewers"
                value={interviewers}
                onChange={(e) => setInterviewers(e.target.value)}
                placeholder="Nombres de los entrevistadores..."
                className="pl-10"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional para la entrevista..."
              rows={3}
            />
          </div>

          {/* Notificación */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notify"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="notify" className="text-sm font-normal cursor-pointer">
              Enviar notificación por email al candidato
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling || !date || !time}>
            {isScheduling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Agendar Entrevista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRInterviewScheduleDialog;
