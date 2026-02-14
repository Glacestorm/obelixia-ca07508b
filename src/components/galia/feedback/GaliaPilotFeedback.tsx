/**
 * GaliaPilotFeedback - Sistema de feedback para usuarios piloto
 * Punto 3.6 del Proyecto V4: Evaluación y retroalimentación del piloto
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Star, Send, MessageSquare, BarChart3, TrendingUp,
  ThumbsUp, AlertCircle, Lightbulb, Bug, Gauge, Sparkles,
} from 'lucide-react';
import { useGaliaPilotFeedback } from '@/hooks/galia/useGaliaPilotFeedback';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'bug', label: 'Error/Bug', icon: <Bug className="h-4 w-4" />, color: 'text-red-500' },
  { value: 'mejora', label: 'Mejora', icon: <Lightbulb className="h-4 w-4" />, color: 'text-amber-500' },
  { value: 'consulta', label: 'Consulta', icon: <MessageSquare className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'usabilidad', label: 'Usabilidad', icon: <Gauge className="h-4 w-4" />, color: 'text-purple-500' },
  { value: 'rendimiento', label: 'Rendimiento', icon: <TrendingUp className="h-4 w-4" />, color: 'text-green-500' },
];

const AREAS = [
  { value: 'asistente', label: 'Asistente IA' },
  { value: 'panel', label: 'Panel/Dashboard' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'circuito', label: 'Circuito LEADER' },
  { value: 'toolkit', label: 'Toolkit Técnico' },
  { value: 'otro', label: 'Otro' },
];

export function GaliaPilotFeedback() {
  const { feedback, loading, stats, submitFeedback } = useGaliaPilotFeedback();

  const [activeTab, setActiveTab] = useState('enviar');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [comment, setComment] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !category || !area) return;
    setSubmitting(true);
    const ok = await submitFeedback({
      rating,
      category,
      area,
      comment: comment || undefined,
      nps_score: npsScore ?? undefined,
    });
    if (ok) {
      setRating(0);
      setCategory('');
      setArea('');
      setComment('');
      setNpsScore(null);
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.totalFeedback}</p>
            <p className="text-xs text-muted-foreground">Total feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{stats.avgRating}/5</p>
            <p className="text-xs text-muted-foreground">Valoración media</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ThumbsUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{stats.satisfactionRate}%</p>
            <p className="text-xs text-muted-foreground">Satisfacción</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Sparkles className="h-5 w-5 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold">{stats.avgNPS}/10</p>
            <p className="text-xs text-muted-foreground">NPS medio</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enviar"><Send className="h-4 w-4 mr-1" /> Enviar Feedback</TabsTrigger>
          <TabsTrigger value="historial"><BarChart3 className="h-4 w-4 mr-1" /> Historial</TabsTrigger>
        </TabsList>

        {/* Formulario */}
        <TabsContent value="enviar" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tu opinión nos ayuda a mejorar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Rating */}
              <div>
                <label className="text-sm font-medium mb-2 block">Valoración general *</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => setRating(v)}
                      onMouseEnter={() => setHoverRating(v)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star className={cn(
                        "h-8 w-8 transition-colors",
                        (hoverRating || rating) >= v ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      )} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de feedback *</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <Button
                      key={cat.value}
                      variant={category === cat.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategory(cat.value)}
                      className="gap-1"
                    >
                      {cat.icon} {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Area */}
              <div>
                <label className="text-sm font-medium mb-2 block">Área afectada *</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map(a => (
                    <Button
                      key={a.value}
                      variant={area === a.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setArea(a.value)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium mb-2 block">Comentarios</label>
                <Textarea
                  placeholder="Describe tu experiencia, sugerencia o problema encontrado..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                />
              </div>

              {/* NPS */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  ¿Recomendarías esta herramienta? (0-10)
                </label>
                <div className="flex gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setNpsScore(i)}
                      className={cn(
                        "w-8 h-8 rounded-md text-xs font-medium border transition-all",
                        npsScore === i
                          ? i >= 9 ? "bg-green-600 text-white border-green-600"
                          : i >= 7 ? "bg-amber-500 text-white border-amber-500"
                          : "bg-red-500 text-white border-red-500"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  0 = Nada probable · 10 = Muy probable
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!rating || !category || !area || submitting}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" /> Enviar Feedback
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial" className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {feedback.map(fb => {
                const catInfo = CATEGORIES.find(c => c.value === fb.category);
                return (
                  <Card key={fb.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(v => (
                              <Star key={v} className={cn("h-3 w-3", v <= fb.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                            ))}
                          </div>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            {catInfo?.icon} {catInfo?.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">{fb.area}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(fb.created_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                      {fb.comment && <p className="text-sm text-muted-foreground">{fb.comment}</p>}
                      {fb.nps_score != null && (
                        <p className="text-xs mt-1">
                          NPS: <span className="font-semibold">{fb.nps_score}/10</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {feedback.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No hay feedback registrado aún</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaPilotFeedback;
