/**
 * HRAdminRequestDetail — Full detail view with actions, timeline, comments
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, ListChecks, Clock, AlertTriangle } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { HRAdminRequestTimeline } from './HRAdminRequestTimeline';
import { HRAdminRequestComments } from './HRAdminRequestComments';
import { LinkedDocumentsSection } from '../shared/LinkedDocumentsSection';
import { getRequestTypeLabel, type AdminRequest, type AdminRequestComment, type AdminRequestActivity, type AdminRequestStatus, type LinkedTask } from '@/hooks/admin/hr/useAdminPortal';
import { DocumentCompletenessIndicator } from '../shared/DocumentCompletenessIndicator';
import { ProcessDeadlinesSummary } from '../shared/ProcessDeadlinesSummary';
import { ExpedientExecutiveSummary } from '../shared/ExpedientExecutiveSummary';
import { useHRProcessDocRequirements } from '@/hooks/erp/hr/useHRProcessDocRequirements';
import type { EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/10 text-blue-700',
  high: 'bg-amber-500/10 text-amber-700',
  urgent: 'bg-red-500/10 text-red-700',
};

interface Props {
  request: AdminRequest;
  comments: AdminRequestComment[];
  activity: AdminRequestActivity[];
  linkedTasks?: LinkedTask[];
  onBack: () => void;
  onUpdateStatus: (id: string, status: AdminRequestStatus, comment?: string) => Promise<boolean>;
  onAddComment: (requestId: string, content: string, isInternal: boolean) => Promise<boolean>;
  onGenerateTasks: (requestId: string) => Promise<void>;
}

export function HRAdminRequestDetail({ request, comments, activity, linkedTasks = [], onBack, onUpdateStatus, onAddComment, onGenerateTasks }: Props) {
  const meta = (request.metadata || {}) as Record<string, any>;
  const [linkedDocs, setLinkedDocs] = useState<EmployeeDocument[]>([]);
  const { getCompleteness } = useHRProcessDocRequirements();
  const completeness = getCompleteness(request.request_type, linkedDocs);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{request.reference_number || 'Sin ref.'}</h3>
              <HRStatusBadge entity="request" status={request.status} size="md" />
              <Badge variant="outline" className={PRIORITY_COLORS[request.priority] || ''}>{request.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{getRequestTypeLabel(request.request_type)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {['submitted', 'reviewing', 'pending_approval'].includes(request.status) && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 text-amber-600" onClick={() => onUpdateStatus(request.id, 'returned', 'Solicitud devuelta para correcciones')}>
                <RotateCcw className="h-3.5 w-3.5" /> Devolver
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-red-600" onClick={() => onUpdateStatus(request.id, 'rejected', 'Solicitud rechazada')}>
                <XCircle className="h-3.5 w-3.5" /> Rechazar
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => onUpdateStatus(request.id, 'approved')}>
                <CheckCircle className="h-3.5 w-3.5" /> Aprobar
              </Button>
            </>
          )}
          {request.status === 'approved' && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onGenerateTasks(request.id)}>
                <ListChecks className="h-3.5 w-3.5" /> Generar tareas
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => onUpdateStatus(request.id, 'in_progress')}>
                Iniciar gestión
              </Button>
            </>
          )}
          {request.status === 'in_progress' && (
            <Button size="sm" className="gap-1.5" onClick={() => onUpdateStatus(request.id, 'completed')}>
              <CheckCircle className="h-3.5 w-3.5" /> Completar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Request data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Datos de la solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">{request.subject}</p>
                {request.description && <p className="text-sm text-muted-foreground mt-1">{request.description}</p>}
              </div>
              {Object.keys(meta).length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(meta).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* V2-ES.2 Paso 5: Unified timeline + comments */}
          <Card>
            <Tabs defaultValue="timeline">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="timeline" className="text-xs">Timeline unificado</TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs">Comentarios ({comments.length})</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="timeline" className="mt-0">
                  <ScrollArea className="h-[350px]">
                    <HRAdminRequestTimeline activity={activity} comments={comments} linkedTasks={linkedTasks} />
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="comments" className="mt-0">
                  <ScrollArea className="h-[350px]">
                    <HRAdminRequestComments
                      comments={comments}
                      onAddComment={(content, isInternal) => onAddComment(request.id, content, isInternal)}
                    />
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* V2-ES.3 Paso 2: Linked documents */}
          <LinkedDocumentsSection
            companyId={request.company_id}
            entityType="admin_request"
            entityId={request.id}
            employeeId={request.employee_id}
            managementType={request.request_type}
            onDocsLoaded={setLinkedDocs}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">{getRequestTypeLabel(request.request_type)}</span>
              </div>
              {request.request_subtype && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtipo</span>
                  <span>{request.request_subtype}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridad</span>
                <Badge variant="outline" className={PRIORITY_COLORS[request.priority] || ''}>{request.priority}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creada</span>
                <span>{new Date(request.created_at).toLocaleDateString('es')}</span>
              </div>
              {request.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resuelta</span>
                  <span>{new Date(request.resolved_at).toLocaleDateString('es')}</span>
                </div>
              )}
              <Separator />
              <DocumentCompletenessIndicator
                managementType={request.request_type}
                docs={linkedDocs}
              />
              <ProcessDeadlinesSummary
                processType={request.request_type}
                triggerDate={request.created_at}
              />
              <DocumentAlertsSummary
                docs={linkedDocs}
                mandatoryMissing={completeness?.mandatoryMissing}
                maxVisible={4}
              />
              <DocActionQueuePanel
                employeeId={request.employee_id}
                relatedEntityType="admin_request"
                relatedEntityId={request.id}
                docs={linkedDocs}
              />
              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Última actualización: {new Date(request.updated_at).toLocaleString('es')}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {request.attachments && (request.attachments as any[]).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Adjuntos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {(request.attachments as any[]).map((att: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border bg-muted/30">
                      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{att.name || `Archivo ${i + 1}`}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
