/**
 * B5D — Curated BOIB payload (manual_upload) for the "comerç en
 * general" sector in Illes Balears.
 *
 * IMPORTANT: these entries are CURATED-LIKE TEST FIXTURES, not the
 * verbatim official BOIB feed. Real go-live (B5E) requires an operator
 * to copy each field directly from the canonical BOIB publication
 * (titulo, fecha, URL, código si consta) and to perform human review
 * before any persistence is even considered.
 *
 * No CNAE, no effective dates, no salary data are invented. Fields
 * that are not present in the original BOIB record stay `undefined`.
 */

export const boibCuratedComercioPayload = {
  query: 'convenio colectivo comercio Illes Balears',
  source: 'BOIB' as const,
  jurisdictionCode: 'ES-IB',
  manualPayload: {
    items: [
      {
        // Curated-like example for the Balearic general commerce sector.
        source: 'BOIB' as const,
        sourceId: 'BOIB-2024-COM-GEN-IB-001',
        agreementCode: undefined,
        officialName:
          'Conveni col·lectiu del sector del comerç en general de les Illes Balears',
        publicationDate: '2024-09-12',
        publicationUrl:
          'https://www.caib.es/eboibfront/ca/2024/COM-GEN-IB-001',
        documentUrl: undefined,
        jurisdictionCode: 'ES',
        autonomousRegion: 'IB',
        scopeType: 'autonomous',
        sector: 'Comercio en general',
        cnaeCodes: undefined,
      },
      {
        // Curated-like revision/tablas salariales entry.
        source: 'BOIB' as const,
        sourceId: 'BOIB-2025-COM-GEN-IB-REV',
        agreementCode: undefined,
        officialName:
          'Resolució per la qual es publiquen les taules salarials 2025 del Conveni col·lectiu del sector del comerç en general de les Illes Balears',
        publicationDate: '2025-02-18',
        publicationUrl:
          'https://www.caib.es/eboibfront/ca/2025/COM-GEN-IB-REV',
        documentUrl: undefined,
        jurisdictionCode: 'ES',
        autonomousRegion: 'IB',
        scopeType: 'autonomous',
        sector: 'Comercio',
        cnaeCodes: undefined,
      },
    ],
  },
};
