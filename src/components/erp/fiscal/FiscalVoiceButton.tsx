/**
 * FiscalVoiceButton - Botón de voz bidireccional para el agente fiscal
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Waves
} from 'lucide-react';
import { useERPFiscalVoice } from '@/hooks/erp/useERPFiscalVoice';

interface FiscalVoiceButtonProps {
  onTranscript: (text: string) => void;
  onSpeakRequest?: (text: string) => void;
  autoSpeak?: boolean;
  lastResponse?: string;
  disabled?: boolean;
  className?: string;
}

export function FiscalVoiceButton({
  onTranscript,
  onSpeakRequest,
  autoSpeak = false,
  lastResponse,
  disabled = false,
  className
}: FiscalVoiceButtonProps) {
  const [showPulse, setShowPulse] = useState(false);
  const previousResponseRef = useRef<string>('');

  const {
    isRecording,
    isPlaying,
    isProcessing,
    transcript,
    error,
    startRecording,
    stopRecording,
    speak,
    stopPlayback,
    clearTranscript
  } = useERPFiscalVoice();

  // Handle transcript completion
  useEffect(() => {
    if (transcript && !isProcessing) {
      onTranscript(transcript);
      clearTranscript();
    }
  }, [transcript, isProcessing, onTranscript, clearTranscript]);

  // Auto-speak new responses
  useEffect(() => {
    if (autoSpeak && lastResponse && lastResponse !== previousResponseRef.current) {
      previousResponseRef.current = lastResponse;
      speak(lastResponse);
    }
  }, [autoSpeak, lastResponse, speak]);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      setShowPulse(true);
    } else {
      setShowPulse(false);
    }
  }, [isRecording]);

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSpeakerClick = () => {
    if (isPlaying) {
      stopPlayback();
    } else if (lastResponse) {
      speak(lastResponse);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        {/* Microphone Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={handleMicClick}
              disabled={disabled || isProcessing}
              className={cn(
                "relative transition-all",
                isRecording && "animate-pulse"
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <>
                  <Waves className="h-4 w-4" />
                  {showPulse && (
                    <span className="absolute inset-0 rounded-md animate-ping bg-destructive/50" />
                  )}
                </>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isProcessing 
              ? 'Procesando audio...' 
              : isRecording 
                ? 'Detener grabación' 
                : 'Hablar con el agente'
            }
          </TooltipContent>
        </Tooltip>

        {/* Speaker Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPlaying ? "secondary" : "ghost"}
              size="icon"
              onClick={handleSpeakerClick}
              disabled={disabled || (!isPlaying && !lastResponse)}
              className={cn(
                "transition-all",
                isPlaying && "bg-primary/10"
              )}
            >
              {isPlaying ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying 
              ? 'Detener reproducción' 
              : 'Reproducir última respuesta'
            }
          </TooltipContent>
        </Tooltip>

        {/* Recording indicator */}
        {isRecording && (
          <span className="text-xs text-destructive font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Grabando...
          </span>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <span className="text-xs text-muted-foreground">
            Transcribiendo...
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}

export default FiscalVoiceButton;
