/**
 * contrataArtifactStatusEngine — Status lifecycle for Contrat@ artifacts
 * V2-RRHH-P1.2: Mirrors AFI_STATUS_META pattern from afiArtifactEngine.ts
 *
 * NO Supabase, NO React — pure functions only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContrataArtifactStatus =
  | 'generated'
  | 'validated_internal'
  | 'dry_run_ready'
  | 'pending_approval'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'archived'
  | 'error';

export interface ContrataStatusMeta {
  label: string;
  description: string;
  color: string;
  disclaimer: string;
}

// ─── Safety invariant ────────────────────────────────────────────────────────

export function isRealSubmissionBlocked(): boolean {
  return true; // V2-ES.8: Real SEPE/Contrat@ submission always blocked
}

// ─── Status metadata ─────────────────────────────────────────────────────────

export const CONTRATA_STATUS_META: Record<ContrataArtifactStatus, ContrataStatusMeta> = {
  generated: {
    label: 'Generado',
    description: 'Payload Contrat@ generado internamente.',
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    disclaimer: 'Generado internamente. No constituye comunicación oficial al SEPE.',
  },
  validated_internal: {
    label: 'Validado internamente',
    description: 'Payload validado contra reglas de formato y consistencia.',
    color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
    disclaimer: 'Validación interna. No equivale a validación oficial del SEPE.',
  },
  dry_run_ready: {
    label: 'Dry-run listo',
    description: 'Listo para simulación de envío (sin transmisión real).',
    color: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
    disclaimer: 'Preparado para simulación interna. Sin transmisión al SEPE.',
  },
  pending_approval: {
    label: 'Pendiente aprobación',
    description: 'Requiere aprobación del responsable antes de avanzar.',
    color: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    disclaimer: 'Pendiente de aprobación interna. No se ha comunicado al SEPE.',
  },
  sent: {
    label: 'Enviado (preparatorio)',
    description: 'Marcado como enviado. En entorno preparatorio, esto es un marcaje manual.',
    color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
    disclaimer: isRealSubmissionBlocked()
      ? '⚠️ SIMULACIÓN: Marcado como enviado internamente. No hay conector real al SEPE.'
      : 'Enviado al SEPE vía Contrat@.',
  },
  accepted: {
    label: 'Aceptado por SEPE',
    description: 'Respuesta positiva del SEPE registrada.',
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    disclaimer: 'Comunicación aceptada por el SEPE.',
  },
  rejected: {
    label: 'Rechazado por SEPE',
    description: 'Respuesta negativa del SEPE registrada.',
    color: 'bg-red-500/10 text-red-700 border-red-500/30',
    disclaimer: 'Comunicación rechazada por el SEPE. Requiere corrección y reenvío.',
  },
  archived: {
    label: 'Archivado',
    description: 'Artefacto cerrado y archivado.',
    color: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
    disclaimer: 'Artefacto archivado. No permite modificaciones.',
  },
  error: {
    label: 'Error en validación',
    description: 'El artefacto contiene errores que impiden su procesamiento.',
    color: 'bg-destructive/10 text-destructive',
    disclaimer: 'El artefacto contiene errores que impiden su procesamiento.',
  },
};

// ─── Valid transitions ───────────────────────────────────────────────────────

const CONTRATA_STATUS_TRANSITIONS: Record<ContrataArtifactStatus, ContrataArtifactStatus[]> = {
  generated: ['validated_internal', 'error'],
  validated_internal: ['dry_run_ready', 'error', 'generated'],
  dry_run_ready: ['pending_approval', 'error', 'validated_internal'],
  pending_approval: ['sent', 'dry_run_ready', 'error'],
  sent: ['accepted', 'rejected'],
  accepted: ['archived'],
  rejected: ['generated'], // allows re-generation after rejection
  archived: [],
  error: ['generated'],
};

// ─── Promotion ───────────────────────────────────────────────────────────────

export function promoteContrataStatus(
  current: ContrataArtifactStatus,
  target: ContrataArtifactStatus,
): { allowed: boolean; error: string | null } {
  const allowed = CONTRATA_STATUS_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    return {
      allowed: false,
      error: `Transición no válida: ${current} → ${target}. Permitidas: ${(allowed ?? []).join(', ')}`,
    };
  }

  // Block real send
  if (target === 'sent' && isRealSubmissionBlocked()) {
    return {
      allowed: true,
      error: null,
      // Note: allowed but marked as preparatory — caller must show disclaimer
    };
  }

  return { allowed: true, error: null };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const CONTRATA_STATUS_LABELS: Record<ContrataArtifactStatus, string> = Object.fromEntries(
  Object.entries(CONTRATA_STATUS_META).map(([k, v]) => [k, v.label]),
) as Record<ContrataArtifactStatus, string>;
