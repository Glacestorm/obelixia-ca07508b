/**
 * HRContractsPanel - Gestión de contratos, finiquitos e indemnizaciones
 * Integrado con tablas erp_hr_contracts
 */

import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle, Clock, Calculator, UserX, Euro, FileDown, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HRContractFormDialog } from './HRContractFormDialog';
import { HRSettlementDialog } from './dialogs';

interface HRContractsPanelProps {
  companyId: string;
  companyCNAE?: string;
}

interface Contract {
  id: string;
  employee_id: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  base_salary: number | null;
  category: string | null;
  workday_type: string;
  is_active: boolean;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    department_id: string | null;
  };
}

export function HRContractsPanel({ companyId, companyCNAE }: HRContractsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);

  // Fetch contracts from database
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_contracts')
        .select(`
          id, employee_id, contract_type, contract_code, start_date, end_date,
          base_salary, category, workday_type, is_active,
          erp_hr_employees!employee_id (id, first_name, last_name, department_id)
        `)
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setContracts((data || []).map((c: any) => ({
        ...c,
        employee: c.erp_hr_employees
      })));
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleContractSuccess = () => {
    fetchContracts();
    setShowContractDialog(false);
    setSelectedContract(null);
  };

  // H1.1: Settlements from real DB
  const [settlements, setSettlements] = useState<any[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [settlementsIsDemo, setSettlementsIsDemo] = useState(false);

  const fetchSettlements = useCallback(async () => {
    setSettlementsLoading(true);
    try {
      const { data, error } = await (supabase
        .from('erp_hr_settlements')
        .select('id, employee_id, termination_type, termination_date, pending_vacation_days, extra_pays_proportional, indemnization_gross, gross_total, status') as any)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        setSettlementsIsDemo(true);
        setSettlements(DEMO_SETTLEMENTS);
      } else {
        // Resolve employee names
        const empIds = (data as any[]).map((s: any) => s.employee_id).filter(Boolean);
        let empMap: Record<string, string> = {};
        if (empIds.length > 0) {
          const { data: emps } = await (supabase
            .from('erp_hr_employees')
            .select('id, first_name, last_name') as any)
            .in('id', empIds);
          (emps as any[])?.forEach((e: any) => {
            empMap[e.id] = `${e.first_name} ${e.last_name}`.trim();
          });
        }
        setSettlementsIsDemo(false);
        setSettlements((data as any[]).map((s: any) => ({
          id: s.id,
          employee: empMap[s.employee_id] || s.employee_id?.slice(0, 8) + '…',
          reason: s.termination_type || '—',
          terminationDate: s.termination_date,
          vacationDays: Number(s.pending_vacation_days) || 0,
          extraPays: Number(s.extra_pays_proportional) || 0,
          compensation: Number(s.indemnization_gross) || 0,
          total: Number(s.gross_total) || 0,
          status: s.status,
        })));
      }
    } catch (err) {
      console.error('Error fetching settlements:', err);
      setSettlementsIsDemo(true);
      setSettlements(DEMO_SETTLEMENTS);
    } finally {
      setSettlementsLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const DEMO_SETTLEMENTS = [
    {
      id: 'demo-1', employee: 'Roberto Gómez Vila', reason: 'Baja voluntaria',
      terminationDate: '2026-01-15', vacationDays: 5, extraPays: 876.50,
      compensation: 0, total: 2356.80, status: 'calculated'
    },
    {
      id: 'demo-2', employee: 'Laura Díaz Martín', reason: 'Fin contrato temporal',
      terminationDate: '2025-12-31', vacationDays: 3, extraPays: 520.00,
      compensation: 1250.00, total: 3890.40, status: 'paid'
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
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Indefinido</Badge>;
      case 'temporal':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Temporal</Badge>;
      case 'practicas':
        return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30">Prácticas</Badge>;
      case 'formacion':
        return <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/30">Formación</Badge>;
      default:
        return <Badge variant="outline">Otro</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, endDate: string | null) => {
    if (!isActive) {
      return <Badge className="bg-muted text-muted-foreground">Finalizado</Badge>;
    }
    if (endDate) {
      const daysUntilEnd = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd < 0) {
        return <Badge className="bg-destructive/10 text-destructive">Vencido</Badge>;
      }
      if (daysUntilEnd <= 30) {
        return <Badge className="bg-amber-500/10 text-amber-600">Por vencer</Badge>;
      }
    }
    return <Badge className="bg-emerald-500/10 text-emerald-600">Activo</Badge>;
  };

  const getSettlementStatusBadge = (status: string) => {
    switch (status) {
      case 'calculated':
        return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30">Calculado</Badge>;
      case 'paid':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Pagado</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  const filteredContracts = contracts.filter(c => {
    const employeeName = c.employee ? `${c.employee.first_name} ${c.employee.last_name}` : '';
    return employeeName.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
                <Button size="sm" onClick={() => setShowContractDialog(true)}>
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
                <Button variant="outline" size="sm" onClick={fetchContracts} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
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
                    {filteredContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {loading ? 'Cargando contratos...' : 'No hay contratos registrados'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContracts.map((contract) => {
                        const employeeName = contract.employee 
                          ? `${contract.employee.first_name} ${contract.employee.last_name}` 
                          : 'Sin asignar';
                        return (
                          <TableRow key={contract.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{employeeName}</p>
                                <p className="text-xs text-muted-foreground">{contract.category || '-'}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getTypeBadge(contract.contract_type)}</TableCell>
                            <TableCell className="text-sm">{contract.start_date}</TableCell>
                            <TableCell className="text-sm">
                              {contract.end_date || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>{contract.workday_type === 'completa' ? 'Completa' : 'Parcial'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {contract.base_salary ? `€${contract.base_salary.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(contract.is_active, contract.end_date)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedContract(contract);
                                setShowContractDialog(true);
                              }}>
                                Ver
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
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
                <Button size="sm" onClick={() => setShowSettlementDialog(true)}>
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
                        <TableCell>{getSettlementStatusBadge(settlement.status)}</TableCell>
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

      {/* Contract Form Dialog */}
      <HRContractFormDialog
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        companyId={companyId}
        contractId={selectedContract?.id}
        companyCNAE={companyCNAE}
        onSaved={handleContractSuccess}
      />

      {/* Settlement Dialog */}
      <HRSettlementDialog
        open={showSettlementDialog}
        onOpenChange={setShowSettlementDialog}
        companyId={companyId}
        onSuccess={() => setShowSettlementDialog(false)}
      />
    </div>
  );
}

export default HRContractsPanel;
