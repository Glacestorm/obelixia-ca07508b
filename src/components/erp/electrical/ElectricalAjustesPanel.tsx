import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, BookOpen, Save, CheckCircle } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { toast } from 'sonner';

interface Props { companyId: string; }

const STORAGE_KEY = 'electrical_module_params';

interface ModuleParams {
  defaultVat: number;
  defaultElectricityTax: number;
  defaultMeterRental: number;
}

const DEFAULT_PARAMS: ModuleParams = {
  defaultVat: 21,
  defaultElectricityTax: 5.11,
  defaultMeterRental: 0.81,
};

export function ElectricalAjustesPanel({ companyId }: Props) {
  const [params, setParams] = useState<ModuleParams>(DEFAULT_PARAMS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setParams(JSON.parse(stored));
    } catch { /* use defaults */ }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    setSaved(true);
    toast.success('Parámetros guardados');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Ajustes" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" /> Ajustes del Módulo
        </h2>
        <p className="text-sm text-muted-foreground">Configuración general del módulo de consultoría eléctrica.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parámetros generales</CardTitle>
            <CardDescription>Valores por defecto para cálculos de simulación e informes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>IVA por defecto (%)</Label>
              <Input type="number" step="0.01" value={params.defaultVat}
                onChange={e => setParams(p => ({ ...p, defaultVat: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid gap-2">
              <Label>Impuesto eléctrico por defecto (%)</Label>
              <Input type="number" step="0.01" value={params.defaultElectricityTax}
                onChange={e => setParams(p => ({ ...p, defaultElectricityTax: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid gap-2">
              <Label>Alquiler de contador por defecto (€/mes)</Label>
              <Input type="number" step="0.01" value={params.defaultMeterRental}
                onChange={e => setParams(p => ({ ...p, defaultMeterRental: parseFloat(e.target.value) || 0 }))} />
            </div>
            <Button onClick={handleSave} className="w-full">
              {saved ? <><CheckCircle className="h-4 w-4 mr-1" /> Guardado</> : <><Save className="h-4 w-4 mr-1" /> Guardar parámetros</>}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" /> Catálogo de tarifas
              </CardTitle>
              <CardDescription>Gestiona las tarifas de las comercializadoras para comparar y simular</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Accede al catálogo de tarifas desde el menú lateral "Catálogo" o desde el simulador.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estados de expediente</CardTitle>
              <CardDescription>Flujo estándar de estados del expediente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-muted-foreground" /> Borrador</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> En análisis</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" /> Propuesta</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500" /> Implementación</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Completado</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> Cancelado</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plantillas de informe</CardTitle>
              <CardDescription>La generación de PDF utiliza una plantilla estándar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Los informes se generan automáticamente desde la pestaña "Informe" de cada expediente con portada, análisis y recomendación incluidos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ElectricalAjustesPanel;
