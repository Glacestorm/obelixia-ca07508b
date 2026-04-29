/**
 * B12.3B — Read-only suggestion card for "Posibles coincidencias en
 * Registro Maestro".
 *
 * STRICTLY READ-ONLY. NO writes, NO edge invokes inside this component.
 * Receives candidates already fetched by the parent drawer.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AgreementMatchCandidate } from '@/lib/hr/agreementRegistryMatchAdvisor';

interface Props {
  loading?: boolean;
  candidates: AgreementMatchCandidate[];
  onSeeCandidate?: (candidate: AgreementMatchCandidate) => void;
  onUseAsReference?: (candidate: AgreementMatchCandidate) => void;
}

export function AgreementRegistryMatchSuggestions({
  loading,
  candidates,
  onSeeCandidate,
  onUseAsReference,
}: Props) {
  return (
    <Card data-testid="agreement-registry-match-suggestions">
      <CardHeader>
        <CardTitle className="text-base">
          Posibles coincidencias en Registro Maestro
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sugerencia automática read-only basada en nombre, sector y CNAE. NO crea vínculo.
          La incorporación real requiere validación humana.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Buscando coincidencias…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin coincidencias claras en el Registro Maestro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>internal_code</TableHead>
                  <TableHead>official_name</TableHead>
                  <TableHead className="text-right">score</TableHead>
                  <TableHead>señales</TableHead>
                  <TableHead>estado</TableHead>
                  <TableHead className="text-right">acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow
                    key={c.registryAgreementId}
                    data-testid={`registry-match-row-${c.internalCode}`}
                  >
                    <TableCell className="font-mono text-xs">{c.internalCode}</TableCell>
                    <TableCell className="text-sm">{c.officialName}</TableCell>
                    <TableCell className="text-right font-semibold">{c.score}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.signals
                          .filter((s) => s.matched)
                          .map((s) => (
                            <Badge key={s.key} variant="secondary" className="text-[10px]">
                              {s.key} +{s.weight}
                            </Badge>
                          ))}
                      </div>
                      {c.warnings.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                          {c.warnings.map((w, i) => (
                            <li key={i}>· {w}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>read-only</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-1 items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onSeeCandidate?.(c)}
                        >
                          Ver posible coincidencia
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onUseAsReference?.(c)}
                        >
                          Usar como referencia para incorporación
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgreementRegistryMatchSuggestions;
