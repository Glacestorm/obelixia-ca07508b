/**
 * ESIRPFPanel — IRPF España: tramos, calculadora retención, modelos 111/190
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Table, FileText } from 'lucide-react';
import { useESLocalization, type IRPFResult } from '@/hooks/erp/hr/useESLocalization';

interface Props { companyId: string; }

export function ESIRPFPanel({ companyId }: Props) {
  const es = useESLocalization(companyId);
  const [year, setYear] = useState(2026);
  const [salario, setSalario] = useState(30000);
  const [situacion, setSituacion] = useState(1);
  const [hijos25, setHijos25] = useState(0);
  const [hijos3, setHijos3] = useState(0);
  const [ascendientes, setAscendientes] = useState(0);
  const [result, setResult] = useState<IRPFResult | null>(null);

  useEffect(() => { es.fetchIRPFTables(year); }, [year]);

  const handleCalculate = () => {
    if (es.irpfTables.length === 0) return;
    const r = es.calculateIRPFRetention({
      salarioBrutoAnual: salario,
      situacionFamiliar: situacion,
      hijosmenores25: hijos25,
      hijosMenores3: hijos3,
      ascendientesCargo: ascendientes,
      discapacidadHijos: false,
      pensionCompensatoria: 0,
      anualidadAlimentos: 0,
      reduccionMovilidad: false,
      prolongacionLaboral: false,
      contratoInferiorAnual: false,
    }, es.irpfTables);
    setResult(r);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="calculator">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="calculator" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> Calculadora</TabsTrigger>
          <TabsTrigger value="tables" className="text-xs gap-1"><Table className="h-3.5 w-3.5" /> Tramos {year}</TabsTrigger>
          <TabsTrigger value="models" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Calculadora de Retención IRPF {year}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Salario Bruto Anual (€)</Label>
                  <Input type="number" value={salario} onChange={e => setSalario(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Situación Familiar</Label>
                  <Select value={String(situacion)} onValueChange={v => setSituacion(parseInt(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — General</SelectItem>
                      <SelectItem value="2">2 — Cónyuge sin rentas</SelectItem>
                      <SelectItem value="3">3 — Resto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hijos &lt; 25</Label>
                  <Input type="number" min="0" value={hijos25} onChange={e => setHijos25(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hijos &lt; 3</Label>
                  <Input type="number" min="0" value={hijos3} onChange={e => setHijos3(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ascendientes</Label>
                  <Input type="number" min="0" value={ascendientes} onChange={e => setAscendientes(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>
              <Button onClick={handleCalculate} size="sm" className="gap-1" disabled={es.irpfTables.length === 0}>
                <Calculator className="h-3.5 w-3.5" /> Calcular Retención
              </Button>

              {result && (
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 border text-center">
                      <p className="text-xs text-muted-foreground">Tipo Efectivo</p>
                      <p className="text-xl font-bold text-primary">{result.tipoEfectivo}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border text-center">
                      <p className="text-xs text-muted-foreground">Retención Mensual</p>
                      <p className="text-xl font-bold">{result.retencionMensual.toFixed(2)}€</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border text-center">
                      <p className="text-xs text-muted-foreground">Cuota Íntegra Anual</p>
                      <p className="text-xl font-bold">{result.cuotaIntegra.toFixed(2)}€</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border text-center">
                      <p className="text-xs text-muted-foreground">Base Imponible</p>
                      <p className="text-xl font-bold">{result.baseImponible.toFixed(2)}€</p>
                    </div>
                  </div>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-xs">Desglose por Tramos</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        {result.tramosAplicados.map((t, i) => (
                          <div key={i} className="flex justify-between p-2 rounded border">
                            <span>{t.desde.toLocaleString()}€ — {t.hasta ? `${t.hasta.toLocaleString()}€` : 'En adelante'}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline">{t.tipo}%</Badge>
                              <Badge variant="secondary">{t.cuota.toFixed(2)}€</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tramos IRPF {year} — Estatal</CardTitle>
            </CardHeader>
            <CardContent>
              {es.irpfTables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin tramos para {year}</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {es.irpfTables.map(t => (
                    <div key={t.id} className="flex justify-between p-2 rounded border">
                      <span>{t.tramo_desde.toLocaleString()}€ — {t.tramo_hasta ? `${t.tramo_hasta.toLocaleString()}€` : 'En adelante'}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">Estatal {t.tipo_estatal}%</Badge>
                        <Badge variant="outline">Autonóm. {t.tipo_autonomico}%</Badge>
                        <Badge variant="secondary">{t.tipo_total}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-medium">Modelo 111</p>
                <p className="text-xs mt-1">Retenciones e ingresos a cuenta trimestrales</p>
                <Badge variant="outline" className="mt-2">Fase G4</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-medium">Modelo 190</p>
                <p className="text-xs mt-1">Resumen anual de retenciones IRPF</p>
                <Badge variant="outline" className="mt-2">Fase G4</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
