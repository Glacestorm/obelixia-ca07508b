/**
 * Campaign Form Dialog - Create/Edit Marketing Campaigns
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
import { MarketingCampaign } from '@/hooks/crm/marketing';
import { Mail, MessageSquare, Share2, TrendingUp, Globe } from 'lucide-react';

const campaignSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['email', 'sms', 'multichannel', 'social', 'ads']),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: MarketingCampaign | null;
  onSubmit: (data: Partial<MarketingCampaign>) => Promise<void>;
}

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  onSubmit,
}: CampaignFormDialogProps) {
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: campaign?.name || '',
      type: campaign?.type || 'email',
      description: campaign?.description || '',
      start_date: campaign?.start_date?.split('T')[0] || '',
      end_date: campaign?.end_date?.split('T')[0] || '',
      budget: campaign?.budget || undefined,
    },
  });

  React.useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        type: campaign.type,
        description: campaign.description || '',
        start_date: campaign.start_date?.split('T')[0] || '',
        end_date: campaign.end_date?.split('T')[0] || '',
        budget: campaign.budget || undefined,
      });
    } else {
      form.reset({
        name: '',
        type: 'email',
        description: '',
        start_date: '',
        end_date: '',
        budget: undefined,
      });
    }
  }, [campaign, form]);

  const handleSubmit = async (data: CampaignFormData) => {
    await onSubmit({
      name: data.name,
      type: data.type,
      description: data.description,
      start_date: data.start_date ? `${data.start_date}T00:00:00Z` : undefined,
      end_date: data.end_date ? `${data.end_date}T00:00:00Z` : undefined,
      budget: data.budget,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {campaign ? 'Editar Campaña' : 'Nueva Campaña'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la campaña</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Campaña de Navidad 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de campaña</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          SMS
                        </div>
                      </SelectItem>
                      <SelectItem value="multichannel">
                        <div className="flex items-center gap-2">
                          <Share2 className="h-4 w-4" />
                          Multicanal
                        </div>
                      </SelectItem>
                      <SelectItem value="social">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Redes Sociales
                        </div>
                      </SelectItem>
                      <SelectItem value="ads">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Publicidad
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Presupuesto (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                {campaign ? 'Guardar cambios' : 'Crear campaña'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CampaignFormDialog;
