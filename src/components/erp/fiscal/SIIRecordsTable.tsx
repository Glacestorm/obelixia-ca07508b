/**
 * SII Records Table - Tabla de registros SII
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MoreHorizontal,
  FileText,
  Send,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ListTodo,
  Eye,
} from 'lucide-react';
import { SIIRecord, SIIRecordStatus, SIITask } from '@/hooks/erp/useERPSII';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SIIRecordsTableProps {
  records: SIIRecord[];
  selectedRecords: string[];
  onSelectRecords: (ids: string[]) => void;
  onGenerate: (id: string) => Promise<boolean>;
  onMarkSent: (id: string) => Promise<boolean>;
  onSimulateResponse: (id: string, response: 'accepted' | 'accepted_with_errors' | 'rejected') => Promise<boolean>;
  onCreateTask: (id: string, data: Partial<SIITask>) => Promise<SIITask | null>;
  statusConfig: Record<SIIRecordStatus, { label: string; color: string; icon: React.ReactNode }>;
}

export function SIIRecordsTable({
  records,
  selectedRecords,
  onSelectRecords,
  onGenerate,
  onMarkSent,
  onSimulateResponse,
  onCreateTask,
  statusConfig,
}: SIIRecordsTableProps) {
  const [detailRecord, setDetailRecord] = useState<SIIRecord | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      onSelectRecords([]);
    } else {
      onSelectRecords(records.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedRecords.includes(id)) {
      onSelectRecords(selectedRecords.filter(i => i !== id));
    } else {
      onSelectRecords([...selectedRecords, id]);
    }
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay registros SII en este libro</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRecords.length === records.length && records.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Contraparte</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const statusConf = statusConfig[record.status];
              return (
                <TableRow 
                  key={record.id}
                  className={cn(
                    selectedRecords.includes(record.id) && "bg-muted/50"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={() => toggleSelect(record.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.document_number}</p>
                      <p className="text-xs text-muted-foreground">{record.operation_type}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.issue_date), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{record.counterparty_name}</p>
                      <p className="text-xs text-muted-foreground">{record.counterparty_tax_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(record.base_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(record.tax_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(record.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("gap-1", statusConf.color)}>
                      {statusConf.icon}
                      {statusConf.label}
                    </Badge>
                    {record.last_error && (
                      <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">
                        {record.last_error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailRecord(record)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        
                        {record.status === 'pending' && (
                          <DropdownMenuItem onClick={() => onGenerate(record.id)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Generar XML
                          </DropdownMenuItem>
                        )}
                        
                        {record.status === 'generated' && (
                          <DropdownMenuItem onClick={() => onMarkSent(record.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Marcar como enviado
                          </DropdownMenuItem>
                        )}
                        
                        {record.status === 'sent' && (
                          <>
                            <DropdownMenuItem onClick={() => onSimulateResponse(record.id, 'accepted')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Simular: Aceptado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSimulateResponse(record.id, 'accepted_with_errors')}>
                              <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                              Simular: Con errores
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSimulateResponse(record.id, 'rejected')}>
                              <XCircle className="h-4 w-4 mr-2 text-red-600" />
                              Simular: Rechazado
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onCreateTask(record.id, {
                            title: `Revisar ${record.document_number}`,
                            task_type: 'review',
                          })}
                        >
                          <ListTodo className="h-4 w-4 mr-2" />
                          Crear tarea
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Detail Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={() => setDetailRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Registro SII</DialogTitle>
            <DialogDescription>
              {detailRecord?.document_number}
            </DialogDescription>
          </DialogHeader>
          
          {detailRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-medium">{detailRecord.document_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha emisión</p>
                  <p className="font-medium">
                    {format(new Date(detailRecord.issue_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contraparte</p>
                  <p className="font-medium">{detailRecord.counterparty_name}</p>
                  <p className="text-sm text-muted-foreground">{detailRecord.counterparty_tax_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo operación</p>
                  <p className="font-medium">{detailRecord.operation_type || 'F1'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Base imponible</p>
                  <p className="text-xl font-bold">{formatCurrency(detailRecord.base_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IVA ({detailRecord.tax_rate}%)</p>
                  <p className="text-xl font-bold">{formatCurrency(detailRecord.tax_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{formatCurrency(detailRecord.total_amount)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Historial de estados</p>
                <div className="space-y-2">
                  {detailRecord.generation_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>Generado: {format(new Date(detailRecord.generation_date), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
                  {detailRecord.sent_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Send className="h-4 w-4 text-purple-600" />
                      <span>Enviado: {format(new Date(detailRecord.sent_date), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
                  {detailRecord.response_date && (
                    <div className="flex items-center gap-2 text-sm">
                      {detailRecord.status === 'accepted' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : detailRecord.status === 'rejected' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                      <span>Respuesta: {format(new Date(detailRecord.response_date), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>

              {detailRecord.csv_code && (
                <div>
                  <p className="text-sm text-muted-foreground">Código CSV</p>
                  <p className="font-mono text-sm">{detailRecord.csv_code}</p>
                </div>
              )}

              {detailRecord.last_error && (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm">{detailRecord.last_error}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SIIRecordsTable;
