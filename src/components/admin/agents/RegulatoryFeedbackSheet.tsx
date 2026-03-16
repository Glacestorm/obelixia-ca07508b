/**
 * RegulatoryFeedbackSheet - Human feedback panel with domain-based permissions
 */

import { useState, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle,
  AlertTriangle, Shield, Scale, Users, Building2, Lock
} from 'lucide-react';
import { useRegulatoryFeedback } from '@/hooks/admin/useRegulatoryFeedback';
import type { RegulatoryDocument } from '@/hooks/admin/useRegulatoryIntelligence';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RegulatoryFeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: RegulatoryDocument | null;
}

const REVIEWABLE_FIELDS = [
  { key: 'summary', label: 'Resumen', description: 'Calidad del resumen ejecutivo generado', domain: 'general' },
  { key: 'impact_level', label: 'Nivel de impacto', description: 'Severidad asignada (critical/high/medium/low)', domain: 'general' },
  { key: 'impact_domains', label: 'Dominios impactados', description: 'Áreas afectadas (RRHH, Legal, Compliance, Fiscal)', domain: 'general' },
  { key: 'impact_summary', label: 'Resumen de impacto', description: 'Descripción del impacto operativo', domain: 'general' },
  { key: 'classification', label: 'Clasificación', description: 'Tipo documental, ámbito territorial, área legal', domain: 'legal' },
] as const;

const DOMAIN_ICONS: Record<string, typeof Users> = {
  hr: Users, legal: Scale, compliance: Shield, fiscal: Building2,
};

