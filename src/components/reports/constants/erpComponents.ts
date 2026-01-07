/**
 * ERP Components and Analysis Types
 */

// ERP Component categories for analysis
export const ERP_COMPONENTS = {
  // Accounting module (40+ components)
  accounting: [
    'erp/accounting/AccountingDashboard.tsx',
    'erp/accounting/ChartOfAccountsTree.tsx',
    'erp/accounting/JournalEntryEditor.tsx',
    'erp/accounting/FiscalClosingWizard.tsx',
    'erp/accounting/FinancialStatementsPanel.tsx',
    'erp/accounting/BankReconciliationPanel.tsx',
    'erp/accounting/AccountsPayablePanel.tsx',
    'erp/accounting/AccountsReceivablePanel.tsx',
    'erp/accounting/CashFlowPanel.tsx',
    'erp/accounting/BudgetPanel.tsx',
    'erp/accounting/FinancialRatiosPanel.tsx',
    'erp/accounting/ConsolidationPanel.tsx',
    'erp/accounting/AmortizationPanel.tsx',
    'erp/accounting/CostCentersPanel.tsx',
    'erp/accounting/AnalyticalAccountingPanel.tsx',
  ],
  // Sales module
  sales: [
    'erp/sales/SalesModule.tsx',
    'erp/sales/SalesInvoiceForm.tsx',
    'erp/sales/SalesOrderPanel.tsx',
    'erp/sales/QuotationPanel.tsx',
    'erp/sales/DeliveryNotePanel.tsx',
    'erp/sales/CustomerPanel.tsx',
  ],
  // Purchases module
  purchases: [
    'erp/purchases/PurchasesDashboard.tsx',
    'erp/purchases/SupplierInvoiceForm.tsx',
    'erp/purchases/PurchaseOrderPanel.tsx',
    'erp/purchases/GoodsReceiptPanel.tsx',
    'erp/purchases/RFQPanel.tsx',
    'erp/purchases/SupplierEvaluationPanel.tsx',
  ],
  // Treasury module
  treasury: [
    'erp/treasury/TreasuryDashboard.tsx',
    'erp/treasury/CashManagementPanel.tsx',
    'erp/treasury/BankAccountsPanel.tsx',
    'erp/treasury/PaymentForecastPanel.tsx',
    'erp/treasury/SEPARemittancesPanel.tsx',
    'erp/treasury/ConfirmingPanel.tsx',
    'erp/treasury/FactoringPanel.tsx',
    'erp/treasury/DiscountOperationsPanel.tsx',
  ],
  // Inventory module
  inventory: [
    'erp/inventory/InventoryDashboard.tsx',
    'erp/inventory/StockManagementPanel.tsx',
    'erp/inventory/WarehousePanel.tsx',
    'erp/inventory/StockMovementsPanel.tsx',
    'erp/inventory/InventoryValuationPanel.tsx',
    'erp/inventory/StockCountPanel.tsx',
  ],
  // Banking Hub
  banking: [
    'erp/banking/BankingHubDashboard.tsx',
    'erp/banking/BankConnectionsPanel.tsx',
    'erp/banking/StatementImportPanel.tsx',
    'erp/banking/AutoReconciliationPanel.tsx',
    'erp/banking/GuaranteesPanel.tsx',
  ],
  // Trade Finance
  trade: [
    'erp/trade/TradeFinancePanel.tsx',
    'erp/trade/DocumentaryCreditsPanel.tsx',
    'erp/trade/ImportExportPanel.tsx',
    'erp/trade/ForexPanel.tsx',
  ],
  // Audit & Compliance
  audit: [
    'erp/audit/AuditDashboard.tsx',
    'erp/audit/AuditTrailPanel.tsx',
    'erp/audit/ControlsPanel.tsx',
    'erp/audit/ComplianceReportsPanel.tsx',
  ],
};

// ERP Hooks for analysis
export const ERP_HOOKS = [
  'useERPAccounting.ts',
  'useERPJournalEntries.ts',
  'useERPFinancialStatements.ts',
  'useERPFinancialRatios.ts',
  'useERPFinancialReports.ts',
  'useERPFiscalYears.ts',
  'useERPSales.ts',
  'useERPPurchases.ts',
  'useERPRFQ.ts',
  'useERPPayables.ts',
  'useERPReceivables.ts',
  'useERPTreasury.ts',
  'useERPCashFlow.ts',
  'useERPBudget.ts',
  'useERPForecasting.ts',
  'useERPBankingHub.ts',
  'useERPBankReconciliation.ts',
  'useERPAutoReconciliation.ts',
  'useERPSEPARemittances.ts',
  'useERPInventory.ts',
  'useERPStockManager.ts',
  'useERPLogistics.ts',
  'useERPTradeFinance.ts',
  'useERPDocumentaryCredits.ts',
  'useERPImportExport.ts',
  'useERPFactoring.ts',
  'useERPDiscountOperations.ts',
  'useERPFinancingOperations.ts',
  'useERPBankGuarantees.ts',
  'useERPInvestments.ts',
  'useERPMarketRates.ts',
  'useERPStockQuotes.ts',
  'useERPCurrencyExposure.ts',
  'useERPESGCarbon.ts',
  'useERPAdvancedRatios.ts',
  'useERPAudit.ts',
  'useNIIFCompliance.ts',
  'useMaestros.ts',
  'useERPRoles.ts',
  'useERPCompanies.ts',
  'useERPSeries.ts',
  'useERPStatementImport.ts',
  'useERPDocumentAccounting.ts',
  'useERPAutoAccounting.ts',
  'useERPTradePartners.ts',
  'useERPDynamicHelp.ts',
  'useAccountingVoiceAgent.ts',
  'useAccountingSupervisorAgent.ts',
  'useERPAccountingChatbot.ts',
];

