/**
 * SEPACTWorkspace — P2.3
 * Unified SEPA Credit Transfer batch management workspace.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileText, Download, CheckCircle, AlertTriangle, XCircle,
  Ban, CreditCard, RefreshCw, Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { useSEPACTBatch } from '@/hooks/erp/hr/useSEPACTBatch';
import {
  SEPACT_STATUS_LABELS,
  type SEPACTBatchStatus,
  type SEPACTBatchSummary,
} from '@/engines/erp/hr/sepaCtEngine';
import { cn } from '@/lib/utils';

interface SEPACTWorkspaceProps {
  companyId: string;
  periodId?: string;
  periodLabel?: string;
  className?: string;
}

const STATUS_COLORS: Record<SEPACTBatchStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  validated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  generated: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  exported: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-destructive/10 text-destructive',
};

const PIPELINE_STEPS: SEPACTBatchStatus[] = ['draft', 'validated', 'generated', 'exported', 'paid'];

export function SEPACTWorkspace({ companyId, periodId, periodLabel, className }: SEPACTWorkspaceProps) {
  const {
    batch, issues, isLoading,
    assembleFromPeriod, toggleLineExclusion,
    validateCurrentBatch, generateXml, downloadXml,
    markExported, markPaid, cancelBatch, resetToDraft,
    getSummary,
  } = useSEPACTBatch(companyId);

  const [summary, setSummary] = useState<SEPACTBatchSummary | null>(null);
  const [activeTab, setActiveTab] = useState('lines');

  const refreshSummary = useCallback(async () => {
    const s = await getSummary();
    setSummary(s);
  }, [getSummary]);

  useEffect(() => {
    if (batch) refreshSummary();
  }, [batch?.status, batch?.lines.length]);

  const handleAssemble = async () => {
    if (!periodId || !periodLabel) return;
    const today = new Date().toISOString().slice(0, 10);
    await assembleFromPeriod(periodId, periodLabel, today);
  };

  // ─── No batch state ───────────────────────────────────────
  if (!batch) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-12 text-center space-y-4">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <div>
            <h3 className="font-semibold text-lg">SEPA Credit Transfer</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Genera lotes de transferencias bancarias ISO 20022 para pagos de nómina
            </p>
          </div>
          {periodId && periodLabel && (
            <Button onClick={handleAssemble} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-2" />
              Crear lote desde {periodLabel}
            </Button>
          )}
          {!periodId && (
            <p className="text-xs text-muted-foreground">
              Selecciona un período de nómina para crear un lote SEPA CT
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentStepIdx = PIPELINE_STEPS.indexOf(batch.status);
  const isCancelled = batch.status === 'cancelled';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Pipeline Stepper */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-semibold">SEPA CT — {batch.periodLabel}</span>
              <Badge className={STATUS_COLORS[batch.status]}>
                {SEPACT_STATUS_LABELS[batch.status]}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{batch.totalAmount.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground">{batch.lineCount} transferencias</p>
            </div>
          </div>

          {/* Steps */}
          {!isCancelled && (
            <div className="flex items-center gap-1">
              {PIPELINE_STEPS.map((step, idx) => (
                <React.Fragment key={step}>
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                    idx < currentStepIdx ? 'bg-primary/20 text-primary' :
                    idx === currentStepIdx ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {idx < currentStepIdx && <CheckCircle className="h-3 w-3" />}
                    {SEPACT_STATUS_LABELS[step]}
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-muted-foreground">Líneas activas</p>
              <p className="text-xl font-bold">{summary.activeLines}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-muted-foreground">Importe total</p>
              <p className="text-xl font-bold">{summary.totalAmount.toFixed(2)} €</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-muted-foreground">Excluidas</p>
              <p className="text-xl font-bold">{summary.excludedLines}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-muted-foreground">Errores / Avisos</p>
              <p className="text-xl font-bold">
                <span className={summary.errorCount > 0 ? 'text-destructive' : ''}>{summary.errorCount}</span>
                {' / '}
                <span className="text-amber-600">{summary.warningCount}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {batch.status === 'draft' && (
              <Button onClick={validateCurrentBatch} size="sm">
                <CheckCircle className="h-4 w-4 mr-1" /> Validar
              </Button>
            )}
            {batch.status === 'validated' && (
              <Button onClick={generateXml} size="sm">
                <FileText className="h-4 w-4 mr-1" /> Generar XML
              </Button>
            )}
            {batch.status === 'generated' && (
              <>
                <Button onClick={downloadXml} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" /> Descargar XML
                </Button>
                <Button onClick={markExported} size="sm">
                  <ArrowRight className="h-4 w-4 mr-1" /> Marcar exportado
                </Button>
              </>
            )}
            {batch.status === 'exported' && (
              <Button onClick={markPaid} size="sm">
                <CheckCircle className="h-4 w-4 mr-1" /> Confirmar pago
              </Button>
            )}
            {['validated', 'generated'].includes(batch.status) && (
              <Button onClick={resetToDraft} size="sm" variant="ghost">
                <RefreshCw className="h-4 w-4 mr-1" /> Volver a borrador
              </Button>
            )}
            {!['paid', 'cancelled'].includes(batch.status) && (
              <Button onClick={cancelBatch} size="sm" variant="destructive">
                <Ban className="h-4 w-4 mr-1" /> Anular
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-2">
            <TabsList>
              <TabsTrigger value="lines" className="text-xs">Líneas ({batch.lines.length})</TabsTrigger>
              <TabsTrigger value="issues" className="text-xs">
                Validación {issues.length > 0 && `(${issues.length})`}
              </TabsTrigger>
              <TabsTrigger value="xml" className="text-xs">XML</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {/* Lines */}
            <TabsContent value="lines" className="mt-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Empleado</TableHead>
                      <TableHead>IBAN</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.lines.map(line => (
                      <TableRow key={line.id} className={cn(line.excluded && 'opacity-50')}>
                        <TableCell className="font-medium text-sm">{line.employeeName}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {line.iban ? `${line.iban.slice(0, 4)}...${line.iban.slice(-4)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">{line.amount.toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {line.sourceType === 'payroll' ? 'Nómina' : 'Finiquito'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {line.excluded ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <EyeOff className="h-3 w-3" /> {line.exclusionReason}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <Eye className="h-3 w-3" /> Incluida
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => toggleLineExclusion(line.id)}
                            >
                              {line.excluded ? 'Incluir' : 'Excluir'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Validation Issues */}
            <TabsContent value="issues" className="mt-0">
              <ScrollArea className="h-[400px]">
                {issues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm">Sin incidencias de validación</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {issues.map((issue, idx) => (
                      <div
                        key={`${issue.lineId}-${idx}`}
                        className={cn(
                          'p-3 rounded-lg border text-sm flex items-start gap-2',
                          issue.severity === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-amber-300/30 bg-amber-50 dark:bg-amber-900/10',
                        )}
                      >
                        {issue.severity === 'error'
                          ? <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        }
                        <div>
                          <p className="font-medium">{issue.message}</p>
                          {issue.employeeName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{issue.employeeName}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* XML Preview */}
            <TabsContent value="xml" className="mt-0">
              <ScrollArea className="h-[400px]">
                {batch.xmlContent ? (
                  <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {batch.xmlContent}
                  </pre>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Genera el XML primero</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default SEPACTWorkspace;
