/**
 * B7A fixture — Hostelería Illes Balears (BOIB) — ambiguous table.
 */
export const hosteleriaAmbiguousFixture = {
  internalCode: 'HOST-IB',
  year: 2024,
  sourceUrl: 'https://www.caib.es/eboibfront/ca/2024/0002/seccio-iii/300002',
  documentUrl: 'https://www.caib.es/eboibfront/pdf/ca/2024/0002/300002',
  html: `
    <html><body>
      <h1>Hostelería Illes Balears 2024 — Borrador no definitivo</h1>
      <table>
        <thead>
          <tr><th>Categoría</th><th>Importe?</th><th>Otros</th></tr>
        </thead>
        <tbody>
          <tr><td>Camarero</td><td>aprox 1.300</td><td>n/d</td></tr>
          <tr><td>Cocinero</td><td>—</td><td>—</td></tr>
          <tr><td>Ayudante de cocina</td><td>1180</td><td>variable</td></tr>
        </tbody>
      </table>
      <p>Jornada y vacaciones según convenio sectorial estatal en lo no regulado.</p>
    </body></html>
  `,
};