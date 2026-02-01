/**
 * HRDocumentUploadDialog - Subida de documentos con procesamiento IA
 * Drag & drop, clasificación automática, indexación
 */

import { useState, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileText, X, Loader2, CheckCircle, 
  AlertCircle, Brain, Sparkles, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HRDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employees: Array<{ id: string; first_name: string; last_name: string }>;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'contrato', label: 'Contrato de trabajo' },
  { value: 'anexo', label: 'Anexo contractual' },
  { value: 'dni', label: 'DNI/NIE' },
  { value: 'titulo', label: 'Título académico' },
  { value: 'certificado', label: 'Certificado formación' },
  { value: 'vida_laboral', label: 'Vida laboral' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'ss', label: 'Documento SS' },
  { value: 'medico', label: 'Certificado médico' },
  { value: 'prl', label: 'Documento PRL' },
  { value: 'otro', label: 'Otro documento' },
];

export function HRDocumentUploadDialog({
  open,
  onOpenChange,
  companyId,
  employees,
  onSuccess
}: HRDocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [indexWithAI, setIndexWithAI] = useState(true);
  const [notes, setNotes] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'indexing' | 'done' | 'error'>('idle');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    if (!documentName) {
      setDocumentName(selectedFile.name);
    }
  }, [documentName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const resetForm = () => {
    setFile(null);
    setEmployeeId('');
    setDocumentType('');
    setDocumentName('');
    setExpiryDate('');
    setIsConfidential(false);
    setIndexWithAI(true);
    setNotes('');
    setUploadProgress(0);
    setUploadStage('idle');
  };

  const handleUpload = async () => {
    if (!file || !employeeId || !documentType) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    setUploading(true);
    setUploadStage('uploading');
    setUploadProgress(10);

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${companyId}/${employeeId}/${documentType}/${Date.now()}.${fileExt}`;
      
      setUploadProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('hr-employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('hr-employee-documents')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      setUploadProgress(60);

      // 3. Create document record using direct fetch to bypass type inference
      const insertResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_employee_documents`,
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
            employee_id: employeeId,
            document_name: documentName || file.name,
            document_type: documentType,
            storage_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            expiry_date: expiryDate || null,
            is_confidential: isConfidential,
            notes: notes || null,
            ai_indexed: false
          })
        }
      );

      if (!insertResponse.ok) throw new Error('Failed to insert document');
      
      const docDataArray = await insertResponse.json();
      const docData = docDataArray[0];

      setUploadProgress(70);

      // 4. Index with AI if enabled
      if (indexWithAI && docData) {
        setUploadStage('indexing');
        setUploadProgress(80);

        try {
          const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('intelligent-ocr', {
            body: { 
              fileUrl,
              extract_tables: true,
              extract_entities: true 
            }
          });

          if (!ocrError && ocrResult) {
            await supabase
              .from('erp_hr_employee_documents')
              .update({
                ai_indexed: true,
                ai_indexed_at: new Date().toISOString(),
                ai_summary: ocrResult.extracted_text?.substring(0, 500),
                ai_document_type: ocrResult.document_type,
                ai_confidence: ocrResult.confidence,
                ai_extracted_data: ocrResult.structured_data || {},
                ai_entities: ocrResult.entities || [],
                searchable_content: ocrResult.extracted_text
              })
              .eq('id', (docData as any).id);
          }
        } catch (aiErr) {
          console.error('AI indexing error (non-blocking):', aiErr);
          // Continue without AI indexing
        }
      }

      setUploadProgress(100);
      setUploadStage('done');
      
      toast.success('Documento subido correctamente');
      
      setTimeout(() => {
        resetForm();
        onSuccess();
      }, 1000);

    } catch (err) {
      console.error('Upload error:', err);
      setUploadStage('error');
      toast.error('Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!uploading) {
        onOpenChange(o);
        if (!o) resetForm();
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documento
            <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Sube documentación del empleado. Se procesará automáticamente con IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zona de arrastre */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}
              ${file ? 'bg-emerald-500/5 border-emerald-500/30' : ''}
            `}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-emerald-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setDocumentName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arrastra un archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Excel, Imágenes (máx. 10MB)
                </p>
              </>
            )}
          </div>

          {/* Campos del formulario */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Empleado *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de documento *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nombre del documento</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Nombre descriptivo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fecha de vencimiento
              </Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-6">
              <Label>Confidencial</Label>
              <Switch
                checked={isConfidential}
                onCheckedChange={setIsConfidential}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Indexar con IA</p>
                <p className="text-xs text-muted-foreground">
                  Extrae texto y permite búsqueda inteligente
                </p>
              </div>
            </div>
            <Switch
              checked={indexWithAI}
              onCheckedChange={setIndexWithAI}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre el documento..."
              rows={2}
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {uploadStage === 'uploading' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo archivo...
                    </>
                  )}
                  {uploadStage === 'indexing' && (
                    <>
                      <Brain className="h-4 w-4 animate-pulse text-emerald-500" />
                      Procesando con IA...
                    </>
                  )}
                  {uploadStage === 'done' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Completado
                    </>
                  )}
                  {uploadStage === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Error
                    </>
                  )}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!file || !employeeId || !documentType || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Subir documento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRDocumentUploadDialog;
