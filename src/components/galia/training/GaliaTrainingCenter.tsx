/**
 * GaliaTrainingCenter - Centro de formación para técnicos GAL
 * Punto 3.5 del Proyecto V4: Formación a los técnicos de los GAL
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  BookOpen, CheckCircle, Clock, Play, Award, TrendingUp,
  AlertTriangle, GraduationCap, FileText, Send,
} from 'lucide-react';
import { useGaliaTraining, TRAINING_MODULES } from '@/hooks/galia/useGaliaTraining';
import { cn } from '@/lib/utils';

export function GaliaTrainingCenter() {
  const {
    progress, needs, loading, stats, modules,
    startModule, updateModuleProgress, submitNeed,
  } = useGaliaTraining();

  const [activeTab, setActiveTab] = useState('modulos');
  const [needArea, setNeedArea] = useState('');
  const [needDesc, setNeedDesc] = useState('');
  const [needPriority, setNeedPriority] = useState('medium');

  const getModuleProgress = useCallback((key: string) => {
    return progress.find(p => p.module_key === key);
  }, [progress]);

  const handleSubmitNeed = async () => {
    if (!needArea.trim() || !needDesc.trim()) return;
    await submitNeed(needArea, needDesc, needPriority);
    setNeedArea('');
    setNeedDesc('');
    setNeedPriority('medium');
  };

  const categoryLabels: Record<string, string> = {
    asistente: 'Asistente IA',
    panel: 'Panel de Control',
    toolkit: 'Toolkit Técnico',
    circuito: 'Circuito LEADER',
    normativa: 'Normativa',
    exportacion: 'Exportación',
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.totalModules}</p>
            <p className="text-xs text-muted-foreground">Módulos totales</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 text-center">
            <Play className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">En progreso</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold">{stats.overallProgress}%</p>
            <p className="text-xs text-muted-foreground">Progreso global</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold">{stats.totalHours}h</p>
            <p className="text-xs text-muted-foreground">Horas estimadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Global Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso formativo global</span>
            <span className="text-sm text-muted-foreground">{stats.overallProgress}%</span>
          </div>
          <Progress value={stats.overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modulos" className="text-xs sm:text-sm">
            <BookOpen className="h-4 w-4 mr-1" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="necesidades" className="text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" /> Necesidades
          </TabsTrigger>
          <TabsTrigger value="certificados" className="text-xs sm:text-sm">
            <Award className="h-4 w-4 mr-1" /> Certificados
          </TabsTrigger>
        </TabsList>

        {/* Módulos Formativos */}
        <TabsContent value="modulos" className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="grid gap-4">
              {Object.entries(
                modules.reduce((acc, mod) => {
                  const cat = categoryLabels[mod.category] || mod.category;
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(mod);
                  return acc;
                }, {} as Record<string, typeof modules>)
              ).map(([cat, mods]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{cat}</h3>
                  <div className="grid gap-3">
                    {mods.map((mod) => {
                      const prog = getModuleProgress(mod.key);
                      const statusColor = prog?.status === 'completed' ? 'text-green-600' :
                        prog?.status === 'in_progress' ? 'text-blue-600' : 'text-muted-foreground';

                      return (
                        <Card key={mod.key} className={cn(
                          "transition-all hover:shadow-md",
                          prog?.status === 'completed' && "border-green-500/30 bg-green-500/5"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{mod.icon}</span>
                                  <h4 className="font-medium text-sm">{mod.title}</h4>
                                  <Badge variant="outline" className="text-[10px]">
                                    {mod.estimatedMinutes} min
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{mod.description}</p>
                                {prog && (
                                  <div className="flex items-center gap-2">
                                    <Progress value={prog.progress_percentage} className="h-2 flex-1" />
                                    <span className={cn("text-xs font-medium", statusColor)}>
                                      {prog.progress_percentage}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0">
                                {!prog ? (
                                  <Button size="sm" onClick={() => startModule(mod.key)} disabled={loading}>
                                    <Play className="h-3 w-3 mr-1" /> Iniciar
                                  </Button>
                                ) : prog.status === 'in_progress' ? (
                                  <Button size="sm" variant="outline" onClick={() => updateModuleProgress(mod.key, (prog.progress_percentage || 0) + 25)}>
                                    Avanzar
                                  </Button>
                                ) : (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Completado
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Necesidades Formativas */}
        <TabsContent value="necesidades" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Reportar necesidad formativa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Área (ej: Moderación de costes, Circuito LEADER...)"
                  value={needArea}
                  onChange={e => setNeedArea(e.target.value)}
                />
                <Textarea
                  placeholder="Describe qué formación necesitas o qué dificultad encuentras..."
                  value={needDesc}
                  onChange={e => setNeedDesc(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <select
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={needPriority}
                    onChange={e => setNeedPriority(e.target.value)}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                  <Button onClick={handleSubmitNeed} disabled={!needArea.trim() || !needDesc.trim()}>
                    <Send className="h-4 w-4 mr-1" /> Enviar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {needs.map(need => (
                  <Card key={need.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{need.area}</span>
                        <div className="flex gap-1">
                          <Badge variant={need.priority === 'high' ? 'destructive' : need.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px]">
                            {need.priority === 'high' ? 'Alta' : need.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {need.status === 'pending' ? 'Pendiente' : need.status === 'scheduled' ? 'Programada' : 'Resuelta'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{need.description}</p>
                    </CardContent>
                  </Card>
                ))}
                {needs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No hay necesidades formativas registradas</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Certificados */}
        <TabsContent value="certificados" className="mt-4">
          <div className="text-center py-8">
            <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">Certificados de Formación</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Completa todos los módulos para obtener tu certificado de capacitación LEADER.
            </p>
            <div className="flex justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.completed}/{stats.totalModules}</p>
                <p className="text-xs text-muted-foreground">Módulos completados</p>
              </div>
            </div>
            {stats.completed === stats.totalModules && stats.totalModules > 0 && (
              <Button className="mt-4" variant="default">
                <FileText className="h-4 w-4 mr-2" /> Descargar Certificado
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaTrainingCenter;
