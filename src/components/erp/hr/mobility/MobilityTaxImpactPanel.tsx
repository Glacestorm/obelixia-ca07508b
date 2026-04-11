/**
 * MobilityTaxImpactPanel — P1.7B-RA
 * International tax impact visualization:
 *  - Art. 7.p eligibility
 *  - CDI status
 *  - Residency classification
 *  - Double taxation risk
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  Banknote, Globe, Scale,
} from 'lucide-react';
import type { ExpatriateCase } from '@/hooks/erp/hr/useExpatriateCase';

interface Props {
  expatCase: ExpatriateCase;
}

const ELIGIBILITY_COLORS: Record<string, string> = {
  eligible: 'bg-success/12 text-success border-success/30',
  partially_eligible: 'bg-warning/12 text-warning border-warning/30',
  not_eligible: 'bg-muted text-muted-foreground border-border',
  requires_review: 'bg-warning/12 text-warning border-warning/30',
};

const RISK_COLORS: Record<string, string> = {
  none: 'bg-success/12 text-success border-success/30',
  low: 'bg-success/12 text-success border-success/30',
  medium: 'bg-warning/12 text-warning border-warning/30',
  high: 'bg-destructive/12 text-destructive border-destructive/30',
};

export function MobilityTaxImpactPanel({ expatCase }: Props) {
  const { taxImpact } = expatCase;
  const { art7p, residency, cdiDetails } = taxImpact;

  return (
    <div className="space-y-3">
      {/* Mandatory Review Banner */}
      {taxImpact.mandatoryReviewPoints.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Revisión fiscal obligatoria</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {taxImpact.mandatoryReviewPoints.map((point, i) => (
                    <li key={i}>• {point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Art. 7.p Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" /> Art. 7.p LIRPF — Exención trabajo en el extranjero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`text-[10px] ${ELIGIBILITY_COLORS[art7p.eligibility]}`}>
              {art7p.eligibilityLabel}
            </Badge>
            {art7p.exemptAmount > 0 && (
              <span className="text-sm font-bold text-success">
                {art7p.exemptAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-1 mb-3">
            {art7p.requirements.map(req => (
              <div key={req.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                {req.met === true && <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />}
                {req.met === false && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                {req.met === null && <HelpCircle className="h-3.5 w-3.5 text-warning shrink-0" />}
                <div>
                  <p className="font-medium">{req.label}</p>
                  <p className="text-[10px] text-muted-foreground">{req.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Max + Notes */}
          <div className="text-[10px] text-muted-foreground space-y-0.5 border-t pt-2">
            <p>Máximo exento: {art7p.maxExemption.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/año</p>
            {art7p.notes.map((n, i) => <p key={i}>{n}</p>)}
          </div>
        </CardContent>
      </Card>

      {/* Residency Classification */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" /> Residencia fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-[10px]">
              {residency.classificationLabel}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 rounded bg-muted/30">
              <p className="text-lg font-bold">{residency.daysInSpain}</p>
              <p className="text-[10px] text-muted-foreground">Días España</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <p className="text-lg font-bold">{residency.daysAbroad}</p>
              <p className="text-[10px] text-muted-foreground">Días exterior</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <p className={`text-lg font-bold ${residency.threshold183Exceeded ? 'text-success' : 'text-warning'}`}>
                {residency.threshold183Exceeded ? '✅' : '⚠️'}
              </p>
              <p className="text-[10px] text-muted-foreground">Regla 183d</p>
            </div>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Centro intereses vitales</span>
              <span className="capitalize">{residency.centerVitalInterests === 'spain' ? 'España' : residency.centerVitalInterests === 'abroad' ? 'Exterior' : 'Indeterminado'}</span>
            </div>
          </div>

          {residency.notes.length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-2 border-t pt-1 space-y-0.5">
              {residency.notes.map((n, i) => <p key={i}>{n}</p>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CDI + Double Taxation */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-1 mb-2">
              <Scale className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium">CDI</p>
            </div>
            {taxImpact.cdiApplicable ? (
              <div>
                <Badge className="text-[10px] bg-success/12 text-success border-success/30">
                  CDI vigente
                </Badge>
                {cdiDetails && (
                  <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                    <p className="font-medium">{cdiDetails.countryName}</p>
                    {cdiDetails.keyProvisions.slice(0, 2).map((p, i) => (
                      <p key={i}>• {p}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Badge className="text-[10px] bg-destructive/12 text-destructive border-destructive/30">
                Sin CDI
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-1 mb-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium">Doble imposición</p>
            </div>
            <Badge className={`text-[10px] ${RISK_COLORS[taxImpact.doubleTaxRisk]}`}>
              {taxImpact.doubleTaxRiskLabel}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Excess Regime */}
      {taxImpact.excessRegimeApplicable && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium mb-1">Régimen de excesos (alternativo a Art. 7.p)</p>
            {taxImpact.excessRegimeNotes.map((n, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">{n}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
