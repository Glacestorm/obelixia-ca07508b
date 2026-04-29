import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

const STEPS = [
  'Buscar la fuente oficial: BOE / REGCON / boletín autonómico.',
  'Confirmar el ámbito (estatal, autonómico, provincial, sectorial, empresa).',
  'Confirmar el CNAE aplicable.',
  'Subir el documento oficial al expediente.',
  'Ejecutar el parser (B7) en modo de previsualización.',
  'Solicitar validación humana (B8).',
  'Activar el convenio en el Registro Maestro (B9).',
  'Crear el mapping empresa/contrato (B10C).',
  'Solicitar runtime apply por scope (B10D).',
  'Incluir en piloto antes de uso productivo (B10F).',
];

export function AgreementMissingCandidateGuide() {
  return (
    <Card data-testid="agreement-missing-candidate-guide">
      <CardHeader>
        <CardTitle className="text-base">No encuentro mi convenio</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Esta guía describe los pasos para incorporar un nuevo convenio al sistema. Es una vista de
          solo lectura: ninguna acción se ejecuta desde aquí.
        </p>
        <ol className="space-y-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>
                <span className="font-medium mr-1">{i + 1}.</span>
                {s}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default AgreementMissingCandidateGuide;