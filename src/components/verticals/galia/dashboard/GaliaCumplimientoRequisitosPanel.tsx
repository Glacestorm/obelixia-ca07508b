/**
 * GALIA - Panel de Cumplimiento de Requisitos
 * Semáforo inteligente que verifica cumplimiento de convocatoria
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Requisito {
  id: string;
  label: string;
  estado: 'cumple' | 'no_cumple' | 'pendiente' | 'advertencia';
  detalle?: string;
  fuente?: string;
}

const MOCK_REQUISITOS: Requisito[] = [
  { id: '1', label: 'Beneficiario elegible (PYME/Autónomo)', estado: 'cumple', detalle: 'NIF verificado en AEAT', fuente: 'AEAT' },
  { id: '2', label: 'Al corriente obligaciones tributarias', estado: 'cumple', detalle: 'Certificado positivo obtenido', fuente: 'AEAT' },
  { id: '3', label: 'Al corriente Seguridad Social', estado: 'cumple', detalle: 'Certificado positivo obtenido', fuente: 'TGSS' },
  { id: '4', label: 'No superar mínimis (300k€/3 años)', estado: 'advertencia', detalle: 'Acumulado 285.000€ (Riesgo alto)', fuente: 'BDNS' },
  { id: '5', label: 'Memoria técnica presentada', estado: 'cumple', detalle: 'Documento analizado con IA', fuente: 'Galia Doc' },
  { id: '6', label: 'Presupuesto desglosado', estado: 'no_cumple', detalle: 'Faltan facturas proforma en partida 3', fuente: 'Galia Costes' },
  { id: '7', label: 'Licencia de obra', estado: 'pendiente', detalle: 'No detectada en documentación', fuente: 'Galia Doc' },
];

export function GaliaCumplimientoRequisitosPanel() {
  const total = MOCK_REQUISITOS.length;
  const cumplidos = MOCK_REQUISITOS.filter(r => r.estado === 'cumple').length;
  const progreso = Math.round((cumplidos / total) * 100);

  const getIcon = (estado: Requisito['estado']) => {
    switch (estado) {
      case 'cumple': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'no_cumple': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'advertencia': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin-slow" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Cumplimiento de Requisitos</CardTitle>
          <Badge variant={progreso === 100 ? 'default' : 'secondary'}>
            {progreso}% Verificado
          </Badge>
        </div>
        <Progress value={progreso} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {MOCK_REQUISITOS.map((req) => (
            <div key={req.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
              <div className="mt-0.5 shrink-0">
                {getIcon(req.estado)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium leading-none">{req.label}</p>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">
                    {req.fuente}
                  </Badge>
                </div>
                {req.detalle && (
                  <p className={cn(
                    "text-xs mt-1",
                    req.estado === 'no_cumple' ? "text-red-500" : 
                    req.estado === 'advertencia' ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {req.detalle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default GaliaCumplimientoRequisitosPanel;
