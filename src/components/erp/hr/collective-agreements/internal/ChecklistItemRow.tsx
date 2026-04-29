import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ChecklistItemStatus =
  | 'pending'
  | 'verified'
  | 'accepted_with_caveat'
  | 'rejected'
  | 'not_applicable';

export interface ChecklistItemRowProps {
  itemKey: string;
  initialStatus?: ChecklistItemStatus;
  initialComment?: string;
  initialEvidenceUrl?: string;
  initialEvidenceExcerpt?: string;
  disabled?: boolean;
  onSave: (data: {
    itemKey: string;
    itemStatus: ChecklistItemStatus;
    comment?: string;
    evidenceUrl?: string;
    evidenceExcerpt?: string;
  }) => Promise<void> | void;
}

const ITEM_LABELS: Record<string, string> = {
  official_source_verified: 'Fuente oficial verificada',
  sha256_reviewed: 'SHA-256 revisado',
  publication_date_reviewed: 'Fecha de publicación revisada',
  effective_period_reviewed: 'Vigencia revisada',
  territorial_scope_reviewed: 'Ámbito territorial revisado',
  functional_scope_reviewed: 'Ámbito funcional revisado',
  cnae_codes_reviewed: 'CNAEs revisados',
  professional_groups_reviewed: 'Grupos profesionales revisados',
  categories_reviewed: 'Categorías revisadas',
  salary_base_reviewed: 'Base salarial revisada',
  pluses_reviewed: 'Pluses revisados',
  working_hours_reviewed: 'Jornada revisada',
  extra_payments_reviewed: 'Pagas extra revisadas',
  seniority_reviewed_or_pending: 'Antigüedad revisada o pendiente',
  it_complement_reviewed_or_pending: 'Complemento IT revisado o pendiente',
  parser_warnings_reviewed: 'Warnings del parser revisados',
  discarded_rows_reviewed: 'Filas descartadas revisadas',
  no_payroll_use_acknowledged: 'No-uso en nómina reconocido',
};

export function ChecklistItemRow(props: ChecklistItemRowProps) {
  const [status, setStatus] = useState<ChecklistItemStatus>(props.initialStatus ?? 'pending');
  const [comment, setComment] = useState(props.initialComment ?? '');
  const [evidenceUrl, setEvidenceUrl] = useState(props.initialEvidenceUrl ?? '');
  const [evidenceExcerpt, setEvidenceExcerpt] = useState(props.initialEvidenceExcerpt ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(props.initialStatus ?? 'pending');
    setComment(props.initialComment ?? '');
    setEvidenceUrl(props.initialEvidenceUrl ?? '');
    setEvidenceExcerpt(props.initialEvidenceExcerpt ?? '');
  }, [
    props.initialStatus,
    props.initialComment,
    props.initialEvidenceUrl,
    props.initialEvidenceExcerpt,
  ]);

  const caveatNeedsComment = status === 'accepted_with_caveat' && comment.trim().length === 0;
  const saveDisabled = props.disabled || saving || caveatNeedsComment;

  return (
    <div className="rounded-md border p-3 space-y-2" data-item-key={props.itemKey}>
      <div className="flex items-start justify-between gap-2">
        <Label className="text-sm font-medium">{ITEM_LABELS[props.itemKey] ?? props.itemKey}</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ChecklistItemStatus)}
          disabled={props.disabled}
        >
          <SelectTrigger className="w-56" aria-label={`status-${props.itemKey}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="verified">Verificado</SelectItem>
            <SelectItem value="accepted_with_caveat">Aceptado con reserva</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
            <SelectItem value="not_applicable">No aplica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Textarea
        placeholder={
          status === 'accepted_with_caveat'
            ? 'Comentario (obligatorio para aceptar con reserva)'
            : 'Comentario (opcional)'
        }
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={props.disabled}
        rows={2}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input
          placeholder="URL de evidencia (opcional)"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          disabled={props.disabled}
        />
        <Input
          placeholder="Extracto de evidencia (opcional)"
          value={evidenceExcerpt}
          onChange={(e) => setEvidenceExcerpt(e.target.value)}
          disabled={props.disabled}
        />
      </div>

      {caveatNeedsComment && (
        <p className="text-xs text-destructive">
          El estado &quot;Aceptado con reserva&quot; requiere un comentario.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saveDisabled}
          onClick={async () => {
            setSaving(true);
            try {
              await props.onSave({
                itemKey: props.itemKey,
                itemStatus: status,
                comment: comment.trim() || undefined,
                evidenceUrl: evidenceUrl.trim() || undefined,
                evidenceExcerpt: evidenceExcerpt.trim() || undefined,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

export default ChecklistItemRow;