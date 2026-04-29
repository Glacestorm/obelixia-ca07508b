import { CheckCircle2, Circle, AlertOctagon, Dot } from 'lucide-react';
import type { IncorporationStep } from '@/lib/hr/agreementIncorporationFlow';
import { cn } from '@/lib/utils';

interface Props {
  steps: IncorporationStep[];
}

function StepIcon({ status }: { status: IncorporationStep['status'] }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'blocked') return <AlertOctagon className="h-4 w-4 text-destructive" />;
  if (status === 'active') return <Dot className="h-4 w-4 text-primary" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function AgreementIncorporationStepper({ steps }: Props) {
  return (
    <ol className="space-y-3" data-testid="agreement-incorporation-stepper">
      {steps.map((step) => (
        <li
          key={step.key}
          className={cn(
            'flex gap-3 p-3 rounded-md border bg-card',
            step.status === 'active' && 'border-primary/50',
            step.status === 'blocked' && 'border-destructive/50',
          )}
        >
          <div className="mt-0.5">
            <StepIcon status={step.status} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{step.label}</div>
            <div className="text-xs text-muted-foreground">{step.description}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default AgreementIncorporationStepper;
