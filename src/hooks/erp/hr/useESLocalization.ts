/**
 * useESLocalization — Hook para el plugin de localización España
 * CRUD + cálculos: datos laborales, IRPF, SS, finiquito, certificado empresa
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Interfaces ──

export interface ESEmployeeLaborData {
  id: string;
  employee_id: string;
  company_id: string;
  naf: string | null;
  grupo_cotizacion: number | null;
  cno_code: string | null;
  convenio_colectivo_id: string | null;
  tipo_contrato_rd: string | null;
  comunidad_autonoma: string | null;
  provincia: string | null;
  regimen_ss: string;
  categoria_profesional: string | null;
  coeficiente_parcialidad: number;
  fecha_alta_ss: string | null;
  fecha_baja_ss: string | null;
  codigo_contrato_red: string | null;
  epigrafe_at: string | null;
  situacion_familiar_irpf: number;
  hijos_menores_25: number;
  hijos_menores_3: number;
  discapacidad_hijos: boolean;
  ascendientes_cargo: number;
  reduccion_movilidad_geografica: boolean;
  pension_compensatoria: number;
  anualidad_alimentos: number;
  prolongacion_laboral: boolean;
  contrato_inferior_anual: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ESIRPFTramo {
  id: string;
  tax_year: number;
  ccaa_code: string | null;
  tramo_desde: number;
  tramo_hasta: number | null;
  tipo_estatal: number;
  tipo_autonomico: number;
  tipo_total: number;
  is_active: boolean;
}

export interface ESSSBase {
  id: string;
  year: number;
  grupo_cotizacion: number;
  base_minima_mensual: number;
  base_maxima_mensual: number;
  base_minima_diaria: number | null;
  base_maxima_diaria: number | null;
  tipo_cc_empresa: number;
  tipo_cc_trabajador: number;
  tipo_desempleo_empresa_gi: number;
  tipo_desempleo_trabajador_gi: number;
  tipo_desempleo_empresa_td: number;
  tipo_desempleo_trabajador_td: number;
  tipo_fogasa: number;
  tipo_fp_empresa: number;
  tipo_fp_trabajador: number;
  tipo_mei: number;
  tipo_at_empresa: number | null;
  is_active: boolean;
}

export interface ESContractType {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  jornada_default: string;
  duracion_maxima_meses: number | null;
  periodo_prueba_max_meses: number | null;
  indemnizacion_dias_anyo: number;
  conversion_indefinido: boolean;
  normativa_referencia: string | null;
  is_active: boolean;
}

export interface IRPFCalculationParams {
  salarioBrutoAnual: number;
  situacionFamiliar: number; // 1,2,3
  hijosmenores25: number;
  hijosMenores3: number;
  ascendientesCargo: number;
  discapacidadHijos: boolean;
  pensionCompensatoria: number;
  anualidadAlimentos: number;
  reduccionMovilidad: boolean;
  prolongacionLaboral: boolean;
  contratoInferiorAnual: boolean;
  ccaaCode?: string;
}

export interface IRPFResult {
  baseImponible: number;
  cuotaIntegra: number;
  tipoEfectivo: number;
  retencionMensual: number;
  tramosAplicados: Array<{ desde: number; hasta: number | null; tipo: number; cuota: number }>;
}

export interface SSContributionResult {
  baseCotizacion: number;
  ccEmpresa: number;
  ccTrabajador: number;
  desempleoEmpresa: number;
  desempleoTrabajador: number;
  fogasa: number;
  fpEmpresa: number;
  fpTrabajador: number;
  mei: number;
  atEmpresa: number;
  totalEmpresa: number;
  totalTrabajador: number;
}

export interface SettlementParams {
  salarioBase: number;
  salarioBrutoAnual: number;
  fechaInicio: string;
  fechaBaja: string;
  tipoExtincion: 'despido_improcedente' | 'despido_objetivo' | 'fin_temporal' | 'voluntaria' | 'mutuo_acuerdo' | 'ere';
  diasVacacionesPendientes: number;
  pagasExtrasAnuales: number;
  indemnizacionDiasAnyo: number;
  antiguedadAnios?: number;
}

export interface SettlementResult {
  vacacionesPendientes: number;
  pagasExtrasProrrata: number;
  indemnizacion: number;
  salarioPendiente: number;
  totalBruto: number;
  diasIndemnizacion: number;
  antiguedadAnios: number;
}

// ── Hook ──

export function useESLocalization(companyId?: string) {
  const [laborData, setLaborData] = useState<ESEmployeeLaborData | null>(null);
  const [irpfTables, setIrpfTables] = useState<ESIRPFTramo[]>([]);
  const [ssBases, setSSBases] = useState<ESSSBase[]>([]);
  const [contractTypes, setContractTypes] = useState<ESContractType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Labor Data CRUD ──

  const fetchLaborData = useCallback(async (employeeId: string) => {
    if (!companyId) return null;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_es_employee_labor_data')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      setLaborData(data as ESEmployeeLaborData | null);
      return data;
    } catch (err) {
      console.error('[useESLocalization] fetchLaborData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const saveLaborData = useCallback(async (data: Partial<ESEmployeeLaborData> & { employee_id: string }) => {
    if (!companyId) return null;
    try {
      const payload = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
      const { data: result, error } = await supabase
        .from('hr_es_employee_labor_data')
        .upsert(payload as any, { onConflict: 'employee_id,company_id' })
        .select()
        .single();
      if (error) throw error;
      setLaborData(result as ESEmployeeLaborData);
      toast.success('Datos laborales ES guardados');
      return result;
    } catch (err) {
      console.error('[useESLocalization] saveLaborData error:', err);
      toast.error('Error al guardar datos laborales');
      return null;
    }
  }, [companyId]);

  // ── IRPF ──

  const fetchIRPFTables = useCallback(async (year: number, ccaaCode?: string) => {
    try {
      let query = supabase
        .from('hr_es_irpf_tables')
        .select('*')
        .eq('tax_year', year)
        .eq('is_active', true)
        .order('tramo_desde', { ascending: true });
      if (ccaaCode) {
        query = query.eq('ccaa_code', ccaaCode);
      } else {
        query = query.is('ccaa_code', null);
      }
      const { data, error } = await query;
      if (error) throw error;
      setIrpfTables((data || []) as ESIRPFTramo[]);
      return data;
    } catch (err) {
      console.error('[useESLocalization] fetchIRPFTables error:', err);
      return [];
    }
  }, []);

  const calculateIRPFRetention = useCallback((params: IRPFCalculationParams, tramos: ESIRPFTramo[]): IRPFResult => {
    // Reducciones sobre base
    let baseImponible = params.salarioBrutoAnual;
    baseImponible -= params.pensionCompensatoria;
    baseImponible -= params.anualidadAlimentos;
    // Mínimos personales (simplificado 2026)
    let minimoPersonal = 5550;
    if (params.hijosmenores25 >= 1) minimoPersonal += 2400;
    if (params.hijosmenores25 >= 2) minimoPersonal += 2700;
    if (params.hijosmenores25 >= 3) minimoPersonal += 4000;
    if (params.hijosmenores25 >= 4) minimoPersonal += 4500;
    if (params.hijosMenores3 > 0) minimoPersonal += params.hijosMenores3 * 2800;
    if (params.ascendientesCargo > 0) minimoPersonal += params.ascendientesCargo * 1150;

    const baseGravable = Math.max(0, baseImponible - minimoPersonal);

    // Calcular cuota por tramos
    let cuotaIntegra = 0;
    let remaining = baseGravable;
    const tramosAplicados: IRPFResult['tramosAplicados'] = [];

    for (const t of tramos) {
      if (remaining <= 0) break;
      const tramoSize = t.tramo_hasta ? t.tramo_hasta - t.tramo_desde : remaining;
      const aplicable = Math.min(remaining, tramoSize);
      const cuota = (aplicable * t.tipo_total) / 100;
      cuotaIntegra += cuota;
      tramosAplicados.push({ desde: t.tramo_desde, hasta: t.tramo_hasta, tipo: t.tipo_total, cuota });
      remaining -= aplicable;
    }

    const tipoEfectivo = baseImponible > 0 ? (cuotaIntegra / baseImponible) * 100 : 0;
    const retencionMensual = cuotaIntegra / 12;

    return { baseImponible, cuotaIntegra, tipoEfectivo: Math.round(tipoEfectivo * 100) / 100, retencionMensual: Math.round(retencionMensual * 100) / 100, tramosAplicados };
  }, []);

  // ── Seguridad Social ──

  const fetchSSBases = useCallback(async (year: number) => {
    try {
      const { data, error } = await supabase
        .from('hr_es_ss_bases')
        .select('*')
        .eq('year', year)
        .eq('is_active', true)
        .order('grupo_cotizacion', { ascending: true });
      if (error) throw error;
      setSSBases((data || []) as ESSSBase[]);
      return data;
    } catch (err) {
      console.error('[useESLocalization] fetchSSBases error:', err);
      return [];
    }
  }, []);

  const calculateSSContributions = useCallback((
    salarioBruto: number,
    ssBase: ESSSBase,
    isTemporary: boolean = false
  ): SSContributionResult => {
    // Aplicar topes
    const baseCotizacion = Math.max(ssBase.base_minima_mensual, Math.min(salarioBruto, ssBase.base_maxima_mensual));

    const ccEmpresa = (baseCotizacion * ssBase.tipo_cc_empresa) / 100;
    const ccTrabajador = (baseCotizacion * ssBase.tipo_cc_trabajador) / 100;
    const desempleoEmpresa = (baseCotizacion * (isTemporary ? ssBase.tipo_desempleo_empresa_td : ssBase.tipo_desempleo_empresa_gi)) / 100;
    const desempleoTrabajador = (baseCotizacion * (isTemporary ? ssBase.tipo_desempleo_trabajador_td : ssBase.tipo_desempleo_trabajador_gi)) / 100;
    const fogasa = (baseCotizacion * ssBase.tipo_fogasa) / 100;
    const fpEmpresa = (baseCotizacion * ssBase.tipo_fp_empresa) / 100;
    const fpTrabajador = (baseCotizacion * ssBase.tipo_fp_trabajador) / 100;
    const mei = (baseCotizacion * ssBase.tipo_mei) / 100;
    const atEmpresa = (baseCotizacion * (ssBase.tipo_at_empresa || 1.50)) / 100;

    const r = (n: number) => Math.round(n * 100) / 100;

    return {
      baseCotizacion: r(baseCotizacion),
      ccEmpresa: r(ccEmpresa),
      ccTrabajador: r(ccTrabajador),
      desempleoEmpresa: r(desempleoEmpresa),
      desempleoTrabajador: r(desempleoTrabajador),
      fogasa: r(fogasa),
      fpEmpresa: r(fpEmpresa),
      fpTrabajador: r(fpTrabajador),
      mei: r(mei),
      atEmpresa: r(atEmpresa),
      totalEmpresa: r(ccEmpresa + desempleoEmpresa + fogasa + fpEmpresa + mei + atEmpresa),
      totalTrabajador: r(ccTrabajador + desempleoTrabajador + fpTrabajador),
    };
  }, []);

  // ── Contract Types ──

  const fetchContractTypes = useCallback(async (category?: string) => {
    try {
      let query = supabase.from('hr_es_contract_types').select('*').eq('is_active', true).order('code');
      if (category) query = query.eq('category', category);
      if (companyId) query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      setContractTypes((data || []) as ESContractType[]);
      return data;
    } catch (err) {
      console.error('[useESLocalization] fetchContractTypes error:', err);
      return [];
    }
  }, [companyId]);

  // ── Settlement (Finiquito) ──

  const calculateSettlement = useCallback((params: SettlementParams): SettlementResult => {
    const start = new Date(params.fechaInicio);
    const end = new Date(params.fechaBaja);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const antiguedadAnios = params.antiguedadAnios ?? diffDays / 365.25;
    const salarioDiario = params.salarioBrutoAnual / 365;

    // Vacaciones pendientes
    const vacacionesPendientes = params.diasVacacionesPendientes * salarioDiario;

    // Pagas extras prorrateadas
    const mesEnCurso = end.getMonth();
    const diaEnMes = end.getDate();
    const fraccionSemestre = ((mesEnCurso % 6) * 30 + diaEnMes) / 180;
    const importePagaExtra = params.salarioBase * (params.pagasExtrasAnuales > 0 ? 1 : 0);
    const pagasExtrasProrrata = importePagaExtra * fraccionSemestre * (params.pagasExtrasAnuales === 2 ? 2 : 1);

    // Indemnización
    let diasIndemnizacion = 0;
    switch (params.tipoExtincion) {
      case 'despido_improcedente':
        diasIndemnizacion = params.indemnizacionDiasAnyo * antiguedadAnios;
        break;
      case 'despido_objetivo':
      case 'ere':
        diasIndemnizacion = 20 * antiguedadAnios;
        break;
      case 'fin_temporal':
        diasIndemnizacion = 12 * antiguedadAnios;
        break;
      case 'voluntaria':
      case 'mutuo_acuerdo':
        diasIndemnizacion = 0;
        break;
    }
    const indemnizacion = diasIndemnizacion * salarioDiario;

    // Salario pendiente del mes
    const diasMesTrabajados = diaEnMes;
    const salarioPendiente = (params.salarioBase / 30) * diasMesTrabajados;

    const r = (n: number) => Math.round(n * 100) / 100;
    const totalBruto = r(vacacionesPendientes + pagasExtrasProrrata + indemnizacion + salarioPendiente);

    return {
      vacacionesPendientes: r(vacacionesPendientes),
      pagasExtrasProrrata: r(pagasExtrasProrrata),
      indemnizacion: r(indemnizacion),
      salarioPendiente: r(salarioPendiente),
      totalBruto,
      diasIndemnizacion: Math.round(diasIndemnizacion * 100) / 100,
      antiguedadAnios: Math.round(antiguedadAnios * 100) / 100,
    };
  }, []);

  return {
    // State
    laborData,
    irpfTables,
    ssBases,
    contractTypes,
    isLoading,
    // Labor Data
    fetchLaborData,
    saveLaborData,
    // IRPF
    fetchIRPFTables,
    calculateIRPFRetention,
    // SS
    fetchSSBases,
    calculateSSContributions,
    // Contracts
    fetchContractTypes,
    // Settlement
    calculateSettlement,
  };
}
