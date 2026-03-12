/**
 * ESPermisosPanel — Permisos retribuidos según ET + convenio
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

const PERMISOS_ET = [
  { motivo: 'Matrimonio / Pareja de hecho registrada', dias: '15 días naturales', articulo: 'Art. 37.3.a ET', retribuido: true },
  { motivo: 'Nacimiento de hijo/a', dias: '16 semanas (progenitor/a)', articulo: 'Art. 48.4 ET / RDL 6/2019', retribuido: true },
  { motivo: 'Fallecimiento cónyuge / familiar 1er grado', dias: '2 días (4 si desplazamiento)', articulo: 'Art. 37.3.b ET', retribuido: true },
  { motivo: 'Fallecimiento familiar 2º grado', dias: '2 días (4 si desplazamiento)', articulo: 'Art. 37.3.b ET', retribuido: true },
  { motivo: 'Accidente/enfermedad grave u hospitalización familiar', dias: '5 días', articulo: 'Art. 37.3.b ET (RDL 5/2023)', retribuido: true },
  { motivo: 'Intervención quirúrgica sin hospitalización (reposo)', dias: '5 días', articulo: 'Art. 37.3.b ET (RDL 5/2023)', retribuido: true },
  { motivo: 'Traslado de domicilio habitual', dias: '1 día', articulo: 'Art. 37.3.c ET', retribuido: true },
  { motivo: 'Deber inexcusable de carácter público', dias: 'Tiempo indispensable', articulo: 'Art. 37.3.d ET', retribuido: true },
  { motivo: 'Funciones sindicales', dias: 'Según norma', articulo: 'Art. 37.3.e ET', retribuido: true },
  { motivo: 'Exámenes prenatales / preparación al parto', dias: 'Tiempo indispensable', articulo: 'Art. 37.3.f ET', retribuido: true },
  { motivo: 'Lactancia hijo/a < 9 meses', dias: '1h/día (acumulable)', articulo: 'Art. 37.4 ET', retribuido: true },
  { motivo: 'Cuidado de menor hospitalizado (< 18 años)', dias: 'Reducción jornada', articulo: 'Art. 37.6 ET', retribuido: false },
  { motivo: 'Permiso por fuerza mayor familiar', dias: '4 días/año', articulo: 'Art. 37.9 ET (RDL 5/2023)', retribuido: true },
  { motivo: 'Permiso parental (no retribuido)', dias: '8 semanas', articulo: 'Art. 48 bis ET (RDL 5/2023)', retribuido: false },
  { motivo: 'Víctima violencia de género', dias: 'Según necesidad', articulo: 'Art. 37.8 ET', retribuido: true },
];

export function ESPermisosPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Permisos Retribuidos — Estatuto de los Trabajadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {PERMISOS_ET.map((p, i) => (
            <div key={i} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.motivo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{p.articulo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">{p.dias}</Badge>
                  <Badge variant={p.retribuido ? 'default' : 'outline'} className="text-xs">
                    {p.retribuido ? 'Retribuido' : 'No retribuido'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 italic">
          Los convenios colectivos pueden ampliar estos permisos. Consultar convenio aplicable.
        </p>
      </CardContent>
    </Card>
  );
}
