/**
 * Audience Segment Form Dialog - Create/Edit Segments
 */

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AudienceSegment, SegmentCondition, SEGMENT_FIELDS } from '@/hooks/crm/marketing';
import { Target, Plus, Trash2 } from 'lucide-react';

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.string(),
});

const segmentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  filter_type: z.enum(['dynamic', 'static']).default('dynamic'),
  conditions: z.array(conditionSchema),
});

type SegmentFormData = z.infer<typeof segmentSchema>;

interface AudienceSegmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: AudienceSegment | null;
  onSubmit: (data: Partial<AudienceSegment>) => Promise<void>;
}

const operators = [
  { value: 'equals', label: 'Es igual a' },
  { value: 'not_equals', label: 'No es igual a' },
  { value: 'contains', label: 'Contiene' },
  { value: 'not_contains', label: 'No contiene' },
  { value: 'greater', label: 'Mayor que' },
  { value: 'less', label: 'Menor que' },
  { value: 'is_empty', label: 'Está vacío' },
  { value: 'is_not_empty', label: 'No está vacío' },
];

export function AudienceSegmentFormDialog({
  open,
  onOpenChange,
  segment,
}: AudienceSegmentFormDialogProps) {
  const form = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: segment?.name || '',
      description: segment?.description || '',
      filter_type: segment?.filter_type ?? 'dynamic',
      conditions: segment?.conditions?.map(c => ({
        field: c.field,
        operator: c.operator,
        value: String(c.value),
      })) || [{ field: '', operator: 'equals', value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  React.useEffect(() => {
    if (segment) {
      form.reset({
        name: segment.name,
        description: segment.description || '',
        filter_type: segment.filter_type,
        conditions: segment.conditions?.map(c => ({
          field: c.field,
          operator: c.operator,
          value: String(c.value),
        })) || [{ field: '', operator: 'equals', value: '' }],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        filter_type: 'dynamic',
        conditions: [{ field: '', operator: 'equals', value: '' }],
      });
    }
  }, [segment, form]);

  const handleSubmit = async (data: SegmentFormData) => {
    const validConditions: SegmentCondition[] = data.conditions
      .filter(c => c.field && c.operator)
      .map(c => ({
        field: c.field,
        operator: c.operator as SegmentCondition['operator'],
        value: c.value,
      }));

    // Note: onSubmit is handled by parent component
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {segment ? 'Editar Segmento' : 'Nuevo Segmento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del segmento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Clientes VIP últimos 90 días" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe el propósito de este segmento..."
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="filter_type"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Segmento dinámico</FormLabel>
                    <FormDescription>
                      Se actualiza automáticamente cuando cambian los datos
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 'dynamic'}
                      onCheckedChange={(checked) => field.onChange(checked ? 'dynamic' : 'static')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Conditions */}
            <div className="space-y-3">
              <FormLabel>Condiciones de segmentación</FormLabel>
              <FormDescription>
                Los contactos deben cumplir TODAS las condiciones
              </FormDescription>
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.field`}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEGMENT_FIELDS.map((f) => (
                            <SelectItem key={f.field} value={f.field}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`conditions.${index}.operator`}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Operador" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`conditions.${index}.value`}
                    render={({ field }) => (
                      <Input 
                        placeholder="Valor"
                        className="flex-1"
                        {...field} 
                      />
                    )}
                  />

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ field: '', operator: 'equals', value: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir condición
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {segment ? 'Guardar cambios' : 'Crear segmento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AudienceSegmentFormDialog;
