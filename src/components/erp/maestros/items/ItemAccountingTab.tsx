/**
 * Pestaña de Contabilidad del Artículo
 * Permite asignar cuentas contables de compra, venta e inventario
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ShoppingCart,
  TrendingUp,
  Package
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

interface ItemAccountingTabProps {
  itemId: string;
}

export const ItemAccountingTab: React.FC<ItemAccountingTabProps> = ({ itemId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  
  // Selected accounts
  const [purchaseAccountId, setPurchaseAccountId] = useState<string | null>(null);
  const [salesAccountId, setSalesAccountId] = useState<string | null>(null);
  const [inventoryAccountId, setInventoryAccountId] = useState<string | null>(null);
  
  // Popover states
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // Load chart of accounts and current item accounting data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load chart of accounts (purchases 6XX, sales 7XX, inventory 3XX)
      const { data: accountsData, error: accountsError } = await supabase
        .from('erp_chart_accounts')
        .select('id, code, name, account_type, level, is_header')
        .or('code.like.3%,code.like.6%,code.like.7%')
        .eq('is_active', true)
        .order('code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load current item accounting data
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('purchase_account_id, sales_account_id, inventory_account_id')
        .eq('id', itemId)
        .single();

      if (itemError && itemError.code !== 'PGRST116') throw itemError;
      
      if (itemData) {
        setPurchaseAccountId(itemData.purchase_account_id);
        setSalesAccountId(itemData.sales_account_id);
        setInventoryAccountId(itemData.inventory_account_id);
      }
    } catch (error) {
      console.error('Error loading accounting data:', error);
      toast.error('Error al cargar datos contables');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          purchase_account_id: purchaseAccountId,
          sales_account_id: salesAccountId,
          inventory_account_id: inventoryAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

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

  // Filter accounts by type
  const purchaseAccounts = accounts.filter(a => a.code.startsWith('6') && !a.is_header);
  const salesAccounts = accounts.filter(a => a.code.startsWith('7') && !a.is_header);
  const inventoryAccounts = accounts.filter(a => a.code.startsWith('3') && !a.is_header);

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
          <h3 className="font-semibold">Configuración Contable del Artículo</h3>
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
        <div className="grid gap-6 md:grid-cols-3">
          {/* Cuenta de Compra (6XX) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Cuenta de Compra</CardTitle>
                  <CardDescription className="text-xs">Grupo 6 - Compras</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Popover open={purchaseOpen} onOpenChange={setPurchaseOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={purchaseOpen}
                    className="w-full justify-between h-auto min-h-10 py-2 text-xs"
                  >
                    <span className={cn(
                      "truncate",
                      !purchaseAccountId && "text-muted-foreground"
                    )}>
                      {getAccountDisplay(purchaseAccountId) || "Seleccionar..."}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cuenta 6XX..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron cuentas</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {purchaseAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name}`}
                              onSelect={() => {
                                setPurchaseAccountId(account.id);
                                setPurchaseOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  purchaseAccountId === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Badge variant="outline" className="mr-2 font-mono text-xs">
                                {account.code}
                              </Badge>
                              <span className="truncate text-xs">{account.name}</span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Cuenta de Venta (7XX) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Cuenta de Venta</CardTitle>
                  <CardDescription className="text-xs">Grupo 7 - Ventas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Popover open={salesOpen} onOpenChange={setSalesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={salesOpen}
                    className="w-full justify-between h-auto min-h-10 py-2 text-xs"
                  >
                    <span className={cn(
                      "truncate",
                      !salesAccountId && "text-muted-foreground"
                    )}>
                      {getAccountDisplay(salesAccountId) || "Seleccionar..."}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cuenta 7XX..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron cuentas</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {salesAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name}`}
                              onSelect={() => {
                                setSalesAccountId(account.id);
                                setSalesOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  salesAccountId === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Badge variant="outline" className="mr-2 font-mono text-xs">
                                {account.code}
                              </Badge>
                              <span className="truncate text-xs">{account.name}</span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Cuenta de Inventario (3XX) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Cuenta de Inventario</CardTitle>
                  <CardDescription className="text-xs">Grupo 3 - Existencias</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Popover open={inventoryOpen} onOpenChange={setInventoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={inventoryOpen}
                    className="w-full justify-between h-auto min-h-10 py-2 text-xs"
                  >
                    <span className={cn(
                      "truncate",
                      !inventoryAccountId && "text-muted-foreground"
                    )}>
                      {getAccountDisplay(inventoryAccountId) || "Seleccionar..."}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cuenta 3XX..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron cuentas</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {inventoryAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name}`}
                              onSelect={() => {
                                setInventoryAccountId(account.id);
                                setInventoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  inventoryAccountId === account.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Badge variant="outline" className="mr-2 font-mono text-xs">
                                {account.code}
                              </Badge>
                              <span className="truncate text-xs">{account.name}</span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                Estas cuentas se usarán automáticamente al contabilizar documentos con este artículo.
                La cuenta de compra (6XX) para facturas de proveedor, la de venta (7XX) para facturas 
                de cliente, y la de inventario (3XX) para valoración de existencias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemAccountingTab;
