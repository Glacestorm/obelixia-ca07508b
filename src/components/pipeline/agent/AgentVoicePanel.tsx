/**
 * Panel de Voz Conversacional para Agente IA
 * Integración con ElevenLabs para interacción de voz
 */

import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2,
  VolumeX,
  Settings,
  Loader2,
  Sparkles,
  MessageSquare,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgentVoicePanelProps {
  className?: string;
  agentContext?: {
    pipelineHealth?: number;
    opportunitiesCount?: number;
    atRiskCount?: number;
  };
}

export function AgentVoicePanel({ className, agentContext }: AgentVoicePanelProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string; timestamp: Date }>>([]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[AgentVoice] Connected');
      toast.success('Conectado al agente de voz');
      setMessages(prev => [...prev, {
        role: 'agent',
        text: '¡Hola! Soy tu asistente de ventas. ¿En qué puedo ayudarte con tu pipeline?',
        timestamp: new Date()
      }]);
    },
    onDisconnect: () => {
      console.log('[AgentVoice] Disconnected');
      toast.info('Desconectado del agente de voz');
    },
    onMessage: (message: unknown) => {
      console.log('[AgentVoice] Message:', message);
      const msg = message as Record<string, unknown>;
      if (msg.type === 'user_transcript') {
        const event = msg.user_transcription_event as Record<string, unknown> | undefined;
        setMessages(prev => [...prev, {
          role: 'user',
          text: (event?.user_transcript as string) || '',
          timestamp: new Date()
        }]);
      } else if (msg.type === 'agent_response') {
        const event = msg.agent_response_event as Record<string, unknown> | undefined;
        setMessages(prev => [...prev, {
          role: 'agent',
          text: (event?.agent_response as string) || '',
          timestamp: new Date()
        }]);
      }
    },
    onError: (error) => {
      console.error('[AgentVoice] Error:', error);
      toast.error('Error en la conexión de voz');
    },
  });

  const startConversation = useCallback(async () => {
    if (!agentId.trim()) {
      toast.error('Configura el Agent ID de ElevenLabs primero');
      setShowConfig(true);
      return;
    }

    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke(
        'elevenlabs-conversation-token',
        { body: { agentId: agentId.trim() } }
      );

      if (error || !data?.signed_url) {
        throw new Error(error?.message || 'No se pudo obtener el token');
      }

      // Start the conversation
      await conversation.startSession({
        signedUrl: data.signed_url,
      });

    } catch (error) {
      console.error('[AgentVoice] Start error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al iniciar conversación');
    } finally {
      setIsConnecting(false);
    }
  }, [agentId, conversation]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setMessages([]);
    } catch (error) {
      console.error('[AgentVoice] Stop error:', error);
    }
  }, [conversation]);

  const toggleMute = useCallback(async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1 : 0 });
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('[AgentVoice] Mute error:', error);
    }
  }, [conversation, isMuted]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4 text-violet-500" />
          Asistente de Voz
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="h-7 text-xs"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <Card className="p-3 bg-muted/50">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">ElevenLabs Agent ID</label>
            <Input
              placeholder="Ej: abc123..."
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Obtén tu Agent ID desde el dashboard de ElevenLabs Conversational AI
            </p>
          </div>
        </Card>
      )}

      {/* Status Card */}
      <Card className={cn(
        "p-4 transition-all duration-300",
        isConnected 
          ? "bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30" 
          : "bg-muted/50"
      )}>
        <div className="flex flex-col items-center gap-4">
          {/* Voice Indicator */}
          <div className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
            isConnected 
              ? isSpeaking 
                ? "bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" 
                : "bg-gradient-to-br from-violet-500/50 to-purple-600/50"
              : "bg-muted"
          )}>
            {isConnecting ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : isConnected ? (
              isSpeaking ? (
                <Volume2 className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )
            ) : (
              <MicOff className="h-8 w-8 text-muted-foreground" />
            )}
            
            {/* Pulse Animation */}
            {isConnected && isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
                <div className="absolute -inset-2 rounded-full border-2 border-violet-500/50 animate-pulse" />
              </>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center">
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className={cn(
                "mb-1",
                isConnected && "bg-gradient-to-r from-violet-500 to-purple-600"
              )}
            >
              {isConnecting ? 'Conectando...' : isConnected ? (isSpeaking ? 'Hablando' : 'Escuchando') : 'Desconectado'}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {isConnected 
                ? 'Habla para interactuar con el agente' 
                : 'Inicia una conversación de voz'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <Button
                onClick={startConversation}
                disabled={isConnecting}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                Iniciar Conversación
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  onClick={stopConversation}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Terminar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Context Info */}
      {agentContext && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span className="text-xs font-medium">Contexto del Agente</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="font-semibold">{agentContext.pipelineHealth || 0}%</div>
              <div className="text-muted-foreground">Salud</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="font-semibold">{agentContext.opportunitiesCount || 0}</div>
              <div className="text-muted-foreground">Opps</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="font-semibold text-red-600">{agentContext.atRiskCount || 0}</div>
              <div className="text-muted-foreground">En riesgo</div>
            </div>
          </div>
        </Card>
      )}

      {/* Conversation History */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Historial
          </h4>
          <div className="space-y-1 max-h-40 overflow-auto">
            {messages.slice(-5).map((msg, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-2 rounded-lg text-xs",
                  msg.role === 'user' 
                    ? "bg-primary/10 ml-4" 
                    : "bg-muted/50 mr-4"
                )}
              >
                <div className="flex items-center gap-1 mb-1">
                  {msg.role === 'user' ? (
                    <Mic className="h-2 w-2" />
                  ) : (
                    <Sparkles className="h-2 w-2 text-violet-500" />
                  )}
                  <span className="font-medium">
                    {msg.role === 'user' ? 'Tú' : 'Agente'}
                  </span>
                </div>
                <p className="text-muted-foreground">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
        <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-violet-500" />
          Sugerencias de uso
        </h4>
        <ul className="text-[10px] text-muted-foreground space-y-1">
          <li>• "¿Cuáles son mis oportunidades en riesgo?"</li>
          <li>• "Dame un resumen del pipeline"</li>
          <li>• "¿Qué acciones debo priorizar hoy?"</li>
          <li>• "Predice el cierre de [nombre de oportunidad]"</li>
        </ul>
      </div>
    </div>
  );
}

export default AgentVoicePanel;
