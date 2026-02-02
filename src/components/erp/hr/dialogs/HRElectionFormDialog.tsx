/**
 * HRElectionFormDialog - Registro de elecciones sindicales
 * Permite registrar nuevas elecciones, fases, censo, votación y resultados
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Vote, Plus, Trash2, Calendar, Users, BarChart3 } from 'lucide-react';

interface HRElectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
  election?: ElectionData | null; // Para edición/resultados
}

interface UnionResult {
  union: string;
  votes: number;
  seats: number;
}

interface ElectionData {
  id?: string;
  type: string;
  convocationDate: string;
  electionDate: string;
  census: number;
  voters: number;
  status: 'convocada' | 'en_curso' | 'votacion' | 'completada' | 'anulada';
  results: UnionResult[];
  notes?: string;
}

const ELECTION_TYPES = [
  { value: 'delegados_personal', label: 'Delegados de Personal (1-49 trabajadores)' },
  { value: 'comite_empresa', label: 'Comité de Empresa (50+ trabajadores)' },
  { value: 'parciales', label: 'Elecciones Parciales' },
];

const ELECTION_STATUS = [
  { value: 'convocada', label: 'Convocada', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'en_curso', label: 'En curso', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'votacion', label: 'En votación', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'completada', label: 'Completada', color: 'bg-green-500/10 text-green-600' },
  { value: 'anulada', label: 'Anulada', color: 'bg-red-500/10 text-red-600' },
];

const UNIONS = [
  'CCOO', 'UGT', 'USO', 'CGT', 'ELA', 'LAB', 'CSIF', 'Independiente', 'Otros'
];

export function HRElectionFormDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
  election
}: HRElectionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ElectionData>({
    type: election?.type || 'delegados_personal',
    convocationDate: election?.convocationDate || new Date().toISOString().split('T')[0],
    electionDate: election?.electionDate || '',
    census: election?.census || 0,
    voters: election?.voters || 0,
    status: election?.status || 'convocada',
    results: election?.results || [],
    notes: election?.notes || ''
  });

  const [newResult, setNewResult] = useState<UnionResult>({
    union: 'CCOO',
    votes: 0,
    seats: 0
  });

  const handleAddResult = () => {
    if (form.results.some(r => r.union === newResult.union)) {
      toast.error('Este sindicato ya tiene resultados registrados');
      return;
    }
    setForm({
      ...form,
      results: [...form.results, { ...newResult }]
    });
    setNewResult({ union: 'CCOO', votes: 0, seats: 0 });
  };

  const handleRemoveResult = (union: string) => {
    setForm({
      ...form,
      results: form.results.filter(r => r.union !== union)
    });
  };

  const calculateParticipation = () => {
    if (form.census === 0) return 0;
    return ((form.voters / form.census) * 100).toFixed(1);
  };

  const getTotalVotes = () => {
    return form.results.reduce((sum, r) => sum + r.votes, 0);
  };

  const getTotalSeats = () => {
    return form.results.reduce((sum, r) => sum + r.seats, 0);
  };

  const handleSubmit = async () => {
    if (!form.type || !form.convocationDate) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    if (form.status === 'completada' && form.results.length === 0) {
      toast.error('Las elecciones completadas requieren resultados');
      return;
    }

    setLoading(true);
    try {
      // Simular guardado - aquí iría la lógica real con supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(election ? 'Elecciones actualizadas' : 'Elecciones registradas correctamente');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setForm({
        type: 'delegados_personal',
        convocationDate: new Date().toISOString().split('T')[0],
        electionDate: '',
        census: 0,
        voters: 0,
        status: 'convocada',
        results: [],
        notes: ''
      });
    } catch (error) {
      console.error('Error saving election:', error);
      toast.error('Error al guardar las elecciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            {election ? 'Editar Elecciones Sindicales' : 'Nueva Convocatoria Electoral'}
          </DialogTitle>
          <DialogDescription>
            Registra el proceso electoral sindical según el Estatuto de los Trabajadores
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de elecciones *</Label>
              <Select 
                value={form.type} 
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ELECTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select 
                value={form.status} 
                onValueChange={(v) => setForm({ ...form, status: v as ElectionData['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELECTION_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha convocatoria *
              </Label>
              <Input
                type="date"
                value={form.convocationDate}
                onChange={(e) => setForm({ ...form, convocationDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha elecciones
              </Label>
              <Input
                type="date"
                value={form.electionDate}
                onChange={(e) => setForm({ ...form, electionDate: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Censo y participación */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Censo electoral
              </Label>
              <Input
                type="number"
                min="0"
                value={form.census}
                onChange={(e) => setForm({ ...form, census: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Votantes</Label>
              <Input
                type="number"
                min="0"
                max={form.census}
                value={form.voters}
                onChange={(e) => setForm({ ...form, voters: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Participación</Label>
              <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                <span className="font-medium">{calculateParticipation()}%</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Resultados por sindicato */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Resultados por sindicato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Lista de resultados */}
              {form.results.length > 0 && (
                <div className="space-y-2">
                  {form.results.map((result) => (
                    <div key={result.union} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{result.union}</Badge>
                        <span className="text-sm">{result.votes} votos</span>
                        <span className="text-sm font-medium text-primary">{result.seats} escaño(s)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveResult(result.union)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total:</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">{getTotalVotes()} votos</span>
                      <span className="text-sm font-medium text-primary">{getTotalSeats()} escaños</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Añadir resultado */}
              <div className="flex items-end gap-2 pt-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Sindicato</Label>
                  <Select 
                    value={newResult.union} 
                    onValueChange={(v) => setNewResult({ ...newResult, union: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIONS.map(union => (
                        <SelectItem key={union} value={union}>
                          {union}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Votos</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-9"
                    value={newResult.votes}
                    onChange={(e) => setNewResult({ ...newResult, votes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Escaños</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-9"
                    value={newResult.seats}
                    onChange={(e) => setNewResult({ ...newResult, seats: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <Button size="sm" onClick={handleAddResult} className="h-9">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Incidencias, impugnaciones, observaciones del proceso..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : election ? 'Actualizar' : 'Registrar Elecciones'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRElectionFormDialog;
