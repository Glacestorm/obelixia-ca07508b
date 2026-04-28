import type { RawAgreementMetadata } from '@/engines/erp/hr/collectiveAgreementsImportTypes';

export const BOIB_METADATA_FIXTURE: RawAgreementMetadata[] = [
  {
    source: 'BOIB',
    sourceId: 'BOIB-2025-COM-GEN-IB',
    agreementCode: 'COM-GEN-IB',
    officialName: 'Convenio colectivo de Comercio General de las Illes Balears',
    publicationDate: '2025-06-10',
    publicationUrl: 'https://www.caib.es/eboibfront/es/2025/com-gen-ib',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Comercio',
    cnaeCodes: ['4711', '4719', '4724'],
    effectiveStartDate: '2025-01-01',
  },
  {
    source: 'BOIB',
    sourceId: 'BOIB-2025-PAN-PAST-IB',
    agreementCode: 'PAN-PAST-IB',
    officialName:
      'Convenio colectivo de Panaderías y Pastelerías de las Illes Balears',
    publicationDate: '2025-07-22',
    publicationUrl: 'https://www.caib.es/eboibfront/es/2025/pan-past-ib',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
    sector: 'Panadería y Pastelería',
    cnaeCodes: ['1071', '1072'],
    effectiveStartDate: '2025-01-01',
  },
  {
    source: 'BOIB',
    sourceId: 'BOIB-2025-HOST-IB',
    agreementCode: 'HOST-IB',
    officialName: 'Convenio colectivo de Hostelería de las Illes Balears',
    publicationDate: '2025-04-15',
    jurisdictionCode: 'IB',
    autonomousRegion: 'IB',
    scopeType: 'autonomous',
  },
];
