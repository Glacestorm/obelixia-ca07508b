/**
 * EmployeeDocumentsSection — "Mis documentos" del Portal del Empleado
 * V2-RRHH-P3: Added document upload capability + completeness indicator
 */
import { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderOpen, Search, FileText, Download, Upload, Eye,
  AlertTriangle, CheckCircle2, Clock, Paperclip, History,
  XCircle, Filter, Loader2, Plus, ShieldCheck,
} from 'lucide-react';
import { useHRDocumentExpedient, type EmployeeDocument, type DocumentCategory } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { DocumentDetailPanel } from '@/components/erp/hr/document-expedient/DocumentDetailPanel';
import { DocTrafficLightBadge } from '@/components/erp/hr/shared/DocTrafficLightBadge';
import { DocAlertsSummaryBar } from '@/components/erp/hr/shared/DocAlertsSummaryBar';
import { DocStatusBadge } from '@/components/erp/hr/shared/DocStatusBadge';
import { ExpedientExecutiveSummary } from '@/components/erp/hr/shared/ExpedientExecutiveSummary';
import { useDocumentVersionCounts } from '@/hooks/erp/hr/useDocumentVersionCounts';
import { computeDocStatus } from '@/components/erp/hr/shared/documentStatusEngine';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  employee: EmployeeProfile;
}

type DocView = 'all' | 'received' | 'pending' | 'alerts';

const CATEGORY_LABELS: Record<string, string> = {
  personal: 'Personal', contract: 'Contratos', payroll: 'Nómina',
  compliance: 'Compliance', medical: 'Médicos', training: 'Formación',
  legal: 'Legal', mobility: 'Movilidad',
};

const STATUS_FRIENDLY: Record<string, string> = {
  draft: 'Borrador', pending_review: 'En revisión', pending_submission: 'Pendiente de envío',
  submitted: 'Enviado', approved: 'Aprobado', rejected: 'Rechazado', expired: 'Caducado',
  active: 'Activo', archived: 'Archivado',
};

const UPLOAD_TYPES = [
  { value: 'personal', label: 'Documento personal' },
  { value: 'justificante', label: 'Justificante' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'formacion', label: 'Formación / Titulación' },
  { value: 'medico', label: 'Documento médico' },
  { value: 'otro', label: 'Otro' },
];

