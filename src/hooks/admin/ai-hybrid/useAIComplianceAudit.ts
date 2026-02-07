/**
 * useAIComplianceAudit - Logs detallados para GDPR/regulaciones
 * Sistema de auditoría para cumplimiento normativo
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DataClassification } from './useDataPrivacyGateway';

// === INTERFACES ===
export type AuditEventType = 
  | 'data_access'
  | 'data_classification'
  | 'data_anonymization'
  | 'data_blocked'
  | 'ai_request'
  | 'ai_response'
  | 'provider_switch'
  | 'credential_access'
  | 'config_change'
  | 'export_request'
  | 'deletion_request';

export type ComplianceFramework = 'gdpr' | 'ccpa' | 'hipaa' | 'apda' | 'lopdgdd' | 'dora';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  entityType?: string;
  entityId?: string;
  action: string;
  details: Record<string, unknown>;
  dataClassification?: DataClassification;
  ipAddress?: string;
  userAgent?: string;
  complianceFlags: ComplianceFramework[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  wasBlocked: boolean;
  metadata?: Record<string, unknown>;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  userId?: string;
  entityType?: string;
  riskLevel?: AuditEvent['riskLevel'][];
  complianceFramework?: ComplianceFramework;
  wasBlocked?: boolean;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  period: { start: Date; end: Date };
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  riskBreakdown: Record<string, number>;
  blockedRequests: number;
  dataAccessEvents: number;
  anonymizationEvents: number;
  violations: AuditEvent[];
  recommendations: string[];
  generatedAt: Date;
}

export interface AuditConfig {
  enableRealTimeLogging: boolean;
  retentionDays: number;
  enabledFrameworks: ComplianceFramework[];
  alertOnHighRisk: boolean;
  alertRecipients: string[];
  exportFormat: 'json' | 'csv' | 'pdf';
}

const DEFAULT_CONFIG: AuditConfig = {
  enableRealTimeLogging: true,
  retentionDays: 365 * 2, // 2 years for GDPR
  enabledFrameworks: ['gdpr', 'lopdgdd', 'apda'],
  alertOnHighRisk: true,
  alertRecipients: [],
  exportFormat: 'json',
};

// === COMPLIANCE RULES ===
const COMPLIANCE_RULES: Record<ComplianceFramework, {
  name: string;
  dataRetentionDays: number;
  requiresAnonymization: DataClassification[];
  blockExternal: DataClassification[];
}> = {
  gdpr: {
    name: 'GDPR (EU)',
    dataRetentionDays: 730, // 2 years
    requiresAnonymization: ['confidential', 'restricted'],
    blockExternal: ['restricted'],
  },
  ccpa: {
    name: 'CCPA (California)',
    dataRetentionDays: 365,
    requiresAnonymization: ['confidential', 'restricted'],
    blockExternal: ['restricted'],
  },
  hipaa: {
    name: 'HIPAA (Healthcare)',
    dataRetentionDays: 2190, // 6 years
    requiresAnonymization: ['internal', 'confidential', 'restricted'],
    blockExternal: ['confidential', 'restricted'],
  },
  apda: {
    name: 'APDA (Andorra)',
    dataRetentionDays: 730,
    requiresAnonymization: ['confidential', 'restricted'],
    blockExternal: ['restricted'],
  },
  lopdgdd: {
    name: 'LOPDGDD (Spain)',
    dataRetentionDays: 730,
    requiresAnonymization: ['confidential', 'restricted'],
    blockExternal: ['restricted'],
  },
  dora: {
    name: 'DORA (EU Digital)',
    dataRetentionDays: 1825, // 5 years
    requiresAnonymization: ['confidential', 'restricted'],
    blockExternal: ['confidential', 'restricted'],
  },
};

// === HOOK ===
export function useAIComplianceAudit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [config, setConfig] = useState<AuditConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  // === LOG EVENT ===
  const logEvent = useCallback(async (
    eventType: AuditEventType,
    action: string,
    details: Record<string, unknown>,
    options?: {
      entityType?: string;
      entityId?: string;
      dataClassification?: DataClassification;
      wasBlocked?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<AuditEvent | null> => {
    if (!config.enableRealTimeLogging) return null;

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();

      // Determine risk level
      let riskLevel: AuditEvent['riskLevel'] = 'low';
      if (options?.wasBlocked) riskLevel = 'high';
      else if (options?.dataClassification === 'restricted') riskLevel = 'critical';
      else if (options?.dataClassification === 'confidential') riskLevel = 'medium';
      else if (eventType === 'data_blocked' || eventType === 'deletion_request') riskLevel = 'high';

      // Determine compliance flags
      const complianceFlags: ComplianceFramework[] = [];
      for (const framework of config.enabledFrameworks) {
        const rules = COMPLIANCE_RULES[framework];
        if (options?.dataClassification) {
          if (rules.requiresAnonymization.includes(options.dataClassification) ||
              rules.blockExternal.includes(options.dataClassification)) {
            complianceFlags.push(framework);
          }
        }
      }

      const event: AuditEvent = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType,
        userId: user?.id,
        userEmail: user?.email,
        entityType: options?.entityType,
        entityId: options?.entityId,
        action,
        details,
        dataClassification: options?.dataClassification,
        ipAddress: undefined, // Would need server-side to get real IP
        userAgent: navigator.userAgent,
        complianceFlags,
        riskLevel,
        wasBlocked: options?.wasBlocked || false,
        metadata: options?.metadata,
      };

      // Store in database
      const client = supabase as any;
      await client
        .from('ai_audit_logs')
        .insert({
          event_type: eventType,
          user_id: event.userId,
          user_email: event.userEmail,
          entity_type: event.entityType,
          entity_id: event.entityId,
          action: event.action,
          details: event.details,
          data_classification: event.dataClassification,
          user_agent: event.userAgent,
          compliance_flags: event.complianceFlags,
          risk_level: event.riskLevel,
          was_blocked: event.wasBlocked,
          metadata: event.metadata,
        });

      // Update local state
      setEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100

      // Alert on high risk
      if (config.alertOnHighRisk && (riskLevel === 'high' || riskLevel === 'critical')) {
        toast.warning(`Evento de alto riesgo registrado: ${action}`);
      }

      return event;
    } catch (err) {
      console.error('[useAIComplianceAudit] logEvent error:', err);
      return null;
    }
  }, [config]);

  // === FETCH EVENTS ===
  const fetchEvents = useCallback(async (filter?: AuditFilter): Promise<AuditEvent[]> => {
    setIsLoading(true);
    try {
      const client = supabase as any;
      let query = client
        .from('ai_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filter?.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString());
      }
      if (filter?.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString());
      }
      if (filter?.eventTypes?.length) {
        query = query.in('event_type', filter.eventTypes);
      }
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter?.entityType) {
        query = query.eq('entity_type', filter.entityType);
      }
      if (filter?.riskLevel?.length) {
        query = query.in('risk_level', filter.riskLevel);
      }
      if (filter?.wasBlocked !== undefined) {
        query = query.eq('was_blocked', filter.wasBlocked);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: AuditEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        timestamp: new Date(e.created_at),
        eventType: e.event_type as AuditEventType,
        userId: e.user_id,
        userEmail: e.user_email,
        entityType: e.entity_type,
        entityId: e.entity_id,
        action: e.action,
        details: e.details || {},
        dataClassification: e.data_classification as DataClassification,
        ipAddress: e.ip_address,
        userAgent: e.user_agent,
        complianceFlags: e.compliance_flags || [],
        riskLevel: e.risk_level as AuditEvent['riskLevel'],
        wasBlocked: e.was_blocked || false,
        metadata: e.metadata,
      }));

      setEvents(mapped);
      return mapped;
    } catch (err) {
      console.error('[useAIComplianceAudit] fetchEvents error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE COMPLIANCE REPORT ===
  const generateReport = useCallback(async (
    framework: ComplianceFramework,
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> => {
    const allEvents = await fetchEvents({
      startDate: period.start,
      endDate: period.end,
    });

    const frameworkEvents = allEvents.filter(e => 
      e.complianceFlags.includes(framework)
    );

    const eventsByType: Record<AuditEventType, number> = {} as any;
    const riskBreakdown: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const event of frameworkEvents) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      riskBreakdown[event.riskLevel]++;
    }

    const violations = frameworkEvents.filter(e => 
      e.riskLevel === 'high' || e.riskLevel === 'critical'
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskBreakdown.critical > 0) {
      recommendations.push('Revisar urgentemente los eventos críticos de seguridad');
    }
    if (riskBreakdown.high > 5) {
      recommendations.push('Considerar reforzar las políticas de clasificación de datos');
    }
    const blockedCount = frameworkEvents.filter(e => e.wasBlocked).length;
    if (blockedCount > frameworkEvents.length * 0.1) {
      recommendations.push('Alto porcentaje de solicitudes bloqueadas - revisar reglas');
    }

    return {
      framework,
      period,
      totalEvents: frameworkEvents.length,
      eventsByType,
      riskBreakdown,
      blockedRequests: blockedCount,
      dataAccessEvents: eventsByType.data_access || 0,
      anonymizationEvents: eventsByType.data_anonymization || 0,
      violations,
      recommendations,
      generatedAt: new Date(),
    };
  }, [fetchEvents]);

  // === EXPORT AUDIT LOG ===
  const exportAuditLog = useCallback(async (
    filter?: AuditFilter,
    format?: 'json' | 'csv'
  ): Promise<string> => {
    const exportEvents = await fetchEvents(filter);
    const exportFormat = format || config.exportFormat;

    await logEvent('export_request', 'Exportación de log de auditoría', {
      eventCount: exportEvents.length,
      format: exportFormat,
      filter,
    });

    if (exportFormat === 'csv') {
      const headers = [
        'ID', 'Timestamp', 'Event Type', 'User Email', 'Action',
        'Data Classification', 'Risk Level', 'Was Blocked', 'Compliance Flags'
      ];
      const rows = exportEvents.map(e => [
        e.id,
        e.timestamp.toISOString(),
        e.eventType,
        e.userEmail || '',
        e.action,
        e.dataClassification || '',
        e.riskLevel,
        e.wasBlocked ? 'Yes' : 'No',
        e.complianceFlags.join(';'),
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return JSON.stringify(exportEvents, null, 2);
  }, [fetchEvents, config.exportFormat, logEvent]);

  // === CHECK COMPLIANCE ===
  const checkCompliance = useCallback((
    dataClassification: DataClassification,
    isExternalRequest: boolean
  ): { compliant: boolean; violations: string[]; frameworks: ComplianceFramework[] } => {
    const violations: string[] = [];
    const affectedFrameworks: ComplianceFramework[] = [];

    for (const framework of config.enabledFrameworks) {
      const rules = COMPLIANCE_RULES[framework];

      if (isExternalRequest && rules.blockExternal.includes(dataClassification)) {
        violations.push(`${rules.name}: Datos ${dataClassification} no pueden enviarse externamente`);
        affectedFrameworks.push(framework);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      frameworks: affectedFrameworks,
    };
  }, [config.enabledFrameworks]);

  // === UPDATE CONFIG ===
  const updateConfig = useCallback((updates: Partial<AuditConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...updates };
      
      // Log config change
      logEvent('config_change', 'Configuración de auditoría actualizada', {
        changes: updates,
      });
      
      return updated;
    });
  }, [logEvent]);

  // === GET COMPLIANCE RULES ===
  const getComplianceRules = useCallback((framework: ComplianceFramework) => {
    return COMPLIANCE_RULES[framework];
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchEvents({ startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) }); // Last 24h
  }, [fetchEvents]);

  return {
    // State
    events,
    isLoading,

    // Actions
    logEvent,
    fetchEvents,
    generateReport,
    exportAuditLog,
    checkCompliance,

    // Config
    config,
    updateConfig,
    getComplianceRules,

    // Constants
    COMPLIANCE_RULES,
  };
}

export default useAIComplianceAudit;
