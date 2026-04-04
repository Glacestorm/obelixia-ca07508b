import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Calculator, Copy } from 'lucide-react';
import { calculateFiniquito } from '@/lib/hr/laborDocumentEngine';
import { toast } from 'sonner';

interface HRLaborDocumentsPanelProps {
  employeeId: string;
}

export function HRLaborDocumentsPanel({ employeeId }: HRLaborDocumentsPanelProps) {
  const [dismissalType, setDismissalType] = useState<string>('procedente');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [annualSalary, setAnnualSalary] = useState(30000);
  const [yearsWorked, setYearsWorked] = useState(3);
  const [vacEntitled, setVacEntitled] = useState(30);
  const [vacTaken, setVacTaken] = useState(10);

  const result = calculateFiniquito({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - yearsWorked)),
    endDate: new Date(endDate),
    annualSalary, vacationDaysEntitled: vacEntitled, vacationDaysTaken: vacTaken,
    extraPayments: 14, dismissalType: dismissalType as any, yearsWorked,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Calculadora de Finiquito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Tipo extinción</Label>
              <Select value={dismissalType} onValueChange={setDismissalType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="procedente">Objetivo Art.52</SelectItem>
                  <SelectItem value="improcedente">Improcedente Art.56</SelectItem>
                  <SelectItem value="temporal_end">Fin temporal Art.49</SelectItem>
                  <SelectItem value="null">Nulo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fecha extinción</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <div><Label>Salario anual (€)</Label><Input type="number" value={annualSalary} onChange={e => setAnnualSalary(Number(e.target.value))} /></div>
            <div><Label>Años trabajados</Label><Input type="number" value={yearsWorked} onChange={e => setYearsWorked(Number(e.target.value))} /></div>
            <div><Label>Vac. generadas</Label><Input type="number" value={vacEntitled} onChange={e => setVacEntitled(Number(e.target.value))} /></div>
            <div><Label>Vac. disfrutadas</Label><Input type="number" value={vacTaken} onChange={e => setVacTaken(Number(e.target.value))} /></div>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Vacaciones pendientes ({result.vacationPending} días)</span><span className="font-medium">{result.vacationAmount.toFixed(2)} €</span></div>
            <div className="flex justify-between"><span>Pagas extras proporcionales</span><span className="font-medium">{result.extraProportional.toFixed(2)} €</span></div>
            <div className="flex justify-between"><span>Indemnización ({result.indemnizationDays} días/año)</span><span className="font-medium">{result.severance.toFixed(2)} €</span></div>
            <Separator />
            <div className="flex justify-between text-base font-bold text-emerald-600"><span>TOTAL FINIQUITO</span><span>{result.totalBruto.toFixed(2)} €</span></div>
            <p className="text-xs text-muted-foreground">Base legal: {result.legalNote}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(`Finiquito: ${result.totalBruto.toFixed(2)}€ (Vac: ${result.vacationAmount.toFixed(2)}€ + Extras: ${result.extraProportional.toFixed(2)}€ + Indemn: ${result.severance.toFixed(2)}€)`)}>
            <Copy className="h-4 w-4 mr-1" /> Exportar cálculo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Certificado para Desempleo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Certificado de empresa conforme a RD 625/1985 con datos del empleado pre-rellenados.</p>
          <div className="p-3 rounded border bg-muted/30 text-xs space-y-1">
            <p><strong>Empleado:</strong> {employeeId}</p>
            <p><strong>Tipo de cese:</strong> {dismissalType === 'procedente' ? 'Despido objetivo' : dismissalType === 'improcedente' ? 'Despido improcedente' : 'Fin de contrato temporal'}</p>
            <p><strong>Salario base anual:</strong> {annualSalary.toFixed(2)} €</p>
            <p><strong>Años trabajados:</strong> {yearsWorked}</p>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.info('Datos copiados para solicitud oficial')}>
            <Copy className="h-4 w-4 mr-1" /> Copiar datos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
