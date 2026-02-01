/**
 * SSNewCommunicationDialog - Formulario para nueva comunicación Sistema RED
 * Permite enviar altas (AFI), bajas (BAJ), variaciones (VAR)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, UserPlus, UserMinus, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface SSNewCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

const COMMUNICATION_TYPES = [
  { value: 'AFI', label: 'Alta (AFI)', icon: UserPlus, description: 'Alta de trabajador en la empresa', color: 'text-green-600' },
  { value: 'BAJ', label: 'Baja (BAJ)', icon: UserMinus, description: 'Baja de trabajador en la empresa', color: 'text-red-600' },
  { value: 'VAR', label: 'Variación (VAR)', icon: RefreshCw, description: 'Modificación de datos del trabajador', color: 'text-blue-600' },
  { value: 'L00', label: 'Liquidación (L00)', icon: FileText, description: 'Liquidación mensual de cotizaciones', color: 'text-purple-600' },
];

const VARIATION_TYPES = [
  'Cambio de contrato',
  'Cambio de jornada',
  'Cambio de categoría',
  'Cambio de CCC',
  'Cambio datos personales',
  'Corrección datos anteriores',
];

const CAUSE_BAJA = [
  'Fin de contrato',
  'Baja voluntaria',
  'Despido disciplinario',
  'Despido objetivo',
  'ERE/ERTE',
  'Jubilación',
  'Incapacidad permanente',
  'Fallecimiento',
];

export function SSNewCommunicationDialog({ 
  open, 
  onOpenChange, 
  companyId,
  onSuccess 
}: SSNewCommunicationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [commType, setCommType] = useState<string>('');
  const [formData, setFormData] = useState({
    workerId: '',
    workerName: '',
    workerDNI: '',
    effectDate: new Date().toISOString().split('T')[0],
    ccc: '',
    contractType: '',
    variationType: '',
    causeBaja: '',
    observations: '',
  });

  const handleSubmit = async () => {
    if (!commType) {
      toast.error('Selecciona un tipo de comunicación');
      return;
    }
    if (!formData.workerName && commType !== 'L00') {
      toast.error('Introduce el nombre del trabajador');
      return;
    }

    setLoading(true);
    try {
      // Simular envío al Sistema RED
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const refNumber = `RED-${new Date().getFullYear()}-${commType}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      toast.success(
        <div>
          <p className="font-medium">Comunicación {commType} enviada</p>
          <p className="text-sm text-muted-foreground">Ref: {refNumber}</p>
        </div>
      );
      
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Error al enviar la comunicación');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCommType('');
    setFormData({
      workerId: '',
      workerName: '',
      workerDNI: '',
      effectDate: new Date().toISOString().split('T')[0],
      ccc: '',
      contractType: '',
      variationType: '',
      causeBaja: '',
      observations: '',
    });
  };

  const selectedType = COMMUNICATION_TYPES.find(t => t.value === commType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Nueva Comunicación Sistema RED
          </DialogTitle>
          <DialogDescription>
            Envía altas, bajas o variaciones de trabajadores a la Seguridad Social
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de comunicación */}
          <div className="space-y-2">
            <Label>Tipo de Comunicación *</Label>
            <RadioGroup value={commType} onValueChange={setCommType} className="grid grid-cols-2 gap-2">
              {COMMUNICATION_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.value}>
                    <RadioGroupItem
                      value={type.value}
                      id={type.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.value}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Icon className={`mb-1 h-5 w-5 ${type.color}`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {commType && commType !== 'L00' && (
            <>
              {/* Datos del trabajador */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="workerName">Nombre Trabajador *</Label>
                  <Input
                    id="workerName"
                    value={formData.workerName}
                    onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workerDNI">DNI/NIE</Label>
                  <Input
                    id="workerDNI"
                    value={formData.workerDNI}
                    onChange={(e) => setFormData({ ...formData, workerDNI: e.target.value })}
                    placeholder="12345678A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="effectDate">Fecha Efecto *</Label>
                  <Input
                    id="effectDate"
                    type="date"
                    value={formData.effectDate}
                    onChange={(e) => setFormData({ ...formData, effectDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccc">CCC (Código Cuenta)</Label>
                  <Input
                    id="ccc"
                    value={formData.ccc}
                    onChange={(e) => setFormData({ ...formData, ccc: e.target.value })}
                    placeholder="28/1234567/89"
                  />
                </div>
              </div>

              {/* Campos específicos según tipo */}
              {commType === 'AFI' && (
                <div className="space-y-2">
                  <Label htmlFor="contractType">Tipo de Contrato</Label>
                  <Select 
                    value={formData.contractType} 
                    onValueChange={(v) => setFormData({ ...formData, contractType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 - Indefinido tiempo completo</SelectItem>
                      <SelectItem value="200">200 - Indefinido tiempo parcial</SelectItem>
                      <SelectItem value="401">401 - Obra o servicio</SelectItem>
                      <SelectItem value="402">402 - Eventual circunstancias producción</SelectItem>
                      <SelectItem value="501">501 - Interinidad</SelectItem>
                      <SelectItem value="502">502 - Prácticas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {commType === 'BAJ' && (
                <div className="space-y-2">
                  <Label htmlFor="causeBaja">Causa de Baja</Label>
                  <Select 
                    value={formData.causeBaja} 
                    onValueChange={(v) => setFormData({ ...formData, causeBaja: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar causa" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAUSE_BAJA.map((cause) => (
                        <SelectItem key={cause} value={cause}>{cause}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {commType === 'VAR' && (
                <div className="space-y-2">
                  <Label htmlFor="variationType">Tipo de Variación</Label>
                  <Select 
                    value={formData.variationType} 
                    onValueChange={(v) => setFormData({ ...formData, variationType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo variación" />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIATION_TYPES.map((vt) => (
                        <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Información adicional para la comunicación..."
                  rows={2}
                />
              </div>
            </>
          )}

          {commType === 'L00' && (
            <div className="p-4 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-2">Liquidación Mensual L00</p>
              <p className="text-muted-foreground">
                Esta comunicación generará el fichero de liquidación mensual con todas las 
                cotizaciones del período seleccionado. Se calculará automáticamente a partir 
                de las nóminas del mes.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !commType}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar a RED
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SSNewCommunicationDialog;
