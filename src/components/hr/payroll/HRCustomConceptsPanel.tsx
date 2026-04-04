/**
 * HRCustomConceptsPanel — Panel de conceptos retributivos personalizados
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, RefreshCw, Euro, Percent, Code } from 'lucide-react';
import { useHRCustomConcepts, type HRCustomConcept } from '@/hooks/hr/useHRCustomConcepts';
import { cn } from '@/lib/utils';

const calcTypeIcon: Record<string, typeof Euro> = {
  fixed: Euro,
  percentage: Percent,
  formula: Code,
  days: Euro,
};

function ConceptRow({ c }: { c: HRCustomConcept }) {
  const Icon = calcTypeIcon[c.calculation_type] || Euro;
  const isEarning = c.concept_type === 'earning';

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{c.concept_name}</span>
          <Badge variant="outline" className="text-[9px] font-mono">{c.concept_code}</Badge>
        </div>
        <Badge className={cn('text-[10px]', isEarning ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
          {isEarning ? 'Devengo' : 'Deducción'}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <Badge variant="secondary" className="text-[9px]">{c.nature}</Badge>
        <Badge variant="secondary" className="text-[9px]">{c.calculation_type}: {c.value ?? '—'}</Badge>
        <Badge variant="secondary" className="text-[9px]">Prioridad: {c.priority}</Badge>
        {c.ss_computable && <Badge variant="outline" className="text-[9px]">SS</Badge>}
        {c.irpf_computable && <Badge variant="outline" className="text-[9px]">IRPF</Badge>}
        {!c.is_active && <Badge variant="destructive" className="text-[9px]">Inactivo</Badge>}
      </div>
      {c.valid_from && (
        <p className="text-[10px] text-muted-foreground">
          Vigencia: {c.valid_from} → {c.valid_to ?? 'Indefinida'}
        </p>
      )}
    </div>
  );
}

export function HRCustomConceptsPanel() {
  const { concepts, isLoading, refetch } = useHRCustomConcepts();

  const active = concepts.filter(c => c.is_active);
  const earnings = active.filter(c => c.concept_type === 'earning');
  const deductions = active.filter(c => c.concept_type === 'deduction');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            Conceptos Personalizados
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="p-2 rounded bg-primary/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Devengos</p>
            <p className="text-lg font-bold">{earnings.length}</p>
          </div>
          <div className="p-2 rounded bg-destructive/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Deducciones</p>
            <p className="text-lg font-bold">{deductions.length}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold">{concepts.length}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[350px]">
          {concepts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay conceptos personalizados
            </div>
          ) : (
            <div className="space-y-2">
              {concepts.map(c => <ConceptRow key={c.id} c={c} />)}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRCustomConceptsPanel;
