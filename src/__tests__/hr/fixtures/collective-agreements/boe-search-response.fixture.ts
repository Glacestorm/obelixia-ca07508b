/**
 * B5C — BOE search response fixture.
 *
 * Models a generic BOE search/diary response shape. Real BOE feeds vary
 * (sumario XML, OpenData JSON). This fixture intentionally mixes:
 *  - true collective-agreement entries
 *  - noise entries (resoluciones, oposiciones) that the BOE fetcher
 *    MUST filter out before normalization.
 *
 * No network, no real BOE call — used only by the BOE fetcher tests
 * via the injectable HTTP adapter.
 */

export const BOE_SEARCH_RESPONSE_FIXTURE = {
  status: 200,
  body: {
    query: 'convenio colectivo',
    fecha: '2025-03-12',
    items: [
      {
        identificador: 'BOE-A-2025-12345',
        titulo:
          'Resolución por la que se publica el Convenio colectivo estatal de la industria del calzado',
        codigoConvenio: '99000005011981',
        url_html:
          'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-12345',
        url_pdf:
          'https://www.boe.es/boe/dias/2025/03/12/pdfs/BOE-A-2025-12345.pdf',
        fecha_publicacion: '2025-03-12',
        ambito: 'estatal',
        sector: 'Calzado',
        cnae: ['1520'],
        fecha_inicio: '2025-01-01',
        fecha_fin: '2027-12-31',
      },
      {
        identificador: 'BOE-A-2025-67890',
        titulo:
          'Resolución por la que se registran las tablas salariales 2025 del Convenio colectivo estatal de empresas de seguridad',
        codigoConvenio: null,
        url_html:
          'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-67890',
        url_pdf: null,
        fecha_publicacion: '2025-05-04',
        ambito: 'estatal',
      },
      // Noise: not an agreement → fetcher must skip.
      {
        identificador: 'BOE-A-2025-99999',
        titulo: 'Resolución sobre oposiciones al cuerpo de gestión',
        url_html:
          'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-99999',
        fecha_publicacion: '2025-05-04',
      },
      // Noise: completely off-topic.
      {
        identificador: 'BOE-A-2025-11111',
        titulo: 'Real Decreto sobre el régimen jurídico del sector eléctrico',
        url_html:
          'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-11111',
        fecha_publicacion: '2025-05-04',
      },
    ],
  },
};
