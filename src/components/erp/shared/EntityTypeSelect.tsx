/**
 * EntityTypeSelect — Selector de tipo de entidad empresarial
 */

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CompanyEntityType,
  ENTITY_TYPE_OPTIONS,
  ENTITY_TYPE_CATEGORIES,
} from '@/types/erp/entityTypes';

interface EntityTypeSelectProps {
  value?: CompanyEntityType;
  onValueChange: (value: CompanyEntityType) => void;
  disabled?: boolean;
}

export function EntityTypeSelect({ value, onValueChange, disabled }: EntityTypeSelectProps) {
  return (
    <Select value={value || ''} onValueChange={(v) => onValueChange(v as CompanyEntityType)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Seleccionar tipo de entidad" />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {ENTITY_TYPE_CATEGORIES.map((category) => {
          const options = ENTITY_TYPE_OPTIONS.filter(o => o.category === category);
          if (options.length === 0) return null;
          return (
            <SelectGroup key={category}>
              <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {category}
              </SelectLabel>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} textValue={opt.label}>
                  <div className="flex items-center gap-2">
                    <span>{opt.label}</span>
                    {opt.multiCnae && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/50 text-primary">
                        Multi-CNAE
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
