/**
 * B5D — Curated BOIB payload (manual_upload) for the
 * panaderia/pastelería/obrador sector in Illes Balears.
 *
 * Curated-like test fixtures, not verbatim BOIB. No CNAE, no salary
 * data, no effective dates invented.
 */

export const boibCuratedPanaderiaPayload = {
  query: 'convenio colectivo panadería pastelería Illes Balears',
  source: 'BOIB' as const,
  jurisdictionCode: 'ES-IB',
  manualPayload: {
    items: [
      {
        source: 'BOIB' as const,
        sourceId: 'BOIB-2024-PAN-PAST-IB-001',
        agreementCode: undefined,
        officialName:
          'Conveni col·lectiu del sector de panaderia, pasteleria, bolleria i obradors de les Illes Balears',
        publicationDate: '2024-11-05',
        publicationUrl:
          'https://www.caib.es/eboibfront/ca/2024/PAN-PAST-IB-001',
        documentUrl: undefined,
        jurisdictionCode: 'ES',
        autonomousRegion: 'IB',
        scopeType: 'autonomous',
        sector: 'Panadería, pastelería y obrador',
        cnaeCodes: undefined,
      },
    ],
  },
};