// ERP Edge Functions
export const ERP_EDGE_FUNCTIONS = [
  'erp-accounting-assistant',
  'erp-fiscal-closing-wizard',
  'erp-banking-hub',
  'erp-sepa-generator',
  'erp-invoice-parser',
  'erp-auto-reconciliation',
  'erp-treasury-forecast',
  'erp-financial-ratios',
  'erp-audit-compliance',
  'erp-niif-validation',
  'erp-pgc-reports',
  'erp-inventory-valuation',
  'erp-stock-alerts',
  'erp-supplier-evaluation',
  'erp-credit-risk',
  'erp-forex-rates',
  'erp-document-ocr',
  'erp-aeat-sii',
  'erp-facturae-generator',
];

// Analysis scope type
export type AnalysisScope = 'crm' | 'erp' | 'combined';

// ERP-specific module analysis
export interface ERPModuleAnalysis {
  name: string;
  category: 'accounting' | 'sales' | 'purchases' | 'treasury' | 'inventory' | 'banking' | 'trade' | 'audit';
  description: string;
  pgcCompliance: boolean;
  niifCompliance: boolean;
  implementedFeatures: string[];
  pendingFeatures: string[];
  completionPercentage: number;
  files: string[];
  businessValue: string;
  differentiators: string[];
  integrations: string[];
}

// Combined analysis for CRM + ERP
export interface CombinedAnalysis {
  synergies: string[];
  integratedFlows: { name: string; description: string; modules: string[] }[];
  customer360: { metric: string; crmSource: string; erpSource: string }[];
  combinedKPIs: { kpi: string; value: string; source: string }[];
  valueProposition: string;
  competitiveAdvantage: string;
  totalModules: number;
  totalComponents: number;
  totalHooks: number;
  totalEdgeFunctions: number;
  totalLinesOfCode: number;
}

// PDF Part titles for each scope
export const PDF_PARTS = {
  crm: [
    { id: 'part1', title: 'Resumen Ejecutivo CRM', subtitle: 'Modulos y Estadisticas' },
    { id: 'part2', title: 'TCO y Competidores', subtitle: 'ISO 27001 Completo' },
    { id: 'part3', title: 'BCP y Gap Analysis', subtitle: 'Roadmap y Continuidad' },
    { id: 'part4', title: 'Mercados Globales', subtitle: 'Expansion Internacional' },
    { id: 'part5', title: 'Marketing y Ventas', subtitle: 'Estrategia Comercial' },
    { id: 'part6', title: 'Propuesta Comercial', subtitle: 'Ejecutiva' },
    { id: 'part7', title: 'Revenue Intelligence', subtitle: 'Customer Success' },
  ],
  erp: [
    { id: 'part1', title: 'Resumen Ejecutivo ERP', subtitle: 'Contabilidad PGC' },
    { id: 'part2', title: 'Modulos Contables', subtitle: 'NIIF y Fiscalidad' },
    { id: 'part3', title: 'Facturacion y SII', subtitle: 'FacturaE, Ventas, Compras' },
    { id: 'part4', title: 'Tesoreria Enterprise', subtitle: 'Cash Flow y Previsiones' },
    { id: 'part5', title: 'Inventario y Stock', subtitle: 'Logistica y Valoracion' },
    { id: 'part6', title: 'Compliance NIIF/IFRS', subtitle: 'Auditoria y Cierre Fiscal' },
    { id: 'part7', title: 'Integracion Bancaria', subtitle: 'SEPA, Remesas, Core Banking' },
  ],
  combined: [
    { id: 'part1', title: 'Vision Ejecutiva Suite', subtitle: 'ROI Unificado CRM+ERP' },
    { id: 'part2', title: 'Cliente 360 Financiero', subtitle: 'CRM + Datos Contables' },
    { id: 'part3', title: 'Automatizacion End-to-End', subtitle: 'Lead hasta Cobro' },
    { id: 'part4', title: 'Compliance Total', subtitle: 'ISO, DORA, PGC, NIIF' },
    { id: 'part5', title: 'TCO Comparativo Suite', subtitle: 'vs Salesforce+SAP' },
    { id: 'part6', title: 'Mercados Globales Suite', subtitle: 'Multi-Pais, Multi-Norma' },
    { id: 'part7', title: 'Propuesta Valor Integral', subtitle: 'Ahorro 60-70%' },
  ],
} as const;

// Get total counts for each scope
export const getComponentCounts = (scope: AnalysisScope) => {
  const erpComponents = Object.values(ERP_COMPONENTS).flat();
  
  switch (scope) {
    case 'crm':
      return {
        components: 220,
        hooks: 55,
        edgeFunctions: 72,
        pages: 9,
      };
    case 'erp':
      return {
        components: erpComponents.length,
        hooks: ERP_HOOKS.length,
        edgeFunctions: ERP_EDGE_FUNCTIONS.length,
        pages: 5,
      };
    case 'combined':
      return {
        components: 220 + erpComponents.length,
        hooks: 55 + ERP_HOOKS.length,
        edgeFunctions: 72 + ERP_EDGE_FUNCTIONS.length,
        pages: 14,
      };
  }
};
