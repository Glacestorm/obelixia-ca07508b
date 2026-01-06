/**
 * useERPFinancialStatements - Hook para Estados Financieros
 * Calcula Balance de Comprobación, PyG y Balance de Situación desde datos reales
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// Helper to fetch entries with optional date filters
async function fetchPostedEntries(
  companyId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ ids: string[]; error: Error | null }> {
  try {
    // Cast to unknown first, then any to completely bypass deep type issues
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              gte: (col: string, val: string) => any;
              lte: (col: string, val: string) => any;
              then: (fn: any) => any;
            };
          };
        };
      };
    };
    
    const baseQuery = client.from('erp_journal_entries').select('id').eq('company_id', companyId).eq('status', 'posted');
    
    let finalQuery: any = baseQuery;
    if (dateFrom) finalQuery = finalQuery.gte('entry_date', dateFrom);
    if (dateTo) finalQuery = finalQuery.lte('entry_date', dateTo);

    const { data, error } = await finalQuery;
    if (error) return { ids: [], error };
    return { ids: (data as { id: string }[])?.map(e => e.id) || [], error: null };
  } catch (err) {
    return { ids: [], error: err as Error };
  }
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitSum: number;
  creditSum: number;
  balance: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceData {
  accounts: AccountBalance[];
  totals: {
    debitSum: number;
    creditSum: number;
    debitBalance: number;
    creditBalance: number;
  };
  isBalanced: boolean;
}

export interface IncomeStatementData {
  ingresos: {
    ventas: number;
    otrosIngresos: number;
    ingresosFinancieros: number;
    totalIngresos: number;
  };
  gastos: {
    aprovisionamientos: number;
    gastosPersonal: number;
    otrosGastos: number;
    amortizaciones: number;
    gastosFinancieros: number;
    totalGastos: number;
  };
  resultados: {
    resultadoExplotacion: number;
    resultadoFinanciero: number;
    resultadoAntesImpuestos: number;
    impuestos: number;
    resultadoNeto: number;
  };
  ratios: {
    margenBruto: number;
    margenOperativo: number;
    margenNeto: number;
  };
}

export interface BalanceSheetData {
  activo: {
    activoNoCorriente: number;
    inmovilizadoIntangible: number;
    inmovilizadoMaterial: number;
    inversionesFinancieras: number;
    activoCorriente: number;
    existencias: number;
    deudoresComerciales: number;
    tesoreria: number;
    totalActivo: number;
  };
  patrimonioNeto: {
    capital: number;
    reservas: number;
    resultadosEjerciciosAnteriores: number;
    resultadoEjercicio: number;
    totalPatrimonioNeto: number;
  };
  pasivo: {
    pasivoNoCorriente: number;
    deudasLargoPlazo: number;
    pasivoCorriente: number;
    proveedores: number;
    otrasDeudas: number;
    totalPasivo: number;
  };
  totalPatrimonioYPasivo: number;
  isBalanced: boolean;
}

export function useERPFinancialStatements() {
  const { currentCompany } = useERPContext();
  const [isLoading, setIsLoading] = useState(false);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);

  // Fetch trial balance from real data
  const fetchTrialBalance = useCallback(async (dateFrom?: string, dateTo?: string) => {
    if (!currentCompany?.id) return null;
    
    setIsLoading(true);
    try {
      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('erp_chart_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('code');

      if (accountsError) throw accountsError;

      // Get posted entries with date filters using helper
      const { ids: entryIds, error: entriesError } = await fetchPostedEntries(
        currentCompany.id,
        dateFrom,
        dateTo
      );

      if (entriesError) throw entriesError;
      let balances: Record<string, { debit: number; credit: number }> = {};

      if (entryIds.length > 0) {
        const { data: lines, error: linesError } = await supabase
          .from('erp_journal_entry_lines')
          .select('*')
          .in('entry_id', entryIds);

        if (linesError) throw linesError;

        lines?.forEach((line: any) => {
          const accId = line.account_id;
          if (!balances[accId]) balances[accId] = { debit: 0, credit: 0 };
          balances[accId].debit += Number(line.debit) || 0;
          balances[accId].credit += Number(line.credit) || 0;
        });
      }

      // Build trial balance rows
      const accountBalances: AccountBalance[] = (accounts || [])
        .filter((acc: any) => acc.accepts_entries !== false)
        .map((acc: any) => {
          const accBalance = balances[acc.id] || { debit: 0, credit: 0 };
          const netBalance = accBalance.debit - accBalance.credit;
          
          return {
            accountId: acc.id,
            accountCode: acc.code,
            accountName: acc.name,
            accountType: acc.type,
            debitSum: accBalance.debit,
            creditSum: accBalance.credit,
            balance: netBalance,
            debitBalance: netBalance > 0 ? netBalance : 0,
            creditBalance: netBalance < 0 ? Math.abs(netBalance) : 0,
          };
        })
        .filter((acc: AccountBalance) => acc.debitSum > 0 || acc.creditSum > 0);

      const totals = accountBalances.reduce(
        (acc, row) => ({
          debitSum: acc.debitSum + row.debitSum,
          creditSum: acc.creditSum + row.creditSum,
          debitBalance: acc.debitBalance + row.debitBalance,
          creditBalance: acc.creditBalance + row.creditBalance,
        }),
        { debitSum: 0, creditSum: 0, debitBalance: 0, creditBalance: 0 }
      );

      const result: TrialBalanceData = {
        accounts: accountBalances,
        totals,
        isBalanced: Math.abs(totals.debitSum - totals.creditSum) < 0.01
      };

      setTrialBalance(result);
      return result;
    } catch (error) {
      console.error('[useERPFinancialStatements] fetchTrialBalance error:', error);
      toast.error('Error al cargar balance de comprobación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  // Fetch income statement from real data
  const fetchIncomeStatement = useCallback(async (dateFrom?: string, dateTo?: string) => {
    if (!currentCompany?.id) return null;
    
    setIsLoading(true);
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('erp_chart_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .in('account_type', ['income', 'expense']);

      if (accountsError) throw accountsError;

      // Use helper to avoid type depth issues
      const { ids: entryIds, error: entriesError } = await fetchPostedEntries(
        currentCompany.id,
        dateFrom,
        dateTo
      );
      if (entriesError) throw entriesError;

      const accountIds = accounts?.map((a: any) => a.id) || [];

      let accountBalances: Record<string, number> = {};

      if (entryIds.length > 0 && accountIds.length > 0) {
        const { data: lines, error: linesError } = await supabase
          .from('erp_journal_entry_lines')
          .select('*')
          .in('entry_id', entryIds)
          .in('account_id', accountIds);

        if (linesError) throw linesError;

        lines?.forEach((line: any) => {
          const acc = accounts?.find((a: any) => a.id === line.account_id);
          if (!acc) return;
          
          if (!accountBalances[acc.code]) accountBalances[acc.code] = 0;
          
          if (acc.account_type === 'income') {
            accountBalances[acc.code] += (Number(line.credit) || 0) - (Number(line.debit) || 0);
          } else {
            accountBalances[acc.code] += (Number(line.debit) || 0) - (Number(line.credit) || 0);
          }
        });
      }

      // Aggregate by PGC groups
      const getGroupSum = (prefix: string) => {
        return Object.entries(accountBalances)
          .filter(([code]) => code.startsWith(prefix))
          .reduce((sum, [, balance]) => sum + balance, 0);
      };

      // INGRESOS (Grupo 7)
      const ventas = getGroupSum('70');
      const otrosIngresos = getGroupSum('75') + getGroupSum('74') + getGroupSum('73');
      const ingresosFinancieros = getGroupSum('76');
      const totalIngresos = ventas + otrosIngresos + ingresosFinancieros;

      // GASTOS (Grupo 6)
      const aprovisionamientos = getGroupSum('60');
      const gastosPersonal = getGroupSum('64');
      const otrosGastos = getGroupSum('62') + getGroupSum('63') + getGroupSum('65');
      const amortizaciones = getGroupSum('68');
      const gastosFinancieros = getGroupSum('66');
      const totalGastos = aprovisionamientos + gastosPersonal + otrosGastos + amortizaciones + gastosFinancieros;

      // RESULTADOS
      const resultadoExplotacion = (ventas + otrosIngresos) - (aprovisionamientos + gastosPersonal + otrosGastos + amortizaciones);
      const resultadoFinanciero = ingresosFinancieros - gastosFinancieros;
      const resultadoAntesImpuestos = resultadoExplotacion + resultadoFinanciero;
      const impuestos = resultadoAntesImpuestos > 0 ? resultadoAntesImpuestos * 0.25 : 0;
      const resultadoNeto = resultadoAntesImpuestos - impuestos;

      const result: IncomeStatementData = {
        ingresos: {
          ventas,
          otrosIngresos,
          ingresosFinancieros,
          totalIngresos,
        },
        gastos: {
          aprovisionamientos,
          gastosPersonal,
          otrosGastos,
          amortizaciones,
          gastosFinancieros,
          totalGastos,
        },
        resultados: {
          resultadoExplotacion,
          resultadoFinanciero,
          resultadoAntesImpuestos,
          impuestos,
          resultadoNeto,
        },
        ratios: {
          margenBruto: totalIngresos > 0 ? ((totalIngresos - aprovisionamientos) / totalIngresos * 100) : 0,
          margenOperativo: totalIngresos > 0 ? (resultadoExplotacion / totalIngresos * 100) : 0,
          margenNeto: totalIngresos > 0 ? (resultadoNeto / totalIngresos * 100) : 0,
        },
      };

      setIncomeStatement(result);
      return result;
    } catch (error) {
      console.error('[useERPFinancialStatements] fetchIncomeStatement error:', error);
      toast.error('Error al cargar cuenta de resultados');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  // Fetch balance sheet from real data
  const fetchBalanceSheet = useCallback(async (asOfDate?: string) => {
    if (!currentCompany?.id) return null;
    
    setIsLoading(true);
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('erp_chart_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .in('account_type', ['asset', 'liability', 'equity']);

      if (accountsError) throw accountsError;

      // Use helper to avoid type depth issues
      const { ids: entryIds, error: entriesError } = await fetchPostedEntries(
        currentCompany.id,
        undefined,
        asOfDate
      );
      if (entriesError) throw entriesError;

      const accountIds = accounts?.map((a: any) => a.id) || [];

      let accountBalances: Record<string, number> = {};

      if (entryIds.length > 0 && accountIds.length > 0) {
        const { data: lines, error: linesError } = await supabase
          .from('erp_journal_entry_lines')
          .select('*')
          .in('entry_id', entryIds)
          .in('account_id', accountIds);

        if (linesError) throw linesError;

        lines?.forEach((line: any) => {
          const acc = accounts?.find((a: any) => a.id === line.account_id);
          if (!acc) return;
          
          if (!accountBalances[acc.code]) accountBalances[acc.code] = 0;
          
          if (acc.account_type === 'asset') {
            accountBalances[acc.code] += (Number(line.debit) || 0) - (Number(line.credit) || 0);
          } else {
            accountBalances[acc.code] += (Number(line.credit) || 0) - (Number(line.debit) || 0);
          }
        });
      }

      const getGroupSum = (prefix: string) => {
        return Object.entries(accountBalances)
          .filter(([code]) => code.startsWith(prefix))
          .reduce((sum, [, balance]) => sum + Math.max(0, balance), 0);
      };

      // ACTIVO
      const inmovilizadoIntangible = getGroupSum('20');
      const inmovilizadoMaterial = getGroupSum('21');
      const inversionesFinancieras = getGroupSum('25');
      const activoNoCorriente = inmovilizadoIntangible + inmovilizadoMaterial + inversionesFinancieras;

      const existencias = getGroupSum('3');
      const deudoresComerciales = getGroupSum('43');
      const tesoreria = getGroupSum('57');
      const activoCorriente = existencias + deudoresComerciales + tesoreria;

      const totalActivo = activoNoCorriente + activoCorriente;

      // PATRIMONIO NETO
      const capital = getGroupSum('10');
      const reservas = getGroupSum('11');
      const resultadosEjerciciosAnteriores = getGroupSum('12');
      const resultadoEjercicio = getGroupSum('129');
      const totalPatrimonioNeto = capital + reservas + resultadosEjerciciosAnteriores + resultadoEjercicio;

      // PASIVO
      const deudasLargoPlazo = getGroupSum('17');
      const pasivoNoCorriente = deudasLargoPlazo;

      const proveedores = getGroupSum('40');
      const otrasDeudas = getGroupSum('41') + getGroupSum('46') + getGroupSum('47');
      const pasivoCorriente = proveedores + otrasDeudas;

      const totalPasivo = pasivoNoCorriente + pasivoCorriente;
      const totalPatrimonioYPasivo = totalPatrimonioNeto + totalPasivo;

      const result: BalanceSheetData = {
        activo: {
          activoNoCorriente,
          inmovilizadoIntangible,
          inmovilizadoMaterial,
          inversionesFinancieras,
          activoCorriente,
          existencias,
          deudoresComerciales,
          tesoreria,
          totalActivo,
        },
        patrimonioNeto: {
          capital,
          reservas,
          resultadosEjerciciosAnteriores,
          resultadoEjercicio,
          totalPatrimonioNeto,
        },
        pasivo: {
          pasivoNoCorriente,
          deudasLargoPlazo,
          pasivoCorriente,
          proveedores,
          otrasDeudas,
          totalPasivo,
        },
        totalPatrimonioYPasivo,
        isBalanced: Math.abs(totalActivo - totalPatrimonioYPasivo) < 0.01,
      };

      setBalanceSheet(result);
      return result;
    } catch (error) {
      console.error('[useERPFinancialStatements] fetchBalanceSheet error:', error);
      toast.error('Error al cargar balance de situación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  // Fetch all statements at once
  const fetchAllStatements = useCallback(async (dateFrom?: string, dateTo?: string) => {
    await Promise.all([
      fetchTrialBalance(dateFrom, dateTo),
      fetchIncomeStatement(dateFrom, dateTo),
      fetchBalanceSheet(dateTo),
    ]);
  }, [fetchTrialBalance, fetchIncomeStatement, fetchBalanceSheet]);

  return {
    isLoading,
    trialBalance,
    incomeStatement,
    balanceSheet,
    fetchTrialBalance,
    fetchIncomeStatement,
    fetchBalanceSheet,
    fetchAllStatements,
  };
}

export default useERPFinancialStatements;
