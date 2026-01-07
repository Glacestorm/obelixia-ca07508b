/**
 * Brand constants for PDF generation
 * NO CREAND references - Use ObelixIA branding only
 */

export const BRAND = {
  // Primary brand name
  name: 'ObelixIA',
  fullName: 'ObelixIA Enterprise Platform',
  
  // Product lines
  products: {
    crm: 'ObelixIA CRM Universal',
    erp: 'ObelixIA ERP Enterprise',
    combined: 'ObelixIA Suite Integral',
    banking: 'ObelixIA Banking Suite',
  },
  
  // Taglines
  taglines: {
    crm: 'Plataforma CRM Multi-Sector Enterprise',
    erp: 'ERP Contable-Financiero PGC Completo',
    combined: 'Suite Empresarial Integral CRM + ERP',
    main: 'Transformacion Digital Empresarial',
  },
  
  // Version prefix
  versionPrefix: 'v',
  
  // Copyright
  copyright: (year: number = new Date().getFullYear()) => 
    `(c) ${year} ObelixIA - Todos los derechos reservados`,
  
  // Document headers
  headers: {
    crm: 'OBELIXIA CRM UNIVERSAL',
    erp: 'OBELIXIA ERP ENTERPRISE',
    combined: 'OBELIXIA SUITE INTEGRAL',
    technical: 'DOCUMENTACION TECNICA',
    commercial: 'PROPUESTA COMERCIAL',
  },
  
  // Market positioning
  positioning: {
    sectors: ['Banca y Finanzas', 'Seguros', 'Retail', 'Manufactura', 'Construccion', 'Sanidad', 'Servicios Profesionales', 'Administracion Publica'],
    regions: ['Andorra', 'Espana', 'Union Europea', 'LATAM'],
    compliance: ['ISO 27001', 'DORA', 'NIS2', 'PSD2/PSD3', 'GDPR', 'eIDAS 2.0'],
  },
} as const;

export type BrandProduct = keyof typeof BRAND.products;
export type BrandHeader = keyof typeof BRAND.headers;
