import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ITEMS = [
  'PDF / HTML con texto extraíble',
  'Anexos salariales localizados',
  'Columnas mínimas presentes',
  'sourcePage anotado',
  'sourceExcerpt capturado',
  'confidence calculable',
  'Reglas mínimas (pagas, antigüedad, jornada)',
  'Fallback manual_table_upload disponible',
];

export function AgreementParserChecklistCard() {
  return (
    <Card data-testid="agreement-parser-checklist-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Checklist preparación del parser B7</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
          {ITEMS.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default AgreementParserChecklistCard;
