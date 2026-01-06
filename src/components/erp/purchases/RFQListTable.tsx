/**
 * Tabla de listado de RFQs (Solicitudes de Cotización)
 * Fase 1: Listado básico con filtros y acciones
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Eye, 
  FileText, 
  Send, 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  RefreshCw,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useERPRFQ, type RFQ } from '@/hooks/erp/useERPRFQ';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RFQListTableProps {
  onCreateNew?: () => void;
  onViewRFQ?: (rfq: RFQ) => void;
  onEditRFQ?: (rfq: RFQ) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Borrador', color: 'bg-gray-500', icon: FileText },
  sent: { label: 'Enviado', color: 'bg-blue-500', icon: Send },
  in_progress: { label: 'En proceso', color: 'bg-yellow-500', icon: Clock },
  evaluated: { label: 'Evaluado', color: 'bg-purple-500', icon: Eye },
  awarded: { label: 'Adjudicado', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-gray-500' },
  medium: { label: 'Media', color: 'text-blue-500' },
  high: { label: 'Alta', color: 'text-orange-500' },
  urgent: { label: 'Urgente', color: 'text-red-500' },
};

export function RFQListTable({ onCreateNew, onViewRFQ, onEditRFQ }: RFQListTableProps) {
  const { rfqs, isLoading, fetchRFQs, updateRFQStatus, deleteRFQ } = useERPRFQ();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchRFQs(statusFilter);
  }, [statusFilter, fetchRFQs]);

  const handleRefresh = useCallback(() => {
    fetchRFQs(statusFilter);
  }, [fetchRFQs, statusFilter]);

  const handleSendRFQ = async (rfq: RFQ) => {
    await updateRFQStatus(rfq.id, 'sent');
  };

  const handleCancelRFQ = async (rfq: RFQ) => {
    await updateRFQStatus(rfq.id, 'cancelled');
  };

  const handleDeleteRFQ = async (rfq: RFQ) => {
    if (window.confirm(`¿Eliminar la solicitud ${rfq.rfq_number}?`)) {
      await deleteRFQ(rfq.id);
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const filteredRFQs = rfqs.filter(rfq => 
    !search || 
    rfq.rfq_number.toLowerCase().includes(search.toLowerCase()) ||
    rfq.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="in_progress">En proceso</SelectItem>
              <SelectItem value="evaluated">Evaluado</SelectItem>
              <SelectItem value="awarded">Adjudicado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {onCreateNew && (
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Solicitud
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Límite Respuesta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredRFQs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || statusFilter !== 'all' 
                    ? 'No se encontraron solicitudes con los filtros aplicados'
                    : 'No hay solicitudes de cotización'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRFQs.map((rfq) => {
                const status = statusConfig[rfq.status] || statusConfig.draft;
                const priority = priorityConfig[rfq.priority] || priorityConfig.medium;
                const StatusIcon = status.icon;
                const isExpired = rfq.response_deadline && new Date(rfq.response_deadline) < new Date();

                return (
                  <TableRow 
                    key={rfq.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewRFQ?.(rfq)}
                  >
                    <TableCell className="font-mono font-medium">
                      {rfq.rfq_number}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={rfq.title}>
                        {rfq.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} text-white gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${priority.color}`}>
                        {priority.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDate(rfq.request_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isExpired && rfq.status !== 'awarded' && rfq.status !== 'cancelled' && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span className={isExpired ? 'text-red-500' : ''}>
                          {formatDate(rfq.response_deadline)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onViewRFQ?.(rfq);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </DropdownMenuItem>
                          {rfq.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onEditRFQ?.(rfq);
                              }}>
                                <FileText className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleSendRFQ(rfq);
                              }}>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar a proveedores
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          {rfq.status !== 'cancelled' && rfq.status !== 'awarded' && (
                            <DropdownMenuItem 
                              className="text-orange-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRFQ(rfq);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          {rfq.status === 'draft' && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRFQ(rfq);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredRFQs.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredRFQs.length} de {rfqs.length} solicitudes
        </div>
      )}
    </div>
  );
}

export default RFQListTable;
