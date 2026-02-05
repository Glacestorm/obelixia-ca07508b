/**
 * Email Template Form Dialog - Create/Edit Email Templates
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
import { Textarea } from '@/components/ui/textarea';
import { EmailTemplate, DEFAULT_VARIABLES } from '@/hooks/crm/marketing';
import { Mail, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const templateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  subject: z.string().min(1, 'El asunto es requerido'),
  category: z.enum(['newsletter', 'promotional', 'transactional', 'nurturing', 'notification']).nullable(),
  html_content: z.string().optional(),
  plain_content: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EmailTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSubmit: (data: Partial<EmailTemplate>) => Promise<void>;
}

const categories = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promotional', label: 'Promocional' },
  { value: 'transactional', label: 'Transaccional' },
  { value: 'nurturing', label: 'Nurturing' },
  { value: 'notification', label: 'Notificación' },
];

export function EmailTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: EmailTemplateFormDialogProps) {
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      subject: template?.subject || '',
      category: template?.category || null,
      html_content: template?.html_content || '',
      plain_content: template?.plain_content || '',
    },
  });

  React.useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject || '',
        category: template.category,
        html_content: template.html_content || '',
        plain_content: template.plain_content || '',
      });
    } else {
      form.reset({
        name: '',
        subject: '',
        category: null,
        html_content: getDefaultTemplate(),
        plain_content: '',
      });
    }
  }, [template, form]);

  const handleSubmit = async (data: TemplateFormData) => {
    // Extract variables from content
    const variableMatches = (data.html_content || '').match(/\{\{(\w+)\}\}/g) || [];
    const variableNames = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))];

    const variables = variableNames.map(name => {
      const existing = DEFAULT_VARIABLES.find(v => v.name === name);
      return {
        name,
        default: existing?.default || '',
        description: existing?.description,
      };
    });

    await onSubmit({
      name: data.name,
      subject: data.subject,
      category: data.category,
      html_content: data.html_content,
      plain_content: data.plain_content,
      variables,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {template ? 'Editar Template' : 'Nuevo Template'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del template</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Email de bienvenida" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto del email</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: ¡Bienvenido a {{company}}!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Variables helper */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Variables disponibles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_VARIABLES.map((variable) => (
                  <Badge 
                    key={variable.name} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      const currentContent = form.getValues('html_content') || '';
                      form.setValue('html_content', currentContent + `{{${variable.name}}}`);
                    }}
                  >
                    {`{{${variable.name}}}`}
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="html_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido HTML</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="<html>...</html>"
                      className="font-mono text-sm min-h-[200px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Usa {"{{variable}}"} para insertar variables dinámicas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plain_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido texto plano (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Versión de texto plano del email..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {template ? 'Guardar cambios' : 'Crear template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Hola {{first_name}},</h1>
    <p>Tu contenido aquí...</p>
    <p>Saludos,<br>{{company}}</p>
  </div>
</body>
</html>`;
}

export default EmailTemplateFormDialog;
