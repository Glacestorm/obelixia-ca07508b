/**
 * B5C — BOIB search response fixture (Illes Balears).
 *
 * Mixed: agreements that should map to Balearic seeds (COM-GEN-IB,
 * PAN-PAST-IB, HOST-IB, etc.) plus noise that the fetcher must filter.
 */

export const BOIB_SEARCH_RESPONSE_FIXTURE = {
  status: 200,
  body: {
    query: 'convenio colectivo Illes Balears',
    items: [
      {
        id: 'BOIB-2025-001',
        titulo:
          'Conveni col·lectiu del sector del comerç en general de les Illes Balears',
        codigo: 'COM-GEN-IB',
        url:
          'https://www.caib.es/eboibfront/ca/2025/12345/seccio-iii-altres-disposicions-i-actes-administratius/472',
        fecha: '2025-02-10',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Comercio',
      },
      {
        id: 'BOIB-2025-002',
        titulo:
          'Conveni col·lectiu del sector de panaderia, pasteleria, bolleria i obradors de les Illes Balears',
        codigo: 'PAN-PAST-IB',
        url:
          'https://www.caib.es/eboibfront/ca/2025/22222/seccio-iii-altres-disposicions-i-actes-administratius/472',
        fecha: '2025-03-15',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Panadería y pastelería',
      },
      {
        id: 'BOIB-2025-003',
        titulo:
          'Conveni col·lectiu del sector d\'hostaleria de les Illes Balears',
        codigo: 'HOST-IB',
        url:
          'https://www.caib.es/eboibfront/ca/2025/33333/seccio-iii-altres-disposicions-i-actes-administratius/472',
        fecha: '2025-04-01',
        ambito: 'autonomico',
        ccaa: 'IB',
        sector: 'Hostelería',
      },
      // Noise: subvenciones, no agreement.
      {
        id: 'BOIB-2025-004',
        titulo: 'Resolució de subvencions per a entitats culturals',
        url:
          'https://www.caib.es/eboibfront/ca/2025/44444/seccio-iii-altres-disposicions-i-actes-administratius/472',
        fecha: '2025-04-02',
      },
    ],
  },
};
