/**
 * useHRDomainCertificates — V2-ES.8 Tramo 3
 * Hook for managing domain certificate configurations per company.
 * 
 * IMPORTANT: This manages certificate METADATA only.
 * - cert_loaded_placeholder ≠ firma real activa
 * - cert_ready_preparatory ≠ envío real habilitado
 * - No cryptographic material is stored
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/security/auditLogger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CertificateDomain = 'tgss_siltra' | 'contrata_sepe' | 'aeat';

export type CertificateType =
  | 'fnmt_software'
  | 'fnmt_representante'
  | 'sede_electronica'
  | 'clave_pin'
  | 'not_specified'
  | 'other';

export type CertificateStatus =
  | 'not_configured'
  | 'partially_configured'
  | 'configured_without_cert'
  | 'cert_loaded_placeholder'
  | 'cert_ready_preparatory'
  | 'expired'
  | 'invalid';

export type CertificateEnvironment = 'sandbox' | 'pre_production' | 'production';

export type CertificateReadinessImpact = 'blocker' | 'warning' | 'info';

export interface DomainCertificate {
  id: string;
  company_id: string;
  domain: CertificateDomain;
  certificate_type: CertificateType;
  certificate_label: string | null;
  certificate_status: CertificateStatus;
  environment: CertificateEnvironment;
  expiration_date: string | null;
  serial_number_hash: string | null;
  issuer_info: Record<string, unknown>;
  configuration_completeness: number;
  readiness_impact: CertificateReadinessImpact;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateFormData {
  domain: CertificateDomain;
  certificate_type?: CertificateType;
  certificate_label?: string;
  certificate_status?: CertificateStatus;
  environment?: CertificateEnvironment;
  expiration_date?: string | null;
  issuer_info?: Record<string, unknown>;
  notes?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const DOMAIN_LABELS: Record<CertificateDomain, string> = {
  tgss_siltra: 'TGSS / SILTRA',
  contrata_sepe: 'Contrat@ / SEPE',
  aeat: 'AEAT',
};

export const STATUS_LABELS: Record<CertificateStatus, string> = {
  not_configured: 'No configurado',
  partially_configured: 'Parcialmente configurado',
  configured_without_cert: 'Configurado sin certificado',
  cert_loaded_placeholder: 'Certificado cargado (placeholder)',
  cert_ready_preparatory: 'Preparatorio — NO es firma real',
  expired: 'Expirado',
  invalid: 'Inválido',
};

export const TYPE_LABELS: Record<CertificateType, string> = {
  fnmt_software: 'FNMT Software',
  fnmt_representante: 'FNMT Representante',
  sede_electronica: 'Sede Electrónica',
  clave_pin: 'Cl@ve PIN',
  not_specified: 'No especificado',
  other: 'Otro',
};

export const ENVIRONMENT_LABELS: Record<CertificateEnvironment, string> = {
  sandbox: 'Sandbox (pruebas)',
  pre_production: 'Pre-producción',
  production: 'Producción',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute configuration completeness based on filled fields */
export function computeCompleteness(cert: Partial<DomainCertificate> | CertificateFormData): number {
  let score = 0;
  const max = 7;

  if (cert.domain) score++;
  if (cert.certificate_type && cert.certificate_type !== 'not_specified') score++;
  if (cert.certificate_label) score++;
  if (cert.certificate_status && cert.certificate_status !== 'not_configured') score++;
  if (cert.environment) score++;
  if (cert.expiration_date) score++;
  if (cert.issuer_info && Object.keys(cert.issuer_info).length > 0) score++;

  return Math.round((score / max) * 100);
}

