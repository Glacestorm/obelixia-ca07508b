/**
 * HRCommunicationsPanel
 * Panel de Comunicaciones Legales a Empleados
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  FileText, 
  Send, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Mail,
  FileSignature,
  Users
} from 'lucide-react';
import { useHRLegalCompliance, LegalCommunication } from '@/hooks/admin/useHRLegalCompliance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HRCommunicationsPanelProps {
  companyId: string;
}

const COMMUNICATION_TYPES = [
  { value: 'despido_objetivo', label: 'Despido Objetivo' },
  { value: 'despido_disciplinario', label: 'Despido Disciplinario' },
  { value: 'modificacion_sustancial', label: 'Modificación Sustancial' },
  { value: 'movilidad_geografica', label: 'Movilidad Geográfica' },
  { value: 'erte', label: 'ERTE' },
  { value: 'fin_contrato', label: 'Fin de Contrato Temporal' },
  { value: 'cambio_turno', label: 'Cambio de Turno/Horario' },
  { value: 'sancion_laboral', label: 'Sanción Laboral' },
  { value: 'comunicacion_sindical', label: 'Comunicación Sindical' },
  { value: 'otro', label: 'Otro' },
];

const DELIVERY_METHODS = [
  { value: 'burofax', label: 'Burofax' },
  { value: 'carta_certificada', label: 'Carta Certificada' },
  { value: 'email_certificado', label: 'Email Certificado' },
  { value: 'mano', label: 'En Mano' },
  { value: 'notificacion_digital', label: 'Notificación Digital' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: FileText },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  sent: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: Send },
  delivered: { label: 'Entregada', color: 'bg-purple-100 text-purple-800', icon: Mail },
  acknowledged: { label: 'Firmada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  archived: { label: 'Archivada', color: 'bg-gray-100 text-gray-800', icon: FileSignature },
};

export function HRCommunicationsPanel({ companyId }: HRCommunicationsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newComm, setNewComm] = useState({
    communication_type: '',
    title: '',
    content: '',
    employee_id: '',
    delivery_method: '',
    effective_date: '',
    jurisdiction: 'ES',
    union_notification_required: false,
  });

  const {
    communications,
    templates,
    isLoading,
    createCommunication,
    updateCommunication,
    getStatusColor
  } = useHRLegalCompliance(companyId);

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.communication_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || comm.delivery_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newComm.communication_type || !newComm.title || !newComm.employee_id) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    await createCommunication({
      ...newComm,
      delivery_status: 'draft',
      legal_references: [],
      checklist_status: {},
      ai_validated: false,
      legal_reviewed: false,
    });

    setIsCreateOpen(false);
    setNewComm({
      communication_type: '',
      title: '',
      content: '',
      employee_id: '',
      delivery_method: '',
      effective_date: '',
      jurisdiction: 'ES',
      union_notification_required: false,
    });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: Partial<LegalCommunication> = { delivery_status: newStatus };
    
    if (newStatus === 'sent') {
      updates.delivered_at = new Date().toISOString();
    } else if (newStatus === 'acknowledged') {
      updates.acknowledged_at = new Date().toISOString();
    }

    await updateCommunication(id, updates);
  };

  const getTypeLabel = (type: string) => {
    const found = COMMUNICATION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar comunicaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Comunicación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Comunicación Legal</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Comunicación *</Label>
                <Select 
                  value={newComm.communication_type} 
                  onValueChange={(v) => setNewComm(prev => ({ ...prev, communication_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNICATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jurisdicción</Label>
                <Select 
                  value={newComm.jurisdiction} 
                  onValueChange={(v) => setNewComm(prev => ({ ...prev, jurisdiction: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">España</SelectItem>
                    <SelectItem value="AD">Andorra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Título *</Label>
                <Input
                  value={newComm.title}
                  onChange={(e) => setNewComm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Comunicación de despido objetivo - Juan García"
                />
              </div>

              <div className="space-y-2">
                <Label>ID Empleado *</Label>
                <Input
                  value={newComm.employee_id}
                  onChange={(e) => setNewComm(prev => ({ ...prev, employee_id: e.target.value }))}
                  placeholder="UUID del empleado"
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Entrega</Label>
                <Select 
                  value={newComm.delivery_method} 
                  onValueChange={(v) => setNewComm(prev => ({ ...prev, delivery_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Efectiva</Label>
                <Input
                  type="date"
                  value={newComm.effective_date}
                  onChange={(e) => setNewComm(prev => ({ ...prev, effective_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="union_required"
                  checked={newComm.union_notification_required}
                  onChange={(e) => setNewComm(prev => ({ ...prev, union_notification_required: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="union_required">Requiere notificación sindical</Label>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Contenido</Label>
                <Textarea
                  value={newComm.content}
                  onChange={(e) => setNewComm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Contenido de la comunicación..."
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Crear Comunicación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = communications.filter(c => c.delivery_status === key).length;
          const Icon = config.icon;
          return (
            <Card key={key} className="cursor-pointer hover:border-primary" onClick={() => setStatusFilter(key)}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{config.label}</span>
                  <Badge variant="secondary" className="ml-auto">{count}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Communications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comunicaciones ({filteredCommunications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredCommunications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No hay comunicaciones que mostrar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCommunications.map(comm => {
                  const statusConfig = STATUS_CONFIG[comm.delivery_status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={comm.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{getTypeLabel(comm.communication_type)}</Badge>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {comm.union_notification_required && (
                              <Badge variant="secondary">
                                <Users className="h-3 w-3 mr-1" />
                                Sindical
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{comm.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Creada: {format(new Date(comm.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                            {comm.effective_date && (
                              <span>Efectiva: {format(new Date(comm.effective_date), 'dd/MM/yyyy', { locale: es })}</span>
                            )}
                            {comm.deadline_date && (
                              <span className="text-orange-600">
                                Límite: {format(new Date(comm.deadline_date), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {comm.delivery_status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(comm.id, 'sent')}>
                              <Send className="h-4 w-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                          {comm.delivery_status === 'sent' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(comm.id, 'acknowledged')}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar Recepción
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Validation Badges */}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant={comm.ai_validated ? 'default' : 'outline'} className="text-xs">
                          {comm.ai_validated ? '✓ IA Validado' : '○ Pendiente IA'}
                        </Badge>
                        <Badge variant={comm.legal_reviewed ? 'default' : 'outline'} className="text-xs">
                          {comm.legal_reviewed ? '✓ Revisión Legal' : '○ Pendiente Legal'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRCommunicationsPanel;
