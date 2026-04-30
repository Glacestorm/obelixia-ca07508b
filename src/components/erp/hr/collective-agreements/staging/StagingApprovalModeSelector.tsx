import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type StagingApprovalModeValue =
  | 'ocr_single_human_approval'
  | 'ocr_dual_human_approval'
  | 'manual_upload_single_approval'
  | 'manual_upload_dual_approval';

export interface StagingApprovalModeSelectorProps {
  value: StagingApprovalModeValue;
  onChange: (v: StagingApprovalModeValue) => void;
  source: 'ocr' | 'manual';
  disabled?: boolean;
}

export function StagingApprovalModeSelector({
  value,
  onChange,
  source,
  disabled,
}: StagingApprovalModeSelectorProps) {
  const options: { value: StagingApprovalModeValue; label: string }[] =
    source === 'ocr'
      ? [
          { value: 'ocr_single_human_approval', label: 'OCR · aprobación humana única' },
          { value: 'ocr_dual_human_approval', label: 'OCR · doble aprobación humana' },
        ]
      : [
          { value: 'manual_upload_single_approval', label: 'Manual · aprobación única' },
          { value: 'manual_upload_dual_approval', label: 'Manual · doble aprobación' },
        ];

  return (
    <div className="space-y-1">
      <Label className="text-xs">Modo de aprobación</Label>
      <Select value={value} onValueChange={(v) => onChange(v as StagingApprovalModeValue)} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default StagingApprovalModeSelector;