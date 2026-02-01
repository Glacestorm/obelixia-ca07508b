/**
 * HRUnionsPanel - Gestión de Sindicatos y Representación Laboral
 * Afiliación sindical, delegados, comité de empresa, crédito horario
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Users, UserCheck, Clock, Calendar, Euro,
  Plus, Edit, FileText, Shield, HeartHandshake,
  Building2, AlertTriangle, CheckCircle
} from 'lucide-react';

interface HRUnionsPanelProps {
  companyId: string;
}

export function HRUnionsPanel({ companyId }: HRUnionsPanelProps) {
  const [activeTab, setActiveTab] = useState('afiliacion');

  // Demo data - Afiliaciones sindicales
  const memberships = [
    { 
      id: '1', 
      employee: 'María García López', 
      department: 'Administración',
      union: 'CCOO',
      membershipDate: '2020-03-15',
      monthlyFee: 18.50,
      payrollDeduction: true,
      status: 'active'
    },
    { 
      id: '2', 
      employee: 'Juan Martínez Ruiz', 
      department: 'Producción',
      union: 'UGT',
      membershipDate: '2019-06-01',
      monthlyFee: 16.00,
      payrollDeduction: true,
      status: 'active'
    },
    { 
      id: '3', 
      employee: 'Ana Fernández Castro', 
      department: 'Comercial',
      union: 'USO',
      membershipDate: '2021-01-10',
      monthlyFee: 15.00,
      payrollDeduction: false,
      status: 'active'
    },
  ];

  // Demo - Representantes
  const representatives = [
    {
      id: '1',
      employee: 'Pedro Sánchez Gómez',
      type: 'delegado_personal',
      typeLabel: 'Delegado de Personal',
      union: 'CCOO',
      startDate: '2024-06-15',
      endDate: '2028-06-15',
      creditHours: 15,
      usedHours: 8,
      status: 'active'
    },
    {
      id: '2',
      employee: 'Laura Díaz Martín',
      type: 'comite_empresa',
      typeLabel: 'Comité de Empresa',
      union: 'UGT',
      startDate: '2024-06-15',
      endDate: '2028-06-15',
      creditHours: 20,
      usedHours: 12,
      status: 'active'
    },
    {
      id: '3',
      employee: 'Carlos Ruiz López',
      type: 'delegado_sindical',
      typeLabel: 'Delegado Sindical',
      union: 'CCOO',
      startDate: '2024-06-15',
      endDate: '2028-06-15',
      creditHours: 15,
      usedHours: 5,
      status: 'active'
    },
  ];

  // Demo - Elecciones
  const elections = [
    {
      id: '1',
      date: '2024-06-10',
      type: 'Delegados de Personal',
      census: 47,
      voters: 42,
      participation: 89.4,
      results: [
        { union: 'CCOO', votes: 18, seats: 1 },
        { union: 'UGT', votes: 15, seats: 1 },
        { union: 'USO', votes: 9, seats: 0 },
      ],
      status: 'completed'
    },
  ];

  // Estadísticas
  const stats = {
    totalAffiliated: memberships.length,
    affiliationRate: ((memberships.length / 47) * 100).toFixed(1),
    totalRepresentatives: representatives.length,
    totalCreditHours: representatives.reduce((sum, r) => sum + r.creditHours, 0),
    usedCreditHours: representatives.reduce((sum, r) => sum + r.usedHours, 0),
    monthlyDeductions: memberships.filter(m => m.payrollDeduction).reduce((sum, m) => sum + m.monthlyFee, 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Activo</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30">Inactivo</Badge>;
      case 'suspended':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Suspendido</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Completado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUnionBadge = (union: string) => {
    const colors: Record<string, string> = {
      'CCOO': 'bg-red-500/10 text-red-600 border-red-500/30',
      'UGT': 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      'USO': 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      'CGT': 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    };
    return <Badge className={colors[union] || 'bg-gray-500/10'}>{union}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Afiliados</p>
                <p className="text-lg font-bold">{stats.totalAffiliated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tasa afiliación</p>
                <p className="text-lg font-bold">{stats.affiliationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Representantes</p>
                <p className="text-lg font-bold">{stats.totalRepresentatives}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Horas sindicales</p>
                <p className="text-lg font-bold">{stats.usedCreditHours}/{stats.totalCreditHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cuotas/mes</p>
                <p className="text-lg font-bold">€{stats.monthlyDeductions.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Próx. elecciones</p>
                <p className="text-lg font-bold">2028</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal con tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <HeartHandshake className="h-5 w-5" />
                Sindicatos y Representación
              </CardTitle>
              <CardDescription>Gestión de afiliación sindical, representantes y crédito horario</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="afiliacion" className="text-xs gap-1">
                <Users className="h-3 w-3" />
                Afiliación
              </TabsTrigger>
              <TabsTrigger value="representantes" className="text-xs gap-1">
                <UserCheck className="h-3 w-3" />
                Representantes
              </TabsTrigger>
              <TabsTrigger value="credito" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Crédito Horario
              </TabsTrigger>
              <TabsTrigger value="elecciones" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                Elecciones
              </TabsTrigger>
            </TabsList>

            {/* Tab Afiliación */}
            <TabsContent value="afiliacion" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Trabajadores afiliados</h4>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar afiliación
                </Button>
              </div>

              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Sindicato</TableHead>
                      <TableHead>Fecha afiliación</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                      <TableHead>Retención nómina</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.employee}</TableCell>
                        <TableCell>{m.department}</TableCell>
                        <TableCell>{getUnionBadge(m.union)}</TableCell>
                        <TableCell>{m.membershipDate}</TableCell>
                        <TableCell className="text-right">€{m.monthlyFee.toFixed(2)}</TableCell>
                        <TableCell>
                          {m.payrollDeduction ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(m.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Tab Representantes */}
            <TabsContent value="representantes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Representantes legales de los trabajadores</h4>
              </div>

              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Representante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Sindicato</TableHead>
                      <TableHead>Mandato</TableHead>
                      <TableHead>Horas/mes</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {representatives.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employee}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.typeLabel}</Badge>
                        </TableCell>
                        <TableCell>{getUnionBadge(r.union)}</TableCell>
                        <TableCell className="text-sm">
                          {r.startDate} - {r.endDate}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{r.creditHours}h</span>
                            <Progress value={(r.usedHours / r.creditHours) * 100} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Info legal */}
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-700">Art. 68 Estatuto de los Trabajadores</p>
                      <p className="text-muted-foreground">
                        Los representantes tienen derecho a un crédito de horas mensuales retribuidas según 
                        el tamaño de la plantilla: hasta 100 trabajadores (15h), 101-250 (20h), 251-500 (30h), 
                        501-750 (35h), más de 750 (40h).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Crédito Horario */}
            <TabsContent value="credito" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Control de horas sindicales</h4>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar uso
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {representatives.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{r.employee}</CardTitle>
                      <CardDescription>{r.typeLabel}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Crédito mensual:</span>
                          <span className="font-medium">{r.creditHours} horas</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Utilizadas:</span>
                          <span className="font-medium">{r.usedHours} horas</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Disponibles:</span>
                          <span className="font-medium text-green-600">{r.creditHours - r.usedHours} horas</span>
                        </div>
                        <Progress value={(r.usedHours / r.creditHours) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">
                          {((r.usedHours / r.creditHours) * 100).toFixed(0)}% utilizado
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab Elecciones */}
            <TabsContent value="elecciones" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Historial de elecciones sindicales</h4>
              </div>

              {elections.map((election) => (
                <Card key={election.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Elecciones {election.type} - {election.date}
                      </CardTitle>
                      {getStatusBadge(election.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold">{election.census}</p>
                        <p className="text-xs text-muted-foreground">Censo electoral</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold">{election.voters}</p>
                        <p className="text-xs text-muted-foreground">Votantes</p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{election.participation}%</p>
                        <p className="text-xs text-muted-foreground">Participación</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sindicato</TableHead>
                          <TableHead className="text-right">Votos</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead className="text-right">Representantes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {election.results.map((result, i) => (
                          <TableRow key={i}>
                            <TableCell>{getUnionBadge(result.union)}</TableCell>
                            <TableCell className="text-right">{result.votes}</TableCell>
                            <TableCell className="text-right">
                              {((result.votes / election.voters) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right font-medium">{result.seats}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRUnionsPanel;
