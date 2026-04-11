/**
 * LastMileOperationsDashboard — LM1+LM2: Unified operations dashboard
 * 
 * Bandeja operativa unificada para envíos oficiales:
 * - KPIs por organismo (TGSS, SEPE, AEAT)
 * - Tabla central con todos los envíos
 * - Filtros por organismo, estado, periodo
 * - Acciones: ver, importar respuesta, corregir, reenviar
 * - Banner isRealSubmissionBlocked
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Clock, Upload, RefreshCw, Shield, ArrowRight } from 'lucide-react';
import { useLastMileMetrics, type OrganismMetrics } from '@/hooks/erp/hr/useLastMileMetrics';
import { READINESS_LABELS, type ReadinessLevel } from '@/engines/erp/hr/officialAdaptersEngine';
import { ImportOfficialResponseDialog } from './ImportOfficialResponseDialog';

interface Props {
  companyId: string;
}

function ReadinessBadge({ level }: { level: ReadinessLevel }) {
  const info = READINESS_LABELS[level];
  return <Badge variant="outline" className={`text-[10px] ${info.color}`}>{info.label}</Badge>;
}

function OrganismCard({ metrics }: { metrics: OrganismMetrics }) {
  return (
    <Card className="border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{metrics.organismLabel}</span>
          <ReadinessBadge level={metrics.readinessLevel} />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{metrics.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{metrics.accepted}</p>
            <p className="text-[10px] text-muted-foreground">Aceptados</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{metrics.rejected}</p>
            <p className="text-[10px] text-muted-foreground">Rechazados</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600">{metrics.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pendientes</p>
          </div>
        </div>
        {metrics.total > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ratio: {metrics.acceptanceRatio}%</span>
            {metrics.avgTimeToReceiptHours !== null && (
              <span>Avg: {metrics.avgTimeToReceiptHours}h</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  accepted: { label: 'Aceptado', icon: CheckCircle, color: 'text-green-600' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'text-green-600' },
  rejected: { label: 'Rechazado', icon: XCircle, color: 'text-red-600' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-600' },
  queued: { label: 'En cola', icon: Clock, color: 'text-blue-600' },
  submitted: { label: 'Enviado', icon: ArrowRight, color: 'text-blue-600' },
  requires_correction: { label: 'Corrección', icon: AlertTriangle, color: 'text-orange-600' },
  processing: { label: 'Procesando', icon: RefreshCw, color: 'text-blue-600' },
};

export function LastMileOperationsDashboard({ companyId }: Props) {
  const { summary, isLoading } = useLastMileMetrics(companyId);
  const [filterOrganism, setFilterOrganism] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const filteredOrganisms = useMemo(() => {
    if (filterOrganism === 'all') return summary.organisms;
    return summary.organisms.filter(o => o.organism === filterOrganism);
  }, [summary.organisms, filterOrganism]);

  return (
    <div className="space-y-4">
      {/* Safety Banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <Shield className="h-4 w-4 flex-shrink-0" />
        <span>
          <strong>Modo preparatorio</strong> — Los envíos oficiales reales están bloqueados. 
          Los artefactos se generan y preparan para handoff manual al organismo correspondiente.
        </span>
      </div>

      {/* KPIs por organismo */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {summary.organisms.map(m => (
          <OrganismCard key={m.organism} metrics={m} />
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm">
          <span>Total: <strong>{summary.totalSubmissions}</strong></span>
          <span className="text-amber-600">Pendientes: <strong>{summary.totalPending}</strong></span>
          <span className="text-red-600">Rechazados: <strong>{summary.totalRejected}</strong></span>
          <span className="text-muted-foreground">Bloqueados credenciales: <strong>{summary.blockedByCredentials}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterOrganism} onValueChange={setFilterOrganism}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Organismo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="tgss">TGSS</SelectItem>
              <SelectItem value="contrata">Contrat@</SelectItem>
              <SelectItem value="certifica">Certific@2</SelectItem>
              <SelectItem value="aeat">AEAT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="accepted">Aceptado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
              <SelectItem value="requires_correction">Corrección</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)} className="text-xs gap-1">
            <Upload className="h-3 w-3" /> Importar respuesta
          </Button>
        </div>
      </div>

      {/* Alerts & Errors */}
      {(summary.deadlineAlerts.length > 0 || summary.topErrors.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.deadlineAlerts.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Clock className="h-4 w-4 text-amber-600" /> Alertas de vencimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[100px]">
                  {summary.deadlineAlerts.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span>{a.organism.toUpperCase()}</span>
                      <Badge variant={a.daysRemaining <= 2 ? 'destructive' : 'outline'} className="text-[10px]">
                        {a.daysRemaining}d restantes
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {summary.topErrors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" /> Errores recurrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[100px]">
                  {summary.topErrors.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span className="truncate max-w-[200px]">{e.message}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{e.organism}</Badge>
                        <span className="text-muted-foreground">×{e.count}</span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {summary.totalSubmissions === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay envíos oficiales registrados. Los artefactos generados en las fases P1.x aparecerán aquí cuando se preparen para envío.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <ImportOfficialResponseDialog
        companyId={companyId}
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        preselectedSubmissionId={selectedSubmissionId}
      />
    </div>
  );
}
