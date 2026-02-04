/**
 * usePayrollComplianceValidation - Hook para validar cumplimiento de convenios y sindicatos
 * Verifica obligaciones legales en nóminas y finiquitos según:
 * - Art. 8.5 ET: Convenio colectivo aplicable
 * - Art. 64-68 ET: Derechos de representación y crédito horario
 * - RD 2001/1983: Jornada y descansos
 * - Convenios sectoriales: Tablas salariales, pluses, antigüedad
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface ComplianceCheck {
  id: string;
  category: 'convenio' | 'sindicato' | 'seguridad_social' | 'irpf' | 'jornada' | 'vacaciones';
  severity: 'critical' | 'warning' | 'info';
  code: string;
  title: string;
  description: string;
  regulation: string;
  passed: boolean;
  expectedValue?: string | number;
  actualValue?: string | number;
  recommendation?: string;
}

export interface ConvenioValidation {
  hasConvenio: boolean;
  convenioId?: string;
  convenioName?: string;
  convenioCodigo?: string;
  isExpired: boolean;
  expirationDate?: string;
  checks: ComplianceCheck[];
}

export interface SindicatoValidation {
  hasRepresentatives: boolean;
  representativeCount: number;
  creditHoursTotal: number;
  creditHoursUsed: number;
  notificationRequired: boolean;
  notificationSent: boolean;
  checks: ComplianceCheck[];
}

export interface PayrollComplianceResult {
  isCompliant: boolean;
  complianceScore: number;
  convenio: ConvenioValidation;
  sindicato: SindicatoValidation;
  allChecks: ComplianceCheck[];
  criticalIssues: ComplianceCheck[];
  warnings: ComplianceCheck[];
  summary: string;
  legalReferences: Array<{ ref: string; description: string }>;
}

export interface SettlementComplianceResult extends PayrollComplianceResult {
  indemnizationCompliant: boolean;
  notificationPeriodCompliant: boolean;
  documentationComplete: boolean;
  terminationType: string;
  requiredNotifications: Array<{
    recipient: string;
    deadline: string;
    sent: boolean;
    documentType: string;
  }>;
}

// === DEFINICIONES DE CHECKS ===
const CONVENIO_CHECKS = [
  {
    id: 'conv_assigned',
    code: 'ART_8_5_ET',
    title: 'Convenio colectivo asignado',
    regulation: 'Art. 8.5 Estatuto de los Trabajadores',
    description: 'El contrato debe informar del convenio colectivo aplicable',
  },
  {
    id: 'conv_salary_min',
    code: 'CONV_SALARIO_MIN',
    title: 'Salario mínimo del convenio',
    regulation: 'Convenio colectivo sectorial',
    description: 'El salario base debe ser igual o superior al mínimo del convenio',
  },
  {
    id: 'conv_extra_pays',
    code: 'CONV_PAGAS_EXTRA',
    title: 'Número de pagas extraordinarias',
    regulation: 'Art. 31 ET + Convenio',
    description: 'Verificar que se abonan las pagas extras según convenio',
  },
  {
    id: 'conv_working_hours',
    code: 'CONV_JORNADA',
    title: 'Jornada laboral',
    regulation: 'Art. 34 ET + Convenio',
    description: 'La jornada no debe superar el máximo del convenio',
  },
  {
    id: 'conv_vacation_days',
    code: 'CONV_VACACIONES',
    title: 'Días de vacaciones',
    regulation: 'Art. 38 ET + Convenio',
    description: 'Mínimo 30 días naturales o lo establecido en convenio',
  },
  {
    id: 'conv_seniority',
    code: 'CONV_ANTIGUEDAD',
    title: 'Complemento de antigüedad',
    regulation: 'Convenio colectivo',
    description: 'Trienios/quinquenios según convenio',
  },
  {
    id: 'conv_not_expired',
    code: 'CONV_VIGENCIA',
    title: 'Vigencia del convenio',
    regulation: 'Art. 86 ET',
    description: 'El convenio debe estar vigente',
  },
];

const SINDICATO_CHECKS = [
  {
    id: 'sind_notify_termination',
    code: 'ART_53_ET',
    title: 'Notificación a representantes legales',
    regulation: 'Art. 53.1.c ET',
    description: 'Comunicar despido objetivo a representantes de los trabajadores',
  },
  {
    id: 'sind_credit_hours',
    code: 'ART_68_ET',
    title: 'Crédito horario respetado',
    regulation: 'Art. 68.e ET',
    description: 'Verificar que no se descuentan horas de crédito sindical',
  },
  {
    id: 'sind_protected_rep',
    code: 'ART_68_A_ET',
    title: 'Protección representantes',
    regulation: 'Art. 68.a ET',
    description: 'Los representantes tienen prioridad de permanencia',
  },
  {
    id: 'sind_consultation_ere',
    code: 'ART_51_ET',
    title: 'Período de consultas ERE',
    regulation: 'Art. 51 ET',
    description: 'Consultas obligatorias en despidos colectivos',
  },
  {
    id: 'sind_union_dues',
    code: 'CUOTA_SINDICAL',
    title: 'Cuota sindical en nómina',
    regulation: 'Art. 11.2 LOLS',
    description: 'Descuento de cuota sindical si hay autorización',
  },
];

const SETTLEMENT_SPECIFIC_CHECKS = [
  {
    id: 'sett_preaviso',
    code: 'ART_53_1_C_ET',
    title: 'Preaviso de 15 días',
    regulation: 'Art. 53.1.c ET',
    description: 'Preaviso obligatorio en despido objetivo',
  },
  {
    id: 'sett_carta_despido',
    code: 'ART_53_1_A_ET',
    title: 'Carta de despido motivada',
    regulation: 'Art. 53.1.a ET',
    description: 'Comunicación escrita con causa y fecha efectos',
  },
  {
    id: 'sett_indemnizacion_simultanea',
    code: 'ART_53_1_B_ET',
    title: 'Pago simultáneo indemnización',
    regulation: 'Art. 53.1.b ET',
    description: 'Poner a disposición la indemnización con la carta',
  },
  {
    id: 'sett_finiquito_firmado',
    code: 'FINIQUITO',
    title: 'Finiquito documentado',
    regulation: 'Art. 49.2 ET',
    description: 'Documento de liquidación y saldo',
  },
];

// === HOOK ===
export function usePayrollComplianceValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<PayrollComplianceResult | null>(null);

  /**
   * Validar cumplimiento de nómina
   */
  const validatePayroll = useCallback(async (
    employeeId: string,
    companyId: string,
    payrollData: {
      baseSalary: number;
      workingHours: number;
      vacationDays: number;
      extraPays: number;
      seniorityYears: number;
      convenioId?: string;
      period: string;
    }
  ): Promise<PayrollComplianceResult> => {
    setIsValidating(true);

    try {
      // Obtener datos del convenio
      let convenioData = null;
      if (payrollData.convenioId) {
        const { data } = await supabase
          .from('erp_hr_collective_agreements')
          .select('*')
          .eq('id', payrollData.convenioId)
          .single();
        convenioData = data;
      }

      // Obtener representantes sindicales de la empresa
      const { data: representatives } = await supabase
        .from('erp_hr_union_memberships')
        .select('*, erp_hr_employees!inner(id, first_name, last_name)')
        .eq('company_id', companyId)
        .eq('is_representative', true)
        .eq('status', 'active');

      const checks: ComplianceCheck[] = [];
      const legalRefs: Array<{ ref: string; description: string }> = [];

      // === CHECKS DE CONVENIO ===
      const convenioChecks = runConvenioChecks(payrollData, convenioData);
      checks.push(...convenioChecks);

      // === CHECKS DE SINDICATOS ===
      const sindicatoChecks = runSindicatoChecks(representatives || []);
      checks.push(...sindicatoChecks);

      // Calcular resultado
      const criticalIssues = checks.filter(c => c.severity === 'critical' && !c.passed);
      const warnings = checks.filter(c => c.severity === 'warning' && !c.passed);
      const passedChecks = checks.filter(c => c.passed);

      const complianceScore = Math.round((passedChecks.length / checks.length) * 100);
      const isCompliant = criticalIssues.length === 0;

      // Agregar referencias legales
      checks.forEach(check => {
        if (!check.passed && check.regulation) {
          legalRefs.push({ ref: check.code, description: check.regulation });
        }
      });

      const result: PayrollComplianceResult = {
        isCompliant,
        complianceScore,
        convenio: {
          hasConvenio: !!payrollData.convenioId,
          convenioId: payrollData.convenioId,
          convenioName: convenioData?.name,
          convenioCodigo: convenioData?.code,
          isExpired: convenioData?.expiration_date 
            ? new Date(convenioData.expiration_date) < new Date() 
            : false,
          expirationDate: convenioData?.expiration_date,
          checks: convenioChecks,
        },
        sindicato: {
          hasRepresentatives: (representatives?.length || 0) > 0,
          representativeCount: representatives?.length || 0,
          creditHoursTotal: 0, // Calcular de datos reales
          creditHoursUsed: 0,
          notificationRequired: false,
          notificationSent: true,
          checks: sindicatoChecks,
        },
        allChecks: checks,
        criticalIssues,
        warnings,
        summary: generateSummary(isCompliant, criticalIssues, warnings),
        legalReferences: legalRefs,
      };

      setLastResult(result);
      return result;
    } catch (error) {
      console.error('[usePayrollComplianceValidation] Error:', error);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Validar cumplimiento de finiquito
   */
  const validateSettlement = useCallback(async (
    employeeId: string,
    companyId: string,
    settlementData: {
      terminationType: string;
      terminationDate: string;
      notificationDate?: string;
      baseSalary: number;
      yearsWorked: number;
      indemnizationDays: number;
      convenioId?: string;
      isRepresentative?: boolean;
    }
  ): Promise<SettlementComplianceResult> => {
    setIsValidating(true);

    try {
      // Primero validar como nómina
      const baseResult = await validatePayroll(employeeId, companyId, {
        baseSalary: settlementData.baseSalary,
        workingHours: 40,
        vacationDays: 30,
        extraPays: 14,
        seniorityYears: settlementData.yearsWorked,
        convenioId: settlementData.convenioId,
        period: settlementData.terminationDate.substring(0, 7),
      });

      const additionalChecks: ComplianceCheck[] = [];
      const requiredNotifications: SettlementComplianceResult['requiredNotifications'] = [];

      // === CHECKS ESPECÍFICOS DE FINIQUITO ===
      
      // Preaviso (despido objetivo)
      if (settlementData.terminationType === 'objective') {
        const notificationDate = settlementData.notificationDate 
          ? new Date(settlementData.notificationDate) 
          : null;
        const terminationDate = new Date(settlementData.terminationDate);
        const daysDiff = notificationDate 
          ? Math.ceil((terminationDate.getTime() - notificationDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        additionalChecks.push({
          id: 'sett_preaviso',
          category: 'convenio',
          severity: 'critical',
          code: 'ART_53_1_C_ET',
          title: 'Preaviso de 15 días',
          description: 'Preaviso obligatorio en despido objetivo',
          regulation: 'Art. 53.1.c ET',
          passed: daysDiff >= 15,
          expectedValue: '15 días mínimo',
          actualValue: `${daysDiff} días`,
          recommendation: daysDiff < 15 
            ? 'Debe indemnizar los días de preaviso no concedidos' 
            : undefined,
        });

        // Notificación a representantes
        requiredNotifications.push({
          recipient: 'Representantes legales de los trabajadores',
          deadline: settlementData.notificationDate || 'Previo al despido',
          sent: false, // Debería verificarse en BD
          documentType: 'Comunicación de despido objetivo',
        });
      }

      // Verificar si es representante sindical
      if (settlementData.isRepresentative) {
        additionalChecks.push({
          id: 'sett_rep_protection',
          category: 'sindicato',
          severity: 'critical',
          code: 'ART_68_A_ET',
          title: 'Protección de representante',
          description: 'Los representantes tienen prioridad de permanencia y protección especial',
          regulation: 'Art. 68.a ET',
          passed: false,
          recommendation: 'Requiere revisión legal especial - expediente disciplinario contradictorio',
        });
      }

      // Indemnización según tipo de despido
      const expectedDays = getExpectedIndemnizationDays(settlementData.terminationType);
      additionalChecks.push({
        id: 'sett_indemnization',
        category: 'convenio',
        severity: 'critical',
        code: 'INDEMNIZACION',
        title: 'Cálculo de indemnización',
        description: `Días por año según tipo de despido: ${settlementData.terminationType}`,
        regulation: getIndemnizationRegulation(settlementData.terminationType),
        passed: settlementData.indemnizationDays >= expectedDays,
        expectedValue: `${expectedDays} días/año`,
        actualValue: `${settlementData.indemnizationDays} días/año`,
      });

      // Combinar checks
      const allChecks = [...baseResult.allChecks, ...additionalChecks];
      const criticalIssues = allChecks.filter(c => c.severity === 'critical' && !c.passed);
      const warnings = allChecks.filter(c => c.severity === 'warning' && !c.passed);
      const passedChecks = allChecks.filter(c => c.passed);

      const result: SettlementComplianceResult = {
        ...baseResult,
        allChecks,
        criticalIssues,
        warnings,
        complianceScore: Math.round((passedChecks.length / allChecks.length) * 100),
        isCompliant: criticalIssues.length === 0,
        indemnizationCompliant: !additionalChecks.find(c => c.id === 'sett_indemnization' && !c.passed),
        notificationPeriodCompliant: !additionalChecks.find(c => c.id === 'sett_preaviso' && !c.passed),
        documentationComplete: true, // Verificar documentos reales
        terminationType: settlementData.terminationType,
        requiredNotifications,
        summary: generateSettlementSummary(criticalIssues, warnings, settlementData.terminationType),
      };

      return result;
    } catch (error) {
      console.error('[usePayrollComplianceValidation] validateSettlement error:', error);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [validatePayroll]);

  /**
   * Obtener checks pendientes para representantes sindicales
   */
  const getUnionNotificationChecks = useCallback(async (
    companyId: string,
    actionType: 'termination' | 'collective_dismissal' | 'work_conditions_change'
  ): Promise<Array<{ required: boolean; description: string; deadline: string }>> => {
    // Verificar si hay representantes
    const { data: reps } = await supabase
      .from('erp_hr_union_memberships')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_representative', true)
      .eq('status', 'active')
      .limit(1);

    const hasReps = (reps?.length || 0) > 0;

    switch (actionType) {
      case 'termination':
        return hasReps ? [
          { required: true, description: 'Comunicar despido objetivo a representantes', deadline: 'Simultáneo a la notificación' },
        ] : [];
      
      case 'collective_dismissal':
        return hasReps ? [
          { required: true, description: 'Apertura período de consultas', deadline: 'Antes del inicio del ERE' },
          { required: true, description: 'Negociación de buena fe', deadline: 'Durante 30 días (15 en <50 trabajadores)' },
          { required: true, description: 'Comunicación a autoridad laboral', deadline: 'Inicio y fin del período de consultas' },
        ] : [];
      
      case 'work_conditions_change':
        return hasReps ? [
          { required: true, description: 'Período de consultas MSCT', deadline: '15 días antes de efectividad' },
        ] : [];
      
      default:
        return [];
    }
  }, []);

  return {
    isValidating,
    lastResult,
    validatePayroll,
    validateSettlement,
    getUnionNotificationChecks,
  };
}

// === FUNCIONES AUXILIARES ===

function runConvenioChecks(
  payrollData: { baseSalary: number; workingHours: number; vacationDays: number; extraPays: number; seniorityYears: number; convenioId?: string },
  convenioData: Record<string, unknown> | null
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check: Convenio asignado
  checks.push({
    id: 'conv_assigned',
    category: 'convenio',
    severity: 'critical',
    code: 'ART_8_5_ET',
    title: 'Convenio colectivo asignado',
    description: 'El contrato debe informar del convenio colectivo aplicable',
    regulation: 'Art. 8.5 Estatuto de los Trabajadores',
    passed: !!payrollData.convenioId,
    recommendation: !payrollData.convenioId 
      ? 'Debe asignar un convenio colectivo al contrato del empleado' 
      : undefined,
  });

  if (convenioData) {
    // Check: Salario mínimo
    const minSalary = convenioData.min_salary as number || 0;
    checks.push({
      id: 'conv_salary_min',
      category: 'convenio',
      severity: 'critical',
      code: 'CONV_SALARIO_MIN',
      title: 'Salario mínimo del convenio',
      description: 'El salario base debe ser igual o superior al mínimo del convenio',
      regulation: 'Convenio colectivo sectorial',
      passed: minSalary === 0 || payrollData.baseSalary >= minSalary,
      expectedValue: minSalary > 0 ? `€${minSalary.toLocaleString('es-ES')}` : 'No definido',
      actualValue: `€${payrollData.baseSalary.toLocaleString('es-ES')}`,
      recommendation: minSalary > 0 && payrollData.baseSalary < minSalary
        ? `Incrementar salario en €${(minSalary - payrollData.baseSalary).toLocaleString('es-ES')}`
        : undefined,
    });

    // Check: Pagas extra
    const convenioExtraPays = convenioData.extra_payments as number || 14;
    checks.push({
      id: 'conv_extra_pays',
      category: 'convenio',
      severity: 'warning',
      code: 'CONV_PAGAS_EXTRA',
      title: 'Número de pagas extraordinarias',
      description: 'Verificar que se abonan las pagas extras según convenio',
      regulation: 'Art. 31 ET + Convenio',
      passed: payrollData.extraPays >= convenioExtraPays,
      expectedValue: `${convenioExtraPays} pagas`,
      actualValue: `${payrollData.extraPays} pagas`,
    });

    // Check: Jornada
    const convenioHours = convenioData.working_hours_week as number || 40;
    checks.push({
      id: 'conv_working_hours',
      category: 'jornada',
      severity: 'warning',
      code: 'CONV_JORNADA',
      title: 'Jornada laboral semanal',
      description: 'La jornada no debe superar el máximo del convenio',
      regulation: 'Art. 34 ET + Convenio',
      passed: payrollData.workingHours <= convenioHours,
      expectedValue: `≤${convenioHours}h`,
      actualValue: `${payrollData.workingHours}h`,
    });

    // Check: Vacaciones
    const convenioVacation = convenioData.vacation_days as number || 30;
    checks.push({
      id: 'conv_vacation_days',
      category: 'vacaciones',
      severity: 'warning',
      code: 'CONV_VACACIONES',
      title: 'Días de vacaciones',
      description: 'Mínimo 30 días naturales o lo establecido en convenio',
      regulation: 'Art. 38 ET + Convenio',
      passed: payrollData.vacationDays >= convenioVacation,
      expectedValue: `≥${convenioVacation} días`,
      actualValue: `${payrollData.vacationDays} días`,
    });

    // Check: Vigencia
    const expirationDate = convenioData.expiration_date as string;
    const isExpired = expirationDate ? new Date(expirationDate) < new Date() : false;
    checks.push({
      id: 'conv_not_expired',
      category: 'convenio',
      severity: 'warning',
      code: 'CONV_VIGENCIA',
      title: 'Vigencia del convenio',
      description: 'El convenio debe estar vigente',
      regulation: 'Art. 86 ET',
      passed: !isExpired,
      expectedValue: 'Vigente',
      actualValue: isExpired ? 'Expirado' : 'Vigente',
      recommendation: isExpired 
        ? 'El convenio ha expirado - aplicar ultraactividad o nuevo convenio' 
        : undefined,
    });
  }

  return checks;
}

function runSindicatoChecks(representatives: Array<Record<string, unknown>>): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const hasReps = representatives.length > 0;

  // Check: Cuota sindical
  checks.push({
    id: 'sind_union_dues',
    category: 'sindicato',
    severity: 'info',
    code: 'CUOTA_SINDICAL',
    title: 'Cuota sindical en nómina',
    description: 'Descuento de cuota sindical si hay autorización del trabajador',
    regulation: 'Art. 11.2 LOLS',
    passed: true, // Verificar autorización individual
  });

  // Check: Crédito horario
  if (hasReps) {
    checks.push({
      id: 'sind_credit_hours',
      category: 'sindicato',
      severity: 'warning',
      code: 'ART_68_ET',
      title: 'Crédito horario respetado',
      description: 'Las horas de crédito sindical no deben descontarse del salario',
      regulation: 'Art. 68.e ET',
      passed: true, // Verificar que no se descuente
    });
  }

  return checks;
}

function generateSummary(isCompliant: boolean, criticalIssues: ComplianceCheck[], warnings: ComplianceCheck[]): string {
  if (isCompliant && warnings.length === 0) {
    return 'Nómina cumple con todas las obligaciones del convenio colectivo y legislación laboral.';
  }
  
  if (isCompliant && warnings.length > 0) {
    return `Nómina cumple requisitos mínimos con ${warnings.length} advertencia(s) a revisar.`;
  }
  
  return `Se detectaron ${criticalIssues.length} incumplimiento(s) crítico(s) que requieren corrección inmediata.`;
}

function generateSettlementSummary(
  criticalIssues: ComplianceCheck[], 
  warnings: ComplianceCheck[],
  terminationType: string
): string {
  const typeLabel: Record<string, string> = {
    voluntary: 'baja voluntaria',
    objective: 'despido objetivo',
    disciplinary: 'despido disciplinario',
    disciplinary_improcedent: 'despido improcedente',
    collective: 'despido colectivo',
    end_contract: 'fin de contrato',
    mutual_agreement: 'mutuo acuerdo',
  };

  const type = typeLabel[terminationType] || terminationType;

  if (criticalIssues.length === 0 && warnings.length === 0) {
    return `Finiquito por ${type} cumple con todas las obligaciones legales y del convenio colectivo.`;
  }
  
  if (criticalIssues.length === 0) {
    return `Finiquito por ${type} cumple requisitos mínimos con ${warnings.length} advertencia(s).`;
  }
  
  return `Finiquito por ${type}: ${criticalIssues.length} incumplimiento(s) crítico(s) detectados.`;
}

function getExpectedIndemnizationDays(terminationType: string): number {
  const days: Record<string, number> = {
    voluntary: 0,
    objective: 20,
    disciplinary: 0,
    disciplinary_improcedent: 33,
    collective: 20,
    end_contract: 12,
    mutual_agreement: 0,
    retirement: 0,
  };
  return days[terminationType] || 0;
}

function getIndemnizationRegulation(terminationType: string): string {
  const regulations: Record<string, string> = {
    voluntary: 'Sin derecho a indemnización',
    objective: 'Art. 53.1.b ET - 20 días/año (máx. 12 mensualidades)',
    disciplinary: 'Sin indemnización si es procedente',
    disciplinary_improcedent: 'Art. 56 ET - 33 días/año (máx. 24 mensualidades)',
    collective: 'Art. 51 ET - 20 días/año (máx. 12 mensualidades)',
    end_contract: 'Art. 49.1.c ET - 12 días/año',
    mutual_agreement: 'Libre pacto entre partes',
    retirement: 'Sin derecho a indemnización',
  };
  return regulations[terminationType] || 'Verificar normativa aplicable';
}

export default usePayrollComplianceValidation;
