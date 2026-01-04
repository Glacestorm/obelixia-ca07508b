import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Hash, Plus, Edit, Trash2, Star } from 'lucide-react';
import { useERPDocumentSeries, DOCUMENT_MODULES, DOCUMENT_TYPES } from '@/hooks/erp/useERPDocumentSeries';
import { useERPContext } from '@/hooks/erp/useERPContext';

export function ERPDocumentSeriesPanel() {
  const { currentCompany } = useERPContext();
  const { 
    series, 
    loading, 
    createSeries, 
    updateSeries, 
    deleteSeries,
    previewNextNumber,
    setAsDefault,
  } = useERPDocumentSeries(currentCompany?.id);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    module: 'sales',
    document_type: 'invoice',
    code: '',
    name: '',
    prefix: '',
    suffix: '',
    next_number: 1,
    padding_length: 6,
    reset_annually: true,
    is_default: false,
  });

  const resetForm = () => {
    setForm({
      module: 'sales',
      document_type: 'invoice',
      code: '',
      name: '',
      prefix: '',
      suffix: '',
      next_number: 1,
      padding_length: 6,
      reset_annually: true,
      is_default: false,
    });
    setEditingId(null);
  };

  const getDocumentTypes = (module: string) => {
    return DOCUMENT_TYPES[module as keyof typeof DOCUMENT_TYPES] || [];
  };

  const handleCreate = async () => {
    if (!form.code || !form.name) return;
    await createSeries(form);
    resetForm();
    setIsCreateOpen(false);
  };

  const handleEdit = (s: any) => {
    setForm({
      module: s.module,
      document_type: s.document_type,
      code: s.code,
      name: s.name,
      prefix: s.prefix || '',
      suffix: s.suffix || '',
      next_number: s.next_number,
      padding_length: s.padding_length,
      reset_annually: s.reset_annually,
      is_default: s.is_default,
    });
    setEditingId(s.id);
    setIsCreateOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    await updateSeries(editingId, form);
    resetForm();
    setIsCreateOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta serie?')) {
      await deleteSeries(id);
    }
  };

  const handleSetDefault = async (s: any) => {
    await setAsDefault(s.id, s.module, s.document_type);
  };

  // Preview del número
  const getPreviewNumber = () => {
    const prefix = form.prefix || '';
    const suffix = form.suffix || '';
    const paddedNum = String(form.next_number).padStart(form.padding_length, '0');
    return `${prefix}${paddedNum}${suffix}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Series Documentales</CardTitle>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nueva Serie
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Serie' : 'Nueva Serie'}</DialogTitle>
                <DialogDescription>
                  Configura la numeración automática de documentos
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Módulo</Label>
                    <Select 
                      value={form.module} 
                      onValueChange={(v) => setForm(f => ({ 
                        ...f, 
                        module: v,
                        document_type: getDocumentTypes(v)[0]?.value || ''
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_MODULES.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select 
                      value={form.document_type} 
                      onValueChange={(v) => setForm(f => ({ ...f, document_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getDocumentTypes(form.module).map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input 
                      id="code" 
                      value={form.code}
                      onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="FV"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input 
                      id="name" 
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Facturas de Venta"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Prefijo</Label>
                    <Input 
                      id="prefix" 
                      value={form.prefix}
                      onChange={(e) => setForm(f => ({ ...f, prefix: e.target.value }))}
                      placeholder="FV"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suffix">Sufijo</Label>
                    <Input 
                      id="suffix" 
                      value={form.suffix}
                      onChange={(e) => setForm(f => ({ ...f, suffix: e.target.value }))}
                      placeholder="/2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="padding">Dígitos</Label>
                    <Input 
                      id="padding" 
                      type="number"
                      min={1}
                      max={10}
                      value={form.padding_length}
                      onChange={(e) => setForm(f => ({ ...f, padding_length: parseInt(e.target.value) || 6 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next">Siguiente Número</Label>
                  <Input 
                    id="next" 
                    type="number"
                    min={1}
                    value={form.next_number}
                    onChange={(e) => setForm(f => ({ ...f, next_number: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground mb-1">Vista previa:</p>
                  <p className="font-mono text-lg font-bold">{getPreviewNumber()}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="reset"
                      checked={form.reset_annually}
                      onCheckedChange={(v) => setForm(f => ({ ...f, reset_annually: v }))}
                    />
                    <Label htmlFor="reset">Reiniciar anualmente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="default"
                      checked={form.is_default}
                      onCheckedChange={(v) => setForm(f => ({ ...f, is_default: v }))}
                    />
                    <Label htmlFor="default">Predeterminada</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={editingId ? handleUpdate : handleCreate}>
                  {editingId ? 'Guardar Cambios' : 'Crear Serie'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Configuración de numeración automática de documentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Siguiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando series...
                  </TableCell>
                </TableRow>
              ) : series.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay series configuradas
                  </TableCell>
                </TableRow>
              ) : (
                series.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {DOCUMENT_MODULES.find(m => m.value === s.module)?.label || s.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {DOCUMENT_TYPES[s.module as keyof typeof DOCUMENT_TYPES]?.find(t => t.value === s.document_type)?.label || s.document_type}
                    </TableCell>
                    <TableCell className="font-mono">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="font-mono">{previewNextNumber(s.id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.is_default && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Pred.
                          </Badge>
                        )}
                        {s.reset_annually && (
                          <Badge variant="secondary" className="text-xs">Anual</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!s.is_default && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleSetDefault(s)}
                            title="Establecer como predeterminada"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ERPDocumentSeriesPanel;
