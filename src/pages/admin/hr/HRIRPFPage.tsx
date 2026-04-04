/**
 * HRIRPFPage — Motor IRPF: regularización, modelos 111/190, certificados
 * Ruta: /obelixia-admin/hr/irpf
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator, FileText, TrendingUp, AlertTriangle,
  CheckCircle, RefreshCw, Download, Users
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { toast } from 'sonner';

// Simulated IRPF summary for demo
interface IRPFEmployeeSummary {
  id: string;
  name: string;
  situacion: 1 | 2 | 3;
  tipoLegal: number;
  tipoSolicitado: number | null;
  tipoEfectivo: number;
  baseAnual: number;
  retencionMensual: number;
  regularizado: boolean;
}

const DEMO_EMPLOYEES: IRPFEmployeeSummary[] = [
  { id: '1', name: 'Ana García López', situacion: 2, tipoLegal: 18.5, tipoSolicitado: null, tipoEfectivo: 18.5, baseAnual: 32000, retencionMensual: 493.33, regularizado: false },
  { id: '2', name: 'Carlos Martín Ruiz', situacion: 3, tipoLegal: 22.1, tipoSolicitado: 25, tipoEfectivo: 25, baseAnual: 45000, retencionMensual: 937.50, regularizado: true },
  { id: '3', name: 'Elena Fernández Díaz', situacion: 1, tipoLegal: 15.2, tipoSolicitado: null, tipoEfectivo: 15.2, baseAnual: 28000, retencionMensual: 354.67, regularizado: false },
];

export function HRIRPFPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-Q2');

  return (
    <DashboardLayout title="Motor IRPF — Retenciones y Modelos Fiscales">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Motor IRPF</h1>
            <p className="text-muted-foreground mt-1">
              Regularización fiscal, modelos 111/190 y certificados de retenciones
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-Q1">2026 — T1</SelectItem>
                <SelectItem value="2026-Q2">2026 — T2</SelectItem>
                <SelectItem value="2026-Q3">2026 — T3</SelectItem>
                <SelectItem value="2026-Q4">2026 — T4</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" /> Recalcular
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Perceptores</span>
              </div>
              <p className="text-2xl font-bold">3</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Tipo medio</span>
              </div>
              <p className="text-2xl font-bold">19.6%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Retención trimestral</span>
              </div>
              <p className="text-2xl font-bold">5.356,50 €</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Regularizaciones</span>
              </div>
              <p className="text-2xl font-bold">1</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Resumen retenciones</TabsTrigger>
            <TabsTrigger value="modelo111">Modelo 111</TabsTrigger>
            <TabsTrigger value="modelo190">Modelo 190</TabsTrigger>
            <TabsTrigger value="certificates">Certificados</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retenciones por empleado — {selectedPeriod}</CardTitle>
                <CardDescription>
                  Tipo legal (Art. 82-86 RIRPF) vs tipo solicitado (Art. 88.5 RIRPF)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {DEMO_EMPLOYEES.map((emp) => (
                      <div key={emp.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Situación {emp.situacion} · Base anual: {emp.baseAnual.toLocaleString('es-ES')} €
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {emp.regularizado && (
                              <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                                Regularizado
                              </Badge>
                            )}
                            {emp.tipoSolicitado && emp.tipoSolicitado > emp.tipoLegal && (
                              <Badge variant="secondary" className="text-[10px]">
                                Art. 88.5
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Tipo legal</span>
                            <p className="font-mono font-semibold">{emp.tipoLegal}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Solicitado</span>
                            <p className="font-mono font-semibold">
                              {emp.tipoSolicitado ? `${emp.tipoSolicitado}%` : '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tipo efectivo</span>
                            <p className="font-mono font-semibold text-primary">{emp.tipoEfectivo}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Retención/mes</span>
                            <p className="font-mono font-semibold">{emp.retencionMensual.toFixed(2)} €</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modelo 111 */}
          <TabsContent value="modelo111" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Modelo 111 — Retenciones e ingresos a cuenta</CardTitle>
                    <CardDescription>
                      Declaración trimestral de retenciones IRPF (rendimientos del trabajo)
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => toast.success('Modelo 111 generado')}>
                    <Download className="h-4 w-4 mr-1" /> Generar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">I. Rendimientos del trabajo</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nº perceptores</span>
                        <span className="font-mono">3</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base retenciones</span>
                        <span className="font-mono">26.250,00 €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Retenciones</span>
                        <span className="font-mono font-semibold text-primary">5.356,50 €</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Resumen</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total a ingresar</span>
                        <span className="font-mono font-bold text-lg">5.356,50 €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Período</span>
                        <span>{selectedPeriod}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modelo 190 */}
          <TabsContent value="modelo190" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Modelo 190 — Resumen anual</CardTitle>
                    <CardDescription>
                      Declaración informativa anual de retenciones e ingresos a cuenta del IRPF
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <FileText className="h-4 w-4 mr-1" /> Disponible en T4
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">El Modelo 190 se genera al cierre del ejercicio fiscal</p>
                  <p className="text-xs mt-1">Datos acumulados disponibles a partir de T4 2026</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certificados de retenciones</CardTitle>
                <CardDescription>
                  Generación individual de certificados para cada empleado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {DEMO_EMPLOYEES.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Retención acum.: {(emp.retencionMensual * 6).toFixed(2)} €
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`Certificado de ${emp.name} generado`)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default HRIRPFPage;
