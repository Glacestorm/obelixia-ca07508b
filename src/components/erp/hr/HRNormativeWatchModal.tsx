/**
 * HRNormativeWatchModal — S9.21e
 * Modal navegable de vigilancia normativa: lista de leyes verificadas,
 * detalle, y acceso al flujo de aprobación manual.
 *
 * Política: NUNCA autoaplica cambios. Siempre requiere validación humana.
 */
import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldCheck, ShieldAlert, RefreshCw, ExternalLink, FileText,
  CheckCircle2, AlertTriangle, Clock, ArrowLeft, Calendar, Scale,
} from 'lucide-react';
import { useRegulatoryWatch, type RegulatoryWatchItem } from '@/hooks/admin/useRegulatoryWatch';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  /** Si se abre desde el texto rojo "X pdte.", arranca en pestaña Pendientes. */
  initialTab?: 'overview' | 'pending' | 'verified';
}

const IMPACT_COLORS: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  in_force: 'En vigor',
  expired: 'Expirada',
  superseded: 'Sustituida',
};

export function HRNormativeWatchModal({ open, onOpenChange, companyId, initialTab = 'overview' }: Props) {
  const {
    items, config, isChecking, runManualCheck, markAsApproved, implementRegulation,
  } = useRegulatoryWatch(companyId);
  const [tab, setTab] = useState<'overview' | 'pending' | 'verified'>(initialTab);
  const [selectedItem, setSelectedItem] = useState<RegulatoryWatchItem | null>(null);
  const { user } = useAuth();

  const pending = useMemo(
    () => items.filter(i =>
      i.approval_status === 'pending' &&
      (i.requires_payroll_recalc || i.impact_level === 'high' || i.impact_level === 'critical'),
    ),
    [items],
  );
  const verified = useMemo(
    () => items.filter(i => i.approval_status === 'in_force' || i.approval_status === 'approved'),
    [items],
  );

  const lastCheck = config?.last_check_at;
  const lastCheckLabel = lastCheck
    ? formatDistanceToNow(new Date(lastCheck), { locale: es, addSuffix: true })
    : 'sin verificar';
  const autoEnabled = config?.auto_check_enabled ?? false;

  const handleApprove = async (item: RegulatoryWatchItem) => {
    if (!item.official_publication || !item.effective_date) {
      toast.error('Faltan datos oficiales (publicación / fecha vigor) para aprobar');
      return;
    }
    await markAsApproved(item.id, {
      publication: item.official_publication,
      publication_date: item.official_publication_date || new Date().toISOString().slice(0, 10),
      publication_number: item.official_publication_number,
      publication_url: item.official_publication_url,
      effective_date: item.effective_date,
    });
    setSelectedItem(null);
  };

  const renderListItem = (item: RegulatoryWatchItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setSelectedItem(item)}
      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{item.title}</p>
        <Badge variant="outline" className={cn('text-[10px] shrink-0', IMPACT_COLORS[item.impact_level])}>
          {item.impact_level}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
      <div className="flex items-center gap-2 flex-wrap pt-0.5">
        <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
        <Badge variant="outline" className="text-[10px]">{item.jurisdiction}</Badge>
        {item.requires_payroll_recalc && (
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
            Afecta nómina
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(item.detected_at), { locale: es, addSuffix: true })}
        </span>
      </div>
    </button>
  );

  const renderDetail = () => {
    if (!selectedItem) return null;
    const it = selectedItem;
    const changes = Array.isArray(it.key_changes) ? it.key_changes as Array<Record<string, string>> : [];
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al listado
        </Button>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <h3 className="text-base font-semibold flex-1">{it.title}</h3>
            <Badge variant="outline" className={cn('text-xs', IMPACT_COLORS[it.impact_level])}>
              Impacto: {it.impact_level}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{it.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded border bg-muted/30">
            <p className="text-muted-foreground">Estado</p>
            <p className="font-medium">{STATUS_LABELS[it.approval_status] ?? it.approval_status}</p>
          </div>
          <div className="p-2 rounded border bg-muted/30">
            <p className="text-muted-foreground">Categoría</p>
            <p className="font-medium">{it.category}</p>
          </div>
          <div className="p-2 rounded border bg-muted/30">
            <p className="text-muted-foreground">Jurisdicción</p>
            <p className="font-medium">{it.jurisdiction}</p>
          </div>
          <div className="p-2 rounded border bg-muted/30">
            <p className="text-muted-foreground">Detectado</p>
            <p className="font-medium">{format(new Date(it.detected_at), 'dd/MM/yyyy', { locale: es })}</p>
          </div>
          {it.official_publication && (
            <div className="p-2 rounded border bg-muted/30 col-span-2">
              <p className="text-muted-foreground">Publicación oficial</p>
              <p className="font-medium">
                {it.official_publication}
                {it.official_publication_number ? ` · ${it.official_publication_number}` : ''}
                {it.official_publication_date ? ` · ${format(new Date(it.official_publication_date), 'dd/MM/yyyy', { locale: es })}` : ''}
              </p>
            </div>
          )}
          {it.effective_date && (
            <div className="p-2 rounded border bg-primary/5 border-primary/30 col-span-2">
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Entrada en vigor
              </p>
              <p className="font-semibold text-primary">
                {format(new Date(it.effective_date), 'dd MMMM yyyy', { locale: es })}
              </p>
            </div>
          )}
        </div>

        {changes.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Cambios clave</h4>
            <ul className="space-y-1.5">
              {changes.map((c, i) => (
                <li key={i} className="text-xs p-2 rounded border bg-card">
                  <p className="font-medium">{c.change}</p>
                  {c.impact && <p className="text-muted-foreground mt-0.5">Impacto: {c.impact}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {it.requires_payroll_recalc && (
              <Badge variant="outline" className="text-[10px]">Recalcula nómina</Badge>
            )}
            {it.requires_contract_update && (
              <Badge variant="outline" className="text-[10px]">Actualiza contratos</Badge>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            {it.source_url && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={it.source_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Fuente
                </a>
              </Button>
            )}
            {it.official_publication_url && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={it.official_publication_url} target="_blank" rel="noreferrer">
                  <FileText className="h-3.5 w-3.5" /> Texto oficial
                </a>
              </Button>
            )}
            {it.approval_status === 'pending' && (
              <Button size="sm" onClick={() => handleApprove(it)} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar manualmente
              </Button>
            )}
            {it.approval_status === 'approved' && it.implementation_status !== 'completed' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => implementRegulation(it.id, user?.id || 'manual')}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar implementada
              </Button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground italic pt-1 border-t">
          Los cambios normativos requieren validación humana antes de aplicarse al cálculo de nómina.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pending.length > 0 ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            Vigilancia normativa
            <Badge variant={pending.length > 0 ? 'destructive' : 'secondary'} className="ml-2">
              {pending.length > 0 ? `${pending.length} pdte.` : 'al día'}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Última verificación: <strong>{lastCheckLabel}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Scale className="h-3 w-3" />
              Modo: <strong>{autoEnabled ? `automático (${config?.check_frequency ?? 'diario'})` : 'manual'}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1.5 text-xs ml-auto"
              disabled={isChecking}
              onClick={() => runManualCheck()}
            >
              <RefreshCw className={cn('h-3 w-3', isChecking && 'animate-spin')} />
              Verificar ahora
            </Button>
          </DialogDescription>
        </DialogHeader>

        {selectedItem ? (
          <ScrollArea className="flex-1 pr-3">{renderDetail()}</ScrollArea>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="gap-1 text-xs">
                Resumen <Badge variant="secondary" className="ml-1 text-[10px]">{items.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1 text-xs">
                Pendientes <Badge variant={pending.length > 0 ? 'destructive' : 'secondary'} className="ml-1 text-[10px]">{pending.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="verified" className="gap-1 text-xs">
                Verificadas <Badge variant="secondary" className="ml-1 text-[10px]">{verified.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 mt-3 min-h-0">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-3">
                  {pending.length > 0 && (
                    <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 text-xs">
                        <p className="font-medium text-destructive">
                          {pending.length} cambio(s) normativos con impacto en nómina pendientes de aprobación.
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Revisa cada uno y aprueba manualmente para que pueda aplicarse al próximo cálculo.
                        </p>
                        <Button size="sm" variant="link" className="h-6 px-0 text-xs" onClick={() => setTab('pending')}>
                          Ver pendientes →
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Última actividad</h4>
                    {items.slice(0, 6).map(renderListItem)}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending" className="flex-1 mt-3 min-h-0">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-2">
                  {pending.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                      Sin cambios normativos pendientes con impacto en nómina.
                    </div>
                  ) : (
                    pending.map(renderListItem)
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="verified" className="flex-1 mt-3 min-h-0">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-2">
                  {verified.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Aún no hay normativas verificadas / en vigor registradas.
                    </div>
                  ) : (
                    verified.map(renderListItem)
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <Separator />
        <p className="text-[10px] text-muted-foreground italic">
          Los cambios normativos NO se autoaplican al cálculo de nómina. Siempre requieren revisión y aprobación humana.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default HRNormativeWatchModal;
