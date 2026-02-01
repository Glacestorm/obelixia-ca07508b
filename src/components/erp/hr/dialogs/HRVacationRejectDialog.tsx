/**
 * HRVacationRejectDialog - Diálogo para rechazar solicitudes de vacaciones
 * Fase D - Diálogos funcionales de Vacaciones
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  XCircle, AlertTriangle, Loader2, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface HRVacationRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    employee_name: string;
    department: string;
    start_date: string;
    end_date: string;
    days: number;
    type: string;
  } | null;
  onConfirm: (requestId: string, reason: string) => void;
  rejectLevel: 'dept' | 'hr';
}

export function HRVacationRejectDialog({
  open,
  onOpenChange,
  request,
  onConfirm,
  rejectLevel,
}: HRVacationRejectDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedReasons = [
    'Coincide con periodo de alta carga de trabajo',
    'Coincide con fecha de entrega crítica del proyecto',
    'Excede el límite de ausencias simultáneas del departamento',
    'Periodo ya solicitado por otro compañero con prioridad',
    'Formación obligatoria programada para esas fechas',
    'Inventario o cierre contable programado',
  ];

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Indica el motivo del rechazo');
      return;
    }

    if (!request) return;

    setLoading(true);
    try {
      onConfirm(request.id, reason);
      setReason('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Rechazar Solicitud de Vacaciones
          </DialogTitle>
          <DialogDescription>
            {rejectLevel === 'dept' 
              ? 'Rechazar como responsable de departamento'
              : 'Rechazar como responsable de RRHH'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Summary */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{request.employee_name}</span>
              <Badge variant="outline">{request.department}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {request.start_date} → {request.end_date} ({request.days} días)
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del Rechazo *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indica el motivo del rechazo..."
              rows={3}
            />
          </div>

          {/* Quick Reasons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Motivos frecuentes:</Label>
            <div className="flex flex-wrap gap-1">
              {predefinedReasons.map((predefined, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => setReason(predefined)}
                >
                  {predefined.length > 40 ? predefined.slice(0, 40) + '...' : predefined}
                </Button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              El empleado será notificado del rechazo y podrá solicitar nuevas fechas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Confirmar Rechazo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRVacationRejectDialog;