/** Check if certificate is expiring soon (within 30 days) */
export function isCertificateExpiringSoon(cert: DomainCertificate): boolean {
  if (!cert.expiration_date) return false;
  const expDate = new Date(cert.expiration_date);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

/** Check if certificate is expired */
export function isCertificateExpired(cert: DomainCertificate): boolean {
  if (!cert.expiration_date) return false;
  return new Date(cert.expiration_date) < new Date();
}

/** Compute readiness impact based on status */
export function computeReadinessImpact(status: CertificateStatus): CertificateReadinessImpact {
  switch (status) {
    case 'not_configured':
    case 'invalid':
    case 'expired':
      return 'blocker';
    case 'partially_configured':
    case 'configured_without_cert':
      return 'warning';
    case 'cert_loaded_placeholder':
    case 'cert_ready_preparatory':
      return 'info';
    default:
      return 'warning';
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseHRDomainCertificatesReturn {
  certificates: DomainCertificate[];
  isLoading: boolean;
  error: string | null;
  fetchCertificates: () => Promise<DomainCertificate[]>;
  getCertificateByDomain: (domain: CertificateDomain) => DomainCertificate | undefined;
  upsertCertificate: (data: CertificateFormData) => Promise<DomainCertificate | null>;
  updateStatus: (id: string, status: CertificateStatus) => Promise<boolean>;
  /** Summary for readiness integration */
  getCertificateSummary: () => CertificateSummary;
}

export interface CertificateSummary {
  totalDomains: number;
  configured: number;
  readyForDryRun: number;
  expired: number;
  blockers: string[];
  warnings: string[];
  overallStatus: 'none' | 'partial' | 'ready_preparatory';
}

export function useHRDomainCertificates(companyId: string): UseHRDomainCertificatesReturn {
  const [certificates, setCertificates] = useState<DomainCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = useCallback(async (): Promise<DomainCertificate[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('erp_hr_domain_certificates')
        .select('*')
        .eq('company_id', companyId)
        .order('domain');

      if (fetchErr) throw fetchErr;
      const certs = (data || []) as unknown as DomainCertificate[];
      setCertificates(certs);
      return certs;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar certificados';
      setError(msg);
      console.error('[useHRDomainCertificates] fetch error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const getCertificateByDomain = useCallback(
    (domain: CertificateDomain) => certificates.find(c => c.domain === domain),
    [certificates]
  );

  const upsertCertificate = useCallback(async (data: CertificateFormData): Promise<DomainCertificate | null> => {
    try {
      const completeness = computeCompleteness(data);
      const impact = computeReadinessImpact(data.certificate_status || 'not_configured');

      const record = {
        company_id: companyId,
        domain: data.domain,
        certificate_type: data.certificate_type || 'not_specified',
        certificate_label: data.certificate_label || null,
        certificate_status: data.certificate_status || 'not_configured',
        environment: data.environment || 'sandbox',
        expiration_date: data.expiration_date || null,
        issuer_info: data.issuer_info || {},
        configuration_completeness: completeness,
        readiness_impact: impact,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error: upsertErr } = await supabase
        .from('erp_hr_domain_certificates')
        .upsert([record] as any, { onConflict: 'company_id,domain' }) // issuer_info: Record→Json boundary
        .select()
        .single();

      if (upsertErr) throw upsertErr;

      const cert = result as unknown as DomainCertificate;

      // Update local state
      setCertificates(prev => {
        const idx = prev.findIndex(c => c.domain === data.domain);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = cert;
          return updated;
        }
        return [...prev, cert];
      });

      // Audit
      await logAuditEvent({
        action: 'certificate_configured',
        tableName: 'erp_hr_domain_certificates',
        recordId: cert.id,
        category: 'compliance',
        severity: 'info',
        newData: {
          domain: data.domain,
          status: data.certificate_status,
          environment: data.environment,
          completeness,
          disclaimer: 'Configuración preparatoria — NO activa firma real',
        },
      });

      toast.success(`Certificado ${DOMAIN_LABELS[data.domain]} configurado`);
      return cert;
    } catch (err) {
      console.error('[useHRDomainCertificates] upsert error:', err);
      toast.error('Error al guardar configuración de certificado');
      return null;
    }
  }, [companyId]);

  const updateStatus = useCallback(async (id: string, status: CertificateStatus): Promise<boolean> => {
    try {
      const impact = computeReadinessImpact(status);

      const { error: updateErr } = await supabase
        .from('erp_hr_domain_certificates')
        .update({
          certificate_status: status,
          readiness_impact: impact,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      setCertificates(prev =>
        prev.map(c => c.id === id ? { ...c, certificate_status: status, readiness_impact: impact } : c)
      );

      await logAuditEvent({
        action: status === 'expired' ? 'certificate_expired' : 'certificate_status_changed',
        tableName: 'erp_hr_domain_certificates',
        recordId: id,
        category: 'compliance',
        severity: status === 'expired' || status === 'invalid' ? 'warning' : 'info',
        newData: { status, impact },
      });

      return true;
    } catch (err) {
      console.error('[useHRDomainCertificates] updateStatus error:', err);
      toast.error('Error al actualizar estado del certificado');
      return false;
    }
  }, []);

  const getCertificateSummary = useCallback((): CertificateSummary => {
    const allDomains: CertificateDomain[] = ['tgss_siltra', 'contrata_sepe', 'aeat'];
    const blockers: string[] = [];
    const warnings: string[] = [];

    let configured = 0;
    let readyForDryRun = 0;
    let expired = 0;

    for (const domain of allDomains) {
      const cert = certificates.find(c => c.domain === domain);
      if (!cert || cert.certificate_status === 'not_configured') {
        blockers.push(`${DOMAIN_LABELS[domain]}: sin configurar`);
        continue;
      }

      if (cert.certificate_status === 'expired') {
        expired++;
        blockers.push(`${DOMAIN_LABELS[domain]}: certificado expirado`);
        continue;
      }

      if (cert.certificate_status === 'invalid') {
        blockers.push(`${DOMAIN_LABELS[domain]}: certificado inválido`);
        continue;
      }

      configured++;

      if (cert.certificate_status === 'cert_ready_preparatory' || cert.certificate_status === 'cert_loaded_placeholder') {
        readyForDryRun++;
      }

      if (cert.certificate_status === 'partially_configured') {
        warnings.push(`${DOMAIN_LABELS[domain]}: configuración parcial`);
      }

      if (cert.certificate_status === 'configured_without_cert') {
        warnings.push(`${DOMAIN_LABELS[domain]}: sin certificado cargado`);
      }

      if (isCertificateExpiringSoon(cert)) {
        warnings.push(`${DOMAIN_LABELS[domain]}: certificado próximo a expirar`);
      }
    }

    const overallStatus: CertificateSummary['overallStatus'] =
      readyForDryRun >= allDomains.length ? 'ready_preparatory'
      : configured > 0 ? 'partial'
      : 'none';

    return {
      totalDomains: allDomains.length,
      configured,
      readyForDryRun,
      expired,
      blockers,
      warnings,
      overallStatus,
    };
  }, [certificates]);

  return {
    certificates,
    isLoading,
    error,
    fetchCertificates,
    getCertificateByDomain,
    upsertCertificate,
    updateStatus,
    getCertificateSummary,
  };
}
