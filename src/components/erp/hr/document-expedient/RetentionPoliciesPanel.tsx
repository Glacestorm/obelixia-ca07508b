/**
 * RetentionPoliciesPanel — Políticas de retención documental por tipo y jurisdicción
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, Trash2, Scale } from 'lucide-react';
import { useHRDocumentExpedient } from '@/hooks/erp/hr/useHRDocumentExpedient';

interface Props {
  companyId: string;
}

export function RetentionPoliciesPanel({ companyId }: Props) {
  const { retentionPolicies, isLoadingRetention, createRetentionPolicy, deleteRetentionPolicy } = useHRDocumentExpedient(companyId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    document_type: '',
    jurisdiction: 'ES',
    retention_years: 5,
    legal_basis: '',
    auto_archive: false,
    auto_delete: false,
    description: '',
  });

  const handleCreate = async () => {
    if (!form.document_type) return;
    await createRetentionPolicy.mutateAsync({
      document_type: form.document_type,
      jurisdiction: form.jurisdiction,
      retention_years: form.retention_years,
      legal_basis: form.legal_basis || undefined,
      auto_archive: form.auto_archive,
      auto_delete: form.auto_delete,
      description: form.description || undefined,
    });
    setShowForm(false);
    setForm({ document_type: '', jurisdiction: 'ES', retention_years: 5, legal_basis: '', auto_archive: false, auto_delete: false, description: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Políticas de Retención Documental
          </h3>
          <p className="text-sm text-muted-foreground">Configuración de períodos de retención por tipo de documento y jurisdicción</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nueva política</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva política de retención</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de documento</Label>
                <Input value={form.document_type} onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))} placeholder="Ej: contrato, nómina, médico..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jurisdicción</Label>
                  <Input value={form.jurisdiction} onChange={e => setForm(p => ({ ...p, jurisdiction: e.target.value }))} placeholder="ES" />
                </div>
                <div>
                  <Label>Años de retención</Label>
                  <Input type="number" min={1} value={form.retention_years} onChange={e => setForm(p => ({ ...p, retention_years: parseInt(e.target.value) || 5 }))} />
                </div>
              </div>
              <div>
                <Label>Base legal</Label>
                <Input value={form.legal_basis} onChange={e => setForm(p => ({ ...p, legal_basis: e.target.value }))} placeholder="Ej: ET Art. 59, LOPD..." />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto-archivar al vencer</Label>
                <Switch checked={form.auto_archive} onCheckedChange={v => setForm(p => ({ ...p, auto_archive: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto-eliminar al vencer</Label>
                <Switch checked={form.auto_delete} onCheckedChange={v => setForm(p => ({ ...p, auto_delete: v }))} />
              </div>
              <Button onClick={handleCreate} disabled={createRetentionPolicy.isPending || !form.document_type} className="w-full">
                Crear política
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingRetention ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : retentionPolicies.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Scale className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay políticas de retención configuradas</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {retentionPolicies.map(p => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{p.document_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.jurisdiction} · {p.retention_years} años
                      {p.legal_basis && ` · ${p.legal_basis}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.auto_archive && <Badge variant="outline" className="text-xs">Auto-archivo</Badge>}
                  {p.auto_delete && <Badge variant="destructive" className="text-xs">Auto-borrado</Badge>}
                  <Badge className={p.is_active ? 'bg-emerald-100 text-emerald-700 text-xs' : 'text-xs'}>{p.is_active ? 'Activa' : 'Inactiva'}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRetentionPolicy.mutate(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
