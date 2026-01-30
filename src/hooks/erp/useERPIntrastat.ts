/**
 * Hook para gestión de Intrastat
 * Declaraciones, líneas, exportación de ficheros
 * 
 * NOTA: Usa datos demo hasta que los tipos de Supabase se regeneren
 */

import { useState, useCallback, useEffect } from 'react';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// ============ TYPES ============

export type IntrastatDirection = 'arrivals' | 'dispatches';
export type IntrastatDeclarationStatus = 'draft' | 'validated' | 'submitted' | 'corrected';

export interface IntrastatConfig {
  company_id: string;
  enabled: boolean;
  arrivals_threshold: number;
  dispatches_threshold: number;
  statistical_threshold: number;
  default_transport_mode: string;
  default_nature_transaction: string;
  default_delivery_terms: string;
  vat_number?: string;
  statistical_number?: string;
  defaults_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntrastatDeclaration {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number;
  direction: IntrastatDirection;
  status: IntrastatDeclarationStatus;
  total_lines: number;
  total_value: number;
  total_statistical_value: number;
  total_net_mass: number;
  generated_at?: string;
  validated_at?: string;
  submitted_at?: string;
  submission_reference?: string;
  file_path?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  lines?: IntrastatLine[];
}

export interface IntrastatLine {
  id: string;
  declaration_id: string;
  line_number: number;
  source_type?: string;
  source_id?: string;
  source_document?: string;
  commodity_code: string;
  commodity_description?: string;
  country_of_origin?: string;
  country_of_destination?: string;
  region_of_origin?: string;
  region_of_destination?: string;
  delivery_terms?: string;
  transport_mode: string;
  nature_of_transaction: string;
  net_mass: number;
  supplementary_units?: number;
  supplementary_unit_code?: string;
  invoice_value: number;
  statistical_value: number;
  partner_vat?: string;
  partner_name?: string;
  is_triangular: boolean;
  is_correction: boolean;
  original_declaration_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IntrastatStats {
  arrivalsThisMonth: number;
  dispatchesThisMonth: number;
  pendingDeclarations: number;
  totalValue: number;
}

// ============ CONSTANTS ============

export const TRANSPORT_MODES = [
  { code: '1', name: 'Transporte marítimo' },
  { code: '2', name: 'Transporte ferroviario' },
  { code: '3', name: 'Transporte por carretera' },
  { code: '4', name: 'Transporte aéreo' },
  { code: '5', name: 'Envíos postales' },
  { code: '7', name: 'Instalaciones de transporte fijas' },
  { code: '8', name: 'Transporte por navegación interior' },
  { code: '9', name: 'Propulsión propia' },
];

export const NATURE_OF_TRANSACTION = [
  { code: '11', name: 'Compra/venta definitiva' },
  { code: '12', name: 'Entrega para venta tras comprobación' },
  { code: '19', name: 'Otras transacciones' },
  { code: '21', name: 'Devolución de mercancías' },
  { code: '22', name: 'Sustitución de mercancías devueltas' },
  { code: '31', name: 'Movimientos a/desde almacén' },
  { code: '41', name: 'Operaciones de perfeccionamiento' },
  { code: '51', name: 'Reparación/mantenimiento a título oneroso' },
  { code: '91', name: 'Alquiler/préstamo más de 24 meses' },
  { code: '99', name: 'Otras operaciones' },
];

export const DELIVERY_TERMS = [
  { code: 'EXW', name: 'Ex Works' },
  { code: 'FCA', name: 'Free Carrier' },
  { code: 'FOB', name: 'Free On Board' },
  { code: 'CIF', name: 'Cost, Insurance and Freight' },
  { code: 'CPT', name: 'Carriage Paid To' },
  { code: 'DAP', name: 'Delivered at Place' },
  { code: 'DDP', name: 'Delivered Duty Paid' },
];

export const EU_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croacia' },
  { code: 'CY', name: 'Chipre' },
  { code: 'CZ', name: 'Chequia' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'GR', name: 'Grecia' },
  { code: 'HU', name: 'Hungría' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IT', name: 'Italia' },
  { code: 'LV', name: 'Letonia' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Rumanía' },
  { code: 'SK', name: 'Eslovaquia' },
  { code: 'SI', name: 'Eslovenia' },
  { code: 'ES', name: 'España' },
  { code: 'SE', name: 'Suecia' },
];

// ============ DEMO DATA ============

const createDemoDeclarations = (companyId: string): IntrastatDeclaration[] => [
  {
    id: 'demo-intra-0',
    company_id: companyId,
    period_year: 2025,
    period_month: 1,
    direction: 'dispatches',
    status: 'draft',
    total_lines: 5,
    total_value: 125000,
    total_statistical_value: 128750,
    total_net_mass: 2450.5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-intra-1',
    company_id: companyId,
    period_year: 2025,
    period_month: 1,
    direction: 'arrivals',
    status: 'validated',
    total_lines: 8,
    total_value: 89500,
    total_statistical_value: 92175,
    total_net_mass: 3200.8,
    validated_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-intra-2',
    company_id: companyId,
    period_year: 2024,
    period_month: 12,
    direction: 'dispatches',
    status: 'submitted',
    total_lines: 12,
    total_value: 245000,
    total_statistical_value: 252350,
    total_net_mass: 5680.2,
    validated_at: new Date(Date.now() - 172800000).toISOString(),
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    submission_reference: 'INTR-2024-12-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-intra-3',
    company_id: companyId,
    period_year: 2024,
    period_month: 12,
    direction: 'arrivals',
    status: 'submitted',
    total_lines: 15,
    total_value: 312500,
    total_statistical_value: 321875,
    total_net_mass: 8920.5,
    validated_at: new Date(Date.now() - 259200000).toISOString(),
    submitted_at: new Date(Date.now() - 172800000).toISOString(),
    submission_reference: 'INTR-2024-12-002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const createDemoLines = (declarationId: string): IntrastatLine[] => [
  {
    id: 'demo-line-0',
    declaration_id: declarationId,
    line_number: 1,
    source_type: 'invoice',
    source_document: 'FV-2025-0001',
    commodity_code: '84713000',
    commodity_description: 'Ordenadores portátiles',
    country_of_destination: 'FR',
    delivery_terms: 'DAP',
    transport_mode: '3',
    nature_of_transaction: '11',
    net_mass: 125.5,
    invoice_value: 45000,
    statistical_value: 46350,
    partner_vat: 'FR12345678901',
    partner_name: 'French Tech Distribution SARL',
    is_triangular: false,
    is_correction: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-line-1',
    declaration_id: declarationId,
    line_number: 2,
    source_type: 'invoice',
    source_document: 'FV-2025-0002',
    commodity_code: '85176200',
    commodity_description: 'Routers y switches de red',
    country_of_destination: 'DE',
    delivery_terms: 'CIF',
    transport_mode: '3',
    nature_of_transaction: '11',
    net_mass: 280.3,
    invoice_value: 28000,
    statistical_value: 28840,
    partner_vat: 'DE123456789',
    partner_name: 'German Network Solutions GmbH',
    is_triangular: false,
    is_correction: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-line-2',
    declaration_id: declarationId,
    line_number: 3,
    source_type: 'invoice',
    source_document: 'FV-2025-0003',
    commodity_code: '84717000',
    commodity_description: 'Unidades de almacenamiento',
    country_of_destination: 'IT',
    delivery_terms: 'FOB',
    transport_mode: '3',
    nature_of_transaction: '11',
    net_mass: 890.2,
    invoice_value: 32000,
    statistical_value: 32960,
    partner_vat: 'IT12345678901',
    partner_name: 'Italian Storage Systems S.r.l.',
    is_triangular: false,
    is_correction: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-line-3',
    declaration_id: declarationId,
    line_number: 4,
    source_type: 'invoice',
    source_document: 'FV-2025-0004',
    commodity_code: '85285900',
    commodity_description: 'Monitores LED',
    country_of_destination: 'PT',
    delivery_terms: 'EXW',
    transport_mode: '3',
    nature_of_transaction: '11',
    net_mass: 456.8,
    invoice_value: 12500,
    statistical_value: 12875,
    partner_vat: 'PT123456789',
    partner_name: 'Portuguese Electronics Lda',
    is_triangular: false,
    is_correction: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-line-4',
    declaration_id: declarationId,
    line_number: 5,
    source_type: 'invoice',
    source_document: 'FV-2025-0005',
    commodity_code: '84433100',
    commodity_description: 'Impresoras multifunción',
    country_of_destination: 'BE',
    delivery_terms: 'CPT',
    transport_mode: '3',
    nature_of_transaction: '11',
    net_mass: 697.7,
    invoice_value: 7500,
    statistical_value: 7725,
    partner_vat: 'BE0123456789',
    partner_name: 'Belgian Office Supplies NV',
    is_triangular: false,
    is_correction: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============ HOOK ============

export function useERPIntrastat() {
  const { currentCompany } = useERPContext();
  
  const [config, setConfig] = useState<IntrastatConfig | null>(null);
  const [declarations, setDeclarations] = useState<IntrastatDeclaration[]>([]);
  const [currentDeclaration, setCurrentDeclaration] = useState<IntrastatDeclaration | null>(null);
  const [lines, setLines] = useState<IntrastatLine[]>([]);
  const [stats, setStats] = useState<IntrastatStats>({
    arrivalsThisMonth: 0,
    dispatchesThisMonth: 0,
    pendingDeclarations: 0,
    totalValue: 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useDemoData = true;

  // ============ LOAD DATA ============

  const loadDemoData = useCallback(() => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    
    const demoDeclarations = createDemoDeclarations(currentCompany.id);
    setDeclarations(demoDeclarations);
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    setStats({
      arrivalsThisMonth: demoDeclarations
        .filter(d => d.direction === 'arrivals' && d.period_month === currentMonth && d.period_year === currentYear)
        .reduce((sum, d) => sum + (d.total_value || 0), 0),
      dispatchesThisMonth: demoDeclarations
        .filter(d => d.direction === 'dispatches' && d.period_month === currentMonth && d.period_year === currentYear)
        .reduce((sum, d) => sum + (d.total_value || 0), 0),
      pendingDeclarations: demoDeclarations.filter(d => d.status === 'draft' || d.status === 'validated').length,
      totalValue: demoDeclarations.reduce((sum, d) => sum + (d.total_value || 0), 0),
    });
    
    setLoading(false);
  }, [currentCompany?.id]);

  const fetchDeclarations = useCallback(() => {
    loadDemoData();
  }, [loadDemoData]);

  const fetchLines = useCallback((declarationId: string) => {
    const demoLines = createDemoLines(declarationId);
    setLines(demoLines);
  }, []);

  // ============ ACTIONS ============

  const createDeclaration = useCallback(async (data: {
    period_year: number;
    period_month: number;
    direction: IntrastatDirection;
  }) => {
    if (!currentCompany?.id) return null;

    const newDeclaration: IntrastatDeclaration = {
      id: `new-${Date.now()}`,
      company_id: currentCompany.id,
      ...data,
      status: 'draft',
      total_lines: 0,
      total_value: 0,
      total_statistical_value: 0,
      total_net_mass: 0,
      generated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDeclarations(prev => [newDeclaration, ...prev]);
    toast.success('Declaración Intrastat creada');
    return newDeclaration;
  }, [currentCompany?.id]);

  const validateDeclaration = useCallback(async (declarationId: string) => {
    setDeclarations(prev => prev.map(d => 
      d.id === declarationId 
        ? { ...d, status: 'validated' as IntrastatDeclarationStatus, validated_at: new Date().toISOString() }
        : d
    ));
    toast.success('Declaración validada');
    return true;
  }, []);

  const submitDeclaration = useCallback(async (declarationId: string) => {
    const declaration = declarations.find(d => d.id === declarationId);
    if (!declaration) return false;

    setDeclarations(prev => prev.map(d => 
      d.id === declarationId 
        ? { 
            ...d, 
            status: 'submitted' as IntrastatDeclarationStatus, 
            submitted_at: new Date().toISOString(),
            submission_reference: `INTR-${d.period_year}-${String(d.period_month).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          }
        : d
    ));
    toast.success('Declaración presentada');
    return true;
  }, [declarations]);

  const addLine = useCallback(async (declarationId: string, lineData: Partial<IntrastatLine>) => {
    const currentLines = lines.filter(l => l.declaration_id === declarationId);
    const newLineNumber = currentLines.length + 1;

    const newLine: IntrastatLine = {
      id: `line-${Date.now()}`,
      declaration_id: declarationId,
      line_number: newLineNumber,
      commodity_code: lineData.commodity_code || '',
      transport_mode: lineData.transport_mode || '3',
      nature_of_transaction: lineData.nature_of_transaction || '11',
      net_mass: lineData.net_mass || 0,
      invoice_value: lineData.invoice_value || 0,
      statistical_value: lineData.statistical_value || lineData.invoice_value || 0,
      is_triangular: false,
      is_correction: false,
      ...lineData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLines(prev => [...prev, newLine]);

    setDeclarations(prev => prev.map(d => {
      if (d.id === declarationId) {
        return {
          ...d,
          total_lines: (d.total_lines || 0) + 1,
          total_value: (d.total_value || 0) + (newLine.invoice_value || 0),
          total_statistical_value: (d.total_statistical_value || 0) + (newLine.statistical_value || 0),
          total_net_mass: (d.total_net_mass || 0) + (newLine.net_mass || 0),
        };
      }
      return d;
    }));

    toast.success('Línea añadida');
    return newLine;
  }, [lines]);

  const updateLine = useCallback(async (lineId: string, updates: Partial<IntrastatLine>) => {
    setLines(prev => prev.map(l => 
      l.id === lineId 
        ? { ...l, ...updates, updated_at: new Date().toISOString() }
        : l
    ));
    toast.success('Línea actualizada');
    return true;
  }, []);

  const deleteLine = useCallback(async (lineId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return false;

    setLines(prev => prev.filter(l => l.id !== lineId));

    setDeclarations(prev => prev.map(d => {
      if (d.id === line.declaration_id) {
        return {
          ...d,
          total_lines: Math.max(0, (d.total_lines || 0) - 1),
          total_value: Math.max(0, (d.total_value || 0) - (line.invoice_value || 0)),
          total_statistical_value: Math.max(0, (d.total_statistical_value || 0) - (line.statistical_value || 0)),
          total_net_mass: Math.max(0, (d.total_net_mass || 0) - (line.net_mass || 0)),
        };
      }
      return d;
    }));

    toast.success('Línea eliminada');
    return true;
  }, [lines]);

  // ============ EXPORT ============

  const exportToCSV = useCallback((declarationId: string) => {
    const declaration = declarations.find(d => d.id === declarationId);
    const declarationLines = lines.filter(l => l.declaration_id === declarationId);

    if (!declaration || declarationLines.length === 0) {
      toast.error('No hay datos para exportar');
      return null;
    }

    const headers = [
      'Línea', 'Código CN8', 'Descripción', 'País', 'Modo Transporte',
      'Naturaleza', 'Masa (kg)', 'Valor Factura', 'Valor Estadístico', 'NIF', 'Nombre'
    ].join(';');

    const rows = declarationLines.map(l => [
      l.line_number,
      l.commodity_code,
      l.commodity_description || '',
      l.country_of_destination || l.country_of_origin || '',
      l.transport_mode,
      l.nature_of_transaction,
      l.net_mass.toFixed(3),
      l.invoice_value.toFixed(2),
      l.statistical_value.toFixed(2),
      l.partner_vat || '',
      l.partner_name || '',
    ].join(';'));

    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intrastat_${declaration.direction}_${declaration.period_year}_${String(declaration.period_month).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Fichero CSV exportado');
    return csvContent;
  }, [declarations, lines]);

  const exportToJSON = useCallback((declarationId: string) => {
    const declaration = declarations.find(d => d.id === declarationId);
    const declarationLines = lines.filter(l => l.declaration_id === declarationId);

    if (!declaration) {
      toast.error('Declaración no encontrada');
      return null;
    }

    const exportData = {
      declaration: {
        period: `${declaration.period_year}-${String(declaration.period_month).padStart(2, '0')}`,
        direction: declaration.direction,
        status: declaration.status,
        totals: {
          lines: declaration.total_lines,
          value: declaration.total_value,
          statistical_value: declaration.total_statistical_value,
          net_mass: declaration.total_net_mass,
        },
      },
      lines: declarationLines.map(l => ({
        line_number: l.line_number,
        commodity_code: l.commodity_code,
        commodity_description: l.commodity_description,
        country: l.country_of_destination || l.country_of_origin,
        transport_mode: l.transport_mode,
        nature_of_transaction: l.nature_of_transaction,
        net_mass: l.net_mass,
        invoice_value: l.invoice_value,
        statistical_value: l.statistical_value,
        partner_vat: l.partner_vat,
        partner_name: l.partner_name,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intrastat_${declaration.direction}_${declaration.period_year}_${String(declaration.period_month).padStart(2, '0')}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Fichero JSON exportado');
    return exportData;
  }, [declarations, lines]);

  const saveConfig = useCallback(async (configData: Partial<IntrastatConfig>) => {
    setConfig(prev => prev ? { ...prev, ...configData } : {
      company_id: currentCompany?.id || '',
      enabled: false,
      arrivals_threshold: 400000,
      dispatches_threshold: 400000,
      statistical_threshold: 12000000,
      default_transport_mode: '3',
      default_nature_transaction: '11',
      default_delivery_terms: 'EXW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...configData,
    });
    toast.success('Configuración Intrastat guardada');
    return true;
  }, [currentCompany?.id]);

  // ============ EFFECTS ============

  useEffect(() => {
    if (currentCompany?.id) {
      loadDemoData();
    }
  }, [currentCompany?.id, loadDemoData]);

  useEffect(() => {
    if (currentDeclaration?.id) {
      fetchLines(currentDeclaration.id);
    }
  }, [currentDeclaration?.id, fetchLines]);

  return {
    config,
    declarations,
    currentDeclaration,
    lines,
    stats,
    loading,
    error,
    useDemoData,
    setCurrentDeclaration,
    fetchDeclarations,
    fetchLines,
    createDeclaration,
    validateDeclaration,
    submitDeclaration,
    addLine,
    updateLine,
    deleteLine,
    saveConfig,
    exportToCSV,
    exportToJSON,
    TRANSPORT_MODES,
    NATURE_OF_TRANSACTION,
    DELIVERY_TERMS,
    EU_COUNTRIES,
  };
}

export default useERPIntrastat;
