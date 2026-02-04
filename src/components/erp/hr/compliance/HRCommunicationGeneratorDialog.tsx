/**
 * HRCommunicationGeneratorDialog - Generador de comunicaciones legales
 * Genera cartas de despido, modificación sustancial, ERTE, etc.
 * con plantillas oficiales y validación por IA
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Sparkles,
  Check,
  AlertTriangle,
  Download,
  Send,
  Loader2,
  Scale,
  Calendar,
  User,
  Building2,
  BookOpen,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRCommunicationGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId?: string;
  employeeName?: string;
  communicationType?: string;
  onSuccess?: () => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  mandatory: boolean;
  completed: boolean;
}

const COMMUNICATION_TYPES = [
  { value: 'despido_objetivo', label: 'Despido Objetivo', legalRef: 'Art. 52-53 ET', noticeDays: 15 },
  { value: 'despido_disciplinario', label: 'Despido Disciplinario', legalRef: 'Art. 54-55 ET', noticeDays: 0 },
  { value: 'modificacion_sustancial', label: 'Modificación Sustancial', legalRef: 'Art. 41 ET', noticeDays: 15 },
  { value: 'movilidad_geografica', label: 'Movilidad Geográfica', legalRef: 'Art. 40 ET', noticeDays: 30 },
  { value: 'erte', label: 'ERTE', legalRef: 'Art. 47 ET', noticeDays: 15 },
  { value: 'fin_contrato_temporal', label: 'Fin Contrato Temporal', legalRef: 'Art. 49.1.c ET', noticeDays: 15 },
  { value: 'cambio_turno', label: 'Cambio de Turno/Horario', legalRef: 'Convenio Colectivo', noticeDays: 7 },
  { value: 'preaviso_baja', label: 'Preaviso de Baja Voluntaria', legalRef: 'Art. 49.1.d ET', noticeDays: 15 },
];

const DELIVERY_METHODS = [
  { value: 'burofax', label: 'Burofax', recommended: true },
  { value: 'carta_certificada', label: 'Carta Certificada', recommended: true },
  { value: 'email_certificado', label: 'Email Certificado', recommended: false },
  { value: 'entrega_mano', label: 'Entrega en Mano', recommended: false },
];

const DEFAULT_CHECKLISTS: Record<string, ChecklistItem[]> = {
  despido_objetivo: [
    { id: '1', text: 'Carta por escrito con causa clara y detallada', mandatory: true, completed: false },
    { id: '2', text: 'Preaviso de 15 días comunicado', mandatory: true, completed: false },
    { id: '3', text: 'Indemnización puesta a disposición (20 días/año)', mandatory: true, completed: false },
    { id: '4', text: 'Comunicación a representantes sindicales (si >50 empleados)', mandatory: false, completed: false },
    { id: '5', text: 'Acuse de recibo preparado', mandatory: true, completed: false },
    { id: '6', text: 'Baja en Seguridad Social programada (3 días)', mandatory: true, completed: false },
    { id: '7', text: 'Certificado empresa SEPE preparado (10 días)', mandatory: true, completed: false },
    { id: '8', text: 'Finiquito calculado y listo para firma', mandatory: true, completed: false },
  ],
  despido_disciplinario: [
    { id: '1', text: 'Carta por escrito con hechos y fechas concretas', mandatory: true, completed: false },
    { id: '2', text: 'Descripción detallada del incumplimiento grave', mandatory: true, completed: false },
    { id: '3', text: 'Audiencia previa al trabajador (si convenio lo requiere)', mandatory: false, completed: false },
    { id: '4', text: 'Comunicación a representantes sindicales', mandatory: false, completed: false },
    { id: '5', text: 'Expediente disciplinario documentado', mandatory: true, completed: false },
    { id: '6', text: 'Testigos o pruebas documentadas', mandatory: false, completed: false },
  ],
  modificacion_sustancial: [
    { id: '1', text: 'Notificación escrita con causas económicas/técnicas/organizativas', mandatory: true, completed: false },
    { id: '2', text: 'Preaviso de 15 días', mandatory: true, completed: false },
    { id: '3', text: 'Período de consultas con representantes (si colectivo)', mandatory: false, completed: false },
    { id: '4', text: 'Documentación acreditativa de las causas', mandatory: true, completed: false },
  ],
  erte: [
    { id: '1', text: 'Comunicación a la autoridad laboral', mandatory: true, completed: false },
    { id: '2', text: 'Período de consultas con representantes', mandatory: true, completed: false },
    { id: '3', text: 'Memoria explicativa de causas', mandatory: true, completed: false },
    { id: '4', text: 'Plan de medidas de acompañamiento social', mandatory: false, completed: false },
    { id: '5', text: 'Comunicación individual a trabajadores afectados', mandatory: true, completed: false },
  ],
};

export function HRCommunicationGeneratorDialog({
  open,
  onOpenChange,
  companyId,
  employeeId,
  employeeName,
  communicationType: initialType,
  onSuccess,
}: HRCommunicationGeneratorDialogProps) {
  const [activeTab, setActiveTab] = useState('config');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState(initialType || '');
  const [selectedEmployee, setSelectedEmployee] = useState(employeeId || '');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState(employeeName || '');
  const [deliveryMethod, setDeliveryMethod] = useState('burofax');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Generated content
  const [generatedContent, setGeneratedContent] = useState('');
  const [legalReferences, setLegalReferences] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  
  // Validation
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const [validationPassed, setValidationPassed] = useState<string[]>([]);
  const [validationFailed, setValidationFailed] = useState<string[]>([]);

  const typeConfig = COMMUNICATION_TYPES.find(t => t.value === selectedType);

  // Generate communication using AI
  const handleGenerate = useCallback(async () => {
    if (!selectedType) {
      toast.error('Selecciona un tipo de comunicación');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'generate_communication',
          company_id: companyId,
          communication_type: selectedType,
          employee_id: selectedEmployee || undefined,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const result = data.data;
        setGeneratedContent(result.content || '');
        setLegalReferences(result.legal_references || [typeConfig?.legalRef || '']);
        setWarnings(result.warnings || []);
        
        // Set default checklist for this type
        const defaultChecklist = DEFAULT_CHECKLISTS[selectedType] || [];
        const aiChecklist = result.checklist || [];
        
        // Merge AI suggestions with defaults
        const mergedChecklist = [
          ...defaultChecklist,
          ...aiChecklist.map((item: string, idx: number) => ({
            id: `ai-${idx}`,
            text: item,
            mandatory: false,
            completed: false,
          }))
        ];
        
        setChecklist(mergedChecklist);
        setActiveTab('content');
        toast.success('Comunicación generada correctamente');
      } else {
        throw new Error('No se pudo generar la comunicación');
      }
    } catch (error) {
      console.error('Error generating communication:', error);
      toast.error('Error al generar la comunicación');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedType, selectedEmployee, companyId, typeConfig]);

  // Validate checklist with AI
  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'validate_checklist',
          company_id: companyId,
          communication_type: selectedType,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const result = data.data;
        setValidationScore(result.score || 0);
        setValidationPassed(result.passed_items || []);
        setValidationFailed(result.failed_items || []);
        
        if (result.is_compliant) {
          toast.success('Validación superada');
        } else {
          toast.warning('Hay elementos pendientes de revisar');
        }
      }
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Error en la validación');
    } finally {
      setIsValidating(false);
    }
  }, [companyId, selectedType]);

  // Toggle checklist item
  const toggleChecklistItem = useCallback((itemId: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  }, []);

  // Calculate completion percentage
  const completionPercentage = checklist.length > 0
    ? Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100)
    : 0;

  const mandatoryCompleted = checklist.filter(c => c.mandatory).every(c => c.completed);

  // Save communication
  const handleSave = useCallback(async () => {
    if (!mandatoryCompleted) {
      toast.error('Completa todos los items obligatorios del checklist');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('erp_hr_legal_communications')
        .insert([{
          company_id: companyId,
          employee_id: selectedEmployee || null,
          communication_type: selectedType,
          jurisdiction: 'ES',
          title: `${typeConfig?.label} - ${selectedEmployeeName || 'Empleado'}`,
          content: generatedContent,
          legal_references: legalReferences,
          required_notice_days: typeConfig?.noticeDays || 0,
          effective_date: effectiveDate || null,
          delivery_method: deliveryMethod,
          delivery_status: 'draft',
          checklist_status: checklist.reduce((acc, item) => ({
            ...acc,
            [item.id]: item.completed
          }), {}),
          ai_validated: validationScore !== null && validationScore >= 80,
          ai_validation_notes: validationFailed.length > 0 
            ? `Pendiente: ${validationFailed.join(', ')}`
            : null,
        }]);

      if (error) throw error;

      toast.success('Comunicación guardada correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar la comunicación');
    } finally {
      setIsSaving(false);
    }
  }, [
    companyId, selectedEmployee, selectedType, selectedEmployeeName,
    generatedContent, legalReferences, typeConfig, effectiveDate,
    deliveryMethod, checklist, validationScore, validationFailed,
    mandatoryCompleted, onSuccess, onOpenChange
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generador de Comunicaciones Legales
          </DialogTitle>
          <DialogDescription>
            Genera comunicaciones oficiales con validación legal automática
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              Configuración
            </TabsTrigger>
            <TabsTrigger value="content" disabled={!generatedContent} className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Contenido
            </TabsTrigger>
            <TabsTrigger value="checklist" disabled={checklist.length === 0} className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedContent} className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Vista Previa
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[55vh] mt-4">
            {/* Tab: Configuration */}
            <TabsContent value="config" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Comunicación *</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMUNICATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{type.label}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {type.legalRef}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {typeConfig && (
                    <p className="text-xs text-muted-foreground">
                      Preaviso requerido: {typeConfig.noticeDays} días
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Empleado Afectado</Label>
                  <Input
                    value={selectedEmployeeName}
                    onChange={(e) => setSelectedEmployeeName(e.target.value)}
                    placeholder="Nombre del empleado..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Método de Entrega *</Label>
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            <span>{method.label}</span>
                            {method.recommended && (
                              <Badge variant="secondary" className="text-xs">
                                Recomendado
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Efectiva</Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    min={typeConfig ? format(addDays(new Date(), typeConfig.noticeDays), 'yyyy-MM-dd') : undefined}
                  />
                  {typeConfig && typeConfig.noticeDays > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Fecha mínima: {format(addDays(new Date(), typeConfig.noticeDays), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas Adicionales</Label>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Información adicional para incluir en la comunicación..."
                  rows={3}
                />
              </div>

              {/* Legal warnings */}
              {typeConfig && (
                <Card className="bg-amber-500/10 border-amber-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Scale className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">Requisitos Legales</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {typeConfig.legalRef} - Preaviso: {typeConfig.noticeDays} días
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          El incumplimiento puede resultar en improcedencia o nulidad.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={!selectedType || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Comunicación
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Tab: Content */}
            <TabsContent value="content" className="space-y-4 pr-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Contenido de la Comunicación</Label>
                  <div className="flex gap-1">
                    {legalReferences.map((ref, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ref}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              {warnings.length > 0 && (
                <Card className="bg-destructive/10 border-destructive/20">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">Advertencias</h4>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                          {warnings.map((w, idx) => (
                            <li key={idx}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Checklist */}
            <TabsContent value="checklist" className="space-y-4 pr-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Checklist de Cumplimiento</h3>
                  <p className="text-xs text-muted-foreground">
                    Verifica todos los requisitos antes de enviar
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{completionPercentage}%</p>
                  <Progress value={completionPercentage} className="w-24 h-2" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : item.mandatory 
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{item.text}</p>
                    </div>
                    {item.mandatory && (
                      <Badge variant="destructive" className="text-xs">
                        Obligatorio
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleValidate} 
                disabled={isValidating}
                variant="outline"
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando con IA...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Validar Cumplimiento
                  </>
                )}
              </Button>

              {validationScore !== null && (
                <Card className={validationScore >= 80 ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Puntuación de Cumplimiento</span>
                      <span className="text-2xl font-bold">{validationScore}%</span>
                    </div>
                    {validationFailed.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-destructive">Pendiente:</p>
                        <ul className="text-xs text-muted-foreground">
                          {validationFailed.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Preview */}
            <TabsContent value="preview" className="space-y-4 pr-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {typeConfig?.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Empleado:</span>
                        <p className="font-medium">{selectedEmployeeName || 'No especificado'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha efectiva:</span>
                        <p className="font-medium">
                          {effectiveDate 
                            ? format(new Date(effectiveDate), 'dd/MM/yyyy', { locale: es })
                            : 'No especificada'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Método de entrega:</span>
                        <p className="font-medium">
                          {DELIVERY_METHODS.find(m => m.value === deliveryMethod)?.label}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Base legal:</span>
                        <p className="font-medium">{typeConfig?.legalRef}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="whitespace-pre-wrap font-mono text-xs bg-muted/50 p-4 rounded-lg max-h-[300px] overflow-auto">
                      {generatedContent}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="outline"
            disabled={!generatedContent}
            onClick={() => {
              // Download as PDF would go here
              toast.info('Función de descarga en desarrollo');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!generatedContent || !mandatoryCompleted || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Guardar Comunicación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRCommunicationGeneratorDialog;
