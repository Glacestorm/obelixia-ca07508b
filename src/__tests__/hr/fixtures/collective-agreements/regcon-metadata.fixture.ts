import type { RawAgreementMetadata } from '@/engines/erp/hr/collectiveAgreementsImportTypes';

export const REGCON_METADATA_FIXTURE: RawAgreementMetadata[] = [
  {
    source: 'REGCON',
    sourceId: 'REGCON-90001234',
    agreementCode: '90001234012025',
    officialName: 'Convenio colectivo de empresa Acme S.A.',
    publicationDate: '2025-02-20',
    documentUrl: 'https://expinterweb.mites.gob.es/regcon/pub/convenio/90001234',
    jurisdictionCode: 'ES',
    scopeType: 'company',
    cnaeCodes: ['6201'],
  },
  {
    source: 'REGCON',
    sourceId: 'REGCON-90005678',
    agreementCode: '90005678012025',
    officialName: 'Convenio colectivo de empresa Foo Holdings',
    publicationDate: '2025-04-01',
    jurisdictionCode: 'ES',
    scopeType: 'group',
  },
];
