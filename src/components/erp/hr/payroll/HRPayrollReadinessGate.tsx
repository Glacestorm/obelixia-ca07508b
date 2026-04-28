/**
 * HRPayrollReadinessGate — panel READ-ONLY de comprobación previa de nómina.
 *
 * Indica si la nómina del empleado/período está READY / REVIEW / BLOCKED
 * según 18 verificaciones derivadas de fuentes ya existentes (normalizer,
 * agreement resolver, incidencias persistidas, effective casuistica).
 *
 * INVARIANTES:
 *  - 100% presentacional: sin queries, sin mutations, sin efectos.
 *  - No toca motor de nómina, ni payload, ni flags, ni BD, ni RLS.
 *  - No genera FDI/AFI/DELT@ ni envíos oficiales.
 *  - No modifica el botón Calcular/Guardar del dialog padre. Solo informa.
 */

import { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isRealSubmissionBlocked } from '@/components/erp/hr/shared/sandboxEnvironmentEngine';

export type AgreementGateStatus =
  | 'clear'
  | 'doubtful'
  | 'missing'
  | 'manual'
  | string;

export type ContractGateStatus =
  | 'complete'
  | 'pending'
  | 'incoherent'
  | string;

export interface HRPayrollReadinessGateProps {
  employeeId?: string | null;
  contractId?: string | null;
  companyId?: string | null;
  safeModeActive: boolean;
  agreementStatus?: AgreementGateStatus;
  contractStatus?: ContractGateStatus;
  legalReviewRequired?: boolean;
  hasPersistedIncidents?: boolean;
  hasLocalPersistedConflicts?: boolean;
  hasUnmappedIncidents?: boolean;
  hasOfficialPendingFlags?: boolean;
  /** Información adicional opcional para checks 4-8 (sin recálculo). */
  professionalGroupKnown?: boolean;
  contributionGroupKnown?: boolean;
  salaryParametrized?: boolean;
  salaryUnitDefined?: boolean;
  payPeriodsDefined?: boolean;
  className?: string;
}

type CheckStatus = 'ok' | 'warn' | 'block' | 'info';

interface CheckItem {
  id: number;
  label: string;
  status: CheckStatus;
  detail?: string;
}

type GateLevel = 'ready' | 'review' | 'blocked';

