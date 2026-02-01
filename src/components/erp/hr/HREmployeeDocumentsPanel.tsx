/**
 * HREmployeeDocumentsPanel - Gestión de documentación por empleado con IA
 * Subida de documentos, indexación IA, búsqueda semántica
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  FileText, Upload, Download, Search, Filter, Eye,
  File, FileImage, FileSpreadsheet, FileType,
  Clock, AlertTriangle, CheckCircle, Trash2, RefreshCw,
  User, Lock, Brain, Sparkles, Bot, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HRDocumentUploadDialog } from './HRDocumentUploadDialog';

interface HREmployeeDocumentsPanelProps {
  companyId: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  expiry_date?: string;
  is_confidential?: boolean;
  ai_indexed?: boolean;
  ai_summary?: string;
  ai_document_type?: string;
  ai_confidence?: number;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
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

export function HREmployeeDocumentsPanel({ companyId }: HREmployeeDocumentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [indexingDocId, setIndexingDocId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Fetch documents using direct fetch to avoid TS2589
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_employee_documents?company_id=eq.${companyId}&select=id,employee_id,document_name,document_type,storage_path,file_size,mime_type,expiry_date,is_confidential,ai_indexed,ai_summary,ai_document_type,ai_confidence,created_at,erp_hr_employees(first_name,last_name)&order=created_at.desc`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      const mappedDocs = (data || []).map((doc: any) => ({
        ...doc,
        file_url: doc.storage_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hr-employee-documents/${doc.storage_path}` : '',
        employee: doc.erp_hr_employees
      }));
      setDocuments(mappedDocs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch employees for filter using direct fetch
  const fetchEmployees = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_employees?company_id=eq.${companyId}&is_active=eq.true&select=id,first_name,last_name`;
      
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
    fetchDocuments();
    fetchEmployees();
  }, [fetchDocuments, fetchEmployees]);

  // Index document with AI
  const indexDocumentWithAI = async (docId: string, fileUrl: string) => {
    setIndexingDocId(docId);
    try {
      // Call OCR/document intelligence
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('intelligent-ocr', {
        body: { 
          fileUrl,
          extract_tables: true,
          extract_entities: true 
        }
      });

      if (ocrError) throw ocrError;

      // Update document with AI data
      const { error: updateError } = await supabase
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
        .eq('id', docId);

      if (updateError) throw updateError;

      toast.success('Documento indexado con IA');
      fetchDocuments();
    } catch (err) {
      console.error('Error indexing document:', err);
      toast.error('Error al indexar documento');
    } finally {
      setIndexingDocId(null);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const employeeName = doc.employee 
      ? `${doc.employee.first_name} ${doc.employee.last_name}`.toLowerCase() 
      : '';
    const matchesSearch = doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employeeName.includes(searchTerm.toLowerCase()) ||
                         (doc.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEmployee = selectedEmployee === 'all' || doc.employee_id === selectedEmployee;
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    return matchesSearch && matchesEmployee && matchesType;
  });

  // Stats
  const stats = {
    totalDocuments: documents.length,
    indexedDocs: documents.filter(d => d.ai_indexed).length,
    expiringDocs: documents.filter(d => {
      if (!d.expiry_date) return false;
      const expiry = new Date(d.expiry_date);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return expiry <= thirtyDays && expiry > new Date();
    }).length,
    confidentialDocs: documents.filter(d => d.is_confidential).length,
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-4 w-4 text-muted-foreground" />;
    if (mimeType.includes('pdf')) return <FileType className="h-4 w-4 text-destructive" />;
    if (mimeType.includes('image')) return <FileImage className="h-4 w-4 text-primary" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) 
      return <FileSpreadsheet className="h-4 w-4 text-accent-foreground" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays && expiry > new Date();
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas con IA */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total documentos</p>
                <p className="text-lg font-bold">{stats.totalDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Indexados IA</p>
                <p className="text-lg font-bold">{stats.indexedDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Por vencer</p>
                <p className="text-lg font-bold">{stats.expiringDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Confidenciales</p>
                <p className="text-lg font-bold">{stats.confidentialDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentación de Empleados
                <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </CardTitle>
              <CardDescription>
                Gestión de documentos con indexación y búsqueda inteligente
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchDocuments}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Subir documento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en documentos (nombre, contenido IA)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de documentos */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>IA</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.mime_type)}
                          <div>
                            <span className="font-medium text-sm">{doc.document_name}</span>
                            {doc.ai_summary && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.ai_summary.substring(0, 60)}...
                              </p>
                            )}
                          </div>
                          {doc.is_confidential && (
                            <Lock className="h-3 w-3 text-purple-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.employee 
                          ? `${doc.employee.first_name} ${doc.employee.last_name}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.ai_indexed ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-muted-foreground">
                              {doc.ai_confidence ? `${Math.round(doc.ai_confidence * 100)}%` : 'OK'}
                            </span>
                          </div>
                        ) : indexingDocId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => indexDocumentWithAI(doc.id, doc.file_url)}
                            className="h-7 px-2"
                          >
                            <Bot className="h-3 w-3 mr-1" />
                            Indexar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <div className="flex items-center gap-1">
                            {isExpired(doc.expiry_date) ? (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                                Vencido
                              </Badge>
                            ) : isExpiringSoon(doc.expiry_date) ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                                {new Date(doc.expiry_date).toLocaleDateString()}
                              </Badge>
                            ) : (
                              <span className="text-sm">
                                {new Date(doc.expiry_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Ver"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Descargar"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = doc.file_url;
                              a.download = doc.document_name;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {!loading && filteredDocuments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron documentos</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="h-4 w-4 mr-1" />
                Subir primer documento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aviso de documentos por vencer */}
      {stats.expiringDocs > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700">Documentos por vencer</p>
                <p className="text-muted-foreground">
                  Hay {stats.expiringDocs} documento(s) que vencen en los próximos 30 días. 
                  Revise y actualice la documentación.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de subida */}
      <HRDocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        companyId={companyId}
        employees={employees}
        onSuccess={() => {
          fetchDocuments();
          setShowUploadDialog(false);
        }}
      />
    </div>
  );
}

export default HREmployeeDocumentsPanel;
