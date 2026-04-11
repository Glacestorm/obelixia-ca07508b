/**
 * MobilityCorridorPanel.tsx — G2.1
 * Displays corridor intelligence: pack version, freshness, confidence,
 * impacted modules, review triggers, and support level.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Globe, Shield, AlertTriangle, CheckCircle, XCircle, Info,
  Clock, RefreshCw, FileText, Scale, Building2, Brain, Gauge,
} from 'lucide-react';
import type { SupervisorResult } from '@/engines/erp/hr/expatriateSupervisor';
import type { ExtendedSeverity } from '@/engines/erp/hr/reviewTriggerEngine';

interface Props {
  supervisor: SupervisorResult;
}

const SUPPORT_COLORS: Record<string, string> = {
  supported_production: 'bg-success/12 text-success border-success/30',
  supported_with_review: 'bg-warning/12 text-warning border-warning/30',
  out_of_scope: 'bg-destructive/12 text-destructive border-destructive/30',
};

const SUPPORT_LABELS: Record<string, string> = {
  supported_production: '✅ Producción',
  supported_with_review: '⚠️ Requiere Revisión',
  out_of_scope: '🚫 Fuera de Alcance',
};

const SEVERITY_CONFIG: Record<ExtendedSeverity, { icon: typeof AlertTriangle; color: string; label: string }> = {
  critical_review_required: { icon: XCircle, color: 'text-destructive', label: 'Crítico' },
  review_required: { icon: AlertTriangle, color: 'text-warning', label: 'Revisión' },
  warning: { icon: Info, color: 'text-info', label: 'Aviso' },
  info: { icon: Info, color: 'text-muted-foreground', label: 'Info' },
};

const FRESHNESS_COLORS: Record<string, string> = {
  current: 'bg-success/12 text-success border-success/30',
  stale: 'bg-warning/12 text-warning border-warning/30',
  review_required: 'bg-destructive/12 text-destructive border-destructive/30',
  no_pack: 'bg-muted/40 text-muted-foreground border-border',
};

const MODULE_ICONS: Record<string, typeof Globe> = {
  hr: Building2,
  fiscal: Scale,
  legal: FileText,
  audit: Shield,
  ia_center: Brain,
  preflight: Gauge,
};

export function MobilityCorridorPanel({ supervisor }: Props) {
  const { corridorPack, corridorLabel, hasCorridorPack, reviewTriggers, crossModuleImpact, consolidatedRiskScore, overallSupportLevel, activationTriggers } = supervisor;

  const activeSignals = activationTriggers.filter(t => t.detected);
  const packStatus = corridorPack?.status ?? 'no_pack';

  return (
    <div className="space-y-3">
      {/* Header: Corridor + Support Level */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-info" />
              Corredor {corridorLabel}
            </CardTitle>
            <Badge className={`text-[10px] ${SUPPORT_COLORS[overallSupportLevel]}`}>
              {SUPPORT_LABELS[overallSupportLevel]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pack info row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">Pack</p>
              <p className="text-xs font-bold">{hasCorridorPack ? `v${corridorPack!.version}` : 'N/A'}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">Estado</p>
              <Badge className={`text-[9px] ${FRESHNESS_COLORS[packStatus]}`}>
                {packStatus === 'current' ? 'Vigente' : packStatus === 'stale' ? 'Obsoleto' : packStatus === 'review_required' ? 'Revisar' : 'Sin pack'}
              </Badge>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">Confianza</p>
              <p className="text-xs font-bold">{corridorPack?.confidenceScore ?? 0}%</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">Riesgo</p>
              <p className="text-xs font-bold">{consolidatedRiskScore}/100</p>
            </div>
          </div>

          {/* Confidence bar */}
          {hasCorridorPack && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Confianza del pack</span>
                <span>{corridorPack!.confidenceScore}%</span>
              </div>
              <Progress value={corridorPack!.confidenceScore} className="h-1.5" />
            </div>
          )}

          {/* Last reviewed */}
          {corridorPack && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Última revisión: {corridorPack.lastReviewed}
              <span className="mx-1">·</span>
              Responsable: {corridorPack.reviewOwner}
            </div>
          )}

          {!hasCorridorPack && (
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
              No existe knowledge pack para este corredor. Clasificación basada únicamente en motores genéricos.
              La revisión manual es obligatoria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activation Triggers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Señales de activación ({activeSignals.length}/{activationTriggers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-1">
            {activationTriggers.map(t => (
              <div key={t.id} className="flex items-center gap-1.5 text-[10px] p-1 rounded">
                {t.detected ? (
                  <CheckCircle className="h-3 w-3 text-success shrink-0" />
                ) : (
                  <div className="h-3 w-3 rounded-full border border-border shrink-0" />
                )}
                <span className={t.detected ? 'text-foreground' : 'text-muted-foreground'}>
                  {t.signal}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Triggers */}
      {reviewTriggers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Review Triggers ({reviewTriggers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {reviewTriggers.map(t => {
                const config = SEVERITY_CONFIG[t.severity];
                const Icon = config.icon;
                return (
                  <div key={t.id} className="flex items-start gap-2 text-xs p-2 rounded-lg border bg-card">
                    <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px] px-1 py-0">{config.label}</Badge>
                        <Badge variant="outline" className="text-[8px] px-1 py-0">{t.affectedModule}</Badge>
                        {t.evidenceRequired && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0">📎 Evidencia</Badge>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5">{t.reason}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">→ {t.suggestedAction}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-Module Impact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground">Impacto Cross-Module</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'hr', label: 'RRHH', active: crossModuleImpact.hr.checklistItems.length > 0 },
              { key: 'fiscal', label: 'Fiscal', active: crossModuleImpact.fiscal.residencyReview || crossModuleImpact.fiscal.art7pReview },
              { key: 'legal', label: 'Jurídico', active: crossModuleImpact.legal.peAssessment || crossModuleImpact.legal.contractAnnex },
              { key: 'audit', label: 'Auditoría', active: crossModuleImpact.audit.evidenceRequired.length > 0 },
              { key: 'ia_center', label: 'IA Center', active: crossModuleImpact.iaCenter.reviewGatesActive > 0 },
              { key: 'preflight', label: 'Preflight', active: crossModuleImpact.preflight.corridorActive },
            ] as const).map(m => {
              const Icon = MODULE_ICONS[m.key] || Globe;
              return (
                <div key={m.key} className={`text-center p-2 rounded-lg border ${m.active ? 'bg-info/8 border-info/20' : 'bg-muted/30 border-border'}`}>
                  <Icon className={`h-4 w-4 mx-auto ${m.active ? 'text-info' : 'text-muted-foreground'}`} />
                  <p className="text-[10px] mt-1 font-medium">{m.label}</p>
                  <p className={`text-[9px] ${m.active ? 'text-info' : 'text-muted-foreground'}`}>
                    {m.active ? 'Impactado' : 'Sin impacto'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pack boundary note */}
      {corridorPack && (
        <Card>
          <CardContent className="py-3">
            <p className="text-[10px] text-muted-foreground">
              <strong>⚠️ Límite de automatización:</strong> {corridorPack.automationBoundaryNote}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1">
              Los packs en TypeScript constants son solución de fase 1. El modelo final de administración normativa
              se implementará con versionado en base de datos y ciclos de revisión de 90 días.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SS / CDI / Immigration summary from pack */}
      {corridorPack && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-medium mb-1">Seguridad Social</p>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span>Régimen</span><span className="font-medium">{corridorPack.ss.regime}</span></div>
                <div className="flex justify-between"><span>Marco</span><span className="font-medium">{corridorPack.ss.framework}</span></div>
                <div className="flex justify-between"><span>Máx. meses</span><span className="font-medium">{corridorPack.ss.maxMonths}</span></div>
                <div className="flex justify-between"><span>Certificado</span><span className="font-medium">{corridorPack.ss.certType}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-medium mb-1">CDI / Inmigración</p>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span>CDI</span><span className="font-medium">{corridorPack.cdi.hasCDI ? '✅ Sí' : '❌ No'}</span></div>
                <div className="flex justify-between"><span>Permiso trabajo</span><span className="font-medium">{corridorPack.immigration.workPermitRequired ? '🔒 Sí' : '✅ No'}</span></div>
                <div className="flex justify-between"><span>Visa</span><span className="font-medium">{corridorPack.immigration.visaType}</span></div>
                <div className="flex justify-between"><span>Art. 7.p</span><span className="font-medium">{corridorPack.tax.art7pApplicable ? '✅' : '—'}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
