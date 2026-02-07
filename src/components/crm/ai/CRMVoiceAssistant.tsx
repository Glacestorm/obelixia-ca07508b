/**
 * CRM Voice Assistant - Phase 7: Advanced AI
 * Integrated with useCRMVoiceAssistant hook
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
  Wand2,
  Send,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRMVoiceAssistant, VoiceCommand, CRMContext } from '@/hooks/crm/ai';

interface CRMVoiceAssistantProps {
  context?: CRMContext;
  className?: string;
}

const SUGGESTED_COMMANDS = [
  { icon: Users, text: 'Muéstrame mis leads calientes', category: 'leads' },
  { icon: TrendingUp, text: '¿Cómo va mi pipeline esta semana?', category: 'pipeline' },
  { icon: Calendar, text: 'Agenda una llamada con Acme Corp', category: 'scheduling' },
  { icon: Mail, text: 'Envía un follow-up a leads sin actividad', category: 'automation' },
  { icon: Phone, text: 'Dame un resumen de mis llamadas de hoy', category: 'calls' },
];

export function CRMVoiceAssistant({ context, className }: CRMVoiceAssistantProps) {
  const [textInput, setTextInput] = useState('');
  
  const {
    commands,
    isRecording,
    isProcessing,
    isSpeaking,
    isMuted,
    audioLevel,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    processTextCommand,
    executeAction,
    toggleMute,
    stopSpeaking,
    clearConversation,
  } = useCRMVoiceAssistant(context);

  const handleToggleListen = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSuggestedCommand = (text: string) => {
    processTextCommand(text);
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      processTextCommand(textInput);
      setTextInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              isRecording 
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearConversation}
              className="h-8 w-8"
              title="Limpiar conversación"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
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
                      onClick={() => executeAction(cmd.id)}
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

        {/* Text and Voice input area */}
        <div className="pt-2 border-t space-y-3">
          {isRecording && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-muted-foreground">Escuchando... ({duration}s)</span>
              </div>
              <Progress value={audioLevel} className="h-1" />
            </div>
          )}
          
          {/* Text input */}
          <div className="flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un comando..."
              className="flex-1"
              disabled={isRecording || isProcessing}
            />
            <Button
              size="icon"
              onClick={handleSendText}
              disabled={!textInput.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Voice button */}
          <div className="flex items-center justify-center">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full p-0 transition-transform",
                isRecording && "scale-110"
              )}
              onClick={handleToggleListen}
              disabled={isProcessing}
            >
              {isRecording ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {isRecording ? 'Toca para detener' : 'Toca para hablar'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CRMVoiceAssistant;
