import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  MoreVertical,
  Trash2,
  Edit,
  TrendingUp
} from 'lucide-react';
import { useCRMDeals, DEAL_STAGES, DealStage, CRMDeal } from '@/hooks/crm/useCRMDeals';
import { useCRMContext } from '@/hooks/crm/useCRMContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DealsKanban() {
  const { hasPermission } = useCRMContext();
  const { 
    loading, 
    createDeal, 
    updateDeal, 
    deleteDeal, 
    moveDealToStage,
    getDealsByStage,
    getPipelineStats 
  } = useCRMDeals();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CRMDeal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    stage: 'lead' as DealStage,
    priority: 'medium',
    expected_close_date: '',
  });

  const dealsByStage = getDealsByStage();
  const stats = getPipelineStats();

  const handleCreate = async () => {
    if (!formData.title) return;
    
    await createDeal({
      title: formData.title,
      description: formData.description || null,
      value: formData.value ? parseFloat(formData.value) : null,
      stage: formData.stage,
      priority: formData.priority,
      expected_close_date: formData.expected_close_date || null,
    });
    
    setFormData({ title: '', description: '', value: '', stage: 'lead', priority: 'medium', expected_close_date: '' });
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingDeal) return;
    
    await updateDeal(editingDeal.id, {
      title: formData.title,
      description: formData.description || null,
      value: formData.value ? parseFloat(formData.value) : null,
      stage: formData.stage,
      priority: formData.priority,
      expected_close_date: formData.expected_close_date || null,
    });
    
    setEditingDeal(null);
  };

  const openEdit = (deal: CRMDeal) => {
    setFormData({
      title: deal.title,
      description: deal.description || '',
      value: deal.value?.toString() || '',
      stage: deal.stage as DealStage,
      priority: deal.priority,
      expected_close_date: deal.expected_close_date || '',
    });
    setEditingDeal(deal);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Valor Pipeline</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Ganados</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.wonValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <span className="text-sm text-muted-foreground">Total Deals</span>
            <p className="text-2xl font-bold">{stats.totalDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <span className="text-sm text-muted-foreground">Conversión</span>
            <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pipeline de Ventas</h3>
        {hasPermission('deals.create') && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Deal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nombre del deal"
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor (€)</Label>
                    <Input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Etapa</Label>
                    <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v as DealStage })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.filter(s => s.value !== 'won' && s.value !== 'lost').map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prioridad</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cierre Esperado</Label>
                    <Input
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">Crear Deal</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => (
          <div key={stage.value} className="flex-shrink-0 w-72">
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <CardTitle className="text-sm">{stage.label}</CardTitle>
                  </div>
                  <Badge variant="secondary">{dealsByStage[stage.value].length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-2">
                    {dealsByStage[stage.value].map((deal) => (
                      <Card 
                        key={deal.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate flex-1">{deal.title}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {hasPermission('deals.update') && (
                                  <DropdownMenuItem onClick={() => openEdit(deal)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {stage.value !== 'won' && hasPermission('deals.update') && (
                                  <DropdownMenuItem onClick={() => moveDealToStage(deal.id, 'won')}>
                                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                                    Marcar Ganado
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('deals.delete') && (
                                  <DropdownMenuItem 
                                    onClick={() => deleteDeal(deal.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {deal.value && (
                            <div className="flex items-center gap-1 text-sm text-primary font-medium mb-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(deal.value)}
                            </div>
                          )}
                          {deal.expected_close_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(deal.expected_close_date), 'dd MMM', { locale: es })}
                            </div>
                          )}
                          <Badge 
                            variant={deal.priority === 'high' ? 'destructive' : 'secondary'} 
                            className="mt-2 text-xs"
                          >
                            {deal.priority === 'high' ? 'Alta' : deal.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {dealsByStage[stage.value].length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Sin deals
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (€)</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
              <div>
                <Label>Etapa</Label>
                <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v as DealStage })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DealsKanban;
