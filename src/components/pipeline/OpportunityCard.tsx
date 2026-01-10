import { Opportunity } from '@/hooks/useOpportunities';
import { PipelineStage } from '@/hooks/usePipelineStages';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Calendar, DollarSign, MoreVertical, User, Star, ArrowRight, Trash2, Edit, Eye, Phone, Mail, MessageCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (id: string) => void;
  onView: (opportunity: Opportunity) => void;
  onMoveStage: (id: string, stageId: string) => void;
  isDragging?: boolean;
  stages: PipelineStage[];
}

export function OpportunityCard({ 
  opportunity, 
  onEdit, 
  onDelete, 
  onView,
  onMoveStage,
  isDragging,
  stages 
}: OpportunityCardProps) {
  // Find current stage and next stage dynamically
  const currentStage = stages.find(s => s.id === opportunity.stage_id);
  const sortedStages = [...stages].sort((a, b) => a.order_position - b.order_position);
  const currentIndex = sortedStages.findIndex(s => s.id === opportunity.stage_id);
  const nextStage = currentIndex >= 0 && currentIndex < sortedStages.length - 1 
    ? sortedStages[currentIndex + 1] 
    : null;
  
  // Skip terminal stages for next stage suggestion
  const nonTerminalNextStage = nextStage && !nextStage.is_terminal ? nextStage : null;
  
  // Find terminal stages
  const wonStage = stages.find(s => s.terminal_type === 'won');
  const lostStage = stages.find(s => s.terminal_type === 'lost');
  const isTerminalStage = currentStage?.is_terminal;
  
  // Calculate days since creation or last activity
  const referenceDate = opportunity.last_activity_date || opportunity.updated_at || opportunity.created_at;
  const daysSinceActivity = referenceDate ? differenceInDays(new Date(), new Date(referenceDate)) : 0;
  const isStale = daysSinceActivity >= 7; // More than 7 days without activity

  // Contact info
  const contactPhone = opportunity.contact?.phone;
  const contactEmail = opportunity.contact?.email;
  const contactName = opportunity.contact?.contact_name;
  
  // Owner info  
  const ownerName = opportunity.owner?.full_name;
  const ownerEmail = opportunity.owner?.email;

  // Generate WhatsApp link
  const getWhatsAppLink = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Generate email link
  const getEmailLink = (email: string, subject: string, body: string) => {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Reminder message
  const reminderMessage = `Hola, le contactamos respecto a la oportunidad "${opportunity.title}" de ${opportunity.company?.name || 'su empresa'}. Han transcurrido ${daysSinceActivity} días sin recibir respuesta. ¿Podría indicarnos el estado actual?`;
  const reminderSubject = `Seguimiento: ${opportunity.title}`;

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-200 group cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 rotate-2 scale-105 shadow-lg",
        opportunity.company?.is_vip && "ring-2 ring-amber-400/50",
        isStale && "border-l-4 border-l-warning"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {opportunity.company?.is_vip && (
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
              )}
              <h4 className="font-semibold text-sm truncate">{opportunity.title}</h4>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{opportunity.company?.name || 'Sin empresa'}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(opportunity)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(opportunity)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {nonTerminalNextStage && (
                <DropdownMenuItem onClick={() => onMoveStage(opportunity.id, nonTerminalNextStage.id)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Mover a {nonTerminalNextStage.name}
                </DropdownMenuItem>
              )}
              {!isTerminalStage && wonStage && lostStage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onMoveStage(opportunity.id, wonStage.id)}
                    className="text-green-600"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Marcar como {wonStage.name}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onMoveStage(opportunity.id, lostStage.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Marcar como {lostStage.name}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(opportunity.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Value & Probability */}
        <div className="flex items-center justify-between">
          {opportunity.estimated_value ? (
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <DollarSign className="h-3.5 w-3.5" />
              {new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'EUR',
                notation: 'compact',
                maximumFractionDigits: 1 
              }).format(opportunity.estimated_value)}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin valor</span>
          )}
          
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium",
              opportunity.probability >= 75 && "border-green-500 text-green-600",
              opportunity.probability >= 50 && opportunity.probability < 75 && "border-amber-500 text-amber-600",
              opportunity.probability < 50 && "border-muted-foreground"
            )}
          >
            {opportunity.probability}%
          </Badge>
        </div>

        {/* Contact Info */}
        {(contactName || contactPhone || contactEmail) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">{contactName || 'Sin contacto'}</span>
            
            <TooltipProvider>
              <div className="flex items-center gap-1">
                {contactPhone && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={`tel:${contactPhone}`}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3 text-primary" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Llamar: {contactPhone}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={getWhatsAppLink(contactPhone, reminderMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3 text-green-600" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>WhatsApp: {contactPhone}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                
                {contactEmail && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a 
                        href={getEmailLink(contactEmail, reminderSubject, reminderMessage)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3 text-blue-600" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Email: {contactEmail}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Owner (Gestor) Info */}
        {ownerName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate flex-1">Gestor: {ownerName}</span>
            
            {ownerEmail && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a 
                      href={getEmailLink(ownerEmail, `Recordatorio: ${opportunity.title}`, `Hola ${ownerName},\n\nHan transcurrido ${daysSinceActivity} días sin actividad en la oportunidad "${opportunity.title}".`)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="h-3 w-3 text-primary" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notificar gestor: {ownerEmail}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Stale Warning */}
        {isStale && !isTerminalStage && (
          <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded px-2 py-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{daysSinceActivity} días sin actividad</span>
          </div>
        )}

        {/* Footer - Dates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          {/* Start date (created_at) */}
          {opportunity.created_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Inicio: {format(new Date(opportunity.created_at), 'dd/MM/yy', { locale: es })}</span>
            </div>
          )}
          
          {/* Estimated close date */}
          {opportunity.estimated_close_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(opportunity.estimated_close_date), 'dd MMM', { locale: es })}</span>
            </div>
          )}
        </div>

        {/* Budget link placeholder */}
        {opportunity.budget_id && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <FileText className="h-3 w-3" />
            <span>Presupuesto vinculado</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