export function RegulatoryFeedbackSheet({ open, onOpenChange, document }: RegulatoryFeedbackSheetProps) {
  const { feedbacks, stats, loading, fetchFeedback, submitFeedback, canReviewField, getAllowedDomains } = useRegulatoryFeedback();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const allowedDomains = getAllowedDomains();

  useEffect(() => {
    if (open && document) {
      fetchFeedback(document.id);
      setSelectedField(null);
      setComment('');
      setCorrectedValue('');
    }
  }, [open, document?.id, fetchFeedback]);

  const handleSubmit = useCallback(async (field: string, accepted: boolean) => {
    if (!document) return;
    setSubmitting(true);

    const originalValue = field === 'summary' ? document.summary
      : field === 'impact_level' ? document.impact_level
      : field === 'impact_domains' ? document.impact_domains?.join(', ')
      : field === 'impact_summary' ? document.impact_summary
      : field === 'classification' ? `${document.document_type} / ${document.territorial_scope} / ${document.legal_area}`
      : '';

    await submitFeedback({
      document_id: document.id,
      feedback_type: accepted ? 'validation' : 'correction',
      field_reviewed: field,
      original_value: originalValue || undefined,
      corrected_value: correctedValue || undefined,
      accepted,
      comment: comment || undefined,
    });

    setComment('');
    setCorrectedValue('');
    setSelectedField(null);
    setSubmitting(false);
  }, [document, comment, correctedValue, submitFeedback]);

  if (!document) return null;

  const docFeedbacks = feedbacks.filter(f => f.document_id === document.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Revisión humana
          </SheetTitle>
          <SheetDescription className="text-xs line-clamp-2">
            {document.document_title}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-2">
          <div className="space-y-4">
            {/* Domain permissions indicator */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Tus dominios:</span>
              {allowedDomains.map(d => (
                <Badge key={d} variant="outline" className="text-[9px] bg-primary/5">
                  {d === 'hr' ? 'RRHH' : d === 'legal' ? 'Jurídico' : d === 'compliance' ? 'Compliance' : d === 'fiscal' ? 'Fiscal' : 'General'}
                </Badge>
              ))}
            </div>

            {/* Document summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{document.jurisdiction_code}</Badge>
                  <Badge variant="outline" className="text-[10px]">{document.impact_level}</Badge>
                  <Badge variant="outline" className="text-[10px]">{document.data_source}</Badge>
                  {document.requires_human_review && (
                    <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600">Requiere revisión</Badge>
                  )}
                </div>
                {document.summary && (
                  <p className="text-xs text-muted-foreground">{document.summary}</p>
                )}
                {document.impact_summary && (
                  <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[11px]">
                      <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
                      {document.impact_summary}
                    </p>
                  </div>
                )}
                <div className="flex gap-1 flex-wrap">
                  {document.impact_domains?.map(d => {
                    const Icon = DOMAIN_ICONS[d] || Shield;
                    return (
                      <Badge key={d} variant="secondary" className="text-[9px] gap-0.5">
                        <Icon className="h-2.5 w-2.5" /> {d}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Reviewable fields */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Campos a validar</h4>
              {REVIEWABLE_FIELDS.map(field => {
                const fieldFeedbacks = docFeedbacks.filter(f => f.field_reviewed === field.key);
                const isSelected = selectedField === field.key;
                const hasAccepted = fieldFeedbacks.some(f => f.accepted === true);
                const hasRejected = fieldFeedbacks.some(f => f.accepted === false);
                const canReview = canReviewField(field.key, document.impact_domains);

                return (
                  <Card key={field.key} className={cn(
                    "transition-all",
                    !canReview && "opacity-50",
                    canReview && "cursor-pointer",
                    isSelected && "ring-2 ring-primary",
                    hasAccepted && "border-emerald-500/30 bg-emerald-500/5",
                    hasRejected && "border-destructive/30 bg-destructive/5"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1" onClick={() => canReview && setSelectedField(isSelected ? null : field.key)}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{field.label}</span>
                            {!canReview && <Lock className="h-3 w-3 text-muted-foreground" />}
                            {hasAccepted && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                            {hasRejected && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{field.description}</p>
                          {!canReview && (
                            <p className="text-[9px] text-muted-foreground/70 italic mt-0.5">Sin permiso para este dominio</p>
                          )}
                        </div>
                        {canReview && !isSelected && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleSubmit(field.key, true); }}
                              disabled={submitting}>
                              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); setSelectedField(field.key); }}
                              disabled={submitting}>
                              <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Expanded correction form */}
                      {isSelected && canReview && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <div>
                            <Label className="text-[11px]">Valor correcto (opcional)</Label>
                            <Textarea
                              value={correctedValue}
                              onChange={(e) => setCorrectedValue(e.target.value)}
                              placeholder="Indica el valor correcto..."
                              className="mt-1 text-xs min-h-[60px]"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Comentario (opcional)</Label>
                            <Textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Añade contexto sobre la corrección..."
                              className="mt-1 text-xs min-h-[50px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="text-xs flex-1"
                              variant="default"
                              onClick={() => handleSubmit(field.key, true)}
                              disabled={submitting}>
                              <ThumbsUp className="h-3 w-3 mr-1" /> Correcto
                            </Button>
                            <Button size="sm" className="text-xs flex-1"
                              variant="destructive"
                              onClick={() => handleSubmit(field.key, false)}
                              disabled={submitting}>
                              <ThumbsDown className="h-3 w-3 mr-1" /> Incorrecto
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs"
                              onClick={() => setSelectedField(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Previous feedback */}
                      {fieldFeedbacks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {fieldFeedbacks.slice(0, 2).map(fb => (
                            <div key={fb.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {fb.accepted ? (
                                <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-2.5 w-2.5 text-destructive" />
                              )}
                              <span>{fb.accepted ? 'Validado' : 'Corregido'}</span>
                              {fb.reviewer_domain && (
                                <Badge variant="outline" className="text-[8px] py-0 h-3.5">{fb.reviewer_domain}</Badge>
                              )}
                              {fb.comment && <span className="truncate max-w-[150px]">· {fb.comment}</span>}
                              <span className="ml-auto shrink-0">
                                {formatDistanceToNow(new Date(fb.created_at), { locale: es, addSuffix: true })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Feedback stats */}
            {docFeedbacks.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Resumen de feedback</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="p-2 text-center">
                      <p className="text-lg font-bold text-emerald-600">{docFeedbacks.filter(f => f.accepted).length}</p>
                      <p className="text-[9px] text-muted-foreground">Validados</p>
                    </Card>
                    <Card className="p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{docFeedbacks.filter(f => f.accepted === false).length}</p>
                      <p className="text-[9px] text-muted-foreground">Corregidos</p>
                    </Card>
                    <Card className="p-2 text-center">
                      <p className="text-lg font-bold">{docFeedbacks.length}</p>
                      <p className="text-[9px] text-muted-foreground">Total</p>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default RegulatoryFeedbackSheet;
