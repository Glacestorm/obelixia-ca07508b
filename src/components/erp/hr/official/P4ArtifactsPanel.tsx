/**
 * P4ArtifactsPanel — V2-RRHH-P4C
 * UI consumer for useP4OfficialArtifacts: allows generating and viewing
 * RLC, RNT, CRA, Modelo 111, Modelo 190 artifacts from runtime.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText, CheckCircle, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Shield, RefreshCw, Download,
  GitBranch, Hash, AlertCircle, Package,
} from 'lucide-react';
import { useP4OfficialArtifacts, type P4ArtifactRecord } from '@/hooks/erp/hr/useP4OfficialArtifacts';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  className?: string;
}

const ARTIFACT_LABELS: Record<string, string> = {
  rlc: 'RLC — Recibo de Liquidación',
  rnt: 'RNT — Relación Nominal',
  cra: 'CRA — Cuadro Resumen',
  modelo_111: 'Modelo 111 — Retenciones IRPF',
  modelo_190: 'Modelo 190 — Resumen Anual',
};

function ArtifactRecordCard({ record }: { record: P4ArtifactRecord }) {
  const [showDetails, setShowDetails] = useState(false);
  const artifact = record.artifact;
  const isValid = artifact.isValid;
  const statusLabel = artifact.statusLabel;

  const handleDownload = () => {
    const json = JSON.stringify(artifact, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.id}_v${record.versionNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border overflow-hidden">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-md', isValid ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {isValid ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">
                {ARTIFACT_LABELS[record.type] ?? record.type}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {artifact.id} · v{artifact.version}
                <span className="ml-1 font-semibold text-primary">(versión #{record.versionNumber})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">
              {statusLabel}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-700 leading-tight">
            {artifact.statusDisclaimer}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Readiness */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Readiness</span>
            <span className={cn('font-medium', artifact.readinessPercent === 100 ? 'text-emerald-600' : 'text-amber-600')}>
              {artifact.readinessPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all',
                artifact.readinessPercent === 100 ? 'bg-emerald-500' :
                artifact.readinessPercent >= 70 ? 'bg-amber-500' : 'bg-destructive'
              )}
              style={{ width: `${artifact.readinessPercent}%` }}
            />
          </div>
        </div>

        {/* Generated date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Generado:</span>
          <span>{new Date(record.generatedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Traceability */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" />
                Trazabilidad
              </span>
              {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1 text-[11px]">
              {record.dbRowId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> DB ID:</span>
                  <span className="font-mono text-primary">{record.dbRowId.slice(0, 12)}…</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ledger event:</span>
                <span className="font-mono">{record.ledgerEventId ? record.ledgerEventId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evidence:</span>
                <span className="font-mono">{record.evidenceId ? record.evidenceId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version Registry:</span>
                <span className="font-mono">{record.versionRegistryId ? record.versionRegistryId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-border/30 mt-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground italic text-[10px]">
                  Envío real: <strong>bloqueado</strong> (isRealSubmissionBlocked)
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function P4ArtifactsPanel({ companyId, className }: Props) {
  const {
    isGenerating,
    artifacts,
    generateRLC, generateRNT, generateCRA,
    generateModelo111, generateModelo190,
  } = useP4OfficialArtifacts(companyId);

  const artifactsByType = useMemo(() => {
    const grouped: Record<string, P4ArtifactRecord[]> = {};
    for (const a of artifacts) {
      if (!grouped[a.type]) grouped[a.type] = [];
      grouped[a.type].push(a);
    }
    return grouped;
  }, [artifacts]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Artefactos Oficiales P4</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                RLC · RNT · CRA · Modelo 111 · Modelo 190
              </p>
            </div>
          </div>
          {isGenerating && (
            <Badge variant="outline" className="text-xs animate-pulse">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Generando…
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {/* Info: how to generate */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Generación de artefactos P4</p>
                  <p>
                    Los artefactos RLC, RNT, CRA, Modelo 111 y Modelo 190 se generan desde los datos de cotización
                    y nómina del período seleccionado. Cada artefacto se persiste con trazabilidad completa
                    (ledger + evidence + version registry).
                  </p>
                  <p className="text-amber-700">
                    Todos los artefactos son internos preparatorios — NO constituyen presentación oficial.
                  </p>
                </div>
              </div>
            </div>

            {/* Generated artifacts list */}
            {artifacts.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Artefactos generados ({artifacts.length})
                </h4>
                {artifacts.map((record, i) => (
                  <ArtifactRecordCard key={record.artifact.id + '-' + i} record={record} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay artefactos P4 generados en esta sesión.</p>
                <p className="text-xs mt-1">
                  Los artefactos persitidos anteriormente se muestran en el paquete oficial mensual.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default P4ArtifactsPanel;
