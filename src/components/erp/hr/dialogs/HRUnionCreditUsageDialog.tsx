/**
 * HRUnionCreditUsageDialog - Registro de uso de crédito horario sindical
 * Permite registrar las horas utilizadas por representantes sindicales
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HRUnionCreditUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

// Demo representatives data
const representatives = [
  { id: '1', name: 'María García López', type: 'Delegado de Personal', union: 'CCOO', monthlyHours: 15, usedHours: 8 },
  { id: '2', name: 'Carlos Rodríguez Pérez', type: 'Comité de Empresa', union: 'UGT', monthlyHours: 20, usedHours: 12 },
  { id: '3', name: 'Ana Martínez Sánchez', type: 'Delegado Sindical', union: 'CGT', monthlyHours: 15, usedHours: 5 },
  { id: '4', name: 'Pedro López Fernández', type: 'Comité de Empresa', union: 'CCOO', monthlyHours: 20, usedHours: 18 },
];

const usageTypes = [
  { value: 'reunion_sindical', label: 'Reunión sindical' },
  { value: 'asamblea', label: 'Asamblea de trabajadores' },
  { value: 'negociacion', label: 'Negociación colectiva' },
  { value: 'formacion', label: 'Formación sindical' },
  { value: 'gestion', label: 'Gestiones sindicales' },
  { value: 'acompanamiento', label: 'Acompañamiento a trabajadores' },
  { value: 'otro', label: 'Otro motivo' },
];

export function HRUnionCreditUsageDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: HRUnionCreditUsageDialogProps) {
  const [selectedRepresentative, setSelectedRepresentative] = useState('');
  const [usageDate, setUsageDate] = useState<Date | undefined>(new Date());
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('0');
  const [usageType, setUsageType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRep = representatives.find(r => r.id === selectedRepresentative);
  const availableHours = selectedRep ? selectedRep.monthlyHours - selectedRep.usedHours : 0;

  const handleSubmit = async () => {
    if (!selectedRepresentative || !usageDate || !hours || !usageType) {
      toast.error('Por favor, complete todos los campos obligatorios');
      return;
    }

    const totalHours = parseFloat(hours) + parseFloat(minutes) / 60;
    
    if (selectedRep && totalHours > availableHours) {
      toast.error(`Las horas solicitadas superan el crédito disponible (${availableHours}h)`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success('Uso de crédito horario registrado correctamente');
      
      // Reset form
      setSelectedRepresentative('');
      setUsageDate(new Date());
      setHours('');
      setMinutes('0');
      setUsageType('');
      setDescription('');
      setLocation('');
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al registrar el uso de crédito horario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Registrar Uso de Crédito Horario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Representante */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Representante *
            </Label>
            <Select value={selectedRepresentative} onValueChange={setSelectedRepresentative}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar representante" />
              </SelectTrigger>
              <SelectContent>
                {representatives.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    <div className="flex flex-col">
                      <span>{rep.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {rep.type} - {rep.union} | Disponible: {rep.monthlyHours - rep.usedHours}h
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info del representante seleccionado */}
          {selectedRep && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-muted-foreground">Crédito mensual:</span>
                  <p className="font-medium">{selectedRep.monthlyHours}h</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usado:</span>
                  <p className="font-medium">{selectedRep.usedHours}h</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Disponible:</span>
                  <p className={cn(
                    "font-medium",
                    availableHours <= 2 ? "text-destructive" : "text-green-600"
                  )}>
                    {availableHours}h
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha de uso *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !usageDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {usageDate ? format(usageDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={usageDate}
                  onSelect={setUsageDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Horas y minutos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Horas *</Label>
              <Input
                type="number"
                min="0"
                max={availableHours}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Ej: 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Minutos</Label>
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo de uso */}
          <div className="space-y-2">
            <Label>Motivo del uso *</Label>
            <Select value={usageType} onValueChange={setUsageType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {usageTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <Label>Lugar</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Sede sindical, Oficinas centrales..."
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Descripción / Observaciones
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle de la actividad realizada..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar Uso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRUnionCreditUsageDialog;
