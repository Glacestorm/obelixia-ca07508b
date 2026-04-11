/**
 * useEmployeeMasterPrefill — H2.1
 * Fetches master data from erp_hr_employees + hr_employee_extensions
 * for additive prefill into operational panels (Registration, Contract).
 * 
 * Rules:
 * - ES-specific fields (naf, ccc, contract_type_rd, etc.) only when country_code === 'ES'
 * - NAF priority: hr_employee_extensions.social_security_number > erp_hr_employees.ss_number
 * - Never overwrites user-entered data — consumer merges only into empty fields
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MasterPrefillData {
  // From erp_hr_employees
  national_id: string | null;
  ss_number: string | null;
  position: string | null;
  hire_date: string | null;
  base_salary: number | null;
  weekly_hours: number | null;
  country_code: string | null;
  // From hr_employee_extensions (ES-only)
  naf: string | null;           // social_security_number from extensions — takes priority over ss_number
  contribution_group: string | null;
  contract_type_rd: string | null;
  collective_agreement: string | null;
  cno_code: string | null;
  ccc: string | null;
  occupation_code: string | null;
}

/** Fields that map from master → Registration panel */
export interface RegistrationPrefillMap {
  dni_nie: string | null;
  naf: string | null;
  ccc: string | null;
  contract_type_code: string | null;
  contribution_group: string | null;
  occupation_code: string | null;
  collective_agreement: string | null;
}

/** Fields that map from master → Contract panel */
export interface ContractPrefillMap {
  dni_nie: string | null;
  naf: string | null;
  ccc: string | null;
  job_title: string | null;
  collective_agreement: string | null;
  weekly_hours: number | null;
  occupation_code: string | null;
}

/** Tracks which fields were actually applied as prefill */
export type PrefilledFieldSet = Set<string>;

export function useEmployeeMasterPrefill(employeeId: string | null) {
  const [masterData, setMasterData] = useState<MasterPrefillData | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<{ key: string; data: MasterPrefillData } | null>(null);

  const fetchMasterData = useCallback(async () => {
    if (!employeeId) return null;

    // Cache check — stable key by employeeId
    const cacheKey = `master-${employeeId}`;
    if (cacheRef.current?.key === cacheKey) {
      return cacheRef.current.data;
    }

    setLoading(true);
    try {
      // Fetch core employee data
      const { data: emp, error: empError } = await supabase
        .from('erp_hr_employees')
        .select('national_id, ss_number, job_title, hire_date, base_salary, weekly_hours, country_code')
        .eq('id', employeeId)
        .maybeSingle();

      if (empError) {
        console.error('[useEmployeeMasterPrefill] core fetch error:', empError);
        return null;
      }
      if (!emp) return null;

      let extensionData: Partial<MasterPrefillData> = {};

      // Fetch ES-specific extensions only when country_code is ES
      if (emp.country_code === 'ES') {
        const { data: ext, error: extError } = await supabase
          .from('hr_employee_extensions')
          .select('social_security_number, contribution_group, contract_type_rd, collective_agreement, cno_code, ccc, ocupacion_ss')
          .eq('employee_id', employeeId)
          .eq('country_code', 'ES')
          .maybeSingle();

        if (!extError && ext) {
          extensionData = {
            naf: (ext as any).social_security_number || null,
            contribution_group: (ext as any).contribution_group || null,
            contract_type_rd: (ext as any).contract_type_rd || null,
            collective_agreement: (ext as any).collective_agreement || null,
            cno_code: (ext as any).cno_code || null,
            ccc: (ext as any).ccc || null,
            occupation_code: (ext as any).ocupacion_ss || null,
          };
        }
      }

      // NAF resolution: extensions.social_security_number > core.ss_number
      const resolvedNaf = extensionData.naf || emp.ss_number || null;

      const result: MasterPrefillData = {
        national_id: emp.national_id,
        ss_number: emp.ss_number,
        position: emp.job_title,
        hire_date: emp.hire_date,
        base_salary: emp.base_salary ? Number(emp.base_salary) : null,
        weekly_hours: emp.weekly_hours ? Number(emp.weekly_hours) : null,
        country_code: emp.country_code,
        naf: resolvedNaf,
        contribution_group: extensionData.contribution_group || null,
        contract_type_rd: extensionData.contract_type_rd || null,
        collective_agreement: extensionData.collective_agreement || null,
        cno_code: extensionData.cno_code || null,
        ccc: extensionData.ccc || null,
        occupation_code: extensionData.occupation_code || null,
      };

      cacheRef.current = { key: cacheKey, data: result };
      setMasterData(result);
      return result;
    } catch (err) {
      console.error('[useEmployeeMasterPrefill] unexpected error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  // Auto-fetch on mount / employeeId change
  useEffect(() => {
    if (employeeId) {
      fetchMasterData();
    } else {
      setMasterData(null);
    }
  }, [employeeId, fetchMasterData]);

  /**
   * Build registration prefill map.
   * Only includes fields that have a value in master.
   * ES-specific fields only when country_code === 'ES'.
   */
  const getRegistrationPrefill = useCallback((): RegistrationPrefillMap => {
    if (!masterData) return { dni_nie: null, naf: null, ccc: null, contract_type_code: null, contribution_group: null, occupation_code: null, collective_agreement: null };
    
    const isES = masterData.country_code === 'ES';
    return {
      dni_nie: masterData.national_id,
      naf: isES ? masterData.naf : null,
      ccc: isES ? masterData.ccc : null,
      contract_type_code: isES ? masterData.contract_type_rd : null,
      contribution_group: isES ? masterData.contribution_group : null,
      occupation_code: isES ? (masterData.occupation_code || masterData.cno_code) : null,
      collective_agreement: isES ? masterData.collective_agreement : null,
    };
  }, [masterData]);

  /**
   * Build contract prefill map.
   */
  const getContractPrefill = useCallback((): ContractPrefillMap => {
    if (!masterData) return { dni_nie: null, naf: null, ccc: null, job_title: null, collective_agreement: null, weekly_hours: null, occupation_code: null };
    
    const isES = masterData.country_code === 'ES';
    return {
      dni_nie: masterData.national_id,
      naf: isES ? masterData.naf : null,
      ccc: isES ? masterData.ccc : null,
      job_title: masterData.position,
      collective_agreement: isES ? masterData.collective_agreement : null,
      weekly_hours: masterData.weekly_hours,
      occupation_code: isES ? (masterData.occupation_code || masterData.cno_code) : null,
    };
  }, [masterData]);

  /**
   * Additive merge: only fills empty/null fields in target.
   * Returns the merged object and the set of field keys that were prefilled.
   */
  const mergeAdditive = useCallback(<T extends Record<string, any>>(
    target: T,
    prefill: Record<string, any>
  ): { merged: T; prefilledKeys: PrefilledFieldSet } => {
    const merged = { ...target };
    const prefilledKeys: PrefilledFieldSet = new Set();

    for (const [key, value] of Object.entries(prefill)) {
      if (value != null && value !== '' && (merged[key] == null || merged[key] === '')) {
        (merged as any)[key] = value;
        prefilledKeys.add(key);
      }
    }

    return { merged, prefilledKeys };
  }, []);

  return {
    masterData,
    loading,
    fetchMasterData,
    getRegistrationPrefill,
    getContractPrefill,
    mergeAdditive,
  };
}

export default useEmployeeMasterPrefill;
