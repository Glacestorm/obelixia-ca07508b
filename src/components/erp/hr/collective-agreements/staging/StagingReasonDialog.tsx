import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface StagingReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
}

export function StagingReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  onConfirm,
}: StagingReasonDialogProps) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs" htmlFor="staging-reason-input">
            Motivo (mínimo 5 caracteres)
          </Label>
          <Textarea
            id="staging-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(trimmed)} disabled={tooShort || isPending}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StagingReasonDialog;