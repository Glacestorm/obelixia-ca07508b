/**
 * HRBankAccountsPage — Cuentas bancarias de empleados (Multi-IBAN)
 * Ruta: /obelixia-admin/hr/bank-accounts
 * Bounded context separado del banking ERP general
 */
import { useState, useEffect, useCallback } from 'react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  CreditCard, Plus, Trash2, Star, Building2, CheckCircle, AlertTriangle
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

interface BankAccount {
  id: string;
  employee_id: string;
  company_id: string;
  iban: string;
  swift_bic: string | null;
  bank_name: string | null;
  account_alias: string | null;
  is_primary: boolean;
  is_active: boolean;
  currency: string;
  notes: string | null;
}

function validateIBAN(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/.test(clean);
}

function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function HRBankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newIban, setNewIban] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newSwift, setNewSwift] = useState('');
  const [newPrimary, setNewPrimary] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_employee_bank_accounts')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setAccounts((data as BankAccount[]) || []);
    } catch (err) {
      console.error('[HRBankAccounts] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleCreate = async () => {
    if (!validateIBAN(newIban)) {
      toast.error('IBAN no válido');
      return;
    }

    try {
      const clean = newIban.replace(/\s/g, '').toUpperCase();
      const { error } = await supabase
        .from('hr_employee_bank_accounts')
        .insert({
          employee_id: crypto.randomUUID(),
          company_id: crypto.randomUUID(),
          iban: clean,
          swift_bic: newSwift || null,
          bank_name: newBankName || null,
          account_alias: newAlias || null,
          is_primary: newPrimary,
        } as any);

      if (error) throw error;
      toast.success('Cuenta bancaria añadida');
      setShowNew(false);
      setNewIban(''); setNewAlias(''); setNewBankName(''); setNewSwift(''); setNewPrimary(false);
      fetchAccounts();
    } catch (err) {
      console.error('[HRBankAccounts] create error:', err);
      toast.error('Error al crear cuenta');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hr_employee_bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Cuenta eliminada');
      fetchAccounts();
    } catch (err) {
      toast.error('Error al eliminar cuenta');
    }
  };

  return (
    <DashboardLayout title="Cuentas Bancarias de Empleados">
      <HRErrorBoundary section="Cuentas Bancarias">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cuentas Bancarias</h1>
            <p className="text-muted-foreground mt-1">
              Gestión multi-IBAN para domiciliación de nóminas
            </p>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nueva cuenta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir cuenta bancaria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>IBAN *</Label>
                  <Input
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    value={newIban}
                    onChange={(e) => setNewIban(e.target.value)}
                  />
                  {newIban && !validateIBAN(newIban) && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> IBAN no válido
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Entidad bancaria</Label>
                    <Input
                      placeholder="Banco Santander"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>SWIFT/BIC</Label>
                    <Input
                      placeholder="BSCHESMMXXX"
                      value={newSwift}
                      onChange={(e) => setNewSwift(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Alias</Label>
                  <Input
                    placeholder="Cuenta nómina principal"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newPrimary} onCheckedChange={setNewPrimary} />
                  <Label>Cuenta principal para domiciliación</Label>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={!newIban}>
                  Guardar cuenta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total cuentas</span>
              </div>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Cuentas principales</span>
              </div>
              <p className="text-2xl font-bold">{accounts.filter(a => a.is_primary).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Activas</span>
              </div>
              <p className="text-2xl font-bold">{accounts.filter(a => a.is_active).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuentas registradas</CardTitle>
            <CardDescription>IBANs vinculados a empleados para domiciliación de nómina</CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay cuentas bancarias registradas</p>
                <p className="text-xs mt-1">Añade la primera cuenta para empezar</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono font-medium">{formatIBAN(acc.iban)}</p>
                            {acc.is_primary && (
                              <Badge variant="default" className="text-[10px]">Principal</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[acc.bank_name, acc.account_alias, acc.swift_bic].filter(Boolean).join(' · ') || 'Sin detalles'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(acc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRBankAccountsPage;
