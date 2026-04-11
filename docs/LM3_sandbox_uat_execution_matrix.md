# LM3 — Sandbox / UAT Execution Matrix

## Fecha: 2026-04-11

---

## Escenarios por Organismo

### TGSS / RED / SILTRA

| ID | Fase | Escenario | Resultado esperado | Evidencia requerida | Estado |
|----|------|-----------|-------------------|---------------------|--------|
| tgss_afi_alta | Sandbox | Alta AFI con datos de prueba → envío SILTRA → acuse | Acuse TGSS recibido | Captura acuse TGSS | ⏳ Pending |
| tgss_afi_baja | Sandbox | Baja AFI → envío → confirmación | Confirmación TGSS | Captura confirmación | ⏳ Pending |
| tgss_bases | Sandbox | Remesa de bases → envío → RLC/RNT de respuesta | RLC/RNT recibido | Fichero RLC/RNT importado | ⏳ Pending |
| tgss_uat_full | UAT | Ciclo completo alta+bases+baja con CCC de prueba | Ciclo validado sin rechazos | Evidencia completa del ciclo | ⏳ Pending |

**Prerequisitos**: Autorización RED + WinSuite32/SILTRA + CCC de prueba

---

### SEPE / Contrat@

| ID | Fase | Escenario | Resultado esperado | Evidencia requerida | Estado |
|----|------|-----------|-------------------|---------------------|--------|
| contrata_alta | Sandbox | Alta contrato indefinido → envío XML → referencia SEPE | Referencia SEPE | Captura referencia | ⏳ Pending |
| contrata_baja | Sandbox | Baja contrato → comunicación → acuse | Acuse SEPE | Captura acuse | ⏳ Pending |
| contrata_prorroga | Sandbox | Prórroga temporal → comunicación → confirmación | Confirmación SEPE | Captura confirmación | ⏳ Pending |
| contrata_rechazo | Sandbox | Rechazo simulado → corrección → reenvío | Reenvío aceptado | Captura rechazo + reenvío | ⏳ Pending |
| contrata_uat | UAT | Ciclo real: alta + prórroga + baja | Ciclo completo sin errores | Referencias SEPE | ⏳ Pending |

**Prerequisitos**: Autorización Contrat@ + Certificado electrónico

---

### SEPE / Certific@2

| ID | Fase | Escenario | Resultado esperado | Evidencia requerida | Estado |
|----|------|-----------|-------------------|---------------------|--------|
| certifica_fin_contrato | Sandbox | Certificado empresa fin contrato → referencia SEPE | Referencia SEPE | Captura referencia | ⏳ Pending |
| certifica_despido | Sandbox | Certificado despido objetivo → acuse | Acuse SEPE | Captura acuse | ⏳ Pending |
| certifica_uat | UAT | Certificado completo con datos reales | Aceptación SEPE | Referencia oficial | ⏳ Pending |

**Prerequisitos**: Autorización Contrat@ + Certificado electrónico + Datos empresa validados

---

### AEAT / Modelo 111

| ID | Fase | Escenario | Resultado esperado | Evidencia requerida | Estado |
|----|------|-----------|-------------------|---------------------|--------|
| aeat111_trimestral | Sandbox | Modelo 111 trimestral → fichero BOE → importar Sede → CSV | CSV justificante | CSV AEAT | ⏳ Pending |
| aeat111_mensual | Sandbox | Modelo 111 mensual → misma secuencia | CSV justificante | CSV AEAT | ⏳ Pending |
| aeat111_uat | UAT | Presentación real 111 con datos fiscales válidos | Justificante aceptado | CSV + PDF | ⏳ Pending |

**Prerequisitos**: Certificado electrónico + NIF dado de alta en Sede AEAT

---

### AEAT / Modelo 190

| ID | Fase | Escenario | Resultado esperado | Evidencia requerida | Estado |
|----|------|-----------|-------------------|---------------------|--------|
| aeat190_anual | Sandbox | Modelo 190 ejercicio completo → fichero BOE → CSV | CSV justificante | CSV AEAT | ⏳ Pending |
| aeat190_discrepancia | Sandbox | Discrepancia con 111 → alerta → corrección | Corrección validada | Captura alerta + corrección | ⏳ Pending |
| aeat190_uat | UAT | Presentación real 190 ejercicio completo | Justificante aceptado | CSV + PDF | ⏳ Pending |

**Prerequisitos**: Certificado electrónico + Datos anuales completos

---

## Resumen de Ejecución

| Organismo | Sandbox Total | Sandbox Passed | UAT Total | UAT Passed | Ready |
|-----------|--------------|----------------|-----------|------------|-------|
| TGSS | 3 | 0 | 1 | 0 | ❌ |
| Contrat@ | 4 | 0 | 1 | 0 | ❌ |
| Certific@2 | 2 | 0 | 1 | 0 | ❌ |
| AEAT 111 | 2 | 0 | 1 | 0 | ❌ |
| AEAT 190 | 2 | 0 | 1 | 0 | ❌ |
| **Total** | **13** | **0** | **5** | **0** | ❌ |

---

## Validación de formato y parser por organismo

| Organismo | Validador implementado | Formato validado | Parser verificado |
|-----------|----------------------|-----------------|-------------------|
| TGSS | `validateFANStructure()` | ❌ not_verified | ❌ No |
| Contrat@ | `validateContratXMLStructure()` | ❌ not_verified | ❌ No |
| Certific@2 | `validateCertificaPayload()` | ❌ not_verified | ❌ No |
| AEAT 111 | `validateBOE111Structure()` | ❌ not_verified | ❌ No |
| AEAT 190 | `validateBOE190Structure()` | ❌ not_verified | ❌ No |

---

## Criterio para marcar escenario como "passed"

1. El artefacto fue generado correctamente por el sistema
2. El artefacto fue importado/enviado al organismo (manual o automático)
3. El organismo devolvió acuse/referencia/justificante
4. La respuesta fue importada y parseada correctamente
5. El estado de la submission transicionó correctamente
6. Se registró evidence en el ledger
