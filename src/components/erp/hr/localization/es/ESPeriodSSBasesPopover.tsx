/**
 * ESPeriodSSBasesPopover — S9.21h
 * Acceso de lectura a las bases SS oficiales del año del periodo.
 * Funciona idéntico para nóminas existentes o nuevas (contextual al periodYear).
 *
 * No autoaplica nada: si faltan bases, ofrece CTA para cargarlas.
 * Política: las bases vienen de `hr_es_ss_bases` (tabla persistente del sistema)
 * y se contrastan visualmente con la fuente única `SS_GROUP_BASES_2026`
 * (RDL 3/2026 + Orden PJC/297/2026).
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronDown, Database, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SS_BASE_MAX_MENSUAL_2026, SS_GROUP_BASES_2026 } from '@/shared/legal/rules/ssRules2026';
import type { ESSSBase } from '@/hooks/erp/hr/useESLocalization';

interface Props {
  periodYear: number;
  ssBases: ESSSBase[];
  isLoading?: boolean;
  onReload?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function ESPeriodSSBasesPopover({
  periodYear, ssBases, isLoading, onReload, onOpenSettings, className,
}: Props) {
  const [open, setOpen] = useState(false);

  const isLoaded = ssBases.length > 0;
  const yearOfBases = ssBases[0]?.year;
  const yearMatchesPeriod = yearOfBases === periodYear;

  // Comparación con fuente canónica para detectar divergencias
  const divergencias = useMemo(() => {
    if (!isLoaded || !yearMatchesPeriod) return [];
    const out: Array<{ grupo: number; campo: string; bd: number; canon: number }> = [];
    for (const b of ssBases) {
      const canon = SS_GROUP_BASES_2026[b.grupo_cotizacion];
      if (!canon) continue;
      if (Math.abs(b.base_maxima_mensual - canon.maxMensual) > 0.01) {
        out.push({ grupo: b.grupo_cotizacion, campo: 'max_mensual', bd: b.base_maxima_mensual, canon: canon.maxMensual });
      }
      if (Math.abs(b.base_minima_mensual - canon.minMensual) > 0.01) {
        out.push({ grupo: b.grupo_cotizacion, campo: 'min_mensual', bd: b.base_minima_mensual, canon: canon.minMensual });
      }
    }
    return out;
  }, [ssBases, isLoaded, yearMatchesPeriod]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-7 gap-1.5 text-xs', className)}
          aria-label={`Bases SS del periodo ${periodYear}`}
        >
          <Database className="h-3 w-3" />
          Bases SS · {periodYear}
          {!isLoaded && (
            <Badge variant="destructive" className="h-4 text-[9px] px-1 ml-0.5">
              faltan
            </Badge>
          )}
          {isLoaded && divergencias.length > 0 && (
            <Badge variant="outline" className="h-4 text-[9px] px-1 ml-0.5 border-warning/50 text-warning">
              divergencias
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[640px] p-0" align="end">
        <div className="px-4 py-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Database className="h-4 w-4 text-primary" />
                Bases SS vigentes — {periodYear}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Fuente: RDL 3/2026 · Orden PJC/297/2026 · Régimen General
              </p>
            </div>
            <div className="flex items-center gap-1">
              {onReload && (
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-6 w-6"
                  disabled={isLoading}
                  onClick={() => void onReload()}
                  aria-label="Recargar bases"
                  title="Recargar bases del año"
                >
                  <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {!isLoaded ? (
          <div className="px-4 py-6 space-y-3 text-center">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
            <div>
              <p className="text-sm font-medium">No hay bases SS cargadas para {periodYear}.</p>
              <p className="text-xs text-muted-foreground mt-1">
                El motor de nómina ES necesita las bases del año del periodo para calcular topes y cotizaciones.
              </p>
            </div>
            {onOpenSettings ? (
              <Button type="button" size="sm" onClick={onOpenSettings} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Cargar bases SS de {periodYear}
              </Button>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Ve a RRHH → Configuración → Localización España → Bases SS para cargarlas.
              </p>
            )}
          </div>
        ) : (
          <>
            {!yearMatchesPeriod && (
              <div className="mx-4 mt-3 p-2 rounded border border-warning/30 bg-warning/5 flex items-start gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5" />
                <span>
                  Las bases cargadas son del año <strong>{yearOfBases}</strong> y el periodo es{' '}
                  <strong>{periodYear}</strong>. El cálculo puede usar topes desfasados.
                </span>
              </div>
            )}
            <div className="px-4 py-2 grid grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded border bg-muted/30">
                <p className="text-muted-foreground">Tope máx. mensual general</p>
                <p className="font-semibold text-sm tabular-nums">{SS_BASE_MAX_MENSUAL_2026.toFixed(2)} €</p>
              </div>
              <div className="p-2 rounded border bg-muted/30">
                <p className="text-muted-foreground">Grupos cargados</p>
                <p className="font-semibold text-sm tabular-nums">{ssBases.length} / 11</p>
              </div>
              <div className={cn(
                'p-2 rounded border',
                divergencias.length > 0 ? 'bg-warning/10 border-warning/30' : 'bg-muted/30',
              )}>
                <p className="text-muted-foreground">Estado vs. fuente oficial</p>
                <p className={cn('font-semibold text-sm', divergencias.length > 0 ? 'text-warning' : 'text-success')}>
                  {divergencias.length > 0 ? `${divergencias.length} divergencia(s)` : 'Coincide'}
                </p>
              </div>
            </div>
            <Separator />
            <ScrollArea className="max-h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Grupo</TableHead>
                    <TableHead className="text-[11px]">Categoría</TableHead>
                    <TableHead className="text-[11px] text-right">Mín. mensual</TableHead>
                    <TableHead className="text-[11px] text-right">Máx. mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ssBases
                    .slice()
                    .sort((a, b) => a.grupo_cotizacion - b.grupo_cotizacion)
                    .map(b => {
                      const canon = SS_GROUP_BASES_2026[b.grupo_cotizacion];
                      const minDiverges = canon && Math.abs(b.base_minima_mensual - canon.minMensual) > 0.01;
                      const maxDiverges = canon && Math.abs(b.base_maxima_mensual - canon.maxMensual) > 0.01;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-mono">{b.grupo_cotizacion}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {canon?.label ?? '—'}
                          </TableCell>
                          <TableCell className={cn(
                            'text-xs text-right tabular-nums',
                            minDiverges && 'text-warning font-semibold',
                          )}>
                            {b.base_minima_mensual.toFixed(2)} €
                          </TableCell>
                          <TableCell className={cn(
                            'text-xs text-right tabular-nums',
                            maxDiverges && 'text-warning font-semibold',
                          )}>
                            {b.base_maxima_mensual.toFixed(2)} €
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </ScrollArea>
            <Separator />
            <p className="px-4 py-2 text-[10px] text-muted-foreground italic">
              Vista de sólo lectura. Los cambios sobre bases SS se realizan desde
              RRHH → Configuración → Localización España.
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default ESPeriodSSBasesPopover;