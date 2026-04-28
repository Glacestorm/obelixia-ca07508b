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

/**
 * NOTE on field naming:
 * The BOIB fetcher (`fetchBoibAgreementMetadata`) consumes raw BOIB
 * payloads using the official BOIB-style field names (`titulo`, `id`,
 * `codigo`, `fecha`, `url`, `ccaa`, `ambito`, `sector`, `cnae`). The
 * curated payload mirrors that shape so the fetcher can normalize it
 * unchanged.
 */

export const boibCuratedComercioPayload = {
  query: 'convenio colectivo comercio Illes Balears',
  source: 'BOIB' as const,
  jurisdictionCode: 'ES-IB',
  manualPayload: {
    items: [
      {
        // Curated-like example for the Balearic general commerce sector.
        id: 'BOIB-2024-COM-GEN-IB-001',
        titulo:
          'Conveni col·lectiu del sector del comerç en general de les Illes Balears',
        fecha: '2024-09-12',
        url:
          'https://www.caib.es/eboibfront/ca/2024/COM-GEN-IB-001',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Comercio en general',
        // codigo, cnae intentionally omitted: not invented when source omits them.
      },
      {
        // Curated-like revision/tablas salariales entry.
        id: 'BOIB-2025-COM-GEN-IB-REV',
        titulo:
          'Resolució per la qual es publiquen les taules salarials 2025 del Conveni col·lectiu del sector del comerç en general de les Illes Balears',
        fecha: '2025-02-18',
        url:
          'https://www.caib.es/eboibfront/ca/2025/COM-GEN-IB-REV',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Comercio',
      },
    ],
  },
};
