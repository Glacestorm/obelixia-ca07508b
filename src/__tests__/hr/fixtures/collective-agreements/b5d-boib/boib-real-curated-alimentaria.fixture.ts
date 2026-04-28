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
        id: 'BOIB-2024-IND-ALIM-IB-001',
        titulo:
          'Conveni col·lectiu del sector de la indústria alimentària de les Illes Balears',
        fecha: '2024-10-03',
        url:
          'https://www.caib.es/eboibfront/ca/2024/IND-ALIM-IB-001',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Industria alimentaria',
      },
    ],
  },
};