function statusIcon(s: CheckStatus) {
  switch (s) {
    case 'ok':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />;
    case 'warn':
      return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />;
    case 'block':
      return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    default:
      return <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

export function HRPayrollReadinessGate(props: HRPayrollReadinessGateProps) {
  const {
    employeeId,
    contractId,
    safeModeActive,
    agreementStatus = 'clear',
    contractStatus = 'complete',
    legalReviewRequired = false,
    hasPersistedIncidents = false,
    hasLocalPersistedConflicts = false,
    hasUnmappedIncidents = false,
    hasOfficialPendingFlags = false,
    professionalGroupKnown,
    contributionGroupKnown,
    salaryParametrized,
    salaryUnitDefined,
    payPeriodsDefined,
    className,
  } = props;

  const officialBlocked = isRealSubmissionBlocked();

  const { sections, gate } = useMemo(() => {
    const employeeOk = !!employeeId;
    const contractOk = !!contractId && contractStatus !== 'incoherent';
    const agreementOk =
      agreementStatus === 'clear' && !legalReviewRequired;
    const agreementMissing = agreementStatus === 'missing';
    const agreementDoubtful =
      agreementStatus === 'doubtful' || agreementStatus === 'manual';

    const identity: CheckItem[] = [
      {
        id: 1,
        label: 'Empleado correctamente identificado',
        status: employeeOk ? 'ok' : 'block',
        detail: 'El empleado debe estar seleccionado y activo.',
      },
      {
        id: 2,
        label: 'Contrato vigente',
        status: contractId
          ? contractStatus === 'incoherent'
            ? 'block'
            : contractStatus === 'pending'
              ? 'warn'
              : 'ok'
          : 'block',
        detail: 'Debe existir contrato resuelto y coherente para el período.',
      },
      {
        id: 3,
        label: 'Convenio identificado',
        status: agreementMissing
          ? 'block'
          : agreementDoubtful
            ? 'warn'
            : 'ok',
        detail:
          agreementMissing
            ? 'No hay convenio resuelto. Bloqueante.'
            : agreementDoubtful
              ? 'Convenio dudoso o asignado manualmente. Requiere revisión.'
              : 'Convenio resuelto automáticamente.',
      },
      {
        id: 4,
        label: 'Grupo profesional informado',
        status: professionalGroupKnown === false ? 'warn' : 'ok',
        detail: 'Necesario para tablas salariales del convenio.',
      },
      {
        id: 5,
        label: 'Grupo de cotización informado',
        status: contributionGroupKnown === false ? 'warn' : 'ok',
        detail: 'Necesario para bases de cotización a la SS.',
      },
    ];

    const salary: CheckItem[] = [
      {
        id: 6,
        label: 'Salario parametrizado',
        status: salaryParametrized === false ? 'block' : 'ok',
        detail: 'Debe haber importe salarial declarado en contrato.',
      },
      {
        id: 7,
        label: 'Unidad salarial definida (mensual / anual)',
        status: salaryUnitDefined === false ? 'warn' : 'ok',
      },
      {
        id: 8,
        label: 'Número de pagas definido (12–16)',
        status: payPeriodsDefined === false ? 'warn' : 'ok',
      },
    ];

    const casuistics: CheckItem[] = [
      {
        id: 9,
        label: 'SafeMode',
        status: safeModeActive ? 'block' : 'ok',
        detail: safeModeActive
          ? 'SafeMode activo: cálculo y guardado de importes bloqueados.'
          : 'SafeMode no activo.',
      },
      {
        id: 10,
        label: 'Conceptos obligatorios completos',
        status:
          safeModeActive || agreementMissing
            ? 'warn'
            : 'ok',
        detail:
          'Verificación derivada del normalizer y resolver de convenio.',
      },
      {
        id: 11,
        label: 'Incidencias persistidas en el período',
        status: hasPersistedIncidents ? 'info' : 'ok',
        detail: hasPersistedIncidents
          ? 'Existen incidencias persistidas. Revisar panel inferior.'
          : 'Sin incidencias persistidas.',
      },
      {
        id: 12,
        label: 'Conflictos local ↔ persistido',
        status: hasLocalPersistedConflicts ? 'warn' : 'ok',
      },
      {
        id: 13,
        label: 'Incidencias no aplicadas al cálculo',
        status: hasUnmappedIncidents ? 'warn' : 'ok',
        detail:
          'Incidencias persistidas reconocidas pero sin slot legacy en motor.',
      },
      {
        id: 14,
        label: 'Revisión legal requerida',
        status: legalReviewRequired ? 'block' : 'ok',
      },
    ];

    const operational: CheckItem[] = [
      {
        id: 15,
        label: 'Comunicaciones oficiales',
        status: officialBlocked
          ? hasOfficialPendingFlags
            ? 'warn'
            : 'info'
          : 'ok',
        detail: officialBlocked
          ? 'Envíos oficiales bloqueados por entorno (dry-run).'
          : 'Entorno permite envíos oficiales.',
      },
    ];

    // Derivar gate global
    const allChecks = [
      ...identity,
      ...salary,
      ...casuistics,
      ...operational,
    ];
    const hasBlock = allChecks.some((c) => c.status === 'block');
    const hasWarn = allChecks.some((c) => c.status === 'warn');

    let level: GateLevel = 'ready';
    if (hasBlock) level = 'blocked';
    else if (hasWarn) level = 'review';

    const canCalculate = !hasBlock;
    const canSave = !hasBlock && !legalReviewRequired;
    const mustBlock = hasBlock;

    operational.push(
      {
        id: 16,
        label: 'La nómina puede calcularse internamente',
        status: canCalculate ? 'ok' : 'block',
      },
      {
        id: 17,
        label: 'La nómina puede guardarse',
        status: canSave ? 'ok' : 'block',
      },
      {
        id: 18,
        label: 'La nómina debe quedar bloqueada',
        status: mustBlock ? 'block' : 'ok',
      },
    );

    return {
      gate: { level, canCalculate, canSave, mustBlock },
      sections: [
        { title: 'Identidad y contrato', items: identity },
        { title: 'Parametrización salarial', items: salary },
        { title: 'Casuística e incidencias', items: casuistics },
        { title: 'Cálculo · guardado · oficiales', items: operational },
      ],
    };
  }, [
    employeeId,
    contractId,
    contractStatus,
    agreementStatus,
    safeModeActive,
    legalReviewRequired,
    hasPersistedIncidents,
    hasLocalPersistedConflicts,
    hasUnmappedIncidents,
    hasOfficialPendingFlags,
    professionalGroupKnown,
    contributionGroupKnown,
    salaryParametrized,
    salaryUnitDefined,
    payPeriodsDefined,
    officialBlocked,
  ]);

  const gateMeta = {
    ready: {
      label: 'LISTA PARA CALCULAR',
      icon: <ShieldCheck className="h-4 w-4" />,
      variant: 'success' as const,
      headerClass: 'bg-success/10 border-success/30',
    },
    review: {
      label: 'REQUIERE REVISIÓN',
      icon: <ShieldQuestion className="h-4 w-4" />,
      variant: 'warning' as const,
      headerClass: 'bg-warning/10 border-warning/30',
    },
    blocked: {
      label: 'BLOQUEADA',
      icon: <ShieldAlert className="h-4 w-4" />,
      variant: 'destructive' as const,
      headerClass: 'bg-destructive/10 border-destructive/30',
    },
  }[gate.level];

  return (
    <Card
      className={cn('mb-3 border', gateMeta.headerClass, className)}
      role="status"
      aria-label="Comprobación previa de nómina"
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {gateMeta.icon}
            Comprobación previa de nómina
          </span>
          <Badge variant={gateMeta.variant} className="text-[10px] h-5">
            {gateMeta.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-1.5 text-xs leading-tight"
                    title={c.detail}
                  >
                    {statusIcon(c.status)}
                    <span className="flex-1">
                      <span className="text-muted-foreground mr-1">
                        {String(c.id).padStart(2, '0')}.
                      </span>
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground italic mt-2 flex items-center gap-1">
          <Info className="h-2.5 w-2.5" />
          Panel informativo. No modifica el cálculo, no genera comunicaciones
          oficiales y no altera el motor de nómina.
        </p>
      </CardContent>
    </Card>
  );
}

export default HRPayrollReadinessGate;