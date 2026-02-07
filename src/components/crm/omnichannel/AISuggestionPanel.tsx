import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sparkles, Loader2, ThumbsUp, ThumbsDown, 
  Copy, RefreshCw, Wand2, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AISuggestionPanelProps {
  conversationId?: string;
  isVisible: boolean;
  onSuggest: () => Promise<string | null>;
  onApplySuggestion: (suggestion: string) => void;
  onClose: () => void;
  className?: string;
}

export function AISuggestionPanel({
  conversationId,
  isVisible,
  onSuggest,
  onApplySuggestion,
  onClose,
  className,
}: AISuggestionPanelProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleGenerateSuggestion = useCallback(async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setSuggestion(null);
    setFeedback(null);
    setIsEditing(false);

    try {
      const result = await onSuggest();
      if (result) {
        setSuggestion(result);
        setEditedSuggestion(result);
      } else {
        toast.error('No se pudo generar sugerencia');
      }
    } catch (err) {
      console.error('Error generating suggestion:', err);
      toast.error('Error al generar sugerencia');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, onSuggest]);

  const handleApply = useCallback(() => {
    const textToApply = isEditing ? editedSuggestion : suggestion;
    if (textToApply) {
      onApplySuggestion(textToApply);
      onClose();
      toast.success('Sugerencia aplicada');
    }
  }, [isEditing, editedSuggestion, suggestion, onApplySuggestion, onClose]);

  const handleCopy = useCallback(() => {
    const textToCopy = isEditing ? editedSuggestion : suggestion;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      toast.success('Copiado al portapapeles');
    }
  }, [isEditing, editedSuggestion, suggestion]);

  const handleFeedback = useCallback((type: 'positive' | 'negative') => {
    setFeedback(type);
    toast.success(type === 'positive' ? '¡Gracias por tu feedback!' : 'Gracias, mejoraremos las sugerencias');
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn("absolute bottom-full left-0 right-0 mb-2 z-10", className)}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg">
          <CardContent className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">Asistente IA</span>
                <Badge variant="secondary" className="text-[10px]">Beta</Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={onClose}
              >
                ×
              </Button>
            </div>

            {/* Content */}
            {!suggestion && !isLoading && (
              <div className="text-center py-4">
                <Wand2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-3">
                  Genera una respuesta sugerida basada en el contexto de la conversación
                </p>
                <Button 
                  onClick={handleGenerateSuggestion}
                  className="gap-2"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Generar sugerencia
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Analizando conversación...</span>
              </div>
            )}

            {suggestion && !isLoading && (
              <div className="space-y-3">
                {isEditing ? (
                  <Textarea
                    value={editedSuggestion}
                    onChange={(e) => setEditedSuggestion(e.target.value)}
                    className="min-h-[100px] text-sm"
                    placeholder="Edita la sugerencia..."
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-background border text-sm">
                    <p className="whitespace-pre-wrap">{suggestion}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={feedback === 'positive' ? 'default' : 'ghost'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleFeedback('positive')}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Buena sugerencia</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={feedback === 'negative' ? 'destructive' : 'ghost'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleFeedback('negative')}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mala sugerencia</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="h-4 w-px bg-border mx-1" />

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCopy}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleGenerateSuggestion}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'Vista previa' : 'Editar'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApply}
                      className="gap-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Usar respuesta
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export default AISuggestionPanel;
