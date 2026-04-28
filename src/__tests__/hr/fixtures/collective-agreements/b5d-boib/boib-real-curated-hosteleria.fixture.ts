/**
 * B5D — Curated BOIB payload (manual_upload) for the hostelería sector
 * in Illes Balears.
 *
 * Curated-like test fixtures, not verbatim BOIB. No CNAE, no salary
 * data, no effective dates invented.
 */

export const boibCuratedHosteleriaPayload = {
  query: 'convenio colectivo hostelería Illes Balears',
  source: 'BOIB' as const,
  jurisdictionCode: 'ES-IB',
  manualPayload: {
    items: [
      {
        source: 'BOIB' as const,
        sourceId: 'BOIB-2024-HOST-IB-001',
        agreementCode: undefined,
        officialName:
          'Conveni col·lectiu del sector d\'hostaleria de les Illes Balears',
        publicationDate: '2024-07-22',
        publicationUrl:
          'https://www.caib.es/eboibfront/ca/2024/HOST-IB-001',
        documentUrl: undefined,
        jurisdictionCode: 'ES',
        autonomousRegion: 'IB',
        scopeType: 'autonomous',
        sector: 'Hostelería',
        cnaeCodes: undefined,
      },
    ],
  },
};
