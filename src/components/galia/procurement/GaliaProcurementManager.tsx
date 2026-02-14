/**
 * GALIA - Gestión de Contratación Pública (LCSP)
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Plus, FileText, AlertTriangle, CheckCircle, Clock,
  Briefcase, Trash2, Edit, ChevronRight, Calendar
} from 'lucide-react';
import { useGaliaProcurement, ProcurementContract } from '@/hooks/galia/useGaliaProcurement';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  preparacion: { label: 'Preparación', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  licitacion: { label: 'Licitación', color: 'bg-blue-500/20 text-blue-400', icon: <Briefcase className="h-3 w-3" /> },
  valoracion: { label: 'Valoración', color: 'bg-amber-500/20 text-amber-400', icon: <Clock className="h-3 w-3" /> },
  adjudicacion: { label: 'Adjudicación', color: 'bg-purple-500/20 text-purple-400', icon: <CheckCircle className="h-3 w-3" /> },
  ejecucion: { label: 'Ejecución', color: 'bg-green-500/20 text-green-400', icon: <ChevronRight className="h-3 w-3" /> },
  finalizado: { label: 'Finalizado', color: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle className="h-3 w-3" /> },
};

const TYPE_LABELS: Record<string, string> = {
  menor: 'Contrato Menor',
  abierto: 'Procedimiento Abierto',
  negociado: 'Negociado sin publicidad',
  restringido: 'Procedimiento Restringido',
};

export function GaliaProcurementManager() {
  const { contracts, loading, createContract, updateContract, deleteContract, getAlerts, STATUS_ORDER } = useGaliaProcurement();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ProcurementContract | null>(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [newContract, setNewContract] = useState({
    title: '', contract_type: 'menor' as const, budget_base: 0,
    contractor: '', description: '', start_date: '', end_date: ''
  });

  const alerts = useMemo(() => getAlerts(), [getAlerts]);
  const totalBudget = useMemo(() => contracts.reduce((sum, c) => sum + Number(c.budget_base || 0), 0), [contracts]);

  const handleCreate = async () => {
    await createContract(newContract);
    setShowCreate(false);
    setNewContract({ title: '', contract_type: 'menor', budget_base: 0, contractor: '', description: '', start_date: '', end_date: '' });
  };

  const handleChecklistToggle = async (contract: ProcurementContract, doc: string) => {
    const updated = { ...contract.documents_checklist, [doc]: !contract.documents_checklist[doc] };
    await updateContract(contract.id, { documents_checklist: updated } as any);
    if (selectedContract?.id === contract.id) {
      setSelectedContract({ ...selectedContract, documents_checklist: updated });
    }
  };

  const checklistProgress = (checklist: Record<string, boolean>) => {
    const total = Object.keys(checklist).length;
    const done = Object.values(checklist).filter(Boolean).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Contratación Pública
          </h2>
          <p className="text-sm text-muted-foreground">Seguimiento conforme a LCSP · {contracts.length} contratos · {formatCurrency(totalBudget)} total</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo Contrato
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{alerts.length} contrato(s) con plazo próximo a vencer (≤30 días)</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="listado">Listado</TabsTrigger>
          <TabsTrigger value="docs">Documentación</TabsTrigger>
        </TabsList>

        {/* Pipeline View */}
        <TabsContent value="pipeline">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {STATUS_ORDER.map(status => {
              const cfg = STATUS_CONFIG[status];
              const items = contracts.filter(c => c.status === status);
              return (
                <Card key={status} className="border-border/50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-1">
                      {cfg.icon}
                      {cfg.label}
                      <Badge variant="outline" className="ml-auto text-[10px] h-4">{items.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-2">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1.5">
                        {items.map(c => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedContract(c)}
                            className="p-2 rounded border border-border/50 bg-card hover:bg-muted/50 cursor-pointer transition-colors text-xs"
                          >
                            <p className="font-medium truncate">{c.title}</p>
                            <p className="text-muted-foreground">{formatCurrency(Number(c.budget_base))}</p>
                            <Progress value={checklistProgress(c.documents_checklist || {})} className="h-1 mt-1" />
                          </div>
                        ))}
                        {items.length === 0 && (
                          <p className="text-[10px] text-muted-foreground text-center py-4">Sin contratos</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Table View */}
        <TabsContent value="listado">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Plazo</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map(c => {
                    const cfg = STATUS_CONFIG[c.status];
                    const daysLeft = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
                    return (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedContract(c)}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell className="text-xs">{TYPE_LABELS[c.contract_type] || c.contract_type}</TableCell>
                        <TableCell>{formatCurrency(Number(c.budget_base))}</TableCell>
                        <TableCell>
                          <Badge className={cfg.color}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {daysLeft !== null && (
                            <span className={daysLeft <= 30 ? 'text-amber-400' : 'text-muted-foreground'}>
                              {daysLeft > 0 ? `${daysLeft}d` : 'Vencido'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Progress value={checklistProgress(c.documents_checklist || {})} className="h-1.5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteContract(c.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Docs Checklist */}
        <TabsContent value="docs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contracts.filter(c => c.status !== 'finalizado').map(c => (
              <Card key={c.id}>
                <CardHeader className="py-3 pb-1">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{c.title}</span>
                    <Badge className={STATUS_CONFIG[c.status]?.color}>{STATUS_CONFIG[c.status]?.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-1">
                    {Object.entries(c.documents_checklist || {}).map(([doc, done]) => (
                      <label key={doc} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/30 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={done as boolean}
                          onChange={() => handleChecklistToggle(c, doc)}
                          className="rounded"
                        />
                        <span className={done ? 'line-through text-muted-foreground' : ''}>{doc}</span>
                      </label>
                    ))}
                  </div>
                  <Progress value={checklistProgress(c.documents_checklist || {})} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {selectedContract.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{TYPE_LABELS[selectedContract.contract_type]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Presupuesto base</p>
                  <p className="font-medium">{formatCurrency(Number(selectedContract.budget_base))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Adjudicatario</p>
                  <p className="font-medium">{selectedContract.contractor || 'Pendiente'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <select
                    value={selectedContract.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      updateContract(selectedContract.id, { status: newStatus } as any);
                      setSelectedContract({ ...selectedContract, status: newStatus as any });
                    }}
                    className="bg-background border rounded px-2 py-1 text-sm"
                  >
                    {STATUS_ORDER.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedContract.description && (
                <div>
                  <p className="text-muted-foreground">Descripción</p>
                  <p>{selectedContract.description}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">Documentación</p>
                {Object.entries(selectedContract.documents_checklist || {}).map(([doc, done]) => (
                  <label key={doc} className="flex items-center gap-2 text-xs cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={done as boolean}
                      onChange={() => handleChecklistToggle(selectedContract, doc)}
                      className="rounded"
                    />
                    <span className={done ? 'line-through text-muted-foreground' : ''}>{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título del contrato" value={newContract.title} onChange={e => setNewContract(p => ({ ...p, title: e.target.value }))} />
            <select
              value={newContract.contract_type}
              onChange={e => setNewContract(p => ({ ...p, contract_type: e.target.value as any }))}
              className="w-full bg-background border rounded px-3 py-2 text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input type="number" placeholder="Presupuesto base (€)" value={newContract.budget_base || ''} onChange={e => setNewContract(p => ({ ...p, budget_base: Number(e.target.value) }))} />
            <Input placeholder="Adjudicatario" value={newContract.contractor} onChange={e => setNewContract(p => ({ ...p, contractor: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Inicio</label>
                <Input type="date" value={newContract.start_date} onChange={e => setNewContract(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fin</label>
                <Input type="date" value={newContract.end_date} onChange={e => setNewContract(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <Textarea placeholder="Descripción" value={newContract.description} onChange={e => setNewContract(p => ({ ...p, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newContract.title}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GaliaProcurementManager;
