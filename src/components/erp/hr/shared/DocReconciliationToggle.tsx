/**
 * DocReconciliationToggle — Toggle manual de conciliación por canal
 * V2-ES.4 Paso 2.5: Checkboxes discretos para marcar conciliación
 * Persiste directamente en erp_hr_employee_documents.
 */
import { useState, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isReconcilableDocType, getApplicableChannels, type ReconciliationChannel } from './DocReconciliationBadge';

const CHANNEL_LABELS: Record<ReconciliationChannel, string> = {
  payroll: 'Nómina',
  social_security: 'Seg. Social',
  tax: 'Fiscal',
};

const CHANNEL_COLUMNS: Record<ReconciliationChannel, string> = {
  payroll: 'reconciled_with_payroll',
  social_security: 'reconciled_with_social_security',
  tax: 'reconciled_with_tax',
};

interface Props {
  documentId: string;
  documentType: string;
  currentFlags: {
    reconciled_with_payroll: boolean;
    reconciled_with_social_security: boolean;
    reconciled_with_tax: boolean;
    reconciliation_notes: string | null;
  };
  onUpdated?: () => void;
  className?: string;
}

export function DocReconciliationToggle({ documentId, documentType, currentFlags, onUpdated, className }: Props) {
  if (!isReconcilableDocType(documentType)) return null;

  const channels = getApplicableChannels(documentType);
  if (channels.length === 0) return null;

  const [flags, setFlags] = useState(currentFlags);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(currentFlags.reconciliation_notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleToggle = useCallback(async (channel: ReconciliationChannel, checked: boolean) => {
    const col = CHANNEL_COLUMNS[channel];
    const newFlags = { ...flags, [col]: checked };
    setFlags(newFlags);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('erp_hr_employee_documents')
        .update({
          [col]: checked,
          reconciled_at: new Date().toISOString(),
        } as any)
        .eq('id', documentId);

      if (error) throw error;
      onUpdated?.();
    } catch {
      // Revert
      setFlags(flags);
      toast.error('Error al actualizar conciliación');
    } finally {
      setSaving(false);
    }
  }, [flags, documentId, onUpdated]);

  const handleSaveNotes = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('erp_hr_employee_documents')
        .update({ reconciliation_notes: notes || null } as any)
        .eq('id', documentId);
      if (error) throw error;
      toast.success('Nota guardada');
      onUpdated?.();
    } catch {
      toast.error('Error al guardar nota');
    } finally {
      setSaving(false);
    }
  }, [notes, documentId, onUpdated]);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-3">
        {channels.map(ch => {
          const col = CHANNEL_COLUMNS[ch] as keyof typeof flags;
          return (
            <label key={ch} className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
              <Checkbox
                checked={!!flags[col]}
                onCheckedChange={(checked) => handleToggle(ch, !!checked)}
                disabled={saving}
                className="h-3 w-3"
              />
              {CHANNEL_LABELS[ch]}
            </label>
          );
        })}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          {showNotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
      {showNotes && (
        <div className="flex gap-1">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas de conciliación..."
            className="text-[10px] h-12 min-h-0 resize-none"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 shrink-0 self-end"
            onClick={handleSaveNotes}
            disabled={saving}
          >
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
}
