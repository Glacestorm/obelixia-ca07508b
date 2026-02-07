/**
 * Hook para gestión de privacidad y clasificación de datos
 * Sistema Híbrido Universal - Fase 3
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// === INTERFACES ===
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ClassificationRule {
  id: string;
  company_id: string | null;
  workspace_id: string | null;
  rule_name: string;
  data_category: string;
  classification_level: DataClassification;
  can_send_external: boolean;
  anonymization_required: boolean;
  field_patterns: FieldPattern[];
  entity_types: string[];
  is_active: boolean;
  created_at: string;
}

export interface FieldPattern {
  pattern: string;
  type: 'regex' | 'exact' | 'contains';
  description?: string;
}

export interface ClassificationResult {
  level: DataClassification;
  matchedRules: string[];
  sensitiveFields: string[];
  canSendExternal: boolean;
  requiresAnonymization: boolean;
  blockedFields: string[];
}

export interface AnonymizationResult {
  originalData: Record<string, unknown>;
  anonymizedData: Record<string, unknown>;
  fieldsAnonymized: string[];
  fieldsBlocked: string[];
}

// === BUILT-IN PATTERNS ===
const BUILT_IN_PATTERNS: Record<string, RegExp> = {
  nif_nie: /^[XYZ]?\d{7,8}[A-Z]$/i,
  cif: /^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/i,
  iban: /^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/i,
  credit_card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone_spain: /^(\+34|0034|34)?[6789]\d{8}$/,
  phone_andorra: /^(\+376|00376|376)?[3678]\d{5}$/,
  salary_amount: /^(salario|sueldo|nómina|salary|wage)/i,
  bank_account: /^(cuenta|account|iban)/i,
};

// Helper to safely parse JSON fields
const parseJsonField = <T>(field: Json | null, defaultValue: T): T => {
  if (!field) return defaultValue;
  try {
    if (typeof field === 'object') return field as unknown as T;
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

// === HOOK ===
export function useDataPrivacyGateway() {
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastClassification, setLastClassification] = useState<ClassificationResult | null>(null);

  // === FETCH RULES ===
  const fetchRules = useCallback(async (companyId?: string, workspaceId?: string) => {
    setIsLoading(true);
    try {
      const client = supabase as any;
      let query = client
        .from('ai_data_classification_rules')
        .select('*')
        .eq('is_active', true)
        .order('classification_level', { ascending: false });

      if (companyId) {
        query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
      }
      if (workspaceId) {
        query = query.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: ClassificationRule[] = (data || []).map((r: any) => ({
        id: r.id,
        company_id: r.company_id,
        workspace_id: r.workspace_id,
        rule_name: r.rule_name,
        data_category: r.data_category,
        classification_level: r.classification_level as DataClassification,
        can_send_external: r.can_send_external ?? true,
        anonymization_required: r.anonymization_required ?? false,
        field_patterns: parseJsonField<FieldPattern[]>(r.field_patterns, []),
        entity_types: parseJsonField<string[]>(r.entity_types, []),
        is_active: r.is_active ?? true,
        created_at: r.created_at,
      }));

      setRules(mapped);
      return mapped;
    } catch (err) {
      console.error('[useDataPrivacyGateway] fetchRules error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CLASSIFY DATA ===
  const classifyData = useCallback((
    data: Record<string, unknown>,
    context?: { entityType?: string; module?: string }
  ): ClassificationResult => {
    let highestLevel: DataClassification = 'public';
    const matchedRules: string[] = [];
    const sensitiveFields: string[] = [];
    const blockedFields: string[] = [];
    let canSendExternal = true;
    let requiresAnonymization = false;

    const levelPriority: Record<DataClassification, number> = {
      public: 0,
      internal: 1,
      confidential: 2,
      restricted: 3,
    };

    const checkField = (key: string, value: unknown, path: string = key) => {
      if (value === null || value === undefined) return;

      const stringValue = String(value);

      for (const [patternName, regex] of Object.entries(BUILT_IN_PATTERNS)) {
        if (regex.test(stringValue) || regex.test(key.toLowerCase())) {
          const matchingRule = rules.find(r => 
            r.field_patterns.some(fp => 
              fp.pattern.toLowerCase().includes(patternName.split('_')[0])
            )
          );

          if (matchingRule) {
            if (levelPriority[matchingRule.classification_level] > levelPriority[highestLevel]) {
              highestLevel = matchingRule.classification_level;
            }
            matchedRules.push(matchingRule.rule_name);
            sensitiveFields.push(path);

            if (!matchingRule.can_send_external) {
              canSendExternal = false;
              blockedFields.push(path);
            }
            if (matchingRule.anonymization_required) {
              requiresAnonymization = true;
            }
          }
        }
      }

      for (const rule of rules) {
        if (context?.entityType && rule.entity_types.length > 0) {
          if (!rule.entity_types.includes(context.entityType)) continue;
        }

        for (const pattern of rule.field_patterns) {
          let matches = false;

          if (pattern.type === 'regex') {
            try {
              const regex = new RegExp(pattern.pattern, 'i');
              matches = regex.test(stringValue) || regex.test(key);
            } catch {
              matches = false;
            }
          } else if (pattern.type === 'exact') {
            matches = stringValue === pattern.pattern || key === pattern.pattern;
          } else if (pattern.type === 'contains') {
            matches = stringValue.toLowerCase().includes(pattern.pattern.toLowerCase()) ||
                      key.toLowerCase().includes(pattern.pattern.toLowerCase());
          }

          if (matches) {
            if (levelPriority[rule.classification_level] > levelPriority[highestLevel]) {
              highestLevel = rule.classification_level;
            }
            if (!matchedRules.includes(rule.rule_name)) {
              matchedRules.push(rule.rule_name);
            }
            if (!sensitiveFields.includes(path)) {
              sensitiveFields.push(path);
            }
            if (!rule.can_send_external) {
              canSendExternal = false;
              if (!blockedFields.includes(path)) {
                blockedFields.push(path);
              }
            }
            if (rule.anonymization_required) {
              requiresAnonymization = true;
            }
          }
        }
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          checkField(nestedKey, nestedValue, `${path}.${nestedKey}`);
        }
      }
    };

    for (const [key, value] of Object.entries(data)) {
      checkField(key, value);
    }

    const result: ClassificationResult = {
      level: highestLevel,
      matchedRules: [...new Set(matchedRules)],
      sensitiveFields: [...new Set(sensitiveFields)],
      canSendExternal,
      requiresAnonymization,
      blockedFields: [...new Set(blockedFields)],
    };

    setLastClassification(result);
    return result;
  }, [rules]);

  // === CAN SEND EXTERNAL ===
  const canSendExternal = useCallback((
    data: Record<string, unknown>,
    context?: { entityType?: string }
  ): boolean => {
    const classification = classifyData(data, context);
    return classification.canSendExternal;
  }, [classifyData]);

  // === SANITIZE FOR EXTERNAL ===
  const sanitizeForExternal = useCallback((
    data: Record<string, unknown>,
    options?: { 
      removeBlocked?: boolean;
      anonymize?: boolean;
    }
  ): AnonymizationResult => {
    const classification = classifyData(data);
    const anonymizedData = JSON.parse(JSON.stringify(data));
    const fieldsAnonymized: string[] = [];
    const fieldsBlocked: string[] = [];

    const processField = (obj: Record<string, unknown>, path: string[] = []) => {
      for (const key of Object.keys(obj)) {
        const fullPath = [...path, key].join('.');
        const value = obj[key];

        if (classification.blockedFields.includes(fullPath)) {
          if (options?.removeBlocked) {
            delete obj[key];
            fieldsBlocked.push(fullPath);
          } else {
            obj[key] = '[BLOCKED]';
            fieldsBlocked.push(fullPath);
          }
        } else if (classification.sensitiveFields.includes(fullPath) && options?.anonymize) {
          if (typeof value === 'string') {
            if (BUILT_IN_PATTERNS.email.test(value)) {
              obj[key] = value.replace(/(.{2}).*@/, '$1***@');
            } else if (BUILT_IN_PATTERNS.phone_spain.test(value) || BUILT_IN_PATTERNS.phone_andorra.test(value)) {
              obj[key] = value.slice(0, 3) + '****' + value.slice(-2);
            } else if (value.length > 4) {
              obj[key] = value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
            } else {
              obj[key] = '****';
            }
            fieldsAnonymized.push(fullPath);
          } else if (typeof value === 'number') {
            obj[key] = 0;
            fieldsAnonymized.push(fullPath);
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processField(value as Record<string, unknown>, [...path, key]);
        }
      }
    };

    processField(anonymizedData);

    return {
      originalData: data,
      anonymizedData,
      fieldsAnonymized,
      fieldsBlocked,
    };
  }, [classifyData]);

  // === CREATE RULE ===
  const createRule = useCallback(async (
    rule: Omit<ClassificationRule, 'id' | 'created_at'>
  ): Promise<ClassificationRule | null> => {
    try {
      const client = supabase as any;
      const { data, error } = await client
        .from('ai_data_classification_rules')
        .insert({
          company_id: rule.company_id,
          workspace_id: rule.workspace_id,
          rule_name: rule.rule_name,
          data_category: rule.data_category,
          classification_level: rule.classification_level,
          can_send_external: rule.can_send_external,
          anonymization_required: rule.anonymization_required,
          field_patterns: rule.field_patterns,
          entity_types: rule.entity_types,
          is_active: rule.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Regla de clasificación creada');
      await fetchRules(rule.company_id || undefined, rule.workspace_id || undefined);
      
      return {
        id: data.id,
        company_id: data.company_id,
        workspace_id: data.workspace_id,
        rule_name: data.rule_name,
        data_category: data.data_category,
        classification_level: data.classification_level as DataClassification,
        can_send_external: data.can_send_external ?? true,
        anonymization_required: data.anonymization_required ?? false,
        field_patterns: parseJsonField<FieldPattern[]>(data.field_patterns, []),
        entity_types: parseJsonField<string[]>(data.entity_types, []),
        is_active: data.is_active ?? true,
        created_at: data.created_at,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating rule';
      toast.error(message);
      return null;
    }
  }, [fetchRules]);

  // === UPDATE RULE ===
  const updateRule = useCallback(async (
    ruleId: string,
    updates: Partial<ClassificationRule>
  ): Promise<boolean> => {
    try {
      const client = supabase as any;
      const { error } = await client
        .from('ai_data_classification_rules')
        .update({
          rule_name: updates.rule_name,
          data_category: updates.data_category,
          classification_level: updates.classification_level,
          can_send_external: updates.can_send_external,
          anonymization_required: updates.anonymization_required,
          field_patterns: updates.field_patterns,
          entity_types: updates.entity_types,
          is_active: updates.is_active,
        })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.map(r => 
        r.id === ruleId ? { ...r, ...updates } : r
      ));
      
      toast.success('Regla actualizada');
      return true;
    } catch (err) {
      toast.error('Error al actualizar regla');
      return false;
    }
  }, []);

  // === DELETE RULE ===
  const deleteRule = useCallback(async (ruleId: string): Promise<boolean> => {
    try {
      const client = supabase as any;
      const { error } = await client
        .from('ai_data_classification_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success('Regla eliminada');
      return true;
    } catch (err) {
      toast.error('Error al eliminar regla');
      return false;
    }
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    isLoading,
    lastClassification,
    classifyData,
    canSendExternal,
    sanitizeForExternal,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
  };
}

export default useDataPrivacyGateway;