export function EmployeeDocumentsSection({ employee }: Props) {
  const {
    documents, isLoadingDocuments, logAccess,
    selectedDocumentId, setSelectedDocumentId,
  } = useHRDocumentExpedient(employee.company_id);

  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<DocView>('all');
  const [showUpload, setShowUpload] = useState(false);

  // Filter to own documents only
  const myDocs = useMemo(() =>
    documents.filter(d => d.employee_id === employee.id),
    [documents, employee.id]
  );

  // Categorize documents
  const { received, pending, alerts } = useMemo(() => {
    const now = new Date();
    const received: EmployeeDocument[] = [];
    const pending: EmployeeDocument[] = [];
    const alerts: EmployeeDocument[] = [];

    for (const d of myDocs) {
      const status = computeDocStatus(d.document_type, d.expiry_date, now);
      const isPending = d.document_status === 'draft' || d.document_status === 'pending_submission' || d.document_status === 'pending_review';
      const isAlert = d.document_status === 'rejected' || d.document_status === 'expired' || status.status === 'expired' || status.status === 'expiring';

      if (isAlert) alerts.push(d);
      if (isPending) pending.push(d);
      if (!isPending) received.push(d);
    }

    return { received, pending, alerts };
  }, [myDocs]);

  // Document completeness
  const completeness = useMemo(() => {
    const requiredTypes = ['dni_nie', 'contrato_trabajo', 'irpf_modelo_145', 'alta_ss', 'cuenta_bancaria'];
    const presentTypes = new Set(myDocs.map(d => d.document_type));
    const have = requiredTypes.filter(t => presentTypes.has(t)).length;
    const total = requiredTypes.length;
    const percent = total > 0 ? Math.round((have / total) * 100) : 100;
    const missing = requiredTypes.filter(t => !presentTypes.has(t));
    return { have, total, percent, missing };
  }, [myDocs]);

  // Apply search + tab filter
  const viewDocs = useMemo(() => {
    let base: EmployeeDocument[];
    switch (activeView) {
      case 'received': base = received; break;
      case 'pending': base = pending; break;
      case 'alerts': base = alerts; break;
      default: base = myDocs;
    }
    if (!search) return base;
    const s = search.toLowerCase();
    return base.filter(d =>
      d.document_name.toLowerCase().includes(s) || d.document_type.toLowerCase().includes(s)
    );
  }, [activeView, myDocs, received, pending, alerts, search]);

  // Version counts
  const docIds = useMemo(() => myDocs.map(d => d.id), [myDocs]);
  const { countsMap: versionCounts } = useDocumentVersionCounts(docIds);
  const docsWithVersionHistory = useMemo(() => {
    let c = 0;
    versionCounts.forEach(v => { if (v > 1) c++; });
    return c;
  }, [versionCounts]);

  const handleView = (doc: EmployeeDocument) => {
    setSelectedDocumentId(doc.id);
    logAccess.mutate({ document_id: doc.id, action: 'view' });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Mis Documentos
            </h2>
            <p className="text-sm text-muted-foreground">
              Tu expediente documental personal. Consulta, descarga o aporta documentos.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Aportar documento
          </Button>
        </div>

        {/* Completeness indicator */}
        <Card className="border-0 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Completitud documental</span>
              </div>
              <span className={`text-sm font-bold ${completeness.percent === 100 ? 'text-emerald-600' : completeness.percent >= 60 ? 'text-amber-600' : 'text-destructive'}`}>
                {completeness.percent}%
              </span>
            </div>
            <Progress
              value={completeness.percent}
              className="h-2"
            />
            {completeness.missing.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Pendientes:</span>
                {completeness.missing.map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
                    {t.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}
            {completeness.percent === 100 && (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Documentación básica completa
              </p>
            )}
          </CardContent>
        </Card>

        {/* Executive summary */}
        {!isLoadingDocuments && myDocs.length > 0 && (
          <ExpedientExecutiveSummary
            docs={myDocs}
            completeness={null}
            docsWithVersionHistory={docsWithVersionHistory}
          />
        )}

        {/* Alerts bar */}
        <DocAlertsSummaryBar docs={myDocs} />

        {/* Tabs by view */}
        <Tabs value={activeView} onValueChange={v => setActiveView(v as DocView)}>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="all" className="text-xs gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Todos
                <Badge variant="secondary" className="text-[10px] h-4 px-1">{myDocs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="received" className="text-xs gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Recibidos
                <Badge variant="secondary" className="text-[10px] h-4 px-1">{received.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Pendientes
                {pending.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-700 border-amber-500/30">{pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Alertas
                {alerts.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-500/10 text-red-700 border-red-500/30">{alerts.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Content: document list */}
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewDocs.length === 0 ? (
            <Card className="mt-4 border-dashed">
              <CardContent className="py-10 text-center">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {activeView === 'alerts' ? 'No hay documentos con alertas — ¡todo en orden!'
                    : activeView === 'pending' ? 'No hay documentos pendientes de aportar'
                    : search ? 'No se encontraron documentos con ese criterio'
                    : 'Tu expediente documental está vacío'}
                </p>
                {activeView === 'all' && !search && myDocs.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Los documentos aparecerán aquí cuando RRHH los registre en tu expediente
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-2 mt-4">
                {viewDocs.map(doc => {
                  const hasFile = !!doc.storage_path || !!doc.file_name;
                  const vCount = versionCounts.get(doc.id) ?? 0;
                  const catLabel = CATEGORY_LABELS[doc.category] || doc.category;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer gap-3"
                      onClick={() => handleView(doc)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{catLabel}</span>
                            <span>·</span>
                            <span>{doc.document_type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {hasFile && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Archivo adjunto</TooltipContent>
                          </Tooltip>
                        )}
                        {vCount > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 bg-sky-500/10 text-sky-700 border-sky-500/20">
                                <History className="h-2.5 w-2.5" />v{vCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{vCount} versiones</TooltipContent>
                          </Tooltip>
                        )}
                        <DocTrafficLightBadge documentType={doc.document_type} expiryDate={doc.expiry_date} />
                        <DocStatusBadge status={doc.document_status} />
                        {!hasFile && doc.document_status === 'draft' && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
                            <Upload className="h-2.5 w-2.5 mr-0.5" /> Pendiente
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </Tabs>
      </div>

      {/* Detail panel slide-over (reused) */}
      {selectedDocumentId && (
        <DocumentDetailPanel
          companyId={employee.company_id}
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}

      {/* Upload dialog */}
      <EmployeeDocUploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        employee={employee}
      />
    </>
  );
}

// ─── Upload Dialog ──────────────────────────────────────────────────────────

function EmployeeDocUploadDialog({ open, onClose, employee }: {
  open: boolean; onClose: () => void; employee: EmployeeProfile;
}) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !docType || !docName.trim()) {
      toast.error('Completa todos los campos antes de subir');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const ext = file.name.split('.').pop() || 'pdf';
      const storagePath = `employees/${employee.id}/uploads/${Date.now()}_${docName.trim().replace(/\s+/g, '_')}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await (supabase as any)
        .from('erp_hr_employee_documents')
        .insert({
          employee_id: employee.id,
          company_id: employee.company_id,
          document_name: docName.trim(),
          document_type: docType,
          category: docType === 'medico' ? 'medical' : docType === 'formacion' ? 'training' : 'personal',
          document_status: 'pending_review',
          storage_path: storagePath,
          storage_bucket: 'hr-documents',
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: employee.id,
        });

      if (insertError) throw insertError;

      toast.success('Documento aportado correctamente', {
        description: 'Será revisado por RRHH.',
      });

      // Reset
      setFile(null);
      setDocType('');
      setDocName('');
      onClose();
    } catch (err) {
      console.error('[EmployeeDocUpload] error:', err);
      toast.error('Error al subir el documento');
    } finally {
      setUploading(false);
    }
  }, [file, docType, docName, employee, onClose]);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Aportar documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo..." />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nombre del documento</Label>
            <Input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="Ej: Certificado de formación..."
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Archivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 h-20 flex-col border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  PDF, JPG, PNG, DOC · Máx. 10 MB
                </span>
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || !docType || !docName.trim()}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
