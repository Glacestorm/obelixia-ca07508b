/**
 * Universal Module Placeholder Component
 * Muestra información de módulos no implementados con botón para solicitar implementación
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, Sparkles, Code, FileCode2, Loader2,
  CheckCircle2, Star, Tag, Clock, Building2,
  ArrowRight, Zap, Shield, BarChart3, Puzzle,
  Send, MessageSquare, AlertCircle, Calendar,
  Users, Rocket, Brain, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

interface ModulePlaceholderProps {
  moduleKey: string;
  moduleName?: string;
  moduleDescription?: string;
  moduleCategory?: string;
  moduleIcon?: React.ReactNode;
  estimatedDelivery?: string;
  priorityLevel?: 'low' | 'medium' | 'high' | 'critical';
  onRequestImplementation?: (moduleKey: string, comment: string) => void;
  showDatabaseInfo?: boolean;
}

interface ModuleData {
  id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  category: string;
  sector: string | null;
  version: string | null;
  base_price: number | null;
  is_core: boolean | null;
  features: any;
  dependencies: string[] | null;
  module_icon: string | null;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    'Core': <Puzzle className="h-5 w-5" />,
    'CRM': <Building2 className="h-5 w-5" />,
    'Analytics': <BarChart3 className="h-5 w-5" />,
    'AI': <Brain className="h-5 w-5" />,
    'Automation': <Zap className="h-5 w-5" />,
    'Security': <Shield className="h-5 w-5" />,
    'Accounting': <Settings className="h-5 w-5" />,
    'Documents': <FileCode2 className="h-5 w-5" />,
    'Integration': <Rocket className="h-5 w-5" />,
  };
  return icons[category] || <Package className="h-5 w-5" />;
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Core': 'from-blue-500/20 to-blue-600/40',
    'CRM': 'from-green-500/20 to-green-600/40',
    'Analytics': 'from-purple-500/20 to-purple-600/40',
    'AI': 'from-pink-500/20 to-pink-600/40',
    'Automation': 'from-amber-500/20 to-amber-600/40',
    'Security': 'from-red-500/20 to-red-600/40',
    'Accounting': 'from-emerald-500/20 to-emerald-600/40',
    'Documents': 'from-cyan-500/20 to-cyan-600/40',
    'Integration': 'from-indigo-500/20 to-indigo-600/40',
  };
  return colors[category] || 'from-gray-500/20 to-gray-600/40';
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    'low': 'bg-gray-500/10 text-gray-500',
    'medium': 'bg-blue-500/10 text-blue-500',
    'high': 'bg-amber-500/10 text-amber-500',
    'critical': 'bg-red-500/10 text-red-500',
  };
  return colors[priority] || colors.medium;
};

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleKey,
  moduleName,
  moduleDescription,
  moduleCategory,
  moduleIcon,
  estimatedDelivery,
  priorityLevel = 'medium',
  onRequestImplementation,
  showDatabaseInfo = true
}) => {
  const [module, setModule] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestComment, setRequestComment] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (showDatabaseInfo) {
      fetchModuleData();
    } else {
      setLoading(false);
    }
  }, [moduleKey, showDatabaseInfo]);

  const fetchModuleData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*')
        .eq('module_key', moduleKey)
        .single();

      if (error) throw error;
      setModule(data);
    } catch (error) {
      console.error('Error fetching module:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestImplementation = async () => {
    setRequesting(true);
    try {
      // Log the request
      await supabase.from('ai_task_queue').insert([{
        task_type: 'module_implementation_request',
        task_title: `Solicitud implementación: ${module?.module_name || moduleName || moduleKey}`,
        task_description: requestComment || 'Sin comentarios adicionales',
        priority: priorityLevel === 'critical' ? 1 : priorityLevel === 'high' ? 2 : priorityLevel === 'medium' ? 3 : 4,
        status: 'pending',
        target_entity_type: 'app_module',
        target_entity_id: module?.id || null,
        target_gestor_id: user?.id || null
      }]);
      
      toast.success('Solicitud enviada', {
        description: `Se ha solicitado la implementación del módulo "${module?.module_name || moduleName || moduleKey}"`
      });
      
      onRequestImplementation?.(moduleKey, requestComment);
      setRequestDialogOpen(false);
      setRequestComment('');
    } catch (error) {
      console.error('Error requesting implementation:', error);
      toast.error('Error al solicitar implementación');
    } finally {
      setRequesting(false);
    }
  };

  const parseFeatures = (features: any): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    if (typeof features === 'object' && features.items) return features.items;
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no module found in DB but we have props, show a basic placeholder
  const displayName = module?.module_name || moduleName || moduleKey;
  const displayDescription = module?.description || moduleDescription || 'Módulo pendiente de implementación';
  const displayCategory = module?.category || moduleCategory || 'General';

  if (!module && !moduleName) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 text-center">
          {moduleIcon || <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />}
          <h3 className="text-lg font-semibold mb-2">Módulo no encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            El módulo "{moduleKey}" no existe en el catálogo
          </p>
          <Button variant="outline" onClick={() => setRequestDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Solicitar creación
          </Button>
        </CardContent>
      </Card>
    );
  }

  const features = module ? parseFeatures(module.features) : [];
  const categoryColor = getCategoryColor(displayCategory);

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="overflow-hidden">
        <div className={cn("h-32 bg-gradient-to-r", categoryColor)} />
        <CardContent className="relative pt-0">
          <div className="absolute -top-12 left-6">
            <div className={cn(
              "h-24 w-24 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl border-4 border-background",
              categoryColor
            )}>
              {getCategoryIcon(module.category)}
            </div>
          </div>
          
          <div className="pt-16 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{module.module_name}</h1>
                <p className="text-muted-foreground font-mono text-sm">{module.module_key}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {module.category}
                </Badge>
                {module.version && (
                  <Badge variant="secondary">v{module.version}</Badge>
                )}
                {module.is_core && (
                  <Badge className="bg-blue-500/10 text-blue-600">
                    <Star className="h-3 w-3 mr-1" />
                    Core
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="mt-4 text-muted-foreground">
              {module.description || 'Sin descripción disponible'}
            </p>
            
            {module.base_price !== null && (
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {module.base_price === 0 ? 'Gratis' : `€${module.base_price}`}
                </span>
                {module.base_price > 0 && (
                  <span className="text-muted-foreground">/mes</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Code className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                Módulo en desarrollo
              </h3>
              <p className="text-sm text-amber-600/80 dark:text-amber-500/80">
                Este módulo está publicado en la tienda pero aún no tiene implementación funcional.
                Puedes solicitar su desarrollo prioritario.
              </p>
            </div>
            <Button 
              onClick={handleRequestImplementation}
              disabled={requesting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {requesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Solicitar implementación
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Features */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Características planificadas
            </CardTitle>
            <CardDescription>
              Funcionalidades que incluirá este módulo cuando esté implementado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {features.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileCode2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Características pendientes de definir</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Sidebar */}
        <div className="space-y-4">
          {/* Dependencies */}
          {module.dependencies && module.dependencies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Puzzle className="h-4 w-4" />
                  Dependencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {module.dependencies.map(dep => (
                    <Badge key={dep} variant="outline" className="font-mono text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sector */}
          {module.sector && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Sector
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-primary/10 text-primary">
                  {module.sector}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estado del desarrollo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Diseño completado</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Publicado en tienda</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm">Esperando implementación</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-muted" />
                  <span className="text-sm text-muted-foreground">Testing y QA</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-muted" />
                  <span className="text-sm text-muted-foreground">Lanzamiento</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-2">¿Necesitas este módulo?</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Solicita su implementación y te notificaremos cuando esté listo
              </p>
              <Button 
                onClick={() => setRequestDialogOpen(true)}
                disabled={requesting}
                className="w-full"
              >
                {requesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Solicitar ahora
              </Button>
            </CardContent>
          </Card>

          {/* Priority & Estimated Delivery */}
          {(priorityLevel || estimatedDelivery) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Información adicional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityLevel && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prioridad</span>
                    <Badge className={getPriorityColor(priorityLevel)}>
                      {priorityLevel === 'critical' ? 'Crítica' : 
                       priorityLevel === 'high' ? 'Alta' :
                       priorityLevel === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  </div>
                )}
                {estimatedDelivery && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Entrega estimada</span>
                    <span className="text-sm font-medium">{estimatedDelivery}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Solicitar Implementación
            </DialogTitle>
            <DialogDescription>
              Solicita la implementación del módulo "{displayName}". Recibirás una notificación cuando esté disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 mb-2">
                {moduleIcon || getCategoryIcon(displayCategory)}
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{moduleKey}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{displayDescription}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentarios (opcional)
              </label>
              <Textarea
                placeholder="Describe cómo planeas usar este módulo o funcionalidades específicas que necesitas..."
                value={requestComment}
                onChange={e => setRequestComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestImplementation} disabled={requesting}>
              {requesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModulePlaceholder;
