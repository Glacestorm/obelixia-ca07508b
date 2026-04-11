/**
 * MobilityClassificationPanel — P1.7B-RA
 * Visual classification of an international mobility case:
 *  - SS regime (EU/bilateral/none)
 *  - Support level badge
 *  - Document checklist with status
 *  - Review triggers
 *  - Impact summary
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield, FileText, AlertTriangle, CheckCircle, XCircle, Clock,
  Globe, Landmark, Calculator,
} from 'lucide-react';
import type { ExpatriateCase } from '@/hooks/erp/hr/useExpatriateCase';
import type { MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  expatCase: ExpatriateCase;
  documents: MobilityDocument[];
}

const SUPPORT_COLORS: Record<string, string> = {
  supported_production: 'bg-success/12 text-success border-success/30',
  supported_with_review: 'bg-warning/12 text-warning border-warning/30',
  out_of_scope: 'bg-destructive/12 text-destructive border-destructive/30',
};

const REGIME_COLORS: Record<string, string> = {
  eu_eea_ch: 'bg-info/12 text-info border-info/30',
  bilateral_agreement: 'bg-warning/12 text-warning border-warning/30',
  no_agreement: 'bg-destructive/12 text-destructive border-destructive/30',
};

const SEVERITY_ICONS: Record<string, typeof AlertTriangle> = {
  critical: XCircle,
  high: AlertTriangle,
  medium: Clock,
  low: CheckCircle,
};

export function MobilityClassificationPanel({ expatCase, documents }: Props) {
  const { mobilityClassification: mc, documentCompleteness, supervisor } = expatCase;
  const presentDocTypes = new Set(documents.map(d => d.document_type));
  const corridorPack = supervisor?.corridorPack;

  return (
    <div className="space-y-3">
      {/* G2.1: Corridor Badge + Pack Freshness */}
      {supervisor && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            🌐 {supervisor.corridorLabel}
          </Badge>
          {corridorPack && (
            <>
              <Badge variant="outline" className="text-[10px]">
                v{corridorPack.version}
              </Badge>
              <Badge className={`text-[10px] ${corridorPack.status === 'current' ? 'bg-success/12 text-success border-success/30' : 'bg-warning/12 text-warning border-warning/30'}`}>
                {corridorPack.status === 'current' ? '✅ Vigente' : '⚠️ Obsoleto'}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Confianza: {corridorPack.confidenceScore}%
              </Badge>
            </>
          )}
          {!corridorPack && (
            <Badge className="text-[10px] bg-muted/40 text-muted-foreground border-border">
              Sin knowledge pack
            </Badge>
          )}
        </div>
      )}
      {/* Support Level Banner */}
      {mc.supportLevel !== 'supported_production' && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">{mc.supportLevelLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {mc.supportLevel === 'supported_with_review'
                    ? 'Este caso requiere revisión por un especialista antes de proceder.'
                    : 'Este caso excede el alcance del sistema. Derivar a asesoría externa.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regime + Support Level + Risk */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <Globe className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground mb-1">Régimen SS</p>
            <Badge className={`text-[10px] ${REGIME_COLORS[mc.ssRegime]}`}>
              {mc.ssRegime === 'eu_eea_ch' ? 'UE/EEE/Suiza' : mc.ssRegime === 'bilateral_agreement' ? 'Bilateral' : 'Sin convenio'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <Shield className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground mb-1">Nivel de soporte</p>
            <Badge className={`text-[10px] ${SUPPORT_COLORS[mc.supportLevel]}`}>
              {mc.supportLevel === 'supported_production' ? 'Producción' : mc.supportLevel === 'supported_with_review' ? 'Revisión' : 'Fuera alcance'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground mb-1">Riesgo</p>
            <div className="text-lg font-bold">{mc.riskScore}</div>
            <Progress value={mc.riskScore} className="h-1 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Country Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" /> Perfil del país destino: {mc.countryProfile.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">UE</span>
              <span>{mc.countryProfile.isEU ? '✅' : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EEE</span>
              <span>{mc.countryProfile.isEEA ? '✅' : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conv. SS bilateral</span>
              <span>{mc.countryProfile.hasBilateralSS ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CDI vigente</span>
              <span>{mc.countryProfile.hasCDI ? '✅' : '❌'}</span>
            </div>
          </div>
          {mc.countryProfile.bilateralSSDetails && (
            <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1">{mc.countryProfile.bilateralSSDetails}</p>
          )}
        </CardContent>
      </Card>

      {/* Impact Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-1 mb-2">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium">Payroll</p>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between"><span>Split</span><span>{mc.payrollImpact.splitPayrollRecommended ? '⚠️ Rec.' : '—'}</span></div>
              <div className="flex justify-between"><span>Shadow</span><span>{mc.payrollImpact.shadowPayrollRecommended ? '⚠️ Rec.' : '—'}</span></div>
              <div className="flex justify-between"><span>Tax Eq.</span><span>{mc.payrollImpact.taxEqualizationRecommended ? '⚠️ Rec.' : '—'}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-1 mb-2">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium">Seg. Social</p>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between"><span>A1</span><span>{mc.ssImpact.a1Required ? '✅ Req.' : '—'}</span></div>
              <div className="flex justify-between"><span>Bilateral</span><span>{mc.ssImpact.bilateralCertRequired ? '✅ Req.' : '—'}</span></div>
              <div className="flex justify-between"><span>Doble cot.</span><span>{mc.ssImpact.dualCoverage ? '⚠️ Riesgo' : '—'}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-1 mb-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium">Fiscal</p>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between"><span>Art. 7.p</span><span>{mc.taxImpact.art7pPotential ? '✅ Posible' : '—'}</span></div>
              <div className="flex justify-between"><span>CDI</span><span>{mc.taxImpact.cdiAvailable ? '✅' : '❌'}</span></div>
              <div className="flex justify-between"><span>Doble imp.</span><span>{mc.taxImpact.doubleTaxRisk ? '⚠️' : '—'}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Checklist documental
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {documentCompleteness.present}/{documentCompleteness.required} ({documentCompleteness.percentage}%)
            </Badge>
          </div>
          <Progress value={documentCompleteness.percentage} className="h-1.5 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {mc.documentChecklist.filter(d => d.required).map(doc => {
              const present = presentDocTypes.has(doc.documentType as any);
              return (
                <div key={doc.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                  {present
                    ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  }
                  <div className="flex-1">
                    <p className="font-medium">{doc.label}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.description}</p>
                  </div>
                  {doc.issuingAuthority && (
                    <Badge variant="outline" className="text-[9px] shrink-0">{doc.issuingAuthority}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Review Triggers */}
      {mc.reviewTriggers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Puntos de revisión ({mc.reviewTriggers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {mc.reviewTriggers.map(trigger => {
                const Icon = SEVERITY_ICONS[trigger.severity] ?? AlertTriangle;
                return (
                  <div key={trigger.id} className="flex items-start gap-2 text-xs p-2 rounded border">
                    <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                      trigger.severity === 'critical' ? 'text-destructive' :
                      trigger.severity === 'high' ? 'text-warning' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <p className="font-medium">{trigger.label}</p>
                      <p className="text-muted-foreground">{trigger.description}</p>
                      {trigger.requiredAction && (
                        <p className="text-primary mt-0.5">→ {trigger.requiredAction}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{trigger.category}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {mc.riskFactors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mc.riskFactors.map(f => (
            <Badge key={f} variant="outline" className="text-[9px]">{f}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
