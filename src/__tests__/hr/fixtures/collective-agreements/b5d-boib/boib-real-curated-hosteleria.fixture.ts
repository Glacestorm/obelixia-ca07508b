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
        id: 'BOIB-2024-HOST-IB-001',
        titulo:
          'Conveni col·lectiu del sector d\'hostaleria de les Illes Balears',
        fecha: '2024-07-22',
        url:
          'https://www.caib.es/eboibfront/ca/2024/HOST-IB-001',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Hostelería',
      },
    ],
  },
};
