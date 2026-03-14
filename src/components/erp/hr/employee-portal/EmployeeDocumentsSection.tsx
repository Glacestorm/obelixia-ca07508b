/**
 * EmployeeDocumentsSection — "Mis documentos" del Portal del Empleado
 * V2-ES.9.3: Reutiliza infraestructura documental existente con UX employee-facing
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FolderOpen, Search, FileText, Download, Upload, Eye,
  AlertTriangle, CheckCircle2, Clock, Paperclip, History,
  XCircle, Filter, Loader2,
} from 'lucide-react';
import { useHRDocumentExpedient, type EmployeeDocument, type DocumentCategory } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { DocumentDetailPanel } from '../../document-expedient/DocumentDetailPanel';
import { DocTrafficLightBadge } from '../../shared/DocTrafficLightBadge';
import { DocAlertsSummaryBar } from '../../shared/DocAlertsSummaryBar';
import { DocStatusBadge } from '../../shared/DocStatusBadge';
import { ExpedientExecutiveSummary } from '../../shared/ExpedientExecutiveSummary';
import { useDocumentVersionCounts } from '@/hooks/erp/hr/useDocumentVersionCounts';
import { computeDocStatus } from '../../shared/documentStatusEngine';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';

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

export function EmployeeDocumentsSection({ employee }: Props) {
  const {
    documents, isLoadingDocuments, logAccess,
    selectedDocumentId, setSelectedDocumentId,
  } = useHRDocumentExpedient(employee.company_id);

  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<DocView>('all');

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
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Mis Documentos
          </h2>
          <p className="text-sm text-muted-foreground">
            Tu expediente documental personal. Consulta, descarga o aporta documentos.
          </p>
        </div>

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
            <Card className="mt-4">
              <CardContent className="py-10 text-center">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {activeView === 'alerts' ? 'No hay documentos con alertas'
                    : activeView === 'pending' ? 'No hay documentos pendientes'
                    : 'No hay documentos'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-2 mt-4">
                {viewDocs.map(doc => {
                  const hasFile = !!doc.storage_path || !!doc.file_name;
                  const vCount = versionCounts.get(doc.id) ?? 0;
                  const catLabel = CATEGORY_LABELS[doc.category] || doc.category;
                  const statusLabel = STATUS_FRIENDLY[doc.document_status] || doc.document_status;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer gap-3"
                      onClick={() => handleView(doc)}
                    >
                      {/* Left: info */}
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

                      {/* Right: badges + actions */}
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
    </>
  );
}
