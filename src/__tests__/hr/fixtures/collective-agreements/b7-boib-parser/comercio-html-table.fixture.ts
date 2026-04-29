/**
 * B7A fixture — Comercio General Illes Balears (BOIB).
 * HTML table representation. NOT a real BOIB download; curated shape.
 */
export const comercioHtmlFixture = {
  internalCode: 'COM-GEN-IB',
  year: 2024,
  sourceUrl: 'https://www.caib.es/eboibfront/ca/2024/0000/seccio-iii/123456',
  documentUrl: 'https://www.caib.es/eboibfront/pdf/ca/2024/0000/123456',
  html: `
    <html><body>
      <h1>Tabla salarial 2024 — Comercio Illes Balears</h1>
      <table>
        <thead>
          <tr>
            <th>Grupo profesional</th>
            <th>Categoría</th>
            <th>Salario mensual</th>
            <th>Salario anual</th>
            <th>Plus convenio</th>
            <th>Plus transporte</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Grupo I</td>
            <td>Dependiente</td>
            <td>1.350,42 €</td>
            <td>18.905,88 €</td>
            <td>120,00 €</td>
            <td>55,00 €</td>
          </tr>
          <tr>
            <td>Grupo II</td>
            <td>Cajero</td>
            <td>1.420,15 €</td>
            <td>19.882,10 €</td>
            <td>125,00 €</td>
            <td>55,00 €</td>
          </tr>
          <tr>
            <td>Grupo III</td>
            <td>Encargado</td>
            <td>1.650,80 €</td>
            <td>23.111,20 €</td>
            <td>150,00 €</td>
            <td>55,00 €</td>
          </tr>
        </tbody>
      </table>
      <p>La jornada anual será de 1.776 horas. Las vacaciones serán de 30 días naturales.
      Se abonarán dos pagas extraordinarias en julio y diciembre.</p>
    </body></html>
  `,
};