/**
 * Email Sequence Form Dialog - Create/Edit Email Sequences
 */

import React from 'react';
import { useForm } from 'react-hook-form';
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
import { EmailSequence } from '@/hooks/crm/marketing';
import { Zap, FormInput, Tag, GitBranch, UserPlus, Hand, Calendar } from 'lucide-react';

const sequenceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  trigger_type: z.enum(['form_submit', 'tag_added', 'deal_stage', 'contact_created', 'manual', 'date_based']),
  trigger_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().default(false),
});

type SequenceFormData = z.infer<typeof sequenceSchema>;

interface EmailSequenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequence: EmailSequence | null;
  onSubmit: (data: Partial<EmailSequence>) => Promise<void>;
}

const triggerOptions = [
  { value: 'form_submit', label: 'Formulario enviado', icon: FormInput },
  { value: 'tag_added', label: 'Tag añadido', icon: Tag },
  { value: 'deal_stage', label: 'Cambio etapa deal', icon: GitBranch },
  { value: 'contact_created', label: 'Contacto creado', icon: UserPlus },
  { value: 'manual', label: 'Inscripción manual', icon: Hand },
  { value: 'date_based', label: 'Fecha programada', icon: Calendar },
];

export function EmailSequenceFormDialog({
  open,
  onOpenChange,
  sequence,
  onSubmit,
}: EmailSequenceFormDialogProps) {
  const form = useForm<SequenceFormData>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      name: sequence?.name || '',
      trigger_type: sequence?.trigger_type || 'manual',
      trigger_config: sequence?.trigger_config || {},
      is_active: sequence?.is_active || false,
    },
  });

  React.useEffect(() => {
    if (sequence) {
      form.reset({
        name: sequence.name,
        trigger_type: sequence.trigger_type,
        trigger_config: sequence.trigger_config || {},
        is_active: sequence.is_active,
      });
    } else {
      form.reset({
        name: '',
        trigger_type: 'manual',
        trigger_config: {},
        is_active: false,
      });
    }
  }, [sequence, form]);

  const handleSubmit = async (data: SequenceFormData) => {
    await onSubmit({
      name: data.name,
      trigger_type: data.trigger_type,
      trigger_config: data.trigger_config || {},
      is_active: data.is_active,
      steps: sequence?.steps || [],
    });
  };

  const selectedTrigger = form.watch('trigger_type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {sequence ? 'Editar Secuencia' : 'Nueva Secuencia'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la secuencia</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Onboarding nuevos clientes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger de activación</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el trigger" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {triggerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Define qué evento inicia automáticamente la secuencia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Secuencia activa</FormLabel>
                    <FormDescription>
                      Activa para inscribir automáticamente contactos
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {sequence ? 'Guardar cambios' : 'Crear secuencia'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default EmailSequenceFormDialog;
