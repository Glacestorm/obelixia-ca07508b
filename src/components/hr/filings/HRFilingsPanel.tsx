/**
 * HRFilingsPanel — Panel principal de ficheros TGSS/AEAT generados
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, FileText, Download, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { useHRGeneratedFiles } from '@/hooks/hr/useHRGeneratedFiles';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HRGeneratedFile } from '@/types/hr';

const FILE_TYPE_LABELS: Record<string, string> = {
  FAN: 'FAN — Afiliación Nóminas',
  FDI: 'FDI — Datos Identificación',
  AFI: 'AFI — Afiliación',
  RLC: 'RLC — Recibo Liquidación',
  RNT: 'RNT — Relación Nominal',
  SILTRA: 'SILTRA',
  MODELO_111: 'Modelo 111',
  MODELO_190: 'Modelo 190',
  SEPA_PAIN001: 'SEPA PAIN.001',
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  generated: { label: 'Generado', icon: Clock, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  validated: { label: 'Validado', icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  sent: { label: 'Enviado', icon: Send, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  accepted: { label: 'Aceptado', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Rechazado', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  cancelled: { label: 'Cancelado', icon: XCircle, className: 'bg-muted text-muted-foreground' },
};

interface HRFilingsPanelProps {
  companyId?: string;
  className?: string;
}

export function HRFilingsPanel({ companyId, className }: HRFilingsPanelProps) {
  const { files, isLoading, fetchFiles, updateFileStatus } = useHRGeneratedFiles(companyId);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const filters: Record<string, string | undefined> = {};
    if (filterType !== 'all') filters.file_type = filterType;
    if (filterStatus !== 'all') filters.status = filterStatus;
    fetchFiles(Object.keys(filters).length > 0 ? filters as any : undefined);
  }, [fetchFiles, filterType, filterStatus]);

  const handleMarkValidated = useCallback(async (id: string) => {
    await updateFileStatus(id, 'validated');
  }, [updateFileStatus]);

  const handleDownload = useCallback((file: HRGeneratedFile) => {
    // In production this would fetch from storage; for now show toast
    const blob = new Blob([`Contenido de ${file.file_name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Ficheros Generados</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchFiles()} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Tipo de fichero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(FILE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          {files.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay ficheros generados con estos filtros
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const statusCfg = STATUS_CONFIG[file.status] || STATUS_CONFIG.generated;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={file.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{file.file_name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {file.file_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{file.period_month}/{file.period_year}</span>
                          <span>·</span>
                          <span>{file.records_count} registros</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(file.created_at), { locale: es, addSuffix: true })}</span>
                        </div>
                        {file.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{file.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={cn('text-[10px]', statusCfg.className)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                        {file.status === 'generated' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMarkValidated(file.id)} title="Marcar como validado">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)} title="Descargar">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRFilingsPanel;
