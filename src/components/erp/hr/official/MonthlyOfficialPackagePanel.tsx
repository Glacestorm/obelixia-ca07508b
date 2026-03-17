/**
 * MonthlyOfficialPackagePanel — V2-RRHH-P4
 * Visualizes the monthly official package with all artifacts,
 * cross-validations, and readiness per circuit.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Package, CheckCircle, XCircle, AlertTriangle, FileText,
  Shield, Clock, Info
} from 'lucide-react';
import type { MonthlyOfficialPackage } from '@/engines/erp/hr/monthlyOfficialPackageEngine';
import type { CrossValidationResult } from '@/engines/erp/hr/officialCrossValidationEngine';
import { cn } from '@/lib/utils';

interface Props {
  pkg: MonthlyOfficialPackage;
  className?: string;
}

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  clean: CheckCircle,
  warnings: AlertTriangle,
  critical: XCircle,
};

export function MonthlyOfficialPackagePanel({ pkg, className }: Props) {
  const StatusIcon = STATUS_ICONS[pkg.crossValidation?.overallStatus ?? 'warnings'] ?? Info;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Paquete Oficial — {pkg.periodLabel}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pkg.companyName}
              </p>
            </div>
          </div>
          <Badge className={cn('text-xs', pkg.statusMeta.color)}>
            {pkg.statusMeta.label}
          </Badge>
        </div>

        {/* Overall readiness */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Readiness general</span>
            <span className="font-medium">{pkg.overallReadiness}%</span>
          </div>
          <Progress value={pkg.overallReadiness} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4">
            {/* Artifacts */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Artefactos ({pkg.artifactsGenerated}/{pkg.artifactsRequired})
              </h4>
              <div className="space-y-1.5">
                {pkg.artifacts.map(a => (
                  <div key={a.artifactType} className="flex items-center justify-between p-2 rounded-md border bg-card">
                    <div className="flex items-center gap-2">
                      {a.isGenerated ? (
                        a.isValid ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        )
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm">{a.artifactType}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {a.isGenerated ? a.statusLabel : 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Cross-validation summary */}
            {pkg.crossValidation && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Validaciones cruzadas
                </h4>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                  <StatusIcon className={cn(
                    'h-5 w-5',
                    pkg.crossValidation.overallStatus === 'clean' ? 'text-emerald-600' :
                    pkg.crossValidation.overallStatus === 'critical' ? 'text-destructive' :
                    'text-amber-600'
                  )} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {pkg.crossValidation.passed}/{pkg.crossValidation.totalChecks} checks OK
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Score: {pkg.crossValidationScore}%
                      </span>
                    </div>
                    <Progress value={pkg.crossValidationScore} className="h-1.5 mt-1" />
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="mt-2 space-y-1">
                  {pkg.crossValidation.categorySummary.map(cat => (
                    <div key={cat.category} className="flex items-center justify-between text-xs px-2 py-1">
                      <span className="text-muted-foreground">{cat.categoryLabel}</span>
                      <span className={cn(
                        cat.failed > 0 ? 'text-destructive font-medium' : 'text-emerald-600'
                      )}>
                        {cat.passed}/{cat.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Circuit readiness */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Readiness por circuito
              </h4>
              <div className="space-y-1.5">
                {pkg.circuitReadiness.map(cr => (
                  <div key={cr.circuitId} className="flex items-center justify-between p-2 rounded-md border bg-card">
                    <div className="flex items-center gap-2">
                      <Shield className={cn('h-3.5 w-3.5', cr.isReady ? 'text-emerald-600' : 'text-muted-foreground')} />
                      <span className="text-sm">{cr.circuitLabel}</span>
                    </div>
                    <Badge variant={cr.isReady ? 'default' : 'outline'} className="text-[10px]">
                      {cr.isReady ? 'Listo' : 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Expedient statuses */}
            {(pkg.ssExpedientStatus || pkg.fiscalExpedientStatus) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Expedientes
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {pkg.ssExpedientStatus && (
                      <div className="p-2 rounded-md border bg-card text-center">
                        <p className="text-[10px] text-muted-foreground">SS</p>
                        <p className="text-xs font-medium capitalize">{pkg.ssExpedientStatus}</p>
                      </div>
                    )}
                    {pkg.fiscalExpedientStatus && (
                      <div className="p-2 rounded-md border bg-card text-center">
                        <p className="text-[10px] text-muted-foreground">Fiscal</p>
                        <p className="text-xs font-medium capitalize">{pkg.fiscalExpedientStatus}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  {pkg.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
