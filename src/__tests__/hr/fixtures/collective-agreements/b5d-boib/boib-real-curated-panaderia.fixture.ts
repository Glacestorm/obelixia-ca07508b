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
        id: 'BOIB-2024-PAN-PAST-IB-001',
        titulo:
          'Conveni col·lectiu del sector de panaderia, pasteleria, bolleria i obradors de les Illes Balears',
        fecha: '2024-11-05',
        url:
          'https://www.caib.es/eboibfront/ca/2024/PAN-PAST-IB-001',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Panadería, pastelería y obrador',
      },
    ],
  },
};
