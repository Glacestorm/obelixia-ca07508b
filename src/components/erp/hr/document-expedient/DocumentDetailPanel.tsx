/**
 * DocumentDetailPanel — Slide-over con detalle completo de un documento
 * Versiones, comentarios, access log, integridad, retención
 */
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, History, MessageSquare, Eye, ShieldCheck,
  Download, CheckCircle2, Send, Clock, Scale, RefreshCw, BookOpen,
  HardDrive, FileUp
} from 'lucide-react';
import { useHRDocumentExpedient, type DocumentVersion, type DocumentComment, type DocumentAccessLog } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCatalogEntry } from '../shared/documentCatalogES';
import { DocTrafficLightBadge } from '../shared/DocTrafficLightBadge';
import { DocStatusBadge } from '../shared/DocStatusBadge';
import { DocReconciliationBadge, isReconcilableDocType } from '../shared/DocReconciliationBadge';
import { DocReconciliationToggle } from '../shared/DocReconciliationToggle';

interface Props {
  companyId: string;
  documentId: string;
  onClose: () => void;
}

export function DocumentDetailPanel({ companyId, documentId, onClose }: Props) {
  const { documents, fetchVersions, fetchComments, fetchAccessLog, addComment, verifyIntegrity } = useHRDocumentExpedient(companyId);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [accessLog, setAccessLog] = useState<DocumentAccessLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [tab, setTab] = useState('info');

  const doc = documents.find(d => d.id === documentId);

  useEffect(() => {
    if (documentId) {
      fetchVersions(documentId).then(setVersions).catch(() => {});
      fetchComments(documentId).then(setComments).catch(() => {});
      fetchAccessLog(documentId).then(setAccessLog).catch(() => {});
    }
  }, [documentId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ document_id: documentId, comment_text: newComment });
    setNewComment('');
    fetchComments(documentId).then(setComments).catch(() => {});
  };

  if (!doc) return null;

  const catalogEntry = getCatalogEntry(doc.document_type);
  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            {doc.document_name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{doc.category}</Badge>
            <Badge variant="secondary">v{doc.version}</Badge>
            <Badge variant="outline">{doc.source}</Badge>
            <DocStatusBadge status={doc.document_status} />
            {doc.is_confidential && <Badge variant="destructive">Confidencial</Badge>}
            {doc.integrity_verified && (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Verificado
              </Badge>
            )}
            <DocReconciliationBadge
              documentType={doc.document_type}
              flags={{
                reconciled_with_payroll: doc.reconciled_with_payroll,
                reconciled_with_social_security: doc.reconciled_with_social_security,
                reconciled_with_tax: doc.reconciled_with_tax,
                reconciliation_notes: doc.reconciliation_notes,
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Descargar
            </Button>
            {!doc.integrity_verified && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => verifyIntegrity.mutate(documentId)}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verificar integridad
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
              <TabsTrigger value="versions" className="text-xs gap-1">
                <History className="h-3 w-3" /> Versiones
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs gap-1">
                <MessageSquare className="h-3 w-3" /> {comments.length}
              </TabsTrigger>
              <TabsTrigger value="log" className="text-xs gap-1">
                <Eye className="h-3 w-3" /> Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Tipo:</span> {doc.document_type}</div>
                    <div><span className="text-muted-foreground">Categoría:</span> {doc.category}</div>
                    <div><span className="text-muted-foreground">Fuente:</span> {doc.source}</div>
                    <div><span className="text-muted-foreground">Versión:</span> {doc.version}</div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-muted-foreground">Estado:</span>
                      <DocTrafficLightBadge documentType={doc.document_type} expiryDate={doc.expiry_date} />
                    </div>
                    {doc.expiry_date && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Vencimiento:</span> {doc.expiry_date}
                      </div>
                    )}
                    {doc.file_hash && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Hash:</span>{' '}
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{doc.file_hash.slice(0, 16)}...</code>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Creado:</span>{' '}
                      {formatDistanceToNow(new Date(doc.created_at), { locale: es, addSuffix: true })}
                    </div>
                  </div>

                  {/* Catalog metadata */}
                  {catalogEntry && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Información del catálogo</p>
                      {catalogEntry.legalBasis && (
                        <div className="flex items-start gap-2">
                          <Scale className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-xs">{catalogEntry.legalBasis}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs">Retención: {catalogEntry.retentionYears} años</span>
                      </div>
                      {catalogEntry.renewable && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs">Documento renovable{catalogEntry.defaultExpiryMonths ? ` (cada ${catalogEntry.defaultExpiryMonths} meses)` : ''}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs">{catalogEntry.description}</span>
                      </div>
                    </div>
                  )}

                  {/* V2-ES.4 Paso 2.4: Conciliación manual */}
                  {isReconcilableDocType(doc.document_type) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conciliación contable</p>
                      <DocReconciliationToggle
                        documentId={doc.id}
                        documentType={doc.document_type}
                        currentFlags={{
                          reconciled_with_payroll: doc.reconciled_with_payroll,
                          reconciled_with_social_security: doc.reconciled_with_social_security,
                          reconciled_with_tax: doc.reconciled_with_tax,
                          reconciliation_notes: doc.reconciliation_notes,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin historial de versiones</p>
                  ) : versions.map(v => (
                    <Card key={v.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Versión {v.version_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.change_summary ?? 'Sin descripción'}
                            {' · '}
                            {formatDistanceToNow(new Date(v.created_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                        {v.file_hash && (
                          <code className="text-xs text-muted-foreground">{v.file_hash.slice(0, 8)}</code>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comments">
              <div className="space-y-3">
                <ScrollArea className="h-[220px]">
                  <div className="space-y-2">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sin comentarios</p>
                    ) : comments.map(c => (
                      <Card key={c.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {c.is_internal && <Badge variant="outline" className="text-xs">Interno</Badge>}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { locale: es, addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{c.comment_text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Añadir comentario..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button size="icon" className="shrink-0" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="log">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {accessLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin registros de acceso</p>
                  ) : accessLog.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-2 rounded border text-sm">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium">{l.action}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(l.created_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
