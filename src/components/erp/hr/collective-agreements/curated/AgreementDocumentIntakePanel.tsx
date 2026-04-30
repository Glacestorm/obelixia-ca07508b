/**
 * B13.2 — Document Intake panel.
 *
 * UI for the legal document intake queue. Strictly triage:
 *  - lists documents detected/added by Source Watcher (B13.1) or manually.
 *  - lets authorized roles claim, classify, mark duplicate, block,
 *    promote-to-extraction (status only) or dismiss.
 *
 * Hard rules:
 *  - No CTAs to activate, run payroll, run OCR or extract tables.
 *  - All mutations go through `useAgreementDocumentIntake`.
 *  - When unauthenticated, renders an "auth required" state without throwing.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Lock, FileSearch, RefreshCw } from 'lucide-react';
import {
  useAgreementDocumentIntake,
  type DocumentIntakeStatus,
  type DocumentIntakeSourceType,
  type DocumentIntakeClassification,
  type DocumentIntakeItem,
} from '@/hooks/erp/hr/useAgreementDocumentIntake';

const STATUS_VARIANT: Record<
  DocumentIntakeStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted'
> = {
  pending_review: 'warning',
  claimed_for_review: 'info',
  classified: 'success',
  duplicate: 'muted',
  blocked: 'destructive',
  ready_for_extraction: 'info',
  dismissed: 'muted',
};

function StatusBadge({ status }: { status: DocumentIntakeStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

export interface AgreementDocumentIntakePanelProps {
  className?: string;
}

export function AgreementDocumentIntakePanel({
  className,
}: AgreementDocumentIntakePanelProps) {
  const [statusFilter, setStatusFilter] = useState<DocumentIntakeStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<DocumentIntakeSourceType | 'all'>('all');
  const [classFilter, setClassFilter] = useState<DocumentIntakeClassification | 'all'>('all');
  const [actionRow, setActionRow] = useState<DocumentIntakeItem | null>(null);
  const [actionType, setActionType] = useState<
    'classify' | 'duplicate' | 'block' | 'dismiss' | null
  >(null);
  const [reason, setReason] = useState('');
  const [classification, setClassification] =
    useState<DocumentIntakeClassification>('unknown');
  const [duplicateOf, setDuplicateOf] = useState('');

  const {
    items,
    isLoading,
    error,
    authRequired,
    refresh,
    claimForReview,
    classify,
    markDuplicate,
    markBlocked,
    promoteToExtraction,
    dismiss,
  } = useAgreementDocumentIntake({
    status: statusFilter === 'all' ? undefined : statusFilter,
    source_type: sourceFilter === 'all' ? undefined : sourceFilter,
    classification: classFilter === 'all' ? undefined : classFilter,
  });

  const closeAction = () => {
    setActionRow(null);
    setActionType(null);
    setReason('');
    setDuplicateOf('');
  };

  const submitAction = async () => {
    if (!actionRow || !actionType) return;
    if (actionType === 'classify') {
      await classify({ id: actionRow.id, classification });
    } else if (actionType === 'duplicate') {
      await markDuplicate({ id: actionRow.id, duplicate_of: duplicateOf, reason });
    } else if (actionType === 'block') {
      await markBlocked({ id: actionRow.id, reason });
    } else if (actionType === 'dismiss') {
      await dismiss({ id: actionRow.id, reason });
    }
    closeAction();
  };

  const banner = useMemo(
    () => (
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
        <div className="space-y-1">
          <p className="font-medium">
            Intake documental — clasifica fuentes oficiales. No extrae tablas ni activa nómina.
          </p>
          <p className="text-xs text-muted-foreground">
            B13.2 sólo realiza triaje y clasificación humana. La extracción (B13.3) y la
            activación en nómina (B9 / B11.3B) permanecen bloqueadas.
          </p>
        </div>
      </div>
    ),
    [],
  );

  if (authRequired) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Intake documental
          </CardTitle>
        </CardHeader>
        <CardContent>
          {banner}
          <p className="mt-4 text-sm text-muted-foreground">
            Inicia sesión con un rol autorizado (superadmin, admin, legal_manager, hr_manager o
            payroll_supervisor) para gestionar el intake documental.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4" /> Intake documental — Convenios curados
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>
        {banner}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending_review">pending_review</SelectItem>
              <SelectItem value="claimed_for_review">claimed_for_review</SelectItem>
              <SelectItem value="classified">classified</SelectItem>
              <SelectItem value="duplicate">duplicate</SelectItem>
              <SelectItem value="blocked">blocked</SelectItem>
              <SelectItem value="ready_for_extraction">ready_for_extraction</SelectItem>
              <SelectItem value="dismissed">dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de fuente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fuentes</SelectItem>
              <SelectItem value="boe">boe</SelectItem>
              <SelectItem value="regcon">regcon</SelectItem>
              <SelectItem value="boletin_autonomico">boletin_autonomico</SelectItem>
              <SelectItem value="bop_provincial">bop_provincial</SelectItem>
              <SelectItem value="manual_official_url">manual_official_url</SelectItem>
              <SelectItem value="other_official">other_official</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={classFilter}
            onValueChange={(v) => setClassFilter(v as typeof classFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Clasificación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las clasificaciones</SelectItem>
              <SelectItem value="new_agreement">new_agreement</SelectItem>
              <SelectItem value="salary_revision">salary_revision</SelectItem>
              <SelectItem value="errata">errata</SelectItem>
              <SelectItem value="paritaria_act">paritaria_act</SelectItem>
              <SelectItem value="scope_clarification">scope_clarification</SelectItem>
              <SelectItem value="unknown">unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {error.code}: {error.message}
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    Sin documentos en intake con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="max-w-xs">
                    <div className="text-sm font-medium">
                      {it.detected_agreement_name ?? '(sin nombre)'}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {it.source_url}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{it.source_type}</Badge>
                    {it.publication_date && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {it.publication_date}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={it.status} />
                  </TableCell>
                  <TableCell>
                    {it.classification ? (
                      <Badge variant="secondary">{it.classification}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    {it.status === 'pending_review' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void claimForReview(it.id)}
                      >
                        Reclamar revisión
                      </Button>
                    )}
                    {(it.status === 'pending_review' || it.status === 'claimed_for_review') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActionRow(it);
                          setActionType('classify');
                        }}
                      >
                        Clasificar
                      </Button>
                    )}
                    {it.status !== 'duplicate' && it.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActionRow(it);
                          setActionType('duplicate');
                        }}
                      >
                        Marcar duplicado
                      </Button>
                    )}
                    {it.status !== 'blocked' && it.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActionRow(it);
                          setActionType('block');
                        }}
                      >
                        Bloquear
                      </Button>
                    )}
                    {it.status === 'classified' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => void promoteToExtraction(it.id)}
                        title="Solo cambia el estado a ready_for_extraction. No ejecuta extracción."
                      >
                        Promover a extracción
                      </Button>
                    )}
                    {it.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActionRow(it);
                          setActionType('dismiss');
                        }}
                      >
                        Descartar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {actionRow && actionType && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 text-sm font-medium">
              {actionType === 'classify' && 'Clasificar documento'}
              {actionType === 'duplicate' && 'Marcar como duplicado'}
              {actionType === 'block' && 'Bloquear documento'}
              {actionType === 'dismiss' && 'Descartar documento'}
            </div>
            {actionType === 'classify' && (
              <Select
                value={classification}
                onValueChange={(v) =>
                  setClassification(v as DocumentIntakeClassification)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_agreement">new_agreement</SelectItem>
                  <SelectItem value="salary_revision">salary_revision</SelectItem>
                  <SelectItem value="errata">errata</SelectItem>
                  <SelectItem value="paritaria_act">paritaria_act</SelectItem>
                  <SelectItem value="scope_clarification">scope_clarification</SelectItem>
                  <SelectItem value="unknown">unknown</SelectItem>
                </SelectContent>
              </Select>
            )}
            {actionType === 'duplicate' && (
              <Input
                placeholder="UUID del documento original"
                value={duplicateOf}
                onChange={(e) => setDuplicateOf(e.target.value)}
                className="mb-2"
              />
            )}
            {actionType !== 'classify' && (
              <Textarea
                placeholder="Razón (mín. 5 caracteres)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={closeAction}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => void submitAction()}>
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementDocumentIntakePanel;