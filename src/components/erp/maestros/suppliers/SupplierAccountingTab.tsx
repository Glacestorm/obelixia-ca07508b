/**
 * Pestaña de Contabilidad del Proveedor
 * Permite asignar cuentas contables (400XXXXX) al proveedor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Calculator, 
  Save, 
  ChevronDown, 
  Check, 
  AlertCircle,
  BookOpen,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
  level: number;
  is_header: boolean;
}

interface SupplierAccountingTabProps {
  supplierId: string;
}

export const SupplierAccountingTab: React.FC<SupplierAccountingTabProps> = ({ supplierId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  
  // Selected accounts
  const [accountId, setAccountId] = useState<string | null>(null);
  const [expenseAccountId, setExpenseAccountId] = useState<string | null>(null);
  
  // Popover states
  const [accountOpen, setAccountOpen] = useState(false);
  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);

  // Load chart of accounts and current supplier accounting data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load chart of accounts (provider accounts 40X and expense accounts 6XX)
      const { data: accountsData, error: accountsError } = await supabase
        .from('erp_chart_accounts')
        .select('id, code, name, account_type, level, is_header')
        .or('code.like.40%,code.like.6%')
        .eq('is_active', true)
        .order('code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load current supplier accounting data
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('account_id, expense_account_id')
        .eq('id', supplierId)
        .single();

      if (supplierError && supplierError.code !== 'PGRST116') throw supplierError;
      
      if (supplierData) {
        setAccountId(supplierData.account_id);
        setExpenseAccountId(supplierData.expense_account_id);
      }
    } catch (error) {
      console.error('Error loading accounting data:', error);
      toast.error('Error al cargar datos contables');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          account_id: accountId,
          expense_account_id: expenseAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (error) throw error;
      toast.success('Configuración contable guardada');
    } catch (error) {
      console.error('Error saving accounting config:', error);
      toast.error('Error al guardar configuración contable');
    } finally {
      setSaving(false);
    }
  };

  const getAccountDisplay = (id: string | null) => {
    if (!id) return null;
    const account = accounts.find(a => a.id === id);
    return account ? `${account.code} - ${account.name}` : null;
  };

  // Filter accounts for supplier (40X) and expenses (6XX)
  const supplierAccounts = accounts.filter(a => a.code.startsWith('40') && !a.is_header);
  const expenseAccounts = accounts.filter(a => a.code.startsWith('6') && !a.is_header);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Configuración Contable</h3>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">No hay cuentas contables configuradas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Primero debes cargar el Plan General Contable en el módulo de Contabilidad
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cuenta de Proveedor (400XXXXX) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Cuenta de Proveedor</CardTitle>
                  <CardDescription>Cuenta contable del grupo 40 (Proveedores)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={accountOpen}
                    className="w-full justify-between h-auto min-h-10 py-2"
                  >
                    <span className={cn(
                      "truncate",
                      !accountId && "text-muted-foreground"
                    )}>
                      {getAccountDisplay(accountId) || "Seleccionar cuenta..."}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cuenta 40X..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron cuentas</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {supplierAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name}`}
                              onSelect={() => {
                                setAccountId(account.id);
                                setAccountOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  accountId === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Badge variant="outline" className="mr-2 font-mono">
                                {account.code}
                              </Badge>
                              <span className="truncate">{account.name}</span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {accountId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Esta cuenta se usará para registrar las deudas con este proveedor
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cuenta de Gasto (6XXXXX) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Receipt className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Cuenta de Gasto</CardTitle>
                  <CardDescription>Cuenta contable del grupo 6 (Compras y Gastos)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Popover open={expenseAccountOpen} onOpenChange={setExpenseAccountOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={expenseAccountOpen}
                    className="w-full justify-between h-auto min-h-10 py-2"
                  >
                    <span className={cn(
                      "truncate",
                      !expenseAccountId && "text-muted-foreground"
                    )}>
                      {getAccountDisplay(expenseAccountId) || "Seleccionar cuenta..."}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cuenta 6XX..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron cuentas</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {expenseAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name}`}
                              onSelect={() => {
                                setExpenseAccountId(account.id);
                                setExpenseAccountOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  expenseAccountId === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Badge variant="outline" className="mr-2 font-mono">
                                {account.code}
                              </Badge>
                              <span className="truncate">{account.name}</span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {expenseAccountId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Esta cuenta se usará por defecto para las compras a este proveedor
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Contabilización Automática</p>
              <p>
                Al configurar las cuentas contables, las facturas de este proveedor se contabilizarán 
                automáticamente usando estas cuentas. La cuenta de proveedor (40X) registra la deuda, 
                y la cuenta de gasto (6XX) registra el coste.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierAccountingTab;
