/**
 * HRPayrollPage — Ruta: /obelixia-admin/hr/payroll
 */
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { PayrollSimulatorPanel, HRCustomConceptsPanel } from '@/components/hr/payroll';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from '@/contexts/ERPContext';
import { STANDARD_SYMBOLS } from '@/types/hr';
import { toast } from 'sonner';

interface SimpleEmployee {
  id: string;
  full_name: string;
}

interface SymbolicRow {
  id?: string;
  symbol_name: string;
  symbol_value: string;
}

function SymbolicValuesCard() {
  const { currentCompany } = useERPContext();
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [symbolicData, setSymbolicData] = useState<SymbolicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch employees
  useEffect(() => {
    if (!currentCompany?.id) return;
    (async () => {
      const { data } = await supabase
        .from('erp_hr_employees')
        .select('id, full_name')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('full_name');
      setEmployees((data || []) as SimpleEmployee[]);
    })();
  }, [currentCompany?.id]);

  // Fetch symbolic data for selected employee
  const fetchSymbolicData = useCallback(async (empId: string) => {
    if (!currentCompany?.id || !empId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_symbolic_data')
        .select('id, symbol_name, symbol_value')
        .eq('company_id', currentCompany.id)
        .eq('employee_id', empId);
      if (error) throw error;
      setSymbolicData((data || []) as SymbolicRow[]);
    } catch {
      toast.error('Error cargando valores simbólicos');
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    if (selectedEmpId) fetchSymbolicData(selectedEmpId);
    else setSymbolicData([]);
  }, [selectedEmpId, fetchSymbolicData]);

  const handleStartEdit = (symbolName: string, currentVal: string) => {
    setEditingSymbol(symbolName);
    setEditValue(currentVal);
  };

  const handleSaveEdit = async (symbolName: string) => {
    if (!currentCompany?.id || !selectedEmpId) return;
    try {
      const existing = symbolicData.find(s => s.symbol_name === symbolName);
      if (existing?.id) {
        await supabase
          .from('erp_hr_employee_symbolic_data')
          .update({ symbol_value: editValue } as any)
          .eq('id', existing.id);
      } else {
        const catalogItem = STANDARD_SYMBOLS.find(s => s.name === symbolName);
        await supabase
          .from('erp_hr_employee_symbolic_data')
          .insert([{
            company_id: currentCompany.id,
            employee_id: selectedEmpId,
            symbol_name: symbolName,
            symbol_value: editValue,
            value_type: catalogItem?.type || 'text',
            category: catalogItem?.category || 'payroll',
          }] as any);
      }
      toast.success('Valor simbólico actualizado');
      setEditingSymbol(null);
      await fetchSymbolicData(selectedEmpId);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const getValueForSymbol = (name: string) => {
    const found = symbolicData.find(s => s.symbol_name === name);
    return found?.symbol_value ?? '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          Valores simbólicos del ciclo
        </CardTitle>
        <CardDescription>
          Consulta y edita los valores simbólicos asignados a cada empleado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecciona un empleado" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
              {employees.length === 0 && (
                <SelectItem value="_none" disabled>Sin empleados activos</SelectItem>
              )}
            </SelectContent>
          </Select>

          {!selectedEmpId ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Selecciona un empleado para ver sus valores simbólicos
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Nombre simbólico</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Denominación larga</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Valor actual</th>
                      <th className="p-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {STANDARD_SYMBOLS.map(sym => {
                      const val = getValueForSymbol(sym.name);
                      const isEditing = editingSymbol === sym.name;

                      return (
                        <tr key={sym.name} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-2 font-mono text-xs">{sym.name}</td>
                          <td className="p-2 text-xs">{sym.label}</td>
                          <td className="p-2">
                            {isEditing ? (
                              <Input
                                className="h-7 text-xs w-full"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs">
                                {val ? (
                                  <Badge variant="secondary" className="text-[10px]">{val}</Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">—</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleSaveEdit(sym.name)}
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setEditingSymbol(null)}
                                >
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleStartEdit(sym.name, val)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function HRPayrollPage() {
  return (
    <DashboardLayout title="Motor de Nómina">
      <HRErrorBoundary section="Motor de Nómina">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motor de Nómina</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cálculo completo de devengos, deducciones, bases SS, IRPF y neto · RDL 3/2026
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PayrollSimulatorPanel />
          <HRCustomConceptsPanel />
        </div>
        <SymbolicValuesCard />
      </div>
      </HRErrorBoundary>
    </DashboardLayout>
  );
}

export default HRPayrollPage;
