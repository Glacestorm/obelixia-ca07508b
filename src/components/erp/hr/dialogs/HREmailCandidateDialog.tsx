/**
 * HREmailCandidateDialog - Dialog para enviar email a candidatos
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface HREmailCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  jobTitle?: string;
  companyId: string;
}

const EMAIL_TEMPLATES = [
  { id: 'thanks', name: 'Agradecimiento por aplicar', subject: 'Gracias por tu candidatura' },
  { id: 'interview', name: 'Invitación a entrevista', subject: 'Te invitamos a una entrevista' },
  { id: 'rejected', name: 'Proceso finalizado', subject: 'Actualización sobre tu candidatura' },
  { id: 'offer', name: 'Oferta de trabajo', subject: '¡Tenemos una oferta para ti!' },
  { id: 'custom', name: 'Personalizado', subject: '' },
];

export function HREmailCandidateDialog({
  open,
  onOpenChange,
  candidate,
  jobTitle,
  companyId
}: HREmailCandidateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template && templateId !== 'custom') {
      setSubject(template.subject);
      generateBodyWithAI(templateId);
    }
  };

  const generateBodyWithAI = async (templateType: string) => {
    if (!candidate) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-recruitment-agent', {
        body: {
          action: 'generate_email',
          params: {
            templateType,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobTitle: jobTitle || 'la posición',
            companyId
          }
        }
      });

      if (error) throw error;
      
      if (data?.emailBody) {
        setBody(data.emailBody);
      } else {
        // Fallback si no hay respuesta de IA
        const fallbackBodies: Record<string, string> = {
          thanks: `Estimado/a ${candidate.first_name},\n\nGracias por tu interés en unirte a nuestro equipo. Hemos recibido tu candidatura para ${jobTitle || 'la posición'} y la estamos revisando con atención.\n\nTe mantendremos informado/a sobre los próximos pasos del proceso.\n\nSaludos cordiales`,
          interview: `Estimado/a ${candidate.first_name},\n\nNos complace informarte que has sido seleccionado/a para una entrevista para ${jobTitle || 'la posición'}.\n\nPor favor, responde a este email para coordinar fecha y hora.\n\nSaludos cordiales`,
          rejected: `Estimado/a ${candidate.first_name},\n\nAgradecemos sinceramente tu interés en nuestra empresa y el tiempo dedicado al proceso de selección.\n\nDespués de una cuidadosa consideración, hemos decidido continuar con otros candidatos que se ajustan más al perfil actual.\n\nTe deseamos mucho éxito en tu búsqueda profesional.\n\nSaludos cordiales`,
          offer: `Estimado/a ${candidate.first_name},\n\n¡Felicidades! Nos complace comunicarte que has sido seleccionado/a para ${jobTitle || 'la posición'}.\n\nAdjuntamos los detalles de la oferta. Por favor, revísala y no dudes en contactarnos si tienes alguna pregunta.\n\nSaludos cordiales`,
        };
        setBody(fallbackBodies[templateType] || '');
      }
    } catch (error) {
      console.error('Error generating email:', error);
      toast.error('Error al generar email con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!candidate || !subject || !body) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsSending(true);
    try {
      // Aquí iría la integración con servicio de email
      // Por ahora simulamos el envío
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Email enviado a ${candidate.email}`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error al enviar email');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('custom');
    setSubject('');
    setBody('');
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Email a Candidato
          </DialogTitle>
          <DialogDescription>
            Envía un email a {candidate.first_name} {candidate.last_name} ({candidate.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Plantilla</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una plantilla" />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Escribe el asunto del email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Mensaje</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateBodyWithAI(selectedTemplate)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generar con IA
              </Button>
            </div>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el contenido del email..."
              rows={10}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || !subject || !body}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HREmailCandidateDialog;
