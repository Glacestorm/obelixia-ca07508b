import { ValidationStatusBadge, type ValidationStatus } from './internal/ValidationStatusBadge';

export interface AgreementValidationHeaderProps {
  agreementName?: string | null;
  internalCode?: string | null;
  status: ValidationStatus | string | null;
}

export function AgreementValidationHeader(props: AgreementValidationHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">
          {props.agreementName || props.internalCode || 'Convenio'}
        </h2>
        {props.internalCode && (
          <p className="text-xs text-muted-foreground">{props.internalCode}</p>
        )}
      </div>
      <ValidationStatusBadge status={(props.status as ValidationStatus) ?? 'draft'} />
    </div>
  );
}

export default AgreementValidationHeader;