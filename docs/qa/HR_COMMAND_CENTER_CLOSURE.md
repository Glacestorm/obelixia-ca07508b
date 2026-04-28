# HR Command Center — Closure Document

**Estado:** Construido, oculto por defecto (flag OFF).
**Versión:** Fase 1 → 4A cerradas.
**Última suite HR:** 103/103 verde.
**Auditoría HR Security:** GREEN (S6/S7/S8).

---

## 1. Resumen ejecutivo

- HR Command Center queda construido y consolidado pero **oculto por defecto**.
- Es **single-tenant ejecutivo**, orientado a cierre mensual y readiness interno.
- Es **read-only**: no escribe, no orquesta envíos oficiales, no toca ledger.
- **No sustituye dashboards existentes** (`HRExecutiveDashboard`, `HRDashboardPanel`).
- **No es visible para clientes finales** mientras `HR_COMMAND_CENTER_ENABLED === false`.
- **No ejecuta hooks pesados con flag OFF** (lazy import condicional, `useHRCommandCenter` no se invoca).
- No constituye certificación jurídica, regulatoria ni presentación oficial.

---

## 2. Inventario de archivos

### Componentes (UI)
- `src/components/erp/hr/command-center/HRCommandCenterPanel.tsx`
- `src/components/erp/hr/command-center/HRCCExecutiveKPIsHeader.tsx`
- `src/components/erp/hr/command-center/HRCCGlobalStateCard.tsx`
- `src/components/erp/hr/command-center/HRCCPayrollReadinessCard.tsx`
- `src/components/erp/hr/command-center/HRCCDocumentaryCard.tsx`
- `src/components/erp/hr/command-center/HRCCLegalComplianceCard.tsx`
- `src/components/erp/hr/command-center/HRCCVPTReadinessCard.tsx`
- `src/components/erp/hr/command-center/HRCCOfficialIntegrationsCard.tsx`
- `src/components/erp/hr/command-center/HRCCAlertsAndBlockersCard.tsx`
- `src/components/erp/hr/command-center/index.ts`
- `src/components/erp/hr/command-center/featureFlag.ts`

### Hooks (lógica pura, read-only)
- `src/hooks/erp/hr/useHRCommandCenter.ts`
- `src/hooks/erp/hr/useOfficialIntegrationsSnapshot.ts`
- `src/hooks/erp/hr/hrCommandCenterAlerts.ts`

### Mount
- `src/components/erp/hr/HRExecutiveDashboard.tsx` (lazy import condicional al final del render).

### Tests
- `src/__tests__/hr/command-center-render.test.tsx`
- `src/__tests__/hr/command-center-vpt-disclaimer.test.tsx`
- `src/__tests__/hr/command-center-legal-readiness.test.tsx`
- `src/__tests__/hr/command-center-officials-states.test.tsx`
- `src/__tests__/hr/command-center-alerts-actions.test.tsx`
- `src/__tests__/hr/command-center-global-readiness.test.tsx`
- `src/__tests__/hr/command-center-mount-flag.test.tsx`
- Resto de la suite HR (`src/__tests__/hr/*`).

---

## 3. Estado funcional por fase

| Fase | Alcance | Estado |
|---|---|---|
| **Fase 1** | Layout + KPIs ejecutivos + Global / Payroll / Documental | Cerrada |
| **Fase 2A** | VPT/S9 real, score capado a 80, `internal_ready` permanente, disclaimer no-oficial | Cerrada |
| **Fase 2B** | Legal/Compliance real, lectura interna, sin certificación jurídica | Cerrada |
| **Fase 2C** | Integraciones oficiales read-only, degradación estricta sin evidencia/respuesta/certificado | Cerrada |
| **Fase 3** | Alertas, blockers, top 5 riesgos y top 5 acciones (round-robin por fuente) | Cerrada |
| **Fase 4A** | Mount oculto en `HRExecutiveDashboard` tras flag estático OFF + lazy import | Cerrada |

---

## 4. Garantías de seguridad

- Sin `service_role` en cliente. Toda lectura usa el cliente JWT del usuario.
- **Sin nuevas edge functions.**
- **Sin nuevas migraciones.**
- **Sin RLS modificada.**
- **Sin escrituras** a tablas (no `insert`/`update`/`delete`).
- **Sin ledger writes.**
- **Sin llamadas** a `useOfficialReadinessMatrix.evaluate()`.
- **Sin orquestación** de `useTGSSReadiness` ni `useContrataReadiness`.
- `persisted_priority_apply` permanece **OFF**.
- C3B3C2 permanece **BLOQUEADA**.
- `isRealSubmissionBlocked() === true` se mantiene en todo el dominio HR.

---

## 5. Garantías legales

- **VPT/S9** = `internal_ready`, herramienta interna de soporte. **No** constituye certificación oficial regulatoria.
- **Legal/Compliance** = lectura interna. Requiere revisión laboral/legal humana antes de cualquier uso externo.
- **Integraciones oficiales** = readiness interno. **No** equivale a presentación oficial sin credencial productiva, envío/UAT, respuesta oficial y evidencia archivada.
- Estados `accepted` / `submitted` / `official_ready` **no se elevan** sin evidencia/respuesta/certificado real.
- Acciones legales u oficiales del top de acciones **requieren revisión humana** (badge HITL).
- **No se usa IA como autoridad jurídica** ni como sustituto de revisión humana.
- No se promete ejecutar envíos oficiales reales.

---

## 6. Tests

### Ficheros relevantes
- `command-center-render.test.tsx`
- `command-center-vpt-disclaimer.test.tsx`
- `command-center-legal-readiness.test.tsx`
- `command-center-officials-states.test.tsx`
- `command-center-alerts-actions.test.tsx`
- `command-center-global-readiness.test.tsx`
- `command-center-mount-flag.test.tsx`
- Resto de la suite HR existente.

### Comando
```bash
bunx vitest run src/__tests__/hr/
```

### Estado esperado
**103/103 verde.**

---

## 7. Riesgos residuales

- Panel oculto por flag OFF; no se ve hasta cambio explícito en código.
- Activación requiere **PR explícito** (no env, no BD, no toggle dinámico).
- **No hay persistencia histórica** de readiness (todo se calcula al vuelo).
- **No hay snapshot backend**; rendimiento ligado a queries en tiempo real.
- **No hay UAT oficial** TGSS / SEPE / AEAT desde este panel.
- **No hay envío oficial** desde este panel.
- El panel es **herramienta de control interno**, no de comunicación con organismos.

---

## 8. Próximas fases posibles

| Fase | Descripción | Requisito previo |
|---|---|---|
| **4C** | Activar en entorno interno/demo con flag ON por PR | Esta documentación + revisión |
| **5** | Snapshot backend read-only para rendimiento | Definir tabla snapshot + RLS |
| **6** | Importadores o pilotos con datos reales acotados | Aceptación cliente piloto |
| **7** | Runbook comercial / demo guiada | Validación legal del discurso |
| **8** | UAT oficial con organismos (TGSS / SEPE / AEAT) — **fuera de este panel** | Conectores oficiales certificados |

---

## 9. Estado de cierre

- Construcción: **completada hasta Fase 4A**.
- Visibilidad por defecto: **OFF**.
- Suite HR: **103/103 verde**.
- Auditoría HR Security: **GREEN**.
- Próximo paso recomendado: revisar este documento y `HR_COMMAND_CENTER_ACTIVATION_RUNBOOK.md` antes de cualquier activación.
