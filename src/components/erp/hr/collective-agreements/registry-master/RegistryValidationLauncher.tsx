/**
 * B12.1 — Read-only launcher/help shell for the human validation
 * panel B8A.3 (`CollectiveAgreementValidationPanel`).
 *
 * The validation panel requires (agreementId, versionId, sourceId)
 * which only make sense when entered from a specific registry row.
 * This launcher is the menu entry-point; it does NOT execute any
 * validation flow by itself and renders no mutating CTAs.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ClipboardList } from 'lucide-react';

export function RegistryValidationLauncher() {
  return (
    <div className="space-y-4" data-testid="registry-validation-launcher">
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Validación humana de convenios — B8A.3
            <Badge variant="outline">read-only entry</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Validación interna — no oficial. La validación humana B8A.3 se
            inicia desde una fila concreta del Registro Maestro
            (agreementId/versionId/sourceId). Esta vista no activa nada por sí
            sola y no escribe en <code>ready_for_payroll</code>.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cómo iniciar una validación</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            1. Abrir <strong>Registro Maestro</strong> y localizar el convenio
            con <code>data_completeness ≥ parsed_full</code>.
          </p>
          <p>
            2. La promoción a <code>ready_for_payroll</code> requiere doble
            firma B8A → B8B y ejecución B9.
          </p>
          <p>
            3. Mientras no exista entry-point por fila, ningún convenio se
            activa: el flujo permanece bloqueado por diseño.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegistryValidationLauncher;