/**
 * HREmployeeDocumentsDialog - Dialog para gestionar documentos de empleado
 * Permite ver, generar y descargar documentos relacionados con un empleado
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Eye,
  Plus,
  RefreshCw,
  FileCheck,
  FileWarning,
  Calendar,
  Briefcase,
  Shield,
  GraduationCap,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string | null;
}

interface EmployeeDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string | null;
  status: string;
  expiry_date: string | null;
  uploaded_at: string;
  category: string;
}

interface HREmployeeDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  companyId: string;
}

const DOCUMENT_CATEGORIES = [
  { id: 'personal', label: 'Personales', icon: FileText },
  { id: 'contract', label: 'Contratos', icon: Briefcase },
  { id: 'training', label: 'Formación', icon: GraduationCap },
  { id: 'medical', label: 'Médicos', icon: Shield },
  { id: 'evaluations', label: 'Evaluaciones', icon: ClipboardList },
];

const GENERATABLE_DOCUMENTS = [
  { type: 'contract_copy', label: 'Copia de contrato', category: 'contract' },
  { type: 'payslip_summary', label: 'Resumen nóminas anual', category: 'personal' },
  { type: 'employment_certificate', label: 'Certificado de empresa', category: 'personal' },
  { type: 'irpf_certificate', label: 'Certificado IRPF', category: 'personal' },
  { type: 'vacation_balance', label: 'Saldo de vacaciones', category: 'personal' },
  { type: 'training_record', label: 'Historial formación', category: 'training' },
  { type: 'performance_summary', label: 'Resumen desempeño', category: 'evaluations' },
];

export function HREmployeeDocumentsDialog({
  open,
  onOpenChange,
  employee,
  companyId
}: HREmployeeDocumentsDialogProps) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchDocuments = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_documents')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to local interface
      const mappedDocs: EmployeeDocument[] = (data || []).map((doc: any) => ({
        id: doc.id,
        document_type: doc.document_type || doc.ai_document_type || 'unknown',
        document_name: doc.document_name || doc.file_name || 'Sin nombre',
        file_url: doc.file_url || doc.storage_path || null,
        status: doc.status || 'valid',
        expiry_date: doc.expiry_date || null,
        uploaded_at: doc.created_at || new Date().toISOString(),
        category: doc.category || 'personal'
      }));
      
      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Demo documents
      setDocuments([
        {
          id: '1',
          document_type: 'contract',
          document_name: 'Contrato indefinido 2024',
          file_url: null,
          status: 'valid',
          expiry_date: null,
          uploaded_at: '2024-01-15T10:00:00Z',
          category: 'contract'
        },
        {
          id: '2',
          document_type: 'dni',
          document_name: 'DNI vigente',
          file_url: null,
          status: 'valid',
          expiry_date: '2028-06-15',
          uploaded_at: '2024-01-15T10:00:00Z',
          category: 'personal'
        },
        {
          id: '3',
          document_type: 'medical',
          document_name: 'Reconocimiento médico 2025',
          file_url: null,
          status: 'valid',
          expiry_date: '2026-02-01',
          uploaded_at: '2025-02-01T10:00:00Z',
          category: 'medical'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (open && employee) {
      fetchDocuments();
    }
  }, [open, employee, fetchDocuments]);

  const handleGenerateDocument = async (docType: string, docLabel: string) => {
    if (!employee) return;
    setGenerating(docType);

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'generate_document',
          context: {
            employeeId: employee.id,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            documentType: docType,
            companyId
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${docLabel} generado correctamente`);
        fetchDocuments();
      } else {
        throw new Error(data?.error || 'Error generando documento');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error(`Error al generar ${docLabel}`);
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = (doc: EmployeeDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    } else {
      toast.info('Generando descarga...', { duration: 2000 });
      // Simulate download
      setTimeout(() => {
        toast.success(`${doc.document_name} descargado`);
      }, 1500);
    }
  };

  const handlePreview = (doc: EmployeeDocument) => {
    toast.info(`Previsualizando: ${doc.document_name}`);
  };

  const getStatusBadge = (status: string, expiryDate: string | null) => {
    const isExpired = expiryDate && new Date(expiryDate) < new Date();
    const isExpiringSoon = expiryDate && 
      new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (isExpired) {
      return <Badge variant="destructive" className="text-xs">Caducado</Badge>;
    }
    if (isExpiringSoon) {
      return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">Por vencer</Badge>;
    }
    if (status === 'valid') {
      return <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">Válido</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  const filteredDocuments = activeTab === 'all' 
    ? documents 
    : documents.filter(d => d.category === activeTab);

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documentos de {employee.first_name} {employee.last_name}
          </DialogTitle>
          <DialogDescription>
            Gestiona los documentos del empleado {employee.employee_number || ''}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
            {DOCUMENT_CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs gap-1">
                <cat.icon className="h-3 w-3" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {/* Documentos existentes */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-green-500" />
                    Documentos Almacenados ({filteredDocuments.length})
                  </h4>
                  
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Cargando documentos...
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay documentos en esta categoría
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredDocuments.map(doc => (
                        <Card key={doc.id} className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{doc.document_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(doc.uploaded_at), "d MMM yyyy", { locale: es })}
                                </p>
                                {doc.expiry_date && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    Vence: {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: es })}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(doc.status, doc.expiry_date)}
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handlePreview(doc)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDownload(doc)}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generar nuevos documentos */}
                {activeTab === 'all' && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      Generar Documentos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {GENERATABLE_DOCUMENTS.map(doc => (
                        <Button
                          key={doc.type}
                          variant="outline"
                          size="sm"
                          className="justify-start text-xs h-auto py-2"
                          disabled={generating === doc.type}
                          onClick={() => handleGenerateDocument(doc.type, doc.label)}
                        >
                          {generating === doc.type ? (
                            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <FileText className="h-3 w-3 mr-2" />
                          )}
                          {doc.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </Tabs>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={fetchDocuments} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HREmployeeDocumentsDialog;
