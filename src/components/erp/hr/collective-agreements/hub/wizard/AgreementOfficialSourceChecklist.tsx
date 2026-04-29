import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ITEMS = [
  'Fuente oficial identificada (BOE / REGCON / boletín autonómico)',
  'URL oficial verificada',
  'PDF / documento oficial descargado',
  'Fecha de publicación registrada',
  'Ámbito territorial confirmado',
  'Ámbito funcional confirmado',
  'Vigencia y prórrogas anotadas',
  'Hash / documento archivado',
];

export function AgreementOfficialSourceChecklist() {
  return (
    <Card data-testid="agreement-official-source-checklist">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Checklist fuente oficial</CardTitle>
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

export default AgreementOfficialSourceChecklist;
