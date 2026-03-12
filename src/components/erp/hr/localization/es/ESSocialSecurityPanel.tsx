/**
 * ESSocialSecurityPanel — Seguridad Social España
 * Tabs: Cotizaciones | Bases y Tipos | CRA | Comunicaciones RED
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Calculator, FileText, Network } from 'lucide-react';
import { useESLocalization, type SSContributionResult } from '@/hooks/erp/hr/useESLocalization';

interface Props { companyId: string; }

export function ESSocialSecurityPanel({ companyId }: Props) {
  const es = useESLocalization(companyId);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [simGrupo, setSimGrupo] = useState(1);
  const [simSalario, setSimSalario] = useState(2500);
  const [simIsTemp, setSimIsTemp] = useState(false);
  const [simResult, setSimResult] = useState<SSContributionResult | null>(null);

  useEffect(() => { es.fetchSSBases(selectedYear); }, [selectedYear]);

  const handleSimulate = () => {
    const base = es.ssBases.find(b => b.grupo_cotizacion === simGrupo);
    if (base) {
      setSimResult(es.calculateSSContributions(simSalario, base, simIsTemp));
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="calculator">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="calculator" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> Simulador</TabsTrigger>
          <TabsTrigger value="bases" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> Bases {selectedYear}</TabsTrigger>
          <TabsTrigger value="cra" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> CRA</TabsTrigger>
          <TabsTrigger value="red" className="text-xs gap-1"><Network className="h-3.5 w-3.5" /> RED</TabsTrigger>
        </TabsList>

        {/* Simulador de Cotización */}
        <TabsContent value="calculator" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Simulador de Cotización SS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Salario Bruto Mensual</Label>
                  <Input type="number" value={simSalario} onChange={e => setSimSalario(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grupo Cotización</Label>
                  <Select value={String(simGrupo)} onValueChange={v => setSimGrupo(parseInt(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
                        <SelectItem key={g} value={String(g)}>Grupo {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo contrato</Label>
                  <Select value={simIsTemp ? 'temporal' : 'indefinido'} onValueChange={v => setSimIsTemp(v === 'temporal')}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="temporal">Temporal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSimulate} size="sm" className="gap-1">
                <Calculator className="h-3.5 w-3.5" /> Calcular
              </Button>

              {simResult && (
                <div className="space-y-3 mt-4">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Base de Cotización</p>
                    <p className="text-lg font-bold">{simResult.baseCotizacion.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Cuota Empresa</CardTitle></CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>CC</span><Badge variant="secondary">{simResult.ccEmpresa.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>Desempleo</span><Badge variant="secondary">{simResult.desempleoEmpresa.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>FOGASA</span><Badge variant="secondary">{simResult.fogasa.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>FP</span><Badge variant="secondary">{simResult.fpEmpresa.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>MEI</span><Badge variant="secondary">{simResult.mei.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>AT/EP</span><Badge variant="secondary">{simResult.atEmpresa.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Empresa</span><Badge>{simResult.totalEmpresa.toFixed(2)}€</Badge></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Cuota Trabajador</CardTitle></CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>CC</span><Badge variant="secondary">{simResult.ccTrabajador.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>Desempleo</span><Badge variant="secondary">{simResult.desempleoTrabajador.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between"><span>FP</span><Badge variant="secondary">{simResult.fpTrabajador.toFixed(2)}€</Badge></div>
                        <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Trabajador</span><Badge>{simResult.totalTrabajador.toFixed(2)}€</Badge></div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bases y Tipos */}
        <TabsContent value="bases" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Bases y Tipos de Cotización {selectedYear}</CardTitle>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {es.ssBases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos para {selectedYear}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Grupo</th>
                        <th className="text-right p-2">Base Mín.</th>
                        <th className="text-right p-2">Base Máx.</th>
                        <th className="text-right p-2">CC Emp.</th>
                        <th className="text-right p-2">CC Trab.</th>
                        <th className="text-right p-2">Desemp. Emp.</th>
                        <th className="text-right p-2">FOGASA</th>
                        <th className="text-right p-2">FP Emp.</th>
                        <th className="text-right p-2">MEI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {es.ssBases.map(b => (
                        <tr key={b.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">Grupo {b.grupo_cotizacion}</td>
                          <td className="p-2 text-right">{b.base_minima_mensual.toFixed(2)}€</td>
                          <td className="p-2 text-right">{b.base_maxima_mensual.toFixed(2)}€</td>
                          <td className="p-2 text-right">{b.tipo_cc_empresa}%</td>
                          <td className="p-2 text-right">{b.tipo_cc_trabajador}%</td>
                          <td className="p-2 text-right">{b.tipo_desempleo_empresa_gi}%</td>
                          <td className="p-2 text-right">{b.tipo_fogasa}%</td>
                          <td className="p-2 text-right">{b.tipo_fp_empresa}%</td>
                          <td className="p-2 text-right">{b.tipo_mei}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRA */}
        <TabsContent value="cra" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p>Código de Cuenta de Cotización (CRA)</p>
              <p className="text-xs mt-1">Gestión de altas, bajas y variaciones de datos — Fase G4 (Integraciones oficiales)</p>
              <Badge variant="outline" className="mt-2">Próximamente</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RED */}
        <TabsContent value="red" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p>Comunicaciones RED (AFI, FDI, FAN)</p>
              <p className="text-xs mt-1">Preparación de ficheros para Sistema RED — Fase G4</p>
              <Badge variant="outline" className="mt-2">Próximamente</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
