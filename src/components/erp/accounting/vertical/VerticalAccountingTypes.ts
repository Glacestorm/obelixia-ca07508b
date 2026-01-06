/**
 * Tipos para Contabilidad Vertical - 12 Industrias
 * Estructura base para módulos de contabilidad especializados por sector
 */

export interface VerticalAccountingModule {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  specificAccounts: AccountTemplate[];
  kpis: KPITemplate[];
  reports: ReportTemplate[];
  complianceRequirements: string[];
  agentCapabilities: string[];
  status: 'active' | 'beta' | 'planned' | 'deprecated';
}

export interface AccountTemplate {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  description?: string;
  isRequired?: boolean;
}

export interface KPITemplate {
  id: string;
  name: string;
  formula: string;
  unit: string;
  target?: number;
  industry: string;
  description: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'financial' | 'operational' | 'compliance' | 'tax';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  required: boolean;
}

// === 12 MÓDULOS DE CONTABILIDAD VERTICAL ===

export const VERTICAL_ACCOUNTING_MODULES: VerticalAccountingModule[] = [
  {
    id: 'agriculture',
    name: 'Agricultura & Ganadería',
    code: 'AGRI',
    description: 'Contabilidad especializada para explotaciones agrícolas, ganaderas y agroindustria',
    icon: 'Wheat',
    color: 'emerald',
    features: [
      'Costos por hectárea y cultivo',
      'Gestión de cosechas y ciclos',
      'Control de ganado y trazabilidad',
      'Subvenciones PAC/CAP',
      'Amortización maquinaria agrícola',
      'Inventario de semillas y fertilizantes'
    ],
    specificAccounts: [
      { code: '350', name: 'Productos agrícolas en curso', type: 'asset', category: 'inventory' },
      { code: '351', name: 'Ganado en explotación', type: 'asset', category: 'inventory' },
      { code: '740', name: 'Subvenciones a la explotación', type: 'revenue', category: 'subsidies' }
    ],
    kpis: [
      { id: 'yield_per_hectare', name: 'Rendimiento por Hectárea', formula: 'production / hectares', unit: 'kg/ha', industry: 'agriculture', description: 'Producción total dividida por hectáreas cultivadas' },
      { id: 'livestock_margin', name: 'Margen Ganadero', formula: '(sales - costs) / heads', unit: '€/cabeza', industry: 'agriculture', description: 'Beneficio por cabeza de ganado' }
    ],
    reports: [
      { id: 'pac_report', name: 'Declaración PAC', type: 'compliance', frequency: 'annual', required: true },
      { id: 'crop_costs', name: 'Costes por Cultivo', type: 'operational', frequency: 'quarterly', required: false }
    ],
    complianceRequirements: ['PAC', 'Trazabilidad Ganadera', 'Cuaderno de Campo Digital'],
    agentCapabilities: ['Análisis de cosechas', 'Predicción de rendimientos', 'Optimización de inputs'],
    status: 'active'
  },
  {
    id: 'education',
    name: 'Educación & Formación',
    code: 'EDUC',
    description: 'Contabilidad para centros educativos, universidades y academias',
    icon: 'GraduationCap',
    color: 'blue',
    features: [
      'Gestión de matrículas y cuotas',
      'Becas y ayudas',
      'Costes por programa/curso',
      'Control de subvenciones educativas',
      'Proyectos de investigación',
      'Fondos de dotación'
    ],
    specificAccounts: [
      { code: '705', name: 'Ingresos por matrículas', type: 'revenue', category: 'education' },
      { code: '655', name: 'Becas y ayudas concedidas', type: 'expense', category: 'scholarships' },
      { code: '745', name: 'Subvenciones educativas', type: 'revenue', category: 'subsidies' }
    ],
    kpis: [
      { id: 'cost_per_student', name: 'Coste por Alumno', formula: 'total_costs / students', unit: '€/alumno', industry: 'education', description: 'Gasto total dividido por número de alumnos' },
      { id: 'scholarship_ratio', name: 'Ratio de Becas', formula: 'scholarships / total_income', unit: '%', industry: 'education', description: 'Porcentaje de ingresos destinados a becas' }
    ],
    reports: [
      { id: 'edu_account', name: 'Cuenta de Resultados Educativa', type: 'financial', frequency: 'annual', required: true },
      { id: 'research_funds', name: 'Fondos de Investigación', type: 'compliance', frequency: 'quarterly', required: false }
    ],
    complianceRequirements: ['LOMLOE', 'Normativa universitaria', 'Fondos europeos H2020'],
    agentCapabilities: ['Previsión de matrículas', 'Análisis de deserción', 'Optimización de recursos'],
    status: 'active'
  },
  {
    id: 'energy',
    name: 'Energía & Utilities',
    code: 'ENER',
    description: 'Contabilidad para empresas energéticas, renovables y utilities',
    icon: 'Zap',
    color: 'amber',
    features: [
      'Gestión de activos energéticos',
      'Trading de energía',
      'Costes de generación',
      'Certificados de origen',
      'Impuestos energéticos',
      'Peajes y cargos regulados'
    ],
    specificAccounts: [
      { code: '220', name: 'Instalaciones de generación', type: 'asset', category: 'fixed_assets' },
      { code: '631', name: 'Impuesto sobre hidrocarburos', type: 'expense', category: 'taxes' },
      { code: '759', name: 'Ingresos por certificados verdes', type: 'revenue', category: 'environmental' }
    ],
    kpis: [
      { id: 'lcoe', name: 'LCOE', formula: 'total_cost / total_energy', unit: '€/MWh', industry: 'energy', description: 'Coste nivelado de la energía' },
      { id: 'capacity_factor', name: 'Factor de Capacidad', formula: 'actual_output / max_output', unit: '%', industry: 'energy', description: 'Eficiencia de generación' }
    ],
    reports: [
      { id: 'cnmc_report', name: 'Informe CNMC', type: 'compliance', frequency: 'monthly', required: true },
      { id: 'carbon_report', name: 'Huella de Carbono', type: 'compliance', frequency: 'annual', required: true }
    ],
    complianceRequirements: ['CNMC', 'REE', 'EU ETS', 'Directiva Renovables'],
    agentCapabilities: ['Predicción de demanda', 'Optimización de trading', 'Gestión de riesgo precio'],
    status: 'active'
  },
  {
    id: 'healthcare',
    name: 'Salud & Sanidad',
    code: 'HEAL',
    description: 'Contabilidad para hospitales, clínicas y servicios sanitarios',
    icon: 'HeartPulse',
    color: 'rose',
    features: [
      'Costes por paciente/GRD',
      'Gestión de conciertos sanitarios',
      'Facturación a aseguradoras',
      'Control de farmacia hospitalaria',
      'Equipamiento médico',
      'Ensayos clínicos'
    ],
    specificAccounts: [
      { code: '215', name: 'Equipamiento médico', type: 'asset', category: 'fixed_assets' },
      { code: '602', name: 'Compras de material sanitario', type: 'expense', category: 'supplies' },
      { code: '705', name: 'Ingresos por asistencia sanitaria', type: 'revenue', category: 'healthcare' }
    ],
    kpis: [
      { id: 'cost_per_drg', name: 'Coste por GRD', formula: 'total_costs / drg_cases', unit: '€/caso', industry: 'healthcare', description: 'Coste promedio por grupo diagnóstico' },
      { id: 'bed_occupancy', name: 'Ocupación de Camas', formula: 'occupied_days / available_days', unit: '%', industry: 'healthcare', description: 'Tasa de ocupación hospitalaria' }
    ],
    reports: [
      { id: 'mssi_report', name: 'Informe al Ministerio Sanidad', type: 'compliance', frequency: 'monthly', required: true },
      { id: 'clinical_trials', name: 'Contabilidad Ensayos Clínicos', type: 'operational', frequency: 'quarterly', required: false }
    ],
    complianceRequirements: ['SNS', 'Ley de Contratos Sector Público', 'RGPD Sanitario'],
    agentCapabilities: ['Predicción de costes', 'Optimización de recursos', 'Análisis de eficiencia'],
    status: 'active'
  },
  {
    id: 'hospitality',
    name: 'Hostelería & Turismo',
    code: 'HOSP',
    description: 'Contabilidad para hoteles, restaurantes y empresas turísticas',
    icon: 'Hotel',
    color: 'purple',
    features: [
      'RevPAR y métricas hoteleras',
      'Gestión de comisiones OTAs',
      'Control de F&B',
      'Yield management',
      'MICE y eventos',
      'Programas de fidelización'
    ],
    specificAccounts: [
      { code: '706', name: 'Ingresos por alojamiento', type: 'revenue', category: 'hospitality' },
      { code: '707', name: 'Ingresos por restauración', type: 'revenue', category: 'hospitality' },
      { code: '627', name: 'Comisiones a intermediarios', type: 'expense', category: 'distribution' }
    ],
    kpis: [
      { id: 'revpar', name: 'RevPAR', formula: 'room_revenue / available_rooms', unit: '€', industry: 'hospitality', description: 'Ingreso por habitación disponible' },
      { id: 'adr', name: 'ADR', formula: 'room_revenue / sold_rooms', unit: '€', industry: 'hospitality', description: 'Tarifa media diaria' }
    ],
    reports: [
      { id: 'ine_tourism', name: 'Encuesta Ocupación Hotelera', type: 'compliance', frequency: 'monthly', required: true },
      { id: 'food_cost', name: 'Control Food Cost', type: 'operational', frequency: 'weekly', required: false }
    ],
    complianceRequirements: ['INE Turismo', 'Libro registro viajeros', 'Trazabilidad alimentaria'],
    agentCapabilities: ['Revenue management', 'Predicción ocupación', 'Optimización pricing'],
    status: 'active'
  },
  {
    id: 'construction',
    name: 'Construcción & Inmobiliaria',
    code: 'CONS',
    description: 'Contabilidad para constructoras, promotoras e inmobiliarias',
    icon: 'Building2',
    color: 'orange',
    features: [
      'Costes por proyecto/obra',
      'Certificaciones de obra',
      'Retenciones y garantías',
      'Grado de avance',
      'Control de subcontratistas',
      'Provisiones para terminación'
    ],
    specificAccounts: [
      { code: '330', name: 'Obra en curso', type: 'asset', category: 'inventory' },
      { code: '437', name: 'Anticipos de clientes (obras)', type: 'liability', category: 'advances' },
      { code: '493', name: 'Provisión para retenciones', type: 'liability', category: 'provisions' }
    ],
    kpis: [
      { id: 'project_margin', name: 'Margen por Obra', formula: '(revenue - costs) / revenue', unit: '%', industry: 'construction', description: 'Rentabilidad por proyecto' },
      { id: 'completion_rate', name: 'Grado de Avance', formula: 'executed / budgeted', unit: '%', industry: 'construction', description: 'Porcentaje de obra ejecutada' }
    ],
    reports: [
      { id: 'project_status', name: 'Estado de Obras', type: 'operational', frequency: 'monthly', required: true },
      { id: 'cash_flow_project', name: 'Cash Flow por Proyecto', type: 'financial', frequency: 'weekly', required: false }
    ],
    complianceRequirements: ['LOE', 'Ley Contratos Sector Público', 'Libro Edificio'],
    agentCapabilities: ['Predicción de desviaciones', 'Análisis de riesgos', 'Optimización de planning'],
    status: 'active'
  },
  {
    id: 'retail',
    name: 'Retail & Distribución',
    code: 'RETA',
    description: 'Contabilidad para comercio minorista y distribución',
    icon: 'ShoppingCart',
    color: 'pink',
    features: [
      'Márgenes por producto/categoría',
      'Gestión multi-tienda',
      'Control de mermas',
      'Promociones y descuentos',
      'E-commerce integrado',
      'Fidelización y CRM'
    ],
    specificAccounts: [
      { code: '300', name: 'Mercaderías', type: 'asset', category: 'inventory' },
      { code: '608', name: 'Devoluciones de compras', type: 'expense', category: 'returns' },
      { code: '708', name: 'Devoluciones de ventas', type: 'revenue', category: 'returns' }
    ],
    kpis: [
      { id: 'gmroi', name: 'GMROI', formula: 'gross_margin / avg_inventory', unit: 'ratio', industry: 'retail', description: 'Retorno sobre inversión en inventario' },
      { id: 'shrinkage', name: 'Tasa de Mermas', formula: 'shrinkage / sales', unit: '%', industry: 'retail', description: 'Pérdidas por robo, caducidad, etc.' }
    ],
    reports: [
      { id: 'store_pnl', name: 'P&L por Tienda', type: 'financial', frequency: 'monthly', required: true },
      { id: 'inventory_turns', name: 'Rotación de Inventario', type: 'operational', frequency: 'weekly', required: false }
    ],
    complianceRequirements: ['Ley Comercio Minorista', 'LGDCU', 'Normativa TPV'],
    agentCapabilities: ['Predicción de demanda', 'Optimización de stock', 'Análisis de basket'],
    status: 'active'
  },
  {
    id: 'manufacturing',
    name: 'Fabricación & Industria',
    code: 'MANU',
    description: 'Contabilidad de costes para empresas industriales y manufactureras',
    icon: 'Factory',
    color: 'slate',
    features: [
      'Costes estándar y variaciones',
      'Centros de coste',
      'Órdenes de fabricación',
      'Control de scrap',
      'OEE y eficiencia',
      'Costes ABC/ABM'
    ],
    specificAccounts: [
      { code: '310', name: 'Materias primas', type: 'asset', category: 'inventory' },
      { code: '330', name: 'Productos en curso', type: 'asset', category: 'inventory' },
      { code: '71', name: 'Variación de existencias productos terminados', type: 'revenue', category: 'inventory_change' }
    ],
    kpis: [
      { id: 'cost_variance', name: 'Variación de Costes', formula: '(actual - standard) / standard', unit: '%', industry: 'manufacturing', description: 'Desviación sobre coste estándar' },
      { id: 'oee', name: 'OEE', formula: 'availability * performance * quality', unit: '%', industry: 'manufacturing', description: 'Eficiencia global de equipos' }
    ],
    reports: [
      { id: 'cost_center', name: 'Informe por Centro de Coste', type: 'operational', frequency: 'monthly', required: true },
      { id: 'variance_analysis', name: 'Análisis de Variaciones', type: 'operational', frequency: 'weekly', required: false }
    ],
    complianceRequirements: ['ISO 9001', 'Normativa medioambiental', 'Prevención de riesgos'],
    agentCapabilities: ['Predicción de costes', 'Detección de anomalías', 'Optimización de producción'],
    status: 'active'
  },
  {
    id: 'professional_services',
    name: 'Servicios Profesionales',
    code: 'PROF',
    description: 'Contabilidad para consultorías, despachos y servicios profesionales',
    icon: 'Briefcase',
    color: 'indigo',
    features: [
      'Gestión de proyectos/asuntos',
      'Control de horas facturables',
      'WIP y facturación progresiva',
      'Gastos reembolsables',
      'Provisiones para contingencias',
      'Rentabilidad por cliente/socio'
    ],
    specificAccounts: [
      { code: '436', name: 'Clientes de dudoso cobro', type: 'asset', category: 'receivables' },
      { code: '705', name: 'Ingresos por servicios profesionales', type: 'revenue', category: 'professional' },
      { code: '144', name: 'Provisión para responsabilidad civil', type: 'liability', category: 'provisions' }
    ],
    kpis: [
      { id: 'billable_rate', name: 'Tasa de Facturación', formula: 'billable_hours / total_hours', unit: '%', industry: 'professional_services', description: 'Horas facturables sobre totales' },
      { id: 'realization_rate', name: 'Tasa de Realización', formula: 'collected / billed', unit: '%', industry: 'professional_services', description: 'Cobrado sobre facturado' }
    ],
    reports: [
      { id: 'wip_report', name: 'Trabajo en Curso', type: 'financial', frequency: 'monthly', required: true },
      { id: 'partner_pnl', name: 'P&L por Socio', type: 'operational', frequency: 'monthly', required: false }
    ],
    complianceRequirements: ['Colegios profesionales', 'LOPD/RGPD', 'Blanqueo de capitales'],
    agentCapabilities: ['Predicción de carga', 'Análisis de rentabilidad', 'Optimización de asignación'],
    status: 'active'
  },
  {
    id: 'nonprofit',
    name: 'ONGs & Fundaciones',
    code: 'NONG',
    description: 'Contabilidad para organizaciones sin ánimo de lucro',
    icon: 'Heart',
    color: 'red',
    features: [
      'Plan contable adaptado ONL',
      'Gestión de proyectos/programas',
      'Justificación de subvenciones',
      'Control de fondos restringidos',
      'Voluntariado valorizado',
      'Memorias de actividades'
    ],
    specificAccounts: [
      { code: '129', name: 'Resultado del ejercicio (excedente)', type: 'equity', category: 'result' },
      { code: '740', name: 'Subvenciones oficiales', type: 'revenue', category: 'subsidies' },
      { code: '651', name: 'Ayudas monetarias', type: 'expense', category: 'programs' }
    ],
    kpis: [
      { id: 'program_ratio', name: 'Ratio de Programas', formula: 'program_expense / total_expense', unit: '%', industry: 'nonprofit', description: 'Gasto en programas sobre total' },
      { id: 'fundraising_efficiency', name: 'Eficiencia Captación', formula: 'fundraising_cost / donations', unit: '%', industry: 'nonprofit', description: 'Coste de captar donaciones' }
    ],
    reports: [
      { id: 'activity_report', name: 'Memoria de Actividades', type: 'compliance', frequency: 'annual', required: true },
      { id: 'project_justification', name: 'Justificación de Proyecto', type: 'compliance', frequency: 'quarterly', required: true }
    ],
    complianceRequirements: ['Ley Fundaciones', 'Utilidad Pública', 'Protectorado'],
    agentCapabilities: ['Análisis de impacto', 'Predicción de donaciones', 'Optimización de programas'],
    status: 'active'
  },
  {
    id: 'government',
    name: 'Sector Público',
    code: 'GOVT',
    description: 'Contabilidad pública y presupuestaria para administraciones',
    icon: 'Landmark',
    color: 'cyan',
    features: [
      'Contabilidad presupuestaria',
      'Ejecución del presupuesto',
      'Control de créditos',
      'Modificaciones presupuestarias',
      'Cuenta General',
      'Estabilidad presupuestaria'
    ],
    specificAccounts: [
      { code: '400', name: 'Acreedores presupuestarios', type: 'liability', category: 'budget' },
      { code: '430', name: 'Deudores presupuestarios', type: 'asset', category: 'budget' },
      { code: '100', name: 'Patrimonio', type: 'equity', category: 'public' }
    ],
    kpis: [
      { id: 'budget_execution', name: 'Ejecución Presupuestaria', formula: 'executed / approved', unit: '%', industry: 'government', description: 'Gasto ejecutado sobre aprobado' },
      { id: 'collection_rate', name: 'Tasa de Recaudación', formula: 'collected / recognized', unit: '%', industry: 'government', description: 'Derechos recaudados sobre reconocidos' }
    ],
    reports: [
      { id: 'cuenta_general', name: 'Cuenta General', type: 'compliance', frequency: 'annual', required: true },
      { id: 'budget_liquidation', name: 'Liquidación Presupuesto', type: 'compliance', frequency: 'annual', required: true }
    ],
    complianceRequirements: ['PGCP', 'LOEPSF', 'Tribunal de Cuentas'],
    agentCapabilities: ['Predicción de recaudación', 'Análisis de desviaciones', 'Alertas de crédito'],
    status: 'active'
  },
  {
    id: 'logistics',
    name: 'Logística & Transporte',
    code: 'LOGI',
    description: 'Contabilidad para empresas de transporte y operadores logísticos',
    icon: 'Truck',
    color: 'teal',
    features: [
      'Costes por ruta/envío',
      'Control de flota',
      'Peajes y combustible',
      'Gestión de almacenes 3PL',
      'Facturación por peso/volumen',
      'Aduanas e IVA diferido'
    ],
    specificAccounts: [
      { code: '218', name: 'Elementos de transporte', type: 'asset', category: 'fixed_assets' },
      { code: '628', name: 'Combustibles y carburantes', type: 'expense', category: 'fleet' },
      { code: '629', name: 'Peajes y autopistas', type: 'expense', category: 'fleet' }
    ],
    kpis: [
      { id: 'cost_per_km', name: 'Coste por Km', formula: 'total_cost / kilometers', unit: '€/km', industry: 'logistics', description: 'Coste total por kilómetro recorrido' },
      { id: 'load_factor', name: 'Factor de Carga', formula: 'actual_load / max_load', unit: '%', industry: 'logistics', description: 'Aprovechamiento de capacidad' }
    ],
    reports: [
      { id: 'fleet_costs', name: 'Costes de Flota', type: 'operational', frequency: 'monthly', required: true },
      { id: 'route_profitability', name: 'Rentabilidad por Ruta', type: 'operational', frequency: 'weekly', required: false }
    ],
    complianceRequirements: ['Tacógrafo digital', 'ADR', 'CMR', 'ITV flota'],
    agentCapabilities: ['Optimización de rutas', 'Predicción de mantenimiento', 'Análisis de eficiencia'],
    status: 'active'
  }
];

export function getVerticalModuleById(id: string): VerticalAccountingModule | undefined {
  return VERTICAL_ACCOUNTING_MODULES.find(m => m.id === id);
}

export function getVerticalModulesByStatus(status: VerticalAccountingModule['status']): VerticalAccountingModule[] {
  return VERTICAL_ACCOUNTING_MODULES.filter(m => m.status === status);
}
