/**
 * CorridorPackAdminPanel.tsx — G2.2
 * Administration UI for corridor knowledge packs.
 * List / detail / filters / governance / actions.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft, BookOpen, Copy, Archive, Power, Upload,
  Shield, Clock, AlertTriangle, CheckCircle, Filter,
  ChevronRight, History,
} from 'lucide-react';
import { useCorridorPackAdmin, type CorridorPackFilters } from '@/hooks/erp/hr/useCorridorPackAdmin';
import type { CorridorPackRow } from '@/hooks/erp/hr/useCorridorPackRepository';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  companyId?: string;
}

// ── Status badges ────────────────────────────────────────────────────────────

function PublicationBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
    published: { label: 'Publicado', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    deprecated: { label: 'Deprecado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };
  const c = config[status] ?? config.draft;
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function MaturityBadge({ level }: { level: string }) {
  const labels: Record<string, string> = {
    initial: 'Inicial', reviewed: 'Revisado', validated: 'Validado', production: 'Producción',
  };
  return <Badge variant="secondary" className="text-xs">{labels[level] ?? level}</Badge>;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 90 ? 'text-emerald-600' : score >= 80 ? 'text-amber-600' : 'text-red-600';
  return <span className={cn('text-xs font-mono font-semibold', color)}>{score}%</span>;
}

function OfficialityBadge({ value }: { value: string }) {
  const labels: Record<string, string> = {
    internal_guidance: 'Guía interna',
    preparatory: 'Preparatorio',
    partial: 'Parcial',
  };
  return (
    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200">
      <Shield className="h-3 w-3 mr-1" />
      {labels[value] ?? value}
    </Badge>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CorridorPackAdminPanel({ companyId }: Props) {
  const admin = useCorridorPackAdmin(companyId);
  const [filters, setFilters] = useState<CorridorPackFilters>({});
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state
  const [duplicateDialog, setDuplicateDialog] = useState<{ packId: string; currentVersion: string } | null>(null);
  const [duplicateVersion, setDuplicateVersion] = useState('');
  const [duplicateReason, setDuplicateReason] = useState('');

  const [actionDialog, setActionDialog] = useState<{
    type: 'publish' | 'deprecate' | 'activate' | 'deactivate';
    packId: string;
    label: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const { data: packs = [], isLoading } = admin.usePackList(filters);

  if (selectedPackId) {
    return (
      <PackDetailView
        packId={selectedPackId}
        admin={admin}
        onBack={() => setSelectedPackId(null)}
        onDuplicate={(id, ver) => { setDuplicateDialog({ packId: id, currentVersion: ver }); setDuplicateVersion(''); setDuplicateReason(''); }}
        onAction={(type, id, label) => { setActionDialog({ type, packId: id, label }); setActionReason(''); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Knowledge Packs — Corredores
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administración de packs normativos de movilidad internacional. Guía interna, no oficial.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5 mr-1" />
          Filtros
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select
              value={filters.publicationStatus ?? 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, publicationStatus: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="deprecated">Deprecado</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category ?? 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, category: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="full_corridor">Corredor completo</SelectItem>
                <SelectItem value="bilateral_ss">SS Bilateral</SelectItem>
                <SelectItem value="tax_treaty">Convenio fiscal</SelectItem>
                <SelectItem value="immigration">Inmigración</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.maturityLevel ?? 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, maturityLevel: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Madurez" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                <SelectItem value="initial">Inicial</SelectItem>
                <SelectItem value="reviewed">Revisado</SelectItem>
                <SelectItem value="validated">Validado</SelectItem>
                <SelectItem value="production">Producción</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.isActive === undefined ? 'all' : String(filters.isActive)}
              onValueChange={(v) => setFilters(f => ({ ...f, isActive: v === 'all' ? undefined : v === 'true' }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Activo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Pack list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando packs...</div>
          ) : packs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No se encontraron packs con los filtros actuales.</div>
          ) : (
            <div className="divide-y">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-mono text-sm font-semibold text-primary whitespace-nowrap">
                      {pack.origin}↔{pack.destination}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PublicationBadge status={pack.publication_status} />
                      <MaturityBadge level={pack.maturity_level} />
                      <ConfidenceBadge score={pack.confidence_score} />
                      {!pack.is_active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Inactivo</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">v{pack.version}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {pack.last_reviewed_at && (
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        Rev. {formatDistanceToNow(new Date(pack.last_reviewed_at), { locale: es, addSuffix: true })}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={() => setDuplicateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar para nueva versión</DialogTitle>
            <DialogDescription>
              Se creará una copia en estado borrador a partir de la versión {duplicateDialog?.currentVersion}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Nueva versión (ej: 1.1.0)"
              value={duplicateVersion}
              onChange={(e) => setDuplicateVersion(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Motivo de la nueva versión..."
              value={duplicateReason}
              onChange={(e) => setDuplicateReason(e.target.value)}
              className="text-sm"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDuplicateDialog(null)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={!duplicateVersion.trim()}
              onClick={async () => {
                if (duplicateDialog) {
                  await admin.duplicatePack(duplicateDialog.packId, duplicateVersion.trim(), duplicateReason || 'Nueva versión');
                  setDuplicateDialog(null);
                }
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action dialog (publish/deprecate/toggle) */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog?.label}</DialogTitle>
            <DialogDescription>Esta acción quedará registrada en el log de auditoría.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="text-sm"
            rows={2}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActionDialog(null)}>Cancelar</Button>
            <Button
              size="sm"
              variant={actionDialog?.type === 'deprecate' ? 'destructive' : 'default'}
              onClick={async () => {
                if (!actionDialog) return;
                const reason = actionReason || actionDialog.label;
                switch (actionDialog.type) {
                  case 'publish':
                    await admin.publishPack(actionDialog.packId, reason);
                    break;
                  case 'deprecate':
                    await admin.deprecatePack(actionDialog.packId, reason);
                    break;
                  case 'activate':
                    await admin.toggleActive(actionDialog.packId, true, reason);
                    break;
                  case 'deactivate':
                    await admin.toggleActive(actionDialog.packId, false, reason);
                    break;
                }
                setActionDialog(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail view ──────────────────────────────────────────────────────────────

function PackDetailView({
  packId,
  admin,
  onBack,
  onDuplicate,
  onAction,
}: {
  packId: string;
  admin: ReturnType<typeof useCorridorPackAdmin>;
  onBack: () => void;
  onDuplicate: (id: string, ver: string) => void;
  onAction: (type: 'publish' | 'deprecate' | 'activate' | 'deactivate', id: string, label: string) => void;
}) {
  const { data: pack, isLoading } = admin.usePackDetail(packId);
  const { data: auditLog = [] } = admin.usePackAuditLog(packId);
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading || !pack) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="p-8 text-center text-sm text-muted-foreground">
          {isLoading ? 'Cargando...' : 'Pack no encontrado'}
        </div>
      </div>
    );
  }

  const pd = pack.pack_data as Record<string, unknown>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">{pack.origin}↔{pack.destination}</span>
              <span className="text-sm text-muted-foreground font-mono">v{pack.version}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PublicationBadge status={pack.publication_status} />
              <MaturityBadge level={pack.maturity_level} />
              <ConfidenceBadge score={pack.confidence_score} />
              <OfficialityBadge value={pack.officiality} />
              {!pack.is_active && <Badge variant="outline" className="text-xs">Inactivo</Badge>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => onDuplicate(pack.id, pack.version)}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Duplicar
          </Button>
          {pack.publication_status === 'draft' && (
            <Button size="sm" onClick={() => onAction('publish', pack.id, 'Publicar pack')}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Publicar
            </Button>
          )}
          {pack.publication_status !== 'deprecated' && (
            <Button variant="destructive" size="sm" onClick={() => onAction('deprecate', pack.id, 'Deprecar pack')}>
              <Archive className="h-3.5 w-3.5 mr-1" /> Deprecar
            </Button>
          )}
          {pack.publication_status !== 'deprecated' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onAction(
                  pack.is_active ? 'deactivate' : 'activate',
                  pack.id,
                  pack.is_active ? 'Desactivar pack' : 'Activar pack',
                )
              }
            >
              <Power className="h-3.5 w-3.5 mr-1" />
              {pack.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Gobernanza</TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Contenido</TabsTrigger>
          <TabsTrigger value="triggers" className="text-xs">Triggers</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Identificación</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Código canónico" value={pack.canonical_code} />
                <Field label="Slug" value={pack.slug} />
                <Field label="Origen" value={pack.origin} />
                <Field label="Destino" value={pack.destination} />
                <Field label="Categoría" value={pack.category} />
                <Field label="Versión" value={pack.version} />
                {pack.parent_version_id && <Field label="Versión padre" value={pack.parent_version_id.substring(0, 8) + '...'} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gobernanza</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Field label="Responsable" value={pack.review_owner ?? '—'} />
                <Field label="Última revisión" value={pack.last_reviewed_at ? format(new Date(pack.last_reviewed_at), 'dd/MM/yyyy', { locale: es }) : '—'} />
                <Field label="Próxima revisión" value={pack.next_review_at ? format(new Date(pack.next_review_at), 'dd/MM/yyyy', { locale: es }) : '—'} />
                <Field label="Confianza" value={pack.confidence_score !== null ? `${pack.confidence_score}%` : '—'} />
                <Field label="Madurez" value={pack.maturity_level} />
                <Field label="Oficialidad" value={pack.officiality} />
                {pack.published_at && <Field label="Publicado" value={format(new Date(pack.published_at), 'dd/MM/yyyy HH:mm', { locale: es })} />}
              </CardContent>
            </Card>

            {pack.automation_boundary_note && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Límite de automatización
                </CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{pack.automation_boundary_note}</p>
                </CardContent>
              </Card>
            )}

            {pack.internal_notes && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Notas internas</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pack.internal_notes}</p>
                </CardContent>
              </Card>
            )}

            {Array.isArray(pack.sources) && pack.sources.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Fuentes</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {pack.sources.map((s, i) => (
                      <li key={i} className="text-xs flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                        <span>{s.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pd?.ss && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Seguridad Social</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="Régimen" value={pd.ss.regime} />
                  <Field label="Framework" value={pd.ss.framework} />
                  <Field label="Máx. meses" value={String(pd.ss.maxMonths)} />
                  <Field label="Certificado" value={pd.ss.certType} />
                  {pd.ss.notes && <p className="text-xs text-muted-foreground mt-2">{pd.ss.notes}</p>}
                </CardContent>
              </Card>
            )}

            {pd?.cdi && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">CDI</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="Convenio" value={pd.cdi.hasCDI ? 'Sí' : 'No'} />
                  <Field label="Referencia" value={pd.cdi.treatyRef} />
                  {pd.cdi.keyArticles?.length > 0 && (
                    <div className="text-xs text-muted-foreground">{pd.cdi.keyArticles.join(' · ')}</div>
                  )}
                </CardContent>
              </Card>
            )}

            {pd?.tax && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Fiscal</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="Umbral residencia" value={`${pd.tax.residenceDaysThreshold} días`} />
                  <Field label="Art. 7.p" value={pd.tax.art7pApplicable ? 'Sí' : 'No'} />
                  <Field label="Exit tax" value={pd.tax.exitTax ? 'Sí' : 'No'} />
                  {pd.tax.beckhamEquivalent && <Field label="Régimen especial" value={pd.tax.beckhamEquivalent} />}
                  {pd.tax.notes && <p className="text-xs text-muted-foreground mt-2">{pd.tax.notes}</p>}
                </CardContent>
              </Card>
            )}

            {pd?.immigration && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Inmigración</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="Permiso trabajo" value={pd.immigration.workPermitRequired ? 'Requerido' : 'No requerido'} />
                  <Field label="Tipo visa" value={pd.immigration.visaType} />
                  <Field label="Plazo" value={pd.immigration.processingDays} />
                  {pd.immigration.notes && <p className="text-xs text-muted-foreground mt-2">{pd.immigration.notes}</p>}
                </CardContent>
              </Card>
            )}

            {pd?.payroll && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Payroll</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="Split recomendado" value={pd.payroll.splitRecommended ? 'Sí' : 'No'} />
                  <Field label="Shadow recomendado" value={pd.payroll.shadowRecommended ? 'Sí' : 'No'} />
                  <Field label="Tax eq. recomendado" value={pd.payroll.taxEqRecommended ? 'Sí' : 'No'} />
                </CardContent>
              </Card>
            )}

            {pd?.requiredDocuments?.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Documentos requeridos</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {pd.requiredDocuments.map((d: string) => (
                      <Badge key={d} variant="outline" className="text-xs">{d.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="triggers">
          <Card>
            <CardContent className="p-0">
              {pd?.reviewTriggers?.length > 0 ? (
                <div className="divide-y">
                  {pd.reviewTriggers.map((t: any) => (
                    <div key={t.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TriggerSeverityIcon severity={t.severity} />
                        <span className="text-sm font-medium">{t.id}</span>
                        <Badge variant="outline" className="text-xs">{t.affectedModule}</Badge>
                        {t.evidenceRequired && (
                          <Badge variant="secondary" className="text-xs">Evidencia requerida</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">→ {t.suggestedAction}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">Sin triggers definidos</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              {auditLog.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {auditLog.map((entry: any) => (
                      <div key={entry.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{entry.action}</span>
                            {entry.severity && <Badge variant="outline" className="text-xs">{entry.severity}</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {entry.created_at && formatDistanceToNow(new Date(entry.created_at), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                        {entry.metadata?.reason && (
                          <p className="text-xs text-muted-foreground">Motivo: {entry.metadata.reason}</p>
                        )}
                        {entry.old_data && (
                          <div className="text-xs mt-1">
                            <span className="text-muted-foreground">Antes: </span>
                            <code className="bg-muted px-1 rounded">{JSON.stringify(entry.old_data)}</code>
                          </div>
                        )}
                        {entry.new_data && (
                          <div className="text-xs mt-0.5">
                            <span className="text-muted-foreground">Después: </span>
                            <code className="bg-muted px-1 rounded">{JSON.stringify(entry.new_data)}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">Sin registros de auditoría</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function TriggerSeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical_review_required':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'review_required':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'warning':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
  }
}
