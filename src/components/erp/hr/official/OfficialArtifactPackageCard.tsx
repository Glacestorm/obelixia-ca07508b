/**
 * OfficialArtifactPackageCard — V2-RRHH-P2B
 * UI card for displaying an official artifact package with status,
 * validations, evidence links, version chain, export, and honest operational labels.
 *
 * P2B additions:
 *  - Version number & chain display
 *  - DB row ID shown in traceability
 *  - Download button for JSON export
 *  - totalLiquidoEstimado honesty label
 *  - Version registry ID linkable
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle, CheckCircle2, XCircle, Info,
  ChevronDown, ChevronRight, FileText, Shield,
  Package, Clock, Building2, User, Calendar,
  AlertCircle, Download, GitBranch, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AFIArtifact } from '@/engines/erp/hr/afiArtifactEngine';
import type { FANCotizacionArtifact } from '@/engines/erp/hr/fanCotizacionArtifactEngine';
import { downloadArtifactJSON } from '@/hooks/erp/hr/useOfficialArtifacts';

// ── Props ──

interface OfficialArtifactPackageCardProps {
  type: 'afi' | 'fan';
  artifact: AFIArtifact | FANCotizacionArtifact;
  ledgerEventId?: string | null;
  evidenceId?: string | null;
  dbRowId?: string | null;
  versionNumber?: number;
  versionRegistryId?: string | null;
  className?: string;
}

// ── Component ──

export function OfficialArtifactPackageCard({
  type, artifact, ledgerEventId, evidenceId, dbRowId, versionNumber, versionRegistryId, className,
}: OfficialArtifactPackageCardProps) {
  const [showValidations, setShowValidations] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isAFI = type === 'afi';
  const afi = isAFI ? artifact as AFIArtifact : null;
  const fan = !isAFI ? artifact as FANCotizacionArtifact : null;

  const statusColor = isAFI
    ? (afi!.artifactStatus === 'error' ? 'bg-destructive/10 text-destructive' :
       afi!.artifactStatus === 'validated_internal' ? 'bg-indigo-500/10 text-indigo-700' :
       afi!.artifactStatus === 'dry_run_ready' ? 'bg-emerald-500/10 text-emerald-700' :
       'bg-blue-500/10 text-blue-700')
    : (fan!.artifactStatus === 'error' ? 'bg-destructive/10 text-destructive' :
       fan!.artifactStatus === 'validated_internal' ? 'bg-indigo-500/10 text-indigo-700' :
       fan!.artifactStatus === 'dry_run_ready' ? 'bg-emerald-500/10 text-emerald-700' :
       'bg-blue-500/10 text-blue-700');

  const statusLabel = isAFI ? afi!.statusLabel : fan!.statusLabel;
  const statusDisclaimer = isAFI ? afi!.statusDisclaimer : fan!.statusDisclaimer;
  const isValid = isAFI ? afi!.isValid : fan!.isValid;
  const readinessPercent = isAFI ? afi!.readinessPercent : fan!.readinessPercent;
  const warnings = isAFI ? afi!.warnings : fan!.warnings;

  const validationErrors = isAFI
    ? afi!.validations.filter(v => !v.valid)
    : fan!.validations.filter(v => !v.passed);

  const handleDownload = () => {
    const ver = versionNumber ?? 1;
    downloadArtifactJSON(artifact, `${artifact.id}_v${ver}.json`);
  };

  return (
    <Card className={cn('border overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-md', isValid ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {isAFI ? <User className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">
                {isAFI ? afi!.actionLabel : fan!.actionLabel}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {artifact.id} · v{artifact.version}
                {versionNumber != null && (
                  <span className="ml-1 font-semibold text-primary">
                    (versión #{versionNumber})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={cn('text-xs', statusColor)}>
              {statusLabel}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Descargar artefacto (JSON pre-oficial)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Disclaimer banner — always visible */}
        <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-700 leading-tight">{statusDisclaimer}</p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>Organismo:</span>
          </div>
          <span className="font-medium">TGSS / SILTRA</span>

          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Circuito:</span>
          </div>
          <span className="font-medium">
            {isAFI ? 'Afiliación' : 'Cotización mensual'}
          </span>

          {isAFI && afi && (
            <>
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Trabajador:</span>
              </div>
              <span className="font-medium truncate">{afi.worker.fullName}</span>
            </>
          )}

          {!isAFI && fan && (
            <>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Período:</span>
              </div>
              <span className="font-medium">{fan.periodLabel}</span>

              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Empleados:</span>
              </div>
              <span className="font-medium">{fan.totalEmployees}</span>
            </>
          )}

          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Fecha efecto:</span>
          </div>
          <span className="font-medium">
            {isAFI ? afi!.effectiveDate : fan!.periodLabel}
          </span>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Generado:</span>
          </div>
          <span className="font-medium">
            {new Date(artifact.generatedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Readiness bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Readiness</span>
            <span className={cn('font-medium', readinessPercent === 100 ? 'text-emerald-600' : 'text-amber-600')}>
              {readinessPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', readinessPercent === 100 ? 'bg-emerald-500' : readinessPercent >= 70 ? 'bg-amber-500' : 'bg-destructive')}
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>

        {/* FAN totals summary — with honesty on líquido estimado */}
        {!isAFI && fan && (
          <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-muted/50 text-xs">
            <div>
              <span className="text-muted-foreground">Total bases CC</span>
              <p className="font-medium">{fan.totals.totalBasesCC.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total cotiz. empresa</span>
              <p className="font-medium">{fan.totals.totalCotizacionEmpresa.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total cotiz. trabajador</span>
              <p className="font-medium">{fan.totals.totalCotizacionTrabajador.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total retención IRPF</span>
              <p className="font-medium">{fan.totals.totalRetencionIRPF.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</p>
            </div>
            {fan.totals.totalLiquidoEstimado != null && (
              <div className="col-span-2 pt-1 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Líquido</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-700 border-amber-500/20">
                          estimado
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-xs">
                        Valor estimado: totalDevengos − cotizaciones trabajador − IRPF.
                        No incluye conceptos no salariales ni deducciones adicionales.
                        Para el valor real, consulte el cierre de nómina.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-medium text-muted-foreground">
                  ~{fan.totals.totalLiquidoEstimado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                </p>
              </div>
            )}
          </div>
        )}

        {/* Validations collapsible */}
        <Collapsible open={showValidations} onOpenChange={setShowValidations}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Validaciones ({validationErrors.length > 0 ? `${validationErrors.length} error(es)` : 'OK'})
              </span>
              {showValidations ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-1 pt-1">
                {(isAFI ? afi!.validations : fan!.validations).map((v: any, i: number) => {
                  const passed = isAFI ? v.valid : v.passed;
                  const severity = isAFI ? (v.required && !v.valid ? 'error' : 'info') : v.severity;
                  return (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] px-1">
                      {passed ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                      ) : severity === 'error' ? (
                        <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">{v.label}</span>
                        {!passed && v.error && <span className="text-muted-foreground ml-1">— {v.error}</span>}
                        {!passed && v.detail && !v.error && <span className="text-muted-foreground ml-1">— {v.detail}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
            {warnings.length > 3 && (
              <p className="text-[10px] text-muted-foreground pl-4">+{warnings.length - 3} más</p>
            )}
          </div>
        )}

        {/* Evidence, versioning & traceability */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" />
                Trazabilidad & versiones
              </span>
              {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1 text-[11px]">
              {dbRowId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> DB ID:</span>
                  <span className="font-mono text-primary">{dbRowId.slice(0, 12)}…</span>
                </div>
              )}
              {versionNumber != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><GitBranch className="h-3 w-3" /> Versión:</span>
                  <Badge variant="outline" className="text-[10px] font-mono">v{versionNumber}</Badge>
                </div>
              )}
              {versionRegistryId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registry:</span>
                  <span className="font-mono">{versionRegistryId.slice(0, 12)}…</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ledger event:</span>
                <span className="font-mono">{ledgerEventId ? ledgerEventId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evidence:</span>
                <span className="font-mono">{evidenceId ? evidenceId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Motor:</span>
                <span>{artifact.version}</span>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-border/30 mt-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground italic">
                  Envío real: <strong>bloqueado</strong> (isRealSubmissionBlocked)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground italic text-[10px]">
                  Persistido en BD · Artefacto descargable como JSON pre-oficial
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
