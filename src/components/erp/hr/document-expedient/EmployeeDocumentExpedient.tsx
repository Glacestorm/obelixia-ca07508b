/**
 * EmployeeDocumentExpedient — Expediente documental del empleado con datos reales
 * Categorías: Personal, Contratos, Nómina, Compliance, Médicos, Formación, Legal, Movilidad
 * V2-ES.4 Paso 6+: Incluye resumen ejecutivo, indicadores de archivo/versión y generación
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderOpen, Upload, Search, FileText, ShieldCheck, AlertTriangle,
  Eye, Download, CheckCircle2, XCircle, Clock, Paperclip, History
} from 'lucide-react';
import { useHRDocumentExpedient, type DocumentCategory, type EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { useHRDocumentStorage } from '@/hooks/erp/hr/useHRDocumentStorage';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { DocumentOriginBadge, ORIGIN_FILTER_OPTIONS, filterByOrigin, type OriginFilterValue } from '../shared/DocumentOriginBadge';
import { DocTrafficLightBadge } from '../shared/DocTrafficLightBadge';
import { DocAlertsSummaryBar } from '../shared/DocAlertsSummaryBar';
import { DocStatusBadge } from '../shared/DocStatusBadge';
import { DocumentAlertsSummary } from '../shared/DocumentAlertsSummary';
import { ExpedientExecutiveSummary } from '../shared/ExpedientExecutiveSummary';
import { RegistrationSummaryWidget } from '../shared/RegistrationSummaryWidget';
import { ContractSummaryWidget } from '../shared/ContractSummaryWidget';
import { DocGenerationBadge } from '../shared/DocGenerationBadge';
import { useDocumentVersionCounts } from '@/hooks/erp/hr/useDocumentVersionCounts';
import { useHRHolidayCalendar } from '@/hooks/erp/hr/useHRHolidayCalendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  companyId: string;
  employeeId?: string;
}

const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; icon: typeof FileText; color: string }> = {
  personal: { label: 'Personal', icon: FolderOpen, color: 'text-blue-600' },
  contract: { label: 'Contratos', icon: FileText, color: 'text-indigo-600' },
  payroll: { label: 'Nómina', icon: FileText, color: 'text-emerald-600' },
  compliance: { label: 'Compliance', icon: ShieldCheck, color: 'text-amber-600' },
  medical: { label: 'Médicos', icon: FileText, color: 'text-red-600' },
  training: { label: 'Formación', icon: FileText, color: 'text-purple-600' },
  legal: { label: 'Legal', icon: FileText, color: 'text-slate-600' },
  mobility: { label: 'Movilidad', icon: FileText, color: 'text-cyan-600' },
};

export function EmployeeDocumentExpedient({ companyId, employeeId }: Props) {
  const {
    documents, isLoadingDocuments, logAccess, verifyIntegrity,
    selectedDocumentId, setSelectedDocumentId, getExpedientStats,
  } = useHRDocumentExpedient(companyId);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<OriginFilterValue>('all');
  const [detailInitialTab, setDetailInitialTab] = useState<string>('info');

  // Storage hook for signed URL generation (on-demand, no extra fetches)
  const { getDownloadUrl } = useHRDocumentStorage(companyId);

  // Calendar label for executive summary
  const { calendarLabel } = useHRHolidayCalendar();

  const filtered = filterByOrigin(
    documents.filter(d => {
      if (employeeId && d.employee_id !== employeeId) return false;
      if (filterCategory !== 'all' && d.category !== filterCategory) return false;
      if (search) {
        const s = search.toLowerCase();
        return d.document_name.toLowerCase().includes(s) || d.document_type.toLowerCase().includes(s);
      }
      return true;
    }),
    filterOrigin,
  );

  const grouped = Object.entries(CATEGORY_CONFIG).reduce((acc, [cat]) => {
    acc[cat] = filtered.filter(d => d.category === cat);
    return acc;
  }, {} as Record<string, EmployeeDocument[]>);

  const stats = getExpedientStats();

  // Version counts for indicator badges
  const documentIds = useMemo(() => filtered.map(d => d.id), [filtered]);
  const { countsMap: versionCounts } = useDocumentVersionCounts(documentIds);

  // Count docs with version history for executive summary
  const docsWithVersionHistory = useMemo(() => {
    let count = 0;
    versionCounts.forEach(v => { if (v > 1) count++; });
    return count;
  }, [versionCounts]);

  const handleView = (doc: EmployeeDocument) => {
    setSelectedDocumentId(doc.id);
    logAccess.mutate({ document_id: doc.id, action: 'view' });
  };

  const statsRow = (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card><CardContent className="p-3 text-center">
        <p className="text-2xl font-bold">{stats.total}</p>
        <p className="text-xs text-muted-foreground">Total documentos</p>
      </CardContent></Card>
      <Card><CardContent className="p-3 text-center">
        <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
        <p className="text-xs text-muted-foreground">Vencen pronto</p>
      </CardContent></Card>
      <Card><CardContent className="p-3 text-center">
        <p className="text-2xl font-bold text-red-600">{stats.unverified}</p>
        <p className="text-xs text-muted-foreground">Sin verificar</p>
      </CardContent></Card>
      <Card><CardContent className="p-3 text-center">
        <p className="text-2xl font-bold text-emerald-600">{stats.activeConsents}</p>
        <p className="text-xs text-muted-foreground">Consentimientos</p>
      </CardContent></Card>
      <Card><CardContent className="p-3 text-center">
        <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
        <p className="text-xs text-muted-foreground">Categorías</p>
      </CardContent></Card>
    </div>
  );

  const showExecutiveSummary = !isLoadingDocuments && filtered.length > 0;

  return (
    <>
      <div className="space-y-4">
        {/* S9.11-P1: Stats + Executive summary header */}
        {showExecutiveSummary ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
            {statsRow}
            <div className="lg:w-[340px]">
              <ExpedientExecutiveSummary
                docs={filtered}
                completeness={null}
                docsWithVersionHistory={docsWithVersionHistory}
                calendarLabel={calendarLabel}
              />
            </div>
          </div>
        ) : (
          statsRow
        )}

        {/* V2-ES.5 Paso 1: Registration summary (only if employee has one) */}
        {employeeId && (
          <RegistrationSummaryWidget companyId={companyId} employeeId={employeeId} />
        )}

        {/* V2-ES.6 Paso 1.1: Contract process summary */}
        {employeeId && (
          <ContractSummaryWidget companyId={companyId} employeeId={employeeId} />
        )}

        {/* Alerts summary bar (legacy) */}
        <DocAlertsSummaryBar docs={filtered} />

        {/* V2-ES.4 Paso 2.2: Alertas consolidadas con severidad */}
        <DocumentAlertsSummary docs={filtered} maxVisible={4} />

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOrigin} onValueChange={v => setFilterOrigin(v as OriginFilterValue)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORIGIN_FILTER_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" /> Subir documento
          </Button>
        </div>

        {/* Documents by category */}
        {isLoadingDocuments ? (
          <div className="text-center py-8 text-muted-foreground">Cargando expediente...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay documentos en el expediente</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(CATEGORY_CONFIG)} className="space-y-2">
            {Object.entries(grouped).filter(([, docs]) => docs.length > 0).map(([cat, docs]) => {
              const config = CATEGORY_CONFIG[cat as DocumentCategory];
              const Icon = config.icon;
              return (
                <AccordionItem key={cat} value={cat} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="font-medium text-sm">{config.label}</span>
                      <Badge variant="secondary" className="text-xs">{docs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <TooltipProvider delayDuration={200}>
                    <div className="space-y-2">
                      {docs.map(doc => {
                        const hasFile = !!doc.storage_path || !!doc.file_name;
                        const vCount = versionCounts.get(doc.id) ?? 0;
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleView(doc)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{doc.document_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.document_type} · v{doc.version}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Badges — read-only indicators */}
                              <DocGenerationBadge
                                metadata={doc.metadata as Record<string, any> | null}
                                source={doc.source}
                              />
                              {doc.integrity_verified ? (
                                <span title="Integridad verificada"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /></span>
                              ) : (
                                <span title="No verificado"><XCircle className="h-3.5 w-3.5 text-muted-foreground/40" /></span>
                              )}
                              <DocTrafficLightBadge
                                documentType={doc.document_type}
                                expiryDate={doc.expiry_date}
                              />
                              <DocStatusBadge status={doc.document_status} />
                              <DocumentOriginBadge relatedEntityType={doc.related_entity_type} />
                              {doc.is_confidential && <Badge variant="outline" className="text-[9px]">Conf.</Badge>}

                              {/* Quick actions — non-destructive */}
                              <div className="flex items-center gap-0.5 ml-1 border-l pl-1.5">
                                {hasFile && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={e => {
                                          e.stopPropagation();
                                          const url = doc.storage_path || doc.file_name;
                                          if (url) window.open(url, '_blank');
                                        }}
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Abrir archivo</TooltipContent>
                                  </Tooltip>
                                )}
                                {vCount > 1 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={e => { e.stopPropagation(); handleView(doc); }}
                                      >
                                        <History className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">{vCount} versiones — ver detalle</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={e => { e.stopPropagation(); handleView(doc); }}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Ver detalle</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </TooltipProvider>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Detail panel */}
      {selectedDocumentId && (
        <DocumentDetailPanel
          companyId={companyId}
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}
    </>
  );
}
