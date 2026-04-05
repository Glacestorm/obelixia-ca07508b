/**
 * HREmployeeSymbolicDataSection — Sección de datos simbólicos del empleado
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { useHRSymbolicData } from '@/hooks/hr/useHRSymbolicData';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { STANDARD_SYMBOLS } from '@/types/hr';
import { cn } from '@/lib/utils';

interface HREmployeeSymbolicDataSectionProps {
  employeeId: string;
}

export function HREmployeeSymbolicDataSection({ employeeId }: HREmployeeSymbolicDataSectionProps) {
  const { currentCompany } = useERPContext();
  const { symbols, isLoading, fetchSymbols, upsertSymbol, deleteSymbol } = useHRSymbolicData(currentCompany?.id);

  useEffect(() => {
    if (employeeId && currentCompany?.id) {
      fetchSymbols(employeeId);
    }
  }, [employeeId, currentCompany?.id, fetchSymbols]);

  const handleToggle = async (symbolName: string, currentValue: boolean) => {
    await upsertSymbol({
      employee_id: employeeId,
      symbol_name: symbolName,
      symbol_value: (!currentValue).toString(),
      value_type: 'boolean',
      valid_from: new Date().toISOString().split('T')[0],
    });
  };

  const getSymbolValue = (symbolName: string): boolean => {
    const existing = symbols.find(s => s.symbol_name === symbolName);
    return existing?.symbol_value === 'true';
  };

  const categoryLabels: Record<string, string> = {
    payroll: 'Nómina',
    it: 'Incapacidad Temporal',
    contract: 'Contrato',
    ss: 'Seguridad Social',
    communications: 'Comunicaciones',
  };

  // Group by category
  const grouped = STANDARD_SYMBOLS.reduce((acc, sym) => {
    if (!acc[sym.category]) acc[sym.category] = [];
    acc[sym.category].push(sym);
    return acc;
  }, {} as Record<string, typeof STANDARD_SYMBOLS[number][]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Datos Simbólicos del Empleado
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {symbols.length} configurados
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, syms]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </p>
                <div className="space-y-2">
                  {syms.map((sym) => {
                    const isActive = getSymbolValue(sym.name);
                    return (
                      <div
                        key={sym.name}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {sym.name}
                          </Badge>
                          <span className="text-sm">{sym.label}</span>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleToggle(sym.name, isActive)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom symbols */}
            {symbols
              .filter(s => !STANDARD_SYMBOLS.some(std => std.name === s.symbol_name))
              .length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Personalizados
                </p>
                <div className="space-y-2">
                  {symbols
                    .filter(s => !STANDARD_SYMBOLS.some(std => std.name === s.symbol_name))
                    .map((sym) => (
                      <div
                        key={sym.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {sym.symbol_name}
                          </Badge>
                          <span className="text-sm">{sym.description || sym.symbol_name}</span>
                          <span className="text-xs text-muted-foreground">= {sym.symbol_value}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteSymbol(sym.id, employeeId)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HREmployeeSymbolicDataSection;
