/**
 * ExpedientCompensacionTab — Global compensation history (no local tax calculations)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employeeId: string;
  companyId: string;
  currentSalary?: number;
  onNavigate?: (module: string) => void;
}

export function ExpedientCompensacionTab({ employeeId, companyId, currentSalary, onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Compensación Global</span>
            {onNavigate && (
              <Button variant="outline" size="sm" onClick={() => onNavigate('compensation-suite')}>
                Suite completa
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10">
              <p className="text-xs text-muted-foreground">Salario bruto anual</p>
              <p className="text-2xl font-bold mt-1">
                {currentSalary ? `${currentSalary.toLocaleString()} €` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground">Beneficios globales</p>
              <p className="text-lg font-semibold mt-1 text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground mt-1">Pendiente de configurar</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Histórico salarial</p>
              <p className="text-lg font-semibold mt-1 text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground mt-1">Sin revisiones registradas</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Los detalles de coste empresa por SS y retenciones fiscales se gestionan desde la localización de cada país.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
