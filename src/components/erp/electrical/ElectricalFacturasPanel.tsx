import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload } from 'lucide-react';

interface Props { companyId: string; }

export function ElectricalFacturasPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Facturas & Contratos
          </h2>
          <p className="text-sm text-muted-foreground">Subida y gestión de facturas eléctricas y contratos de suministro.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Subir documento
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos del expediente</CardTitle>
          <CardDescription>Facturas y contratos asociados</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            La subida y gestión documental se implementará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalFacturasPanel;
