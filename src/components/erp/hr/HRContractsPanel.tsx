/**
 * HRContractsPanel - Gestión de contratos, finiquitos e indemnizaciones
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  FileText, Plus, Search, Filter, Calendar, AlertTriangle,
  CheckCircle, Clock, Calculator, UserX, Euro, FileDown
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRContractsPanelProps {
  companyId: string;
}

export function HRContractsPanel({ companyId }: HRContractsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('contracts');

  // Demo data - Contratos
  const contracts = [
    { 
      id: '1', 
      employee: 'María García López', 
      department: 'Administración',
      type: 'indefinido',
      startDate: '2020-03-15',
      endDate: null,
      salary: 2800,
      category: 'Técnico',
      workday: 'Completa',
      status: 'active'
    },
    { 
      id: '2', 
      employee: 'Juan Martínez Ruiz', 
      department: 'Producción',
      type: 'temporal',
      startDate: '2025-06-01',
      endDate: '2026-02-28',
      salary: 2400,
      category: 'Operario',
      workday: 'Completa',
      status: 'expiring'
    },
    { 
      id: '3', 
      employee: 'Ana Fernández Castro', 
      department: 'Comercial',
      type: 'indefinido',
      startDate: '2021-09-01',
      endDate: null,
      salary: 3200,
      category: 'Comercial',
      workday: 'Completa',
      status: 'active'
    },
    { 
      id: '4', 
      employee: 'Luis Pérez Santos', 
      department: 'IT',
      type: 'practicas',
      startDate: '2025-10-01',
      endDate: '2026-03-31',
      salary: 1200,
      category: 'Becario',
      workday: 'Parcial',
      status: 'active'
    },
  ];

  // Demo data - Finiquitos
  const settlements = [
    {
      id: '1',
      employee: 'Roberto Gómez Vila',
      reason: 'Baja voluntaria',
      terminationDate: '2026-01-15',
      vacationDays: 5,
      extraPays: 876.50,
      compensation: 0,
      total: 2356.80,
      status: 'calculated'
    },
    {
      id: '2',
      employee: 'Laura Díaz Martín',
      reason: 'Fin contrato temporal',
      terminationDate: '2025-12-31',
      vacationDays: 3,
      extraPays: 520.00,
      compensation: 1250.00,
      total: 3890.40,
      status: 'paid'
    },
  ];

  // Demo data - Calculadora indemnizaciones
  const compensationTypes = [
    { type: 'Despido improcedente', days: 33, maxMonths: 24, description: '33 días por año trabajado' },
    { type: 'Despido objetivo', days: 20, maxMonths: 12, description: '20 días por año trabajado' },
    { type: 'Fin contrato temporal', days: 12, maxMonths: null, description: '12 días por año trabajado' },
    { type: 'ERE/ERTE', days: 20, maxMonths: 12, description: '20 días por año trabajado' },
  ];

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'indefinido':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Indefinido</Badge>;
      case 'temporal':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Temporal</Badge>;
      case 'practicas':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Prácticas</Badge>;
      case 'formacion':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">Formación</Badge>;
      default:
        return <Badge variant="outline">Otro</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Activo</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Por vencer</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Vencido</Badge>;
      case 'calculated':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Calculado</Badge>;
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Pagado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const filteredContracts = contracts.filter(c =>
    c.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="settlements" className="gap-2">
            <UserX className="h-4 w-4" />
            Finiquitos
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
        </TabsList>

        {/* Contratos */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Contratos Laborales</CardTitle>
                  <CardDescription>Gestión de contratos activos y vencimientos</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Contrato
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtros
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Salario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contract.employee}</p>
                            <p className="text-xs text-muted-foreground">{contract.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(contract.type)}</TableCell>
                        <TableCell className="text-sm">{contract.startDate}</TableCell>
                        <TableCell className="text-sm">
                          {contract.endDate || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{contract.category}</TableCell>
                        <TableCell className="text-right font-medium">€{contract.salary.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finiquitos */}
        <TabsContent value="settlements" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Finiquitos y Liquidaciones</CardTitle>
                  <CardDescription>Cálculo y gestión de finiquitos</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Finiquito
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Fecha Baja</TableHead>
                      <TableHead className="text-right">Vacaciones</TableHead>
                      <TableHead className="text-right">Pagas Extra</TableHead>
                      <TableHead className="text-right">Indemnización</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium">{settlement.employee}</TableCell>
                        <TableCell>{settlement.reason}</TableCell>
                        <TableCell>{settlement.terminationDate}</TableCell>
                        <TableCell className="text-right">{settlement.vacationDays}d</TableCell>
                        <TableCell className="text-right">€{settlement.extraPays.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{settlement.compensation.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">€{settlement.total.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculadora */}
        <TabsContent value="calculator" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculadora de Indemnizaciones
                </CardTitle>
                <CardDescription>
                  Cálculo automático según normativa laboral vigente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de extinción</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Despido improcedente</option>
                    <option>Despido objetivo</option>
                    <option>Fin contrato temporal</option>
                    <option>ERE/ERTE</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha inicio contrato</label>
                    <Input type="date" defaultValue="2020-01-15" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha extinción</label>
                    <Input type="date" defaultValue="2026-01-31" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Salario bruto mensual</label>
                  <Input type="number" placeholder="2500" defaultValue="2800" />
                </div>

                <Button className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Indemnización
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultado del Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Años trabajados:</span>
                    <span className="font-medium">6 años, 16 días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salario diario:</span>
                    <span className="font-medium">€93.33</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Días por año:</span>
                    <span className="font-medium">33 días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total días:</span>
                    <span className="font-medium">198 días</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Indemnización total:</span>
                    <span className="text-xl font-bold text-green-600">€18,479.34</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700">Nota importante</p>
                      <p className="text-muted-foreground">
                        Este cálculo es orientativo. Consulte con el agente IA de RRHH 
                        para un análisis detallado según su convenio colectivo.
                      </p>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar Cálculo
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de referencia */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Referencia de Indemnizaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Extinción</TableHead>
                    <TableHead className="text-center">Días/Año</TableHead>
                    <TableHead className="text-center">Máximo</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compensationTypes.map((comp, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{comp.type}</TableCell>
                      <TableCell className="text-center">{comp.days}</TableCell>
                      <TableCell className="text-center">
                        {comp.maxMonths ? `${comp.maxMonths} meses` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{comp.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRContractsPanel;
