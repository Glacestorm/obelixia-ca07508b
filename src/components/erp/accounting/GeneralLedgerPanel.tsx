/**
 * GeneralLedgerPanel - Libro Mayor Visual Integrado
 * Árbol de cuentas navegable + Mayor con datos reales
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BookOpen, 
  Search, 
  Download, 
  FileSpreadsheet, 
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FolderTree,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Filter,
  Calendar
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { useERPAccounting, ChartOfAccount } from '@/hooks/erp/useERPAccounting';
import { useERPJournalEntries } from '@/hooks/erp/useERPJournalEntries';
import { cn } from '@/lib/utils';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getGroupName,
  getAccountGroup,
  getAccountTypeLabel,
  ACCOUNT_TYPE_COLORS
} from '@/lib/erp/accounting-dictionaries';

interface LedgerEntry {
  id: string;
  date: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  journalName: string;
  entryId: string;
}

interface AccountWithBalance extends ChartOfAccount {
  totalDebit: number;
  totalCredit: number;
  balance: number;
  movementCount: number;
}

interface AccountGroup {
  group: string;
  name: string;
  accounts: AccountWithBalance[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

type DatePreset = 'year' | 'month' | 'quarter' | 'custom';

export function GeneralLedgerPanel() {
  const { currentCompany } = useERPContext();
  const { chartOfAccounts, isLoading: loadingAccounts, fetchChartOfAccounts } = useERPAccounting();
  
  // State
  const [selectedAccount, setSelectedAccount] = useState<AccountWithBalance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['4', '6', '7']));
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [accountBalances, setAccountBalances] = useState<Map<string, { debit: number; credit: number; count: number }>>(new Map());
  const [datePreset, setDatePreset] = useState<DatePreset>('year');
  const [dateRange, setDateRange] = useState({
    from: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    to: format(endOfYear(new Date()), 'yyyy-MM-dd')
  });

  const countryCode = currentCompany?.country?.substring(0, 2).toUpperCase() || 'ES';

  // Preset dates
  const applyDatePreset = useCallback((preset: DatePreset) => {
    const now = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case 'month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'quarter':
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        break;
      case 'year':
      default:
        from = startOfYear(now);
        to = endOfYear(now);
    }

    setDatePreset(preset);
    setDateRange({
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd')
    });
  }, []);

  // Fetch account balances from real data
  const fetchAccountBalances = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('erp_journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          erp_journal_entries!inner(
            company_id,
            entry_date,
            status
          )
        `)
        .eq('erp_journal_entries.company_id', currentCompany.id)
        .eq('erp_journal_entries.status', 'posted')
        .gte('erp_journal_entries.entry_date', dateRange.from)
        .lte('erp_journal_entries.entry_date', dateRange.to);

      if (error) throw error;

      const balanceMap = new Map<string, { debit: number; credit: number; count: number }>();
      
      (data || []).forEach((line: any) => {
        const existing = balanceMap.get(line.account_id) || { debit: 0, credit: 0, count: 0 };
        balanceMap.set(line.account_id, {
          debit: existing.debit + (line.debit || 0),
          credit: existing.credit + (line.credit || 0),
          count: existing.count + 1
        });
      });

      setAccountBalances(balanceMap);
    } catch (error) {
      console.error('Error fetching account balances:', error);
    }
  }, [currentCompany?.id, dateRange]);

  // Fetch ledger entries for selected account
  const fetchLedgerEntries = useCallback(async (accountId: string) => {
    if (!currentCompany?.id || !accountId) return;

    setLoadingLedger(true);
    try {
      const { data, error } = await supabase
        .from('erp_journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          description,
          erp_journal_entries!inner(
            id,
            entry_number,
            entry_date,
            description,
            status,
            company_id,
            erp_journals(journal_name)
          )
        `)
        .eq('account_id', accountId)
        .eq('erp_journal_entries.company_id', currentCompany.id)
        .eq('erp_journal_entries.status', 'posted')
        .gte('erp_journal_entries.entry_date', dateRange.from)
        .lte('erp_journal_entries.entry_date', dateRange.to)
        .order('erp_journal_entries(entry_date)', { ascending: true });

      if (error) throw error;

      // Calculate running balance
      let runningBalance = 0;
      const entries: LedgerEntry[] = (data || []).map((line: any) => {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        runningBalance += debit - credit;

        return {
          id: line.id,
          date: line.erp_journal_entries.entry_date,
          entryNumber: line.erp_journal_entries.entry_number || '-',
          description: line.description || line.erp_journal_entries.description || '',
          debit,
          credit,
          balance: runningBalance,
          journalName: line.erp_journal_entries.erp_journals?.journal_name || 'General',
          entryId: line.erp_journal_entries.id
        };
      });

      setLedgerEntries(entries);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('Error al cargar movimientos');
    } finally {
      setLoadingLedger(false);
    }
  }, [currentCompany?.id, dateRange]);

  // Initial load
  useEffect(() => {
    if (currentCompany?.id) {
      fetchChartOfAccounts();
      fetchAccountBalances();
    }
  }, [currentCompany?.id, fetchChartOfAccounts, fetchAccountBalances]);

  // Reload balances when date changes
  useEffect(() => {
    if (currentCompany?.id) {
      fetchAccountBalances();
      if (selectedAccount) {
        fetchLedgerEntries(selectedAccount.id);
      }
    }
  }, [dateRange, currentCompany?.id, fetchAccountBalances]);

  // Enrich accounts with balances
  const accountsWithBalances: AccountWithBalance[] = useMemo(() => {
    return chartOfAccounts.map(acc => {
      const balance = accountBalances.get(acc.id) || { debit: 0, credit: 0, count: 0 };
      return {
        ...acc,
        totalDebit: balance.debit,
        totalCredit: balance.credit,
        balance: balance.debit - balance.credit,
        movementCount: balance.count
      };
    });
  }, [chartOfAccounts, accountBalances]);

  // Group accounts
  const groupedAccounts: AccountGroup[] = useMemo(() => {
    const filtered = accountsWithBalances.filter(account => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return account.account_code.toLowerCase().includes(term) ||
             account.account_name.toLowerCase().includes(term);
    });

    const groups: Record<string, AccountGroup> = {};

    for (let i = 1; i <= 9; i++) {
      const groupNum = i.toString();
      groups[groupNum] = {
        group: groupNum,
        name: getGroupName(groupNum, countryCode),
        accounts: [],
        totalDebit: 0,
        totalCredit: 0,
        balance: 0
      };
    }

    filtered.forEach(account => {
      const group = getAccountGroup(account.account_code);
      if (groups[group]) {
        groups[group].accounts.push(account);
        groups[group].totalDebit += account.totalDebit;
        groups[group].totalCredit += account.totalCredit;
        groups[group].balance += account.balance;
      }
    });

    Object.values(groups).forEach(group => {
      group.accounts.sort((a, b) => a.account_code.localeCompare(b.account_code));
    });

    return Object.values(groups);
  }, [accountsWithBalances, searchTerm, countryCode]);

  // Handlers
  const toggleGroup = (group: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) newSet.delete(group);
      else newSet.add(group);
      return newSet;
    });
  };

  const handleSelectAccount = (account: AccountWithBalance) => {
    setSelectedAccount(account);
    fetchLedgerEntries(account.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currentCompany?.currency || 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (balance < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const totals = useMemo(() => {
    return ledgerEntries.reduce(
      (acc, entry) => ({
        debit: acc.debit + entry.debit,
        credit: acc.credit + entry.credit
      }),
      { debit: 0, credit: 0 }
    );
  }, [ledgerEntries]);

  if (!currentCompany) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Selecciona una empresa para ver el Libro Mayor
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Libro Mayor</h3>
            <p className="text-sm text-muted-foreground">
              Navegación por cuentas y movimientos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date presets */}
          <div className="flex items-center gap-1 mr-2">
            {(['month', 'quarter', 'year'] as DatePreset[]).map(preset => (
              <Button
                key={preset}
                variant={datePreset === preset ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => applyDatePreset(preset)}
                className="h-8"
              >
                {preset === 'month' ? 'Mes' : preset === 'quarter' ? 'Trimestre' : 'Año'}
              </Button>
            ))}
          </div>
          
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => {
              setDatePreset('custom');
              setDateRange(prev => ({ ...prev, from: e.target.value }));
            }}
            className="w-36 h-8"
          />
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => {
              setDatePreset('custom');
              setDateRange(prev => ({ ...prev, to: e.target.value }));
            }}
            className="w-36 h-8"
          />
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => {
              fetchChartOfAccounts();
              fetchAccountBalances();
              if (selectedAccount) fetchLedgerEntries(selectedAccount.id);
            }}
          >
            <RefreshCw className={cn("h-4 w-4", (loadingAccounts || loadingLedger) && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Main Content - Resizable */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
        {/* Left Panel - Account Tree */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="h-full flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cuenta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {groupedAccounts.map((group) => (
                  <Collapsible
                    key={group.group}
                    open={openGroups.has(group.group)}
                    onOpenChange={() => toggleGroup(group.group)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className={cn(
                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-muted/50",
                        group.accounts.length === 0 && "opacity-50"
                      )}>
                        {openGroups.has(group.group) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-bold text-primary text-sm">{group.group}</span>
                        <span className="text-sm font-medium truncate flex-1">{group.name}</span>
                        {group.balance !== 0 && (
                          <span className={cn(
                            "font-mono text-xs",
                            group.balance > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(Math.abs(group.balance))}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {group.accounts.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-4 border-l pl-2 space-y-0.5">
                        {group.accounts.map((account) => (
                          <div
                            key={account.id}
                            onClick={() => handleSelectAccount(account)}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm",
                              "hover:bg-muted/50",
                              selectedAccount?.id === account.id && "bg-primary/10 border-l-2 border-primary"
                            )}
                          >
                            {account.accepts_entries ? (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <FolderTree className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {account.account_code}
                            </span>
                            <span className="truncate flex-1">{account.account_name}</span>
                            {account.movementCount > 0 && (
                              <>
                                {getBalanceIcon(account.balance)}
                                <span className={cn(
                                  "font-mono text-xs",
                                  account.balance > 0 ? "text-green-600" : 
                                  account.balance < 0 ? "text-red-600" : "text-muted-foreground"
                                )}>
                                  {formatCurrency(Math.abs(account.balance))}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Ledger */}
        <ResizablePanel defaultSize={65}>
          <div className="h-full flex flex-col">
            {/* Account Info Header */}
            {selectedAccount ? (
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Cuenta</p>
                      <p className="font-mono font-bold text-lg">{selectedAccount.account_code}</p>
                    </div>
                    <div className="max-w-md">
                      <p className="text-xs text-muted-foreground">Nombre</p>
                      <p className="font-semibold truncate">{selectedAccount.account_name}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', ACCOUNT_TYPE_COLORS[selectedAccount.account_type] || '')}
                    >
                      {getAccountTypeLabel(selectedAccount.account_type, countryCode)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className={cn(
                      "font-mono font-bold text-xl",
                      selectedAccount.balance > 0 ? "text-green-600" : 
                      selectedAccount.balance < 0 ? "text-red-600" : ""
                    )}>
                      {formatCurrency(selectedAccount.balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAccount.movementCount} movimientos
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b bg-muted/10">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Selecciona una cuenta para ver sus movimientos</span>
                </div>
              </div>
            )}

            {/* Ledger Table */}
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead className="w-24">Asiento</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="w-24">Diario</TableHead>
                    <TableHead className="text-right w-28">Debe</TableHead>
                    <TableHead className="text-right w-28">Haber</TableHead>
                    <TableHead className="text-right w-32">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLedger ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Cargando movimientos...</p>
                      </TableCell>
                    </TableRow>
                  ) : !selectedAccount ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                        <FolderTree className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Selecciona una cuenta del árbol</p>
                        <p className="text-xs mt-1">para ver su libro mayor</p>
                      </TableCell>
                    </TableRow>
                  ) : ledgerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Sin movimientos en el período</p>
                        <p className="text-xs mt-1">{dateRange.from} - {dateRange.to}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {format(new Date(entry.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-primary">
                          {entry.entryNumber}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.journalName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono font-semibold",
                          entry.balance > 0 ? "text-green-600" : 
                          entry.balance < 0 ? "text-red-600" : ""
                        )}>
                          {formatCurrency(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Totals Footer */}
            {selectedAccount && ledgerEntries.length > 0 && (
              <div className="p-4 border-t bg-muted/30">
                <div className="flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Debe</p>
                    <p className="font-mono font-bold">{formatCurrency(totals.debit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Haber</p>
                    <p className="font-mono font-bold">{formatCurrency(totals.credit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo Final</p>
                    <p className={cn(
                      "font-mono font-bold text-lg",
                      totals.debit - totals.credit > 0 ? "text-green-600" : 
                      totals.debit - totals.credit < 0 ? "text-red-600" : ""
                    )}>
                      {formatCurrency(totals.debit - totals.credit)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default GeneralLedgerPanel;
