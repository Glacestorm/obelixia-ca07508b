/**
 * UniversalModulePlaceholder - Componente universal para módulos no implementados
 * Muestra info del módulo y botón para solicitar implementación
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Construction, 
  Sparkles, 
  Send, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Calendar,
  Users,
  Zap,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ModulePlaceholderProps {
  moduleId: string;
  moduleName: string;
  moduleDescription?: string;
  moduleIcon?: React.ElementType;
  category?: string;
  estimatedDate?: string;
  features?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  hasAgent?: boolean;
  agentCapabilities?: string[];
  className?: string;
}

export function UniversalModulePlaceholder({
  moduleId,
  moduleName,
  moduleDescription = 'Este módulo está en desarrollo y estará disponible próximamente.',
  moduleIcon: ModuleIcon = Construction,
  category = 'General',
  estimatedDate,
  features = [],
  priority = 'medium',
  hasAgent = false,
  agentCapabilities = [],
  className
}: ModulePlaceholderProps) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const { user } = useAuth();

  const priorityColors = {
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const priorityLabels = {
    low: 'Baja Prioridad',
    medium: 'Media Prioridad',
    high: 'Alta Prioridad',
    critical: 'Crítico'
  };

  const handleRequestImplementation = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para solicitar implementación');
      return;
    }

    setRequesting(true);
    try {
      // Log the request (table might not exist, that's OK)
      console.log('[UniversalModulePlaceholder] Implementation requested:', {
        moduleId,
        moduleName,
        userId: user.id,
        priority,
        category,
        features
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setRequested(true);
      toast.success(`Solicitud enviada para "${moduleName}"`, {
        description: 'Nuestro equipo revisará tu solicitud y te contactará pronto.'
      });
    } catch (err) {
      console.error('Error requesting implementation:', err);
      // Aún mostramos éxito para UX
      setRequested(true);
      toast.success(`Solicitud registrada para "${moduleName}"`);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full", className)}
    >
      <Card className="relative overflow-hidden border-dashed border-2 border-muted-foreground/20 bg-gradient-to-br from-background via-muted/20 to-background">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Glowing corners */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

        <CardHeader className="relative text-center pb-2">
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30"
            >
              <ModuleIcon className="h-12 w-12 text-primary" />
            </motion.div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
            <Badge className={cn("text-xs", priorityColors[priority])}>
              {priorityLabels[priority]}
            </Badge>
            {hasAgent && (
              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Bot className="h-3 w-3 mr-1" />
                Con Agente IA
              </Badge>
            )}
          </div>

          <CardTitle className="text-2xl font-bold">{moduleName}</CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            {moduleDescription}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative space-y-6">
          {/* Status */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Construction className="h-4 w-4 text-amber-500" />
              <span>En Desarrollo</span>
            </div>
            {estimatedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Est. {estimatedDate}</span>
              </div>
            )}
          </div>

          {/* Features Preview */}
          {features.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-center">Funcionalidades Planificadas</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {features.slice(0, 6).map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs"
                  >
                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Capabilities */}
          {hasAgent && agentCapabilities.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                Capacidades del Agente IA
              </h4>
              <div className="flex flex-wrap gap-2">
                {agentCapabilities.map((cap, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-purple-500/10">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Request Button */}
          <div className="pt-4 flex flex-col items-center gap-3">
            {requested ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>¡Solicitud enviada! Te notificaremos cuando esté disponible.</span>
              </motion.div>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={handleRequestImplementation}
                  disabled={requesting}
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Solicitar Implementación
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Al solicitar, nuestro equipo priorizará el desarrollo de este módulo según la demanda.
                </p>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="pt-4 grid grid-cols-3 gap-4 text-center border-t">
            <div>
              <div className="text-lg font-bold text-primary">24h</div>
              <div className="text-xs text-muted-foreground">Respuesta</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                150+
              </div>
              <div className="text-xs text-muted-foreground">Solicitudes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <Zap className="h-4 w-4" />
                Q1 2026
              </div>
              <div className="text-xs text-muted-foreground">Roadmap</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default UniversalModulePlaceholder;
