import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface GaliaNuevaConvocatoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<any>;
}

export function GaliaNuevaConvocatoriaModal({ isOpen, onClose, onCreate }: GaliaNuevaConvocatoriaModalProps) {
  const [creatingConvocatoria, setCreatingConvocatoria] = useState(false);
  const [nuevaConvocatoriaForm, setNuevaConvocatoriaForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    presupuesto_total: 0,
    fecha_inicio: '',
    fecha_fin: '',
    porcentaje_ayuda_max: 80
  });

  const handleCrearConvocatoria = async () => {
    if (!nuevaConvocatoriaForm.codigo || !nuevaConvocatoriaForm.nombre || !nuevaConvocatoriaForm.fecha_inicio || !nuevaConvocatoriaForm.fecha_fin) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    setCreatingConvocatoria(true);
    try {
      const result = await onCreate({
        ...nuevaConvocatoriaForm,
        estado: 'borrador',
        presupuesto_comprometido: 0,
        presupuesto_ejecutado: 0,
        requisitos: [],
        criterios_valoracion: [],
        documentacion_requerida: []
      });
      
      if (result) {
        toast.success('Convocatoria creada correctamente');
        onClose();
        setNuevaConvocatoriaForm({
          codigo: '',
          nombre: '',
          descripcion: '',
          presupuesto_total: 0,
          fecha_inicio: '',
          fecha_fin: '',
          porcentaje_ayuda_max: 80
        });
      }
    } catch (error) {
      console.error('Error creating convocatoria:', error);
      toast.error('Error al crear la convocatoria');
    } finally {
      setCreatingConvocatoria(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nueva Convocatoria
          </DialogTitle>
          <DialogDescription>
            Crea una nueva convocatoria de ayudas LEADER. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                placeholder="LEADER-2024-001"
                value={nuevaConvocatoriaForm.codigo}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, codigo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="presupuesto">Presupuesto Total (€)</Label>
              <Input
                id="presupuesto"
                type="number"
                placeholder="500000"
                value={nuevaConvocatoriaForm.presupuesto_total || ''}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, presupuesto_total: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Convocatoria *</Label>
            <Input
              id="nombre"
              placeholder="Ayudas para la modernización de explotaciones agrarias"
              value={nuevaConvocatoriaForm.nombre}
              onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, nombre: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Descripción detallada de la convocatoria..."
              rows={3}
              value={nuevaConvocatoriaForm.descripcion}
              onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={nuevaConvocatoriaForm.fecha_inicio}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin *</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={nuevaConvocatoriaForm.fecha_fin}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="porcentaje">% Ayuda Máx.</Label>
              <Input
                id="porcentaje"
                type="number"
                min="0"
                max="100"
                value={nuevaConvocatoriaForm.porcentaje_ayuda_max}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, porcentaje_ayuda_max: parseInt(e.target.value) || 80 }))}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCrearConvocatoria} disabled={creatingConvocatoria}>
            {creatingConvocatoria ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Convocatoria
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
