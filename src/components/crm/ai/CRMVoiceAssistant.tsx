/**
 * CRM Voice Assistant - 2026 Trend
 * Asistente de voz conversacional para CRM
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Users,
  TrendingUp,
  Bot,
  Loader2,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceCommand {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'assistant';
  action?: {
    type: string;
    data?: Record<string, unknown>;
    executed?: boolean;
  };
}

const SUGGESTED_COMMANDS = [
  { icon: Users, text: 'Muéstrame mis leads calientes', category: 'leads' },
  { icon: TrendingUp, text: '¿Cómo va mi pipeline esta semana?', category: 'pipeline' },
  { icon: Calendar, text: 'Agenda una llamada con Acme Corp', category: 'scheduling' },
  { icon: Mail, text: 'Envía un follow-up a leads sin actividad', category: 'automation' },
  { icon: Phone, text: 'Dame un resumen de mis llamadas de hoy', category: 'calls' },
];

export function CRMVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([
    {
      id: '1',
      text: '¡Hola! Soy tu asistente CRM con IA. Puedo ayudarte a gestionar leads, agendar reuniones, analizar tu pipeline y más. ¿Qué necesitas?',
      timestamp: new Date(),
      type: 'assistant'
    }
  ]);
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate voice listening
  const handleToggleListen = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      setAudioLevel(0);
    } else {
      setIsListening(true);
      // Simulate audio levels
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      
      // Simulate command after 3 seconds
      setTimeout(() => {
        clearInterval(interval);
        setIsListening(false);
        setAudioLevel(0);
        processVoiceCommand('Muéstrame los leads de esta semana');
      }, 3000);
    }
  }, [isListening]);

  const processVoiceCommand = useCallback(async (text: string) => {
    // Add user command
    const userCommand: VoiceCommand = {
      id: `user-${Date.now()}`,
      text,
      timestamp: new Date(),
      type: 'user'
    };
    setCommands(prev => [...prev, userCommand]);
    setIsProcessing(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate response based on command
    let response = '';
    let action: VoiceCommand['action'];

    if (text.toLowerCase().includes('lead')) {
      response = 'Tienes 12 leads activos esta semana. 3 son de alta prioridad: Acme Corp ($45K), TechStart ($28K) y Global Industries ($85K). ¿Quieres que te muestre detalles de alguno?';
      action = { type: 'show_leads', data: { filter: 'this_week', priority: 'high' } };
    } else if (text.toLowerCase().includes('pipeline')) {
      response = 'Tu pipeline muestra $225K en oportunidades activas. La tasa de conversión está en 23%, un 5% mejor que el mes pasado. Tienes 2 deals que podrían cerrarse esta semana.';
      action = { type: 'show_pipeline', data: { view: 'summary' } };
    } else if (text.toLowerCase().includes('agenda') || text.toLowerCase().includes('llamada')) {
      response = '¿Para cuándo quieres agendar la llamada? Tienes disponibilidad mañana a las 10:00, 14:00 y 16:30.';
      action = { type: 'schedule_call', data: { status: 'pending_time' } };
    } else if (text.toLowerCase().includes('follow-up') || text.toLowerCase().includes('seguimiento')) {
      response = 'Encontré 5 leads sin actividad en los últimos 7 días. ¿Quieres que prepare emails de seguimiento personalizados para cada uno?';
      action = { type: 'create_followups', data: { count: 5, days_inactive: 7 } };
    } else {
      response = 'Entendido. ¿Puedes darme más detalles sobre lo que necesitas?';
    }

    const assistantResponse: VoiceCommand = {
      id: `assistant-${Date.now()}`,
      text: response,
      timestamp: new Date(),
      type: 'assistant',
      action
    };

    setCommands(prev => [...prev, assistantResponse]);
    setIsProcessing(false);

    // Simulate text-to-speech
    if (!isMuted) {
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }
  }, [isMuted]);

  const handleSuggestedCommand = (text: string) => {
    processVoiceCommand(text);
  };

  const handleExecuteAction = useCallback((commandId: string) => {
    setCommands(prev => prev.map(cmd => {
      if (cmd.id === commandId && cmd.action) {
        toast.success('Acción ejecutada', {
          description: `${cmd.action.type} completado`
        });
        return { ...cmd, action: { ...cmd.action, executed: true } };
      }
      return cmd;
    }));
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isListening 
                ? "bg-red-500 animate-pulse" 
                : isSpeaking 
                  ? "bg-green-500"
                  : "bg-gradient-to-br from-primary to-accent"
            )}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base">Asistente CRM</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                IA 2026
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-8 w-8"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Conversation area */}
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-3">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className={cn(
                  "flex",
                  cmd.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5",
                    cmd.type === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  <p className="text-sm">{cmd.text}</p>
                  {cmd.action && !cmd.action.executed && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 h-7 text-xs gap-1"
                      onClick={() => handleExecuteAction(cmd.id)}
                    >
                      <Wand2 className="h-3 w-3" />
                      Ejecutar
                    </Button>
                  )}
                  {cmd.action?.executed && (
                    <Badge variant="outline" className="mt-2 text-xs text-green-600">
                      ✓ Ejecutado
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested commands */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Sugerencias:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_COMMANDS.slice(0, 3).map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleSuggestedCommand(cmd.text)}
                >
                  <Icon className="h-3 w-3" />
                  {cmd.text.length > 25 ? cmd.text.slice(0, 25) + '...' : cmd.text}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Voice input area */}
        <div className="pt-2 border-t">
          {isListening && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Escuchando...</span>
              </div>
              <Progress value={audioLevel} className="h-1" />
            </div>
          )}
          
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={isListening ? "destructive" : "default"}
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full p-0 transition-transform",
                isListening && "scale-110"
              )}
              onClick={handleToggleListen}
            >
              {isListening ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {isListening ? 'Toca para detener' : 'Toca para hablar'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CRMVoiceAssistant;
