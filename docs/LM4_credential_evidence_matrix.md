# LM4 — Credential Evidence Matrix

## Fecha: 2026-04-11

---

## Estado por Organismo + Tipo de Credencial

### TGSS / RED / SILTRA

| Credencial | Obligatoria | Estado | Validación | Expiración | Evidencia adjunta | Notas revisión |
|-----------|-------------|--------|-----------|------------|-------------------|----------------|
| autorizacion_red | ✅ Sí | `not_configured` | — | — | 0 docs | — |
| certificado_electronico | ✅ Sí | `not_configured` | — | — | 0 docs | — |
| winsuite_siltra | ✅ Sí | `not_configured` | — | — | 0 docs | — |

**Certificado electrónico**: `not_configured`
**Parser verificado**: ❌ No
**Formato validado**: Sin validaciones registradas

---

### SEPE / Contrat@

| Credencial | Obligatoria | Estado | Validación | Expiración | Evidencia adjunta | Notas revisión |
|-----------|-------------|--------|-----------|------------|-------------------|----------------|
| autorizacion_contrata | ✅ Sí | `not_configured` | — | — | 0 docs | — |
| certificado_electronico | ✅ Sí | `not_configured` | — | — | 0 docs | — |

**Certificado electrónico**: `not_configured`
**Parser verificado**: ❌ No

---

### SEPE / Certific@2

| Credencial | Obligatoria | Estado | Validación | Expiración | Evidencia adjunta | Notas revisión |
|-----------|-------------|--------|-----------|------------|-------------------|----------------|
| autorizacion_contrata | ✅ Sí | `not_configured` | — | — | 0 docs | — |
| certificado_electronico | ✅ Sí | `not_configured` | — | — | 0 docs | — |

**Certificado electrónico**: `not_configured`
**Parser verificado**: ❌ No

---

### AEAT / Modelo 111

| Credencial | Obligatoria | Estado | Validación | Expiración | Evidencia adjunta | Notas revisión |
|-----------|-------------|--------|-----------|------------|-------------------|----------------|
| certificado_electronico | ✅ Sí | `not_configured` | — | — | 0 docs | — |
| clave_pin | ❌ No | `not_configured` | — | — | 0 docs | — |
| clave_permanente | ❌ No | `not_configured` | — | — | 0 docs | — |

**Certificado electrónico**: `not_configured`
**Parser verificado**: ❌ No

---

### AEAT / Modelo 190

| Credencial | Obligatoria | Estado | Validación | Expiración | Evidencia adjunta | Notas revisión |
|-----------|-------------|--------|-----------|------------|-------------------|----------------|
| certificado_electronico | ✅ Sí | `not_configured` | — | — | 0 docs | — |
| clave_pin | ❌ No | `not_configured` | — | — | 0 docs | — |

**Certificado electrónico**: `not_configured`
**Parser verificado**: ❌ No

---

## Resumen de Evidencia

| Organismo | Total credenciales | Configuradas | Validadas | Evidencia adjunta | Escenarios con evidencia |
|-----------|-------------------|-------------|-----------|-------------------|--------------------------|
| TGSS | 3 | 0 | 0 | 0 | 0/4 |
| Contrat@ | 2 | 0 | 0 | 0 | 0/5 |
| Certific@2 | 2 | 0 | 0 | 0 | 0/3 |
| AEAT 111 | 3 | 0 | 0 | 0 | 0/3 |
| AEAT 190 | 2 | 0 | 0 | 0 | 0/3 |
| **Total** | **12** | **0** | **0** | **0** | **0/18** |

---

## Modelo de Estado: Persisted vs Validated vs UAT-Confirmed

| Nivel | Persistido en DB | Requiere evidencia | Requiere organismo real | Automático |
|-------|-----------------|-------------------|------------------------|------------|
| `not_configured` | ✅ | ❌ | ❌ | ✅ (default) |
| `pending_request` | ✅ | ❌ | ❌ | ❌ (operador) |
| `configured` | ✅ | Recomendado | ❌ | ❌ (operador) |
| `validated` | ✅ | ✅ Obligatorio | ❌ | ❌ (operador) |
| `spec_aligned` (formato) | ✅ | ❌ (automático) | ❌ | ✅ (motor) |
| `sandbox_validated` (formato) | ✅ | ✅ | ✅ (sandbox) | ❌ (operador) |
| `uat_confirmed` (formato) | ✅ | ✅ | ✅ (producción) | ❌ (operador) |

**Invariante**: Ningún nivel superior se alcanza sin evidencia real suficiente. El motor computa `canGoLive` pero no lo fuerza.
