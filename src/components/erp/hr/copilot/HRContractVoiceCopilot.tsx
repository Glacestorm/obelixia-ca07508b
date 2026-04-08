/**
 * HRContractVoiceCopilot — FAB + panel lateral de copiloto de voz contractual
 * Posición: inferior-derecha dentro del formulario de empleado
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, VolumeX, Send, X, MessageCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useContractVoiceCopilot } from '@/hooks/erp/hr/useContractVoiceCopilot';
import { cn } from '@/lib/utils';

interface Props {
  contractType?: string;
  contractTypeCode?: string;
  hireDate?: string;
  terminationDate?: string;
  endDate?: string;
  extensionCount?: number;
  status?: string;
  employeeName?: string;
}

export function HRContractVoiceCopilot(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [autoVoice, setAutoVoice] = useState(false);

  const {
    isListening, isSpeaking, isProcessing, messages, transcript,
    sttSupported, ttsSupported,
    startListening, stopListening, speak, stopSpeaking,
    askQuestion, clearMessages, setTranscript,
  } = useContractVoiceCopilot();

  const handleSend = useCallback(async (text?: string) => {
    const q = text || textInput || transcript;
    if (!q.trim()) return;
    setTextInput('');
    setTranscript('');
    const answer = await askQuestion(q, props);
    if (autoVoice && answer) speak(answer);
  }, [textInput, transcript, props, askQuestion, speak, autoVoice, setTranscript]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      // Auto-send after stopping
      setTimeout(() => {
        if (transcript) handleSend(transcript);
      }, 500);
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening, transcript, handleSend]);

  // FAB button
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 max-h-[500px] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Copiloto Contractual</p>
            <p className="text-[10px] text-muted-foreground">Legislación laboral ES</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setAutoVoice(!autoVoice)}
            title={autoVoice ? 'Desactivar voz automática' : 'Activar voz automática'}
          >
            {autoVoice ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3 max-h-[320px]">
        {messages.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground space-y-2">
            <p>👋 Pregunte sobre contratación, plazos, prórrogas o cualquier duda legal.</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {['¿Puedo prorrogar?', '¿Qué plazo tengo?', '¿Conversión a indefinido?'].map(q => (
                <Badge
                  key={q} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                  onClick={() => handleSend(q)}
                >{q}</Badge>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={cn("text-xs p-2 rounded-lg max-w-[90%]",
              m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              {m.content}
              {m.role === 'assistant' && ttsSupported && (
                <Button
                  variant="ghost" size="icon" className="h-5 w-5 mt-1"
                  onClick={() => isSpeaking ? stopSpeaking() : speak(m.content)}
                >
                  {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Consultando...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Listening indicator */}
      {isListening && (
        <div className="px-3 py-1 bg-primary/5 border-t flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-1 bg-primary rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 12}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span className="text-xs text-primary font-medium">Escuchando...</span>
          {transcript && <span className="text-xs text-muted-foreground truncate">{transcript}</span>}
        </div>
      )}

      {/* Input */}
      <div className="p-2 border-t flex gap-1.5">
        {sttSupported && (
          <Button
            variant={isListening ? 'destructive' : 'outline'}
            size="icon" className="h-8 w-8 shrink-0"
            onClick={handleVoiceToggle}
          >
            {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Input
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Pregunte sobre contratos..."
          className="h-8 text-xs"
          disabled={isProcessing}
        />
        <Button
          size="icon" className="h-8 w-8 shrink-0"
          onClick={() => handleSend()}
          disabled={isProcessing || (!textInput && !transcript)}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default HRContractVoiceCopilot;
