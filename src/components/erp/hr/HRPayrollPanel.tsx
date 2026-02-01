/**
 * HRPayrollPanel - Gestión de nóminas
 * Cálculo, generación y seguimiento de nóminas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DollarSign, Calculator, FileDown, Search, Filter,
  CheckCircle, Clock, AlertTriangle, Users,
  TrendingUp, Euro, Plus, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { HRPayrollEntryDialog } from './HRPayrollEntryDialog';

interface HRPayrollPanelProps {
  companyId: string;
}

export function HRPayrollPanel({ companyId }: HRPayrollPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-02');
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);

  // Demo data
  const payrolls = [
    { 
      id: '1', 
      employee: 'María García López', 
      department: 'Administración',
      grossSalary: 2800,
      netSalary: 2156.80,
      irpf: 15.2,
      ss: 6.35,
      extras: 200,
      deductions: 50,
      status: 'paid',
      payDate: '2026-01-28'
    },
    { 
      id: '2', 
      employee: 'Juan Martínez Ruiz', 
      department: 'Producción',
      grossSalary: 2400,
      netSalary: 1891.20,
      irpf: 12.5,
      ss: 6.35,
      extras: 150,
      deductions: 0,
      status: 'pending',
      payDate: null
    },
    { 
      id: '3', 
      employee: 'Ana Fernández Castro', 
      department: 'Comercial',
      grossSalary: 3200,
      netSalary: 2432.00,
      irpf: 18.0,
      ss: 6.35,
      extras: 400,
      deductions: 100,
      status: 'calculated',
      payDate: null
    },
    { 
      id: '4', 
      employee: 'Carlos Rodríguez Pérez', 
      department: 'IT',
      grossSalary: 3500,
      netSalary: 2625.00,
      irpf: 20.0,
      ss: 6.35,
      extras: 0,
      deductions: 0,
      status: 'error',
      payDate: null
    },
  ];

  const summary = {
    totalGross: 142800,
    totalNet: 109752.50,
    totalIRPF: 21420,
    totalSS: 9073.80,
    employeesCount: 47,
    pendingCount: 3
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Pagada</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pendiente</Badge>;
      case 'calculated':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Calculada</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Error</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const filteredPayrolls = payrolls.filter(p =>
    p.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Resumen mensual */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Bruto Total</p>
                <p className="text-lg font-bold">€{summary.totalGross.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Neto Total</p>
                <p className="text-lg font-bold">€{summary.totalNet.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">IRPF</p>
                <p className="text-lg font-bold">€{summary.totalIRPF.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Seg. Social</p>
                <p className="text-lg font-bold">€{summary.totalSS.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Empleados</p>
                <p className="text-lg font-bold">{summary.employeesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">{summary.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Herramientas y filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Nóminas - {selectedMonth}</CardTitle>
              <CardDescription>Gestión y cálculo de nóminas mensuales</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-[180px]"
              />
              <Button size="sm" onClick={() => setShowPayrollDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Nómina
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.success('Calculando nóminas...', { duration: 2000 });
                  setTimeout(() => toast.success('4 nóminas calculadas correctamente'), 2500);
                }}
              >
                <Calculator className="h-4 w-4 mr-1" />
                Calcular Todas
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast.success('Exportando archivo SEPA...');
                  setTimeout(() => toast.success('Archivo remesa_202602.xml generado'), 1500);
                }}
              >
                <FileDown className="h-4 w-4 mr-1" />
                Exportar SEPA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Búsqueda */}
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

          {/* Tabla de nóminas */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">IRPF %</TableHead>
                  <TableHead className="text-right">SS %</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{payroll.employee}</TableCell>
                    <TableCell>{payroll.department}</TableCell>
                    <TableCell className="text-right">€{payroll.grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{payroll.irpf}%</TableCell>
                    <TableCell className="text-right">{payroll.ss}%</TableCell>
                    <TableCell className="text-right text-green-600">
                      {payroll.extras > 0 ? `+€${payroll.extras}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      €{payroll.netSalary.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedPayrollId(payroll.id);
                          setShowPayrollDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de entrada de nómina */}
      <HRPayrollEntryDialog
        open={showPayrollDialog}
        onOpenChange={(open) => {
          setShowPayrollDialog(open);
          if (!open) setSelectedPayrollId(null);
        }}
        companyId={companyId}
        month={selectedMonth}
        onSave={(data) => {
          console.log('Payroll saved:', data);
          toast.success('Nómina guardada correctamente');
        }}
      />
    </div>
  );
}

export default HRPayrollPanel;
