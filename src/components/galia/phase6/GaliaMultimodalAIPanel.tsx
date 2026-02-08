/**
 * GaliaMultimodalAIPanel - Voice + Document AI Interface
 * 
 * Multimodal AI capabilities for document analysis and voice interaction.
 */

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Mic, 
  MicOff,
  FileImage,
  Upload,
  Sparkles,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Brain,
  Volume2,
  Loader2,
  Send,
  Camera,
  ScanLine
} from 'lucide-react';
import { useGaliaMultimodalAI, DocumentType, Language } from '@/hooks/galia/useGaliaMultimodalAI';
import { cn } from '@/lib/utils';

interface GaliaMultimodalAIPanelProps {
  expedienteId?: string;
  onDocumentAnalyzed?: (result: unknown) => void;
  className?: string;
}

export function GaliaMultimodalAIPanel({
  expedienteId,
  onDocumentAnalyzed,
  className
}: GaliaMultimodalAIPanelProps) {
  const [activeTab, setActiveTab] = useState('document');
  const [documentType, setDocumentType] = useState<DocumentType>('general');
  const [language, setLanguage] = useState<Language>('es');
  const [voiceQuery, setVoiceQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    isRecording,
    error,
    analysisResult,
    transcriptionResult,
    voiceResponse,
    analyzeDocument,
    transcribeVoice,
    askVoiceAssistant,
    startRecording,
    stopRecording,
    imageToBase64,
    clearState
  } = useGaliaMultimodalAI();

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const base64 = await imageToBase64(file);
    setSelectedImage(`data:${file.type};base64,${base64}`);
    
    const result = await analyzeDocument(base64, documentType, language);
    if (result) {
      onDocumentAnalyzed?.(result);
    }
  }, [analyzeDocument, documentType, language, imageToBase64, onDocumentAnalyzed]);

  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      const audioBase64 = await stopRecording();
      if (audioBase64) {
        const transcription = await transcribeVoice(audioBase64, language);
        if (transcription) {
          setVoiceQuery(transcription.transcription);
        }
      }
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, transcribeVoice, language]);

  const handleAskAssistant = useCallback(async () => {
    if (!voiceQuery.trim()) return;
    await askVoiceAssistant(voiceQuery, expedienteId, language);
  }, [voiceQuery, expedienteId, language, askVoiceAssistant]);

  const documentTypes: { type: DocumentType; label: string }[] = [
    { type: 'factura', label: 'Factura' },
    { type: 'solicitud', label: 'Solicitud' },
    { type: 'presupuesto', label: 'Presupuesto' },
    { type: 'licencia', label: 'Licencia' },
    { type: 'justificacion', label: 'Justificación' },
    { type: 'general', label: 'General' }
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'es', label: 'Español' },
    { code: 'ca', label: 'Catalán' },
    { code: 'eu', label: 'Euskera' },
    { code: 'gl', label: 'Gallego' }
  ];

  return (
    <Card className={cn("border-2 border-accent/20", className)}>
      <CardHeader className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                IA Multimodal
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Gemini 2.5
                </Badge>
              </CardTitle>
              <CardDescription>
                Análisis de documentos y asistente de voz
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearState} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="document" className="text-xs">
              <FileImage className="h-3 w-3 mr-1" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs">
              <Mic className="h-3 w-3 mr-1" />
              Voz
            </TabsTrigger>
            <TabsTrigger value="assistant" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Asistente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="document" className="mt-4 space-y-4">
            {/* Document Type & Language Selection */}
            <div className="flex gap-2 flex-wrap">
              <select 
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                {documentTypes.map(dt => (
                  <option key={dt.type} value={dt.type}>{dt.label}</option>
                ))}
              </select>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                "hover:border-primary/50 hover:bg-primary/5",
                selectedImage ? "border-primary bg-primary/5" : "border-muted-foreground/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedImage ? (
                <div className="space-y-3">
                  <img 
                    src={selectedImage} 
                    alt="Documento" 
                    className="max-h-40 mx-auto rounded-lg shadow"
                  />
                  <p className="text-sm text-muted-foreground">
                    Clic para cambiar documento
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Arrastra o haz clic para subir</p>
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, PDF (primera página)
                  </p>
                </>
              )}
            </div>

            {/* Analysis Loading */}
            {isLoading && activeTab === 'document' && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Analizando documento con OCR avanzado...</span>
              </div>
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{analysisResult.documentType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Confianza: {(analysisResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <Alert variant={analysisResult.validation.isComplete ? "default" : "destructive"}>
                    {analysisResult.validation.isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {analysisResult.validation.isComplete ? 'Documento Completo' : 'Información Faltante'}
                    </AlertTitle>
                    <AlertDescription>
                      {analysisResult.validation.missingFields.length > 0 && (
                        <ul className="list-disc list-inside text-xs mt-1">
                          {analysisResult.validation.missingFields.map((field, i) => (
                            <li key={i}>{field}</li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Datos Extraídos</h4>
                    {analysisResult.extractedData.fields.map((field, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                        <span className="text-muted-foreground">{field.name}</span>
                        <span className="font-medium">{String(field.value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Resumen</h4>
                    <p className="text-xs text-muted-foreground">{analysisResult.summary}</p>
                  </div>

                  {analysisResult.validation.eligibleForLEADER && (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Elegible para LEADER
                    </Badge>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-4 space-y-4">
            {/* Voice Recording */}
            <div className="text-center py-6">
              <button
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center transition-all",
                  isRecording 
                    ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50" 
                    : "bg-primary hover:bg-primary/90 shadow-lg"
                )}
              >
                {isRecording ? (
                  <MicOff className="h-10 w-10 text-white" />
                ) : (
                  <Mic className="h-10 w-10 text-white" />
                )}
              </button>
              <p className="mt-4 text-sm text-muted-foreground">
                {isRecording ? 'Grabando... Toca para detener' : 'Toca para grabar'}
              </p>
              {isRecording && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{ 
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Transcription Result */}
            {transcriptionResult && (
              <div className="space-y-3">
                <Alert>
                  <Volume2 className="h-4 w-4" />
                  <AlertTitle>Transcripción</AlertTitle>
                  <AlertDescription>
                    <p className="mt-2">{transcriptionResult.transcription}</p>
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Idioma: {transcriptionResult.language}</span>
                      <span>•</span>
                      <span>Duración: {transcriptionResult.duration_seconds}s</span>
                      <span>•</span>
                      <span>Confianza: {(transcriptionResult.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </AlertDescription>
                </Alert>

                {transcriptionResult.entities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {transcriptionResult.entities.map((entity, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {entity.type}: {entity.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assistant" className="mt-4 space-y-4">
            {/* Query Input */}
            <div className="space-y-2">
              <Textarea
                value={voiceQuery}
                onChange={(e) => setVoiceQuery(e.target.value)}
                placeholder="Escribe tu consulta o usa el micrófono para dictarla..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleVoiceToggle}
                  variant="outline"
                  size="icon"
                  className={cn(isRecording && "bg-red-100 border-red-300")}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={handleAskAssistant}
                  disabled={isLoading || !voiceQuery.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Consultar
                </Button>
              </div>
            </div>

            {/* Assistant Response */}
            {voiceResponse && (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-sm">{voiceResponse.response}</p>
                    </div>
                  </div>

                  {voiceResponse.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground">Sugerencias:</h4>
                      <div className="flex flex-wrap gap-1">
                        {voiceResponse.suggestions.map((sug, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="cursor-pointer text-xs"
                            onClick={() => setVoiceQuery(sug)}
                          >
                            {sug}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {voiceResponse.nextSteps.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground">Próximos pasos:</h4>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {voiceResponse.nextSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {voiceResponse.requiresHuman && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Requiere Atención Humana</AlertTitle>
                      <AlertDescription className="text-xs">
                        {voiceResponse.escalationReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaMultimodalAIPanel;
