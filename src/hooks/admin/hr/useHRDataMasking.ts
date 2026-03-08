/**
 * useHRDataMasking — Field-level masking enforcement for sensitive HR data
 * Queries erp_hr_masking_rules and applies masking to salary/PII fields
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaskingRule {
  id: string;
  field_path: string;
  masking_strategy: string;
  classification_id: string;
  is_active: boolean;
}

interface MaskingConfig {
  rules: MaskingRule[];
  loaded: boolean;
}

export function useHRDataMasking(companyId: string | undefined) {
  const [config, setConfig] = useState<MaskingConfig>({ rules: [], loaded: false });

  useEffect(() => {
    if (!companyId) return;

    const fetchRules = async () => {
      try {
        const { data } = await supabase
          .from('erp_hr_masking_rules')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true);

        setConfig({ rules: (data as unknown as MaskingRule[]) || [], loaded: true });
      } catch {
        setConfig({ rules: [], loaded: true });
      }
    };

    fetchRules();
  }, [companyId]);

  const maskValue = useCallback((fieldName: string, value: unknown): string => {
    if (!config.loaded || value === null || value === undefined) return String(value ?? '');

    const rule = config.rules.find(r => r.field_path === fieldName);
    if (!rule) return String(value);

    const strValue = String(value);

    switch (rule.masking_strategy) {
      case 'full':
        return '●●●●●●';
      case 'partial':
        if (strValue.length <= 4) return '●●●●';
        return '●●●●' + strValue.slice(-4);
      case 'hash':
        return `[hash:${strValue.slice(0, 3)}...]`;
      case 'range':
        // For salary: show range instead of exact value
        const num = Number(value);
        if (!isNaN(num)) {
          const lower = Math.floor(num / 5000) * 5000;
          const upper = lower + 5000;
          return `${lower.toLocaleString()}-${upper.toLocaleString()}`;
        }
        return '●●●●●●';
      default:
        return '●●●●●●';
    }
  }, [config]);

  const shouldMask = useCallback((fieldName: string): boolean => {
    return config.rules.some(r => r.field_path === fieldName);
  }, [config]);

  const getMaskingLevel = useCallback((fieldName: string): string | null => {
    const rule = config.rules.find(r => r.field_path === fieldName);
    return rule?.classification_id || null;
  }, [config]);

  return {
    maskValue,
    shouldMask,
    getMaskingLevel,
    rulesLoaded: config.loaded,
    activeRules: config.rules.length,
  };
}

export default useHRDataMasking;
