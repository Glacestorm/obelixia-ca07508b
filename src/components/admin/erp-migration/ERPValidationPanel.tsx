/**
 * ERPValidationPanel - Panel de validación contable
 * Verificación de cuadre, consistencia y reglas de negocio
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Play,
  RefreshCw,
  FileCheck,
  Loader2
} from 'lucide-react';
import { useERPMigration, ValidationSummary } from '@/hooks/admin/integrations/useERPMigration';
import { cn } from '@/lib/utils';

interface ERPValidationPanelProps {
  sessionId?: string;
}

export function ERPValidationPanel({ sessionId }: ERPValidationPanelProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationSummary | null>(null);

  const { validateSession } = useERPMigration();

  const handleValidate = useCallback(async () => {
    if (!sessionId) return;
    setIsValidating(true);
    const result = await validateSession(sessionId);
    setValidationResult(result);
    setIsValidating(false);
  }, [sessionId, validateSession]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      critical: { label: 'Crítico', variant: 'destructive' as const },
      error: { label: 'Error', variant: 'destructive' as const },
      warning: { label: 'Advertencia', variant: 'secondary' as const },
      info: { label: 'Info', variant: 'outline' as const }
    };
    const cfg = config[severity as keyof typeof config] || config.info;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una sesión de migración para validar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Validación Contable
              </CardTitle>
              <CardDescription>
                Verificación de integridad y cumplimiento de reglas
              </CardDescription>
            </div>
            <Button onClick={handleValidate} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Validación
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {validationResult ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Correctos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{validationResult.passed}</p>
                </div>

                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Advertencias</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{validationResult.warnings}</p>
                </div>

                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Errores</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{validationResult.failed}</p>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                    <span className="font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{validationResult.total_validated}</p>
                </div>
              </div>

              {/* Can Proceed Status */}
              <div className={cn(
                "p-4 rounded-lg border flex items-center justify-between",
                validationResult.can_proceed 
                  ? "bg-green-500/10 border-green-500/20" 
                  : "bg-red-500/10 border-red-500/20"
              )}>
                <div className="flex items-center gap-2">
                  {validationResult.can_proceed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {validationResult.can_proceed 
                      ? 'La migración puede continuar' 
                      : 'Hay errores bloqueantes que deben resolverse'
                    }
                  </span>
                </div>
                {validationResult.can_proceed && (
                  <Button size="sm">
                    Continuar Migración
                  </Button>
                )}
              </div>

              {/* Issues List */}
              {validationResult.issues.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Problemas Detectados</h3>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {validationResult.issues.map((issue, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{issue.message}</p>
                            <p className="text-xs text-muted-foreground">
                              Regla: {issue.rule_key} · {issue.count} ocurrencias
                            </p>
                          </div>
                          {getSeverityBadge(issue.severity)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ejecuta la validación para verificar los datos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ERPValidationPanel;
