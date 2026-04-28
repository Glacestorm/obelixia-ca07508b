/**
 * B5D — Curated BOIB payload (manual_upload) for the food industry
 * sector in Illes Balears.
 *
 * Curated-like test fixtures, not verbatim BOIB. No CNAE, no salary
 * data, no effective dates invented.
 */

export const boibCuratedAlimentariaPayload = {
  query: 'convenio colectivo industria alimentaria Illes Balears',
  source: 'BOIB' as const,
  jurisdictionCode: 'ES-IB',
  manualPayload: {
    items: [
      {
        source: 'BOIB' as const,
        sourceId: 'BOIB-2024-IND-ALIM-IB-001',
        agreementCode: undefined,
        officialName:
          'Conveni col·lectiu del sector de la indústria alimentària de les Illes Balears',
        publicationDate: '2024-10-03',
        publicationUrl:
          'https://www.caib.es/eboibfront/ca/2024/IND-ALIM-IB-001',
        documentUrl: undefined,
        jurisdictionCode: 'ES',
        autonomousRegion: 'IB',
        scopeType: 'autonomous',
        sector: 'Industria alimentaria',
        cnaeCodes: undefined,
      },
    ],
  },
};
