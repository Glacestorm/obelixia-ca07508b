/**
 * HRENPSSurveyDialog - Dialog para lanzar encuestas eNPS
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
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, Loader2, Send, Calendar, Users, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface HRENPSSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onLaunched?: () => void;
}

const SURVEY_SCOPES = [
  { id: 'all', name: 'Toda la empresa', description: 'Enviar a todos los empleados activos' },
  { id: 'department', name: 'Por departamento', description: 'Seleccionar departamentos específicos' },
  { id: 'location', name: 'Por ubicación', description: 'Seleccionar ubicaciones específicas' },
];

const DURATIONS = [
  { value: '3', label: '3 días' },
  { value: '5', label: '5 días' },
  { value: '7', label: '1 semana' },
  { value: '14', label: '2 semanas' },
];

export function HRENPSSurveyDialog({
  open,
  onOpenChange,
  companyId,
  onLaunched
}: HRENPSSurveyDialogProps) {
  const [title, setTitle] = useState('Encuesta de Satisfacción Laboral');
  const [scope, setScope] = useState('all');
  const [duration, setDuration] = useState('7');
  const [customMessage, setCustomMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);

  // Demo data
  const estimatedRecipients = scope === 'all' ? 47 : 12;

  const handleLaunch = async () => {
    if (!title) {
      toast.error('Por favor añade un título para la encuesta');
      return;
    }

    setIsLaunching(true);
    try {
      // Simular lanzamiento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Encuesta eNPS lanzada correctamente', {
        description: `Se ha enviado a ${estimatedRecipients} empleados`
      });
      
      onLaunched?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error launching survey:', error);
      toast.error('Error al lanzar la encuesta');
    } finally {
      setIsLaunching(false);
    }
  };

  const resetForm = () => {
    setTitle('Encuesta de Satisfacción Laboral');
    setScope('all');
    setDuration('7');
    setCustomMessage('');
    setIsAnonymous(true);
    setReminderEnabled(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-primary" />
            Lanzar Encuesta eNPS
          </DialogTitle>
          <DialogDescription>
            Mide el Employee Net Promoter Score de tu organización
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Explicación eNPS */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-300">¿Qué es eNPS?</p>
                <p className="text-muted-foreground mt-1">
                  El eNPS mide la probabilidad de que tus empleados recomienden tu empresa 
                  como lugar de trabajo. Escala de 0-10 donde Promotores (9-10), 
                  Pasivos (7-8), Detractores (0-6).
                </p>
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la encuesta</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Encuesta de Satisfacción Laboral Q1 2026"
            />
          </div>

          {/* Alcance */}
          <div className="space-y-2">
            <Label>Alcance</Label>
            <div className="grid grid-cols-1 gap-2">
              {SURVEY_SCOPES.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    scope === s.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setScope(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    {scope === s.id && (
                      <Badge variant="default">Seleccionado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Destinatarios estimados</Label>
              <div className="flex items-center gap-2 h-10 px-3 bg-muted rounded-md">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{estimatedRecipients} empleados</span>
              </div>
            </div>
          </div>

          {/* Mensaje personalizado */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje personalizado (opcional)</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Añade un mensaje personalizado que acompañará la encuesta..."
              rows={3}
            />
          </div>

          {/* Opciones */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
                Respuestas anónimas (recomendado)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reminder"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="reminder" className="text-sm font-normal cursor-pointer">
                Enviar recordatorio a mitad del período
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleLaunch} disabled={isLaunching || !title}>
            {isLaunching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Lanzar Encuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRENPSSurveyDialog;
