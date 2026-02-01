/**
 * HRDocumentGeneratorDialog - Generar documentos desde plantillas
 * Rellena variables, previsualiza y genera PDF
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileSignature, Loader2, Download, Eye, Save,
  User, Building2, Calendar, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HRDocumentGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  template: {
    id: string;
    template_code: string;
    template_name: string;
    template_content?: string;
    variables_schema?: Array<{
      name: string;
      type: string;
      required?: boolean;
      default?: any;
      options?: string[];
    }>;
    jurisdiction: string;
    document_type: string;
  } | null;
  onSuccess: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  position?: string;
  department_id?: string;
}

export function HRDocumentGeneratorDialog({
  open,
  onOpenChange,
  companyId,
  template,
  onSuccess
}: HRDocumentGeneratorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [activeTab, setActiveTab] = useState('variables');
  const [fullTemplate, setFullTemplate] = useState<any>(null);

  // Fetch full template with content
  const fetchFullTemplate = useCallback(async () => {
    if (!template?.id) return;
    
    setLoadingTemplate(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_document_templates?id=eq.${template.id}&select=*`;
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch template');
      const data = await response.json();
      if (data && data.length > 0) {
        setFullTemplate(data[0]);
        // Initialize variable values with defaults
        const schema = data[0].variables_schema || [];
        const defaults: Record<string, any> = {};
        schema.forEach((v: any) => {
          if (v.default !== undefined) {
            defaults[v.name] = v.default;
          }
        });
        setVariableValues(defaults);
      }
    } catch (err) {
      console.error('Error fetching template:', err);
    } finally {
      setLoadingTemplate(false);
    }
  }, [template?.id]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_employees?company_id=eq.${companyId}&is_active=eq.true&select=id,first_name,last_name,dni,position,department_id`;
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && template) {
      fetchFullTemplate();
      fetchEmployees();
      setActiveTab('variables');
      setPreviewContent('');
      setSelectedEmployeeId('');
    }
  }, [open, template, fetchFullTemplate, fetchEmployees]);

  // Auto-fill employee data when selected
  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (employee) {
        setVariableValues(prev => ({
          ...prev,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_dni: employee.dni || '',
          job_position: employee.position || prev.job_position || ''
        }));
      }
    }
  }, [selectedEmployeeId, employees]);

  // Generate preview
  const generatePreview = () => {
    if (!fullTemplate?.template_content) return;
    
    let content = fullTemplate.template_content;
    
    // Replace all variables
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value?.toString() || `[${key}]`);
    });
    
    // Mark unfilled variables
    content = content.replace(/{{(\w+)}}/g, '[$1 - pendiente]');
    
    setPreviewContent(content);
    setActiveTab('preview');
  };

  // Save generated document
  const handleSave = async (status: 'draft' | 'pending_review' = 'draft') => {
    if (!fullTemplate || !selectedEmployeeId) {
      toast.error('Seleccione un empleado');
      return;
    }

    setLoading(true);
    try {
      // Generate final content
      let content = fullTemplate.template_content;
      Object.entries(variableValues).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value?.toString() || '');
      });

      const insertResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_generated_documents`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            company_id: companyId,
            employee_id: selectedEmployeeId,
            template_id: fullTemplate.id,
            document_type: fullTemplate.document_type,
            document_name: `${fullTemplate.template_name} - ${variableValues.employee_name || 'Empleado'}`,
            generated_content: content,
            variables_used: variableValues,
            status
          })
        }
      );

      if (!insertResponse.ok) throw new Error('Failed to save document');

      toast.success(status === 'draft' ? 'Borrador guardado' : 'Documento enviado a revisión');
      onSuccess();
    } catch (err) {
      console.error('Error saving document:', err);
      toast.error('Error al guardar documento');
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  const variablesSchema = fullTemplate?.variables_schema || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Generar Documento
            <Badge variant="outline" className="ml-2">
              {template.jurisdiction}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {template.template_name}
          </DialogDescription>
        </DialogHeader>

        {loadingTemplate ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="mb-4">
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            </TabsList>

            <TabsContent value="variables" className="mt-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Employee selector */}
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <Label className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      Empleado *
                    </Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} {emp.dni && `- ${emp.dni}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic variables */}
                  <div className="grid grid-cols-2 gap-3">
                    {variablesSchema.map((variable: any) => (
                      <div key={variable.name} className="space-y-1.5">
                        <Label className="text-sm">
                          {variable.name.replace(/_/g, ' ')}
                          {variable.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        
                        {variable.type === 'select' && variable.options ? (
                          <Select
                            value={variableValues[variable.name] || ''}
                            onValueChange={(v) => setVariableValues(prev => ({ ...prev, [variable.name]: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {variable.options.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : variable.type === 'date' ? (
                          <Input
                            type="date"
                            value={variableValues[variable.name] || ''}
                            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                          />
                        ) : variable.type === 'number' ? (
                          <Input
                            type="number"
                            value={variableValues[variable.name] || ''}
                            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                            placeholder={variable.default?.toString()}
                          />
                        ) : (
                          <Input
                            value={variableValues[variable.name] || ''}
                            onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                            placeholder={variable.default?.toString()}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {variablesSchema.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Esta plantilla no tiene variables configuradas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end mt-4">
                <Button onClick={generatePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Vista Previa
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border font-mono text-sm whitespace-pre-wrap">
                  {previewContent || (
                    <p className="text-muted-foreground text-center">
                      Complete las variables y genere la vista previa
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSave('draft')}
            disabled={loading || !selectedEmployeeId}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar Borrador
          </Button>
          <Button 
            onClick={() => handleSave('pending_review')}
            disabled={loading || !selectedEmployeeId}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSignature className="h-4 w-4 mr-1" />}
            Generar y Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRDocumentGeneratorDialog;
