import type { RawAgreementMetadata } from '@/engines/erp/hr/collectiveAgreementsImportTypes';

/**
 * Minimal BOE metadata fixture used by B5A importer tests.
 * Real BOE feed records contain many more fields; we only model what
 * the importer needs.
 */
export const BOE_METADATA_FIXTURE: RawAgreementMetadata[] = [
  {
    source: 'BOE',
    sourceId: 'BOE-A-2025-12345',
    agreementCode: '99000005011981',
    officialName: 'Convenio colectivo estatal de la industria del calzado',
    publicationDate: '2025-03-12',
    publicationUrl: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-12345',
    documentUrl: 'https://www.boe.es/boe/dias/2025/03/12/pdfs/BOE-A-2025-12345.pdf',
    jurisdictionCode: 'ES',
    scopeType: 'state',
    sector: 'Calzado',
    cnaeCodes: ['1520'],
    effectiveStartDate: '2025-01-01',
    effectiveEndDate: '2027-12-31',
  },
  {
    source: 'BOE',
    sourceId: 'BOE-A-2025-67890',
    // No agreementCode → must build a stable internal_code via slug.
    officialName: 'Convenio colectivo estatal de empresas de seguridad',
    publicationDate: '2025-05-04',
    publicationUrl: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-67890',
    jurisdictionCode: 'ES',
    scopeType: 'state',
  },
  // Duplicate by agreementCode → must be skipped by dedupe.
  {
    source: 'BOE',
    sourceId: 'BOE-A-2025-12345-DUP',
    agreementCode: '99000005011981',
    officialName: 'Convenio colectivo estatal de la industria del calzado (rev.)',
    publicationDate: '2025-03-12',
    publicationUrl: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-12345',
    jurisdictionCode: 'ES',
    scopeType: 'state',
  },
];
