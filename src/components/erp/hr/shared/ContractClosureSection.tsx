/**
 * ContractClosureSection — Compact operational closure UI for contracting
 * V2-ES.6 Paso 3: Shows closure status, blockers, and action button
 *
 * Mirrors RegistrationClosureSection.tsx pattern (alta/afiliación).
 * Integrates into ContractDataPanel without new routes.
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Lock, Unlock, ShieldCheck, AlertTriangle, XCircle,
  CheckCircle2, FileText, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContractClosureBlocker, ContractClosureSnapshot } from './contractClosureEngine';

interface Props {
  canClose: boolean;
  isClosed: boolean;
  isConfirmed: boolean;
  blockers: ContractClosureBlocker[];
  warnings: ContractClosureBlocker[];
  existingSnapshot: ContractClosureSnapshot | null;
  closedAt: string | null;
  closureNotes: string | null;
  onClose: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  onReopen: (reason?: string) => Promise<boolean>;
  className?: string;
}

export function ContractClosureSection({
  canClose, isClosed, isConfirmed, blockers, warnings,
  existingSnapshot, closedAt, closureNotes,
  onClose, onReopen, className,
}: Props) {
  const [notes, setNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);

  const handleClose = useCallback(async () => {
    setClosing(true);
    await onClose(notes.trim() || undefined);
    setClosing(false);
    setNotes('');
  }, [onClose, notes]);

  const handleReopen = useCallback(async () => {
    setReopening(true);
    await onReopen(reopenReason.trim() || undefined);
    setReopening(false);
    setReopenReason('');
  }, [onReopen, reopenReason]);

  // Already confirmed — no closure needed
  if (isConfirmed) {
    return (
      <div className={cn('flex items-center gap-1.5 text-[10px] text-emerald-600', className)}>
        <ShieldCheck className="h-3 w-3 shrink-0" />
        <span>Contratación confirmada oficialmente — cierre implícito</span>
      </div>
    );
  }

  // Already closed internally
  if (isClosed) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-primary shrink-0" />
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Cerrado internamente
            </Badge>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-muted-foreground hover:text-foreground">
                <Unlock className="h-2.5 w-2.5 mr-0.5" />
                Reabrir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reabrir proceso de contratación</AlertDialogTitle>
                <AlertDialogDescription>
                  El cierre operativo se eliminará y el proceso volverá a estado abierto. Se registrará en auditoría.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                placeholder="Motivo de reapertura (opcional)"
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReopen} disabled={reopening}>
                  {reopening ? 'Reabriendo…' : 'Reabrir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Closure metadata */}
        <div className="space-y-0.5 text-[10px] text-muted-foreground pl-4">
          {closedAt && (
            <p className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {new Date(closedAt).toLocaleString('es')}
            </p>
          )}
          {closureNotes && (
            <p className="flex items-start gap-1">
              <FileText className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              {closureNotes}
            </p>
          )}
          {existingSnapshot && (
            <p className="flex items-center gap-1">
              <ShieldCheck className="h-2.5 w-2.5" />
              Readiness: {existingSnapshot.pre_integration.readiness_percent}% — {existingSnapshot.pre_integration.status}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Not closeable — show blockers
  if (!canClose) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground">Cierre operativo no disponible:</span>
        </div>
        <div className="space-y-0.5 pl-4">
          {blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px] text-red-600">
              <XCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              <span>{b.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Can close — show action
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[10px] font-medium">Proceso cerrable internamente</span>
        </div>
        {warnings.length > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
            {warnings.length} aviso(s)
          </Badge>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-0.5 pl-4">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px] text-amber-600">
              <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 w-full border-primary/30 text-primary hover:bg-primary/5"
          >
            <Lock className="h-3 w-3" />
            Cerrar contratación internamente
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar proceso de contratación internamente</AlertDialogTitle>
            <AlertDialogDescription>
              El proceso quedará marcado como cerrado internamente con una evidencia inmutable.
              Esto <strong>no</strong> implica comunicación oficial ante SEPE/Contrat@.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Notas de cierre (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="text-sm"
            rows={2}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={closing}>
              {closing ? 'Cerrando…' : 'Cerrar internamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
