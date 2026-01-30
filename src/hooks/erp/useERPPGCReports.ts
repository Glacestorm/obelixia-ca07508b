/**
 * useERPPGCReports - Hook para generación de informes oficiales PGC
 * Genera Balance, Cuenta de Resultados, Estado de Cambios en PN y ECPN según normativa española
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// === TYPES ===
export type PGCReportType = 
  | 'balance_abreviado' 
  | 'balance_normal' 
  | 'balance_pyme'
  | 'pyg_abreviado'
  | 'pyg_normal'
  | 'pyg_pyme'
  | 'ecpn' // Estado de Cambios en Patrimonio Neto
  | 'efe'  // Estado de Flujos de Efectivo
  | 'memoria';

export type ExportFormat = 'pdf' | 'xlsx' | 'xbrl' | 'json';

export interface PGCReportLine {
  code: string;
  label: string;
  currentYear: number;
  previousYear: number;
  notes?: string;
  level: number;
  isTotal?: boolean;
  isBold?: boolean;
}

export interface PGCBalanceSheet {
  reportType: 'balance_abreviado' | 'balance_normal' | 'balance_pyme';
  generatedAt: string;
  fiscalYear: string;
  companyName: string;
  companyCIF: string;
  activo: {
    activoNoCorriente: PGCReportLine[];
    activoCorriente: PGCReportLine[];
    totalActivo: number;
  };
  pasivoPatrimonio: {
    patrimonioNeto: PGCReportLine[];
    pasivoNoCorriente: PGCReportLine[];
    pasivoCorriente: PGCReportLine[];
    totalPasivoPatrimonio: number;
  };
}

export interface PGCIncomeStatement {
  reportType: 'pyg_abreviado' | 'pyg_normal' | 'pyg_pyme';
  generatedAt: string;
  fiscalYear: string;
  companyName: string;
  companyCIF: string;
  lines: PGCReportLine[];
  resultadoEjercicio: number;
}

export interface GeneratedReport {
  id: string;
  type: PGCReportType;
  format: ExportFormat;
  generatedAt: string;
  fiscalYear: string;
  downloadUrl?: string;
  data: PGCBalanceSheet | PGCIncomeStatement | any;
}

// === MAPEO DE CUENTAS PGC ===
const PGC_BALANCE_MAPPING_ABREVIADO = {
  activo: {
    activoNoCorriente: [
      { code: 'A.I', label: 'I. Inmovilizado intangible', accounts: ['20', '21'], level: 1 },
      { code: 'A.II', label: 'II. Inmovilizado material', accounts: ['21', '22', '23'], level: 1 },
      { code: 'A.III', label: 'III. Inversiones inmobiliarias', accounts: ['22'], level: 1 },
      { code: 'A.IV', label: 'IV. Inversiones financieras a L/P', accounts: ['24', '25', '26'], level: 1 },
      { code: 'A.V', label: 'V. Activos por impuesto diferido', accounts: ['474'], level: 1 },
    ],
    activoCorriente: [
      { code: 'B.I', label: 'I. Existencias', accounts: ['30', '31', '32', '33', '34', '35', '36'], level: 1 },
      { code: 'B.II', label: 'II. Deudores comerciales', accounts: ['43', '44'], level: 1 },
      { code: 'B.III', label: 'III. Inversiones financieras C/P', accounts: ['54', '53'], level: 1 },
      { code: 'B.IV', label: 'IV. Efectivo y equivalentes', accounts: ['57'], level: 1 },
    ],
  },
  pasivo: {
    patrimonioNeto: [
      { code: 'A.I', label: 'I. Capital', accounts: ['10'], level: 1 },
      { code: 'A.II', label: 'II. Prima de emisión', accounts: ['110'], level: 1 },
      { code: 'A.III', label: 'III. Reservas', accounts: ['11', '112', '113', '114', '115'], level: 1 },
      { code: 'A.IV', label: 'IV. Resultado de ejercicios anteriores', accounts: ['12'], level: 1 },
      { code: 'A.V', label: 'V. Resultado del ejercicio', accounts: ['129'], level: 1 },
    ],
    pasivoNoCorriente: [
      { code: 'B.I', label: 'I. Deudas a L/P', accounts: ['17'], level: 1 },
      { code: 'B.II', label: 'II. Pasivos por impuesto diferido', accounts: ['479'], level: 1 },
    ],
    pasivoCorriente: [
      { code: 'C.I', label: 'I. Deudas a C/P', accounts: ['52', '50'], level: 1 },
      { code: 'C.II', label: 'II. Acreedores comerciales', accounts: ['40', '41'], level: 1 },
    ],
  },
};

const PGC_PYG_MAPPING_ABREVIADO = [
  { code: '1', label: 'Importe neto de la cifra de negocios', accounts: ['70'], sign: 1, level: 0 },
  { code: '2', label: 'Variación de existencias', accounts: ['71'], sign: 1, level: 0 },
  { code: '3', label: 'Trabajos realizados por la empresa', accounts: ['73'], sign: 1, level: 0 },
  { code: '4', label: 'Aprovisionamientos', accounts: ['60', '61'], sign: -1, level: 0 },
  { code: '5', label: 'Otros ingresos de explotación', accounts: ['74', '75'], sign: 1, level: 0 },
  { code: '6', label: 'Gastos de personal', accounts: ['64'], sign: -1, level: 0 },
  { code: '7', label: 'Otros gastos de explotación', accounts: ['62', '63', '65'], sign: -1, level: 0 },
  { code: '8', label: 'Amortización del inmovilizado', accounts: ['68'], sign: -1, level: 0 },
  { code: 'A', label: 'RESULTADO DE EXPLOTACIÓN', accounts: [], sign: 0, level: 0, isTotal: true },
  { code: '9', label: 'Ingresos financieros', accounts: ['76', '77'], sign: 1, level: 0 },
  { code: '10', label: 'Gastos financieros', accounts: ['66', '67'], sign: -1, level: 0 },
  { code: 'B', label: 'RESULTADO FINANCIERO', accounts: [], sign: 0, level: 0, isTotal: true },
  { code: 'C', label: 'RESULTADO ANTES DE IMPUESTOS', accounts: [], sign: 0, level: 0, isTotal: true },
  { code: '11', label: 'Impuesto sobre beneficios', accounts: ['63'], sign: -1, level: 0 },
  { code: 'D', label: 'RESULTADO DEL EJERCICIO', accounts: [], sign: 0, level: 0, isTotal: true, isBold: true },
];

// === HOOK ===
export function useERPPGCReports(fiscalYearId?: string) {
  const { currentCompany } = useERPContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  
  // Create a simple fiscal year object from ID
  const currentFiscalYear = fiscalYearId ? { id: fiscalYearId, name: fiscalYearId } : null;

  // === FETCH ACCOUNT BALANCES ===
  const fetchAccountBalances = useCallback(async () => {
    if (!currentCompany?.id || !currentFiscalYear?.id) return {};

    try {
      const { data: entries, error: entriesError } = await supabase
        .from('erp_journal_entry_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          erp_chart_of_accounts!inner(id, account_code, account_name)
        `)
        .eq('erp_journal_entries.company_id', currentCompany.id)
        .eq('erp_journal_entries.fiscal_year_id', currentFiscalYear.id)
        .eq('erp_journal_entries.status', 'posted');

      if (entriesError) throw entriesError;

      // Aggregate by account code
      const balances: Record<string, { code: string; name: string; debit: number; credit: number; balance: number }> = {};

      entries?.forEach((line: any) => {
        const code = line.erp_chart_of_accounts?.account_code || '';
        const name = line.erp_chart_of_accounts?.account_name || '';
        
        if (!balances[code]) {
          balances[code] = { code, name, debit: 0, credit: 0, balance: 0 };
        }
        
        balances[code].debit += line.debit_amount || 0;
        balances[code].credit += line.credit_amount || 0;
        balances[code].balance = balances[code].debit - balances[code].credit;
      });

      return balances;
    } catch (err) {
      console.error('[useERPPGCReports] fetchAccountBalances error:', err);
      return {};
    }
  }, [currentCompany?.id, currentFiscalYear?.id]);

  // === CALCULATE LINE AMOUNT ===
  const calculateLineAmount = (
    accountPrefixes: string[], 
    balances: Record<string, any>,
    sign: number = 1
  ): number => {
    let total = 0;
    
    Object.values(balances).forEach((acc: any) => {
      if (accountPrefixes.some(prefix => acc.code.startsWith(prefix))) {
        // For income/expense accounts, use balance
        // For balance sheet, calculate based on account nature
        total += acc.balance * sign;
      }
    });
    
    return Math.round(total * 100) / 100;
  };

  // === GENERATE BALANCE SHEET ===
  const generateBalanceSheet = useCallback(async (
    reportType: 'balance_abreviado' | 'balance_normal' | 'balance_pyme' = 'balance_abreviado'
  ): Promise<PGCBalanceSheet | null> => {
    if (!currentCompany || !currentFiscalYear) {
      toast.error('Selecciona empresa y ejercicio fiscal');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balances = await fetchAccountBalances();
      const mapping = PGC_BALANCE_MAPPING_ABREVIADO;

      // Generate asset lines
      const activoNoCorriente: PGCReportLine[] = mapping.activo.activoNoCorriente.map(item => ({
        code: item.code,
        label: item.label,
        currentYear: calculateLineAmount(item.accounts, balances, 1),
        previousYear: 0, // TODO: previous year comparison
        level: item.level,
      }));

      const activoCorriente: PGCReportLine[] = mapping.activo.activoCorriente.map(item => ({
        code: item.code,
        label: item.label,
        currentYear: calculateLineAmount(item.accounts, balances, 1),
        previousYear: 0,
        level: item.level,
      }));

      const totalActivo = 
        activoNoCorriente.reduce((sum, l) => sum + l.currentYear, 0) +
        activoCorriente.reduce((sum, l) => sum + l.currentYear, 0);

      // Generate liability/equity lines
      const patrimonioNeto: PGCReportLine[] = mapping.pasivo.patrimonioNeto.map(item => ({
        code: item.code,
        label: item.label,
        currentYear: calculateLineAmount(item.accounts, balances, -1), // Credit balance for equity
        previousYear: 0,
        level: item.level,
      }));

      const pasivoNoCorriente: PGCReportLine[] = mapping.pasivo.pasivoNoCorriente.map(item => ({
        code: item.code,
        label: item.label,
        currentYear: calculateLineAmount(item.accounts, balances, -1),
        previousYear: 0,
        level: item.level,
      }));

      const pasivoCorriente: PGCReportLine[] = mapping.pasivo.pasivoCorriente.map(item => ({
        code: item.code,
        label: item.label,
        currentYear: calculateLineAmount(item.accounts, balances, -1),
        previousYear: 0,
        level: item.level,
      }));

      const totalPasivoPatrimonio = 
        patrimonioNeto.reduce((sum, l) => sum + l.currentYear, 0) +
        pasivoNoCorriente.reduce((sum, l) => sum + l.currentYear, 0) +
        pasivoCorriente.reduce((sum, l) => sum + l.currentYear, 0);

      const report: PGCBalanceSheet = {
        reportType,
        generatedAt: new Date().toISOString(),
        fiscalYear: currentFiscalYear.name || currentFiscalYear.id,
        companyName: currentCompany.legal_name || currentCompany.name,
        companyCIF: currentCompany.tax_id || '',
        activo: {
          activoNoCorriente,
          activoCorriente,
          totalActivo,
        },
        pasivoPatrimonio: {
          patrimonioNeto,
          pasivoNoCorriente,
          pasivoCorriente,
          totalPasivoPatrimonio,
        },
      };

      const generatedReport: GeneratedReport = {
        id: crypto.randomUUID(),
        type: reportType,
        format: 'json',
        generatedAt: new Date().toISOString(),
        fiscalYear: currentFiscalYear.id,
        data: report,
      };

      setCurrentReport(generatedReport);
      setGeneratedReports(prev => [generatedReport, ...prev]);
      toast.success('Balance generado correctamente');
      
      return report;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error generando balance';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany, currentFiscalYear, fetchAccountBalances]);

  // === GENERATE INCOME STATEMENT ===
  const generateIncomeStatement = useCallback(async (
    reportType: 'pyg_abreviado' | 'pyg_normal' | 'pyg_pyme' = 'pyg_abreviado'
  ): Promise<PGCIncomeStatement | null> => {
    if (!currentCompany || !currentFiscalYear) {
      toast.error('Selecciona empresa y ejercicio fiscal');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balances = await fetchAccountBalances();
      const mapping = PGC_PYG_MAPPING_ABREVIADO;

      let resultadoExplotacion = 0;
      let resultadoFinanciero = 0;

      const lines: PGCReportLine[] = mapping.map(item => {
        let amount = 0;
        
        if (item.accounts.length > 0) {
          amount = calculateLineAmount(item.accounts, balances, item.sign);
        }

        // Calculate subtotals
        if (item.code === 'A') {
          // Sum lines 1-8
          const exploitationLines = mapping.filter(m => 
            ['1', '2', '3', '4', '5', '6', '7', '8'].includes(m.code)
          );
          amount = exploitationLines.reduce((sum, l) => 
            sum + calculateLineAmount(l.accounts, balances, l.sign), 0
          );
          resultadoExplotacion = amount;
        } else if (item.code === 'B') {
          // Sum lines 9-10
          const financialLines = mapping.filter(m => ['9', '10'].includes(m.code));
          amount = financialLines.reduce((sum, l) => 
            sum + calculateLineAmount(l.accounts, balances, l.sign), 0
          );
          resultadoFinanciero = amount;
        } else if (item.code === 'C') {
          amount = resultadoExplotacion + resultadoFinanciero;
        } else if (item.code === 'D') {
          const impuesto = calculateLineAmount(['63'], balances, -1);
          amount = resultadoExplotacion + resultadoFinanciero + impuesto;
        }

        return {
          code: item.code,
          label: item.label,
          currentYear: amount,
          previousYear: 0,
          level: item.level,
          isTotal: item.isTotal,
          isBold: item.isBold,
        };
      });

      const resultadoEjercicio = lines.find(l => l.code === 'D')?.currentYear || 0;

      const report: PGCIncomeStatement = {
        reportType,
        generatedAt: new Date().toISOString(),
        fiscalYear: currentFiscalYear.name || currentFiscalYear.id,
        companyName: currentCompany.legal_name || currentCompany.name,
        companyCIF: currentCompany.tax_id || '',
        lines,
        resultadoEjercicio,
      };

      const generatedReport: GeneratedReport = {
        id: crypto.randomUUID(),
        type: reportType,
        format: 'json',
        generatedAt: new Date().toISOString(),
        fiscalYear: currentFiscalYear.id,
        data: report,
      };

      setCurrentReport(generatedReport);
      setGeneratedReports(prev => [generatedReport, ...prev]);
      toast.success('Cuenta de PyG generada correctamente');
      
      return report;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error generando PyG';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany, currentFiscalYear, fetchAccountBalances]);

  // === EXPORT REPORT ===
  const exportReport = useCallback(async (
    report: GeneratedReport,
    format: ExportFormat
  ): Promise<string | null> => {
    setIsLoading(true);

    try {
      // For now, return JSON. In production, call edge function for PDF/XLSX/XBRL
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        toast.success('Informe exportado');
        return url;
      }

      // Call edge function for other formats
      const { data, error: fnError } = await supabase.functions.invoke('erp-financial-reports', {
        body: {
          action: 'export',
          report_type: report.type,
          format,
          data: report.data,
          company_id: currentCompany?.id,
          fiscal_year_id: currentFiscalYear?.id,
        }
      });

      if (fnError) throw fnError;

      toast.success(`Informe exportado en formato ${format.toUpperCase()}`);
      return data.downloadUrl || null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error exportando informe';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, currentFiscalYear?.id]);

  // === GET REPORT TYPE LABEL ===
  const getReportTypeLabel = (type: PGCReportType): string => {
    const labels: Record<PGCReportType, string> = {
      'balance_abreviado': 'Balance Abreviado',
      'balance_normal': 'Balance Normal',
      'balance_pyme': 'Balance PYME',
      'pyg_abreviado': 'Cuenta de PyG Abreviada',
      'pyg_normal': 'Cuenta de PyG Normal',
      'pyg_pyme': 'Cuenta de PyG PYME',
      'ecpn': 'Estado de Cambios en PN',
      'efe': 'Estado de Flujos de Efectivo',
      'memoria': 'Memoria',
    };
    return labels[type] || type;
  };

  return {
    // State
    isLoading,
    error,
    generatedReports,
    currentReport,
    
    // Actions
    generateBalanceSheet,
    generateIncomeStatement,
    exportReport,
    
    // Helpers
    getReportTypeLabel,
    setCurrentReport,
  };
}

export default useERPPGCReports;
