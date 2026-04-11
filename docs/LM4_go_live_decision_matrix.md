# LM4 — Go-Live Decision Matrix

## Fecha: 2026-04-11

---

## Regla Dura de Go-Live (6 condiciones obligatorias)

Un organismo **no puede** obtener `canGoLive === true` sin cumplir **todas** estas condiciones simultáneamente:

1. ✅ Credenciales obligatorias configuradas y validadas
2. ✅ Certificado electrónico válido vinculado
3. ✅ Formato de fichero ≥ `spec_aligned`
4. ✅ Parser de respuesta verificado con muestra real
5. ✅ ≥1 escenario sandbox superado
6. ✅ ≥1 escenario UAT superado

---

## Decisión por Organismo

| Organismo | Decisión | canGoLive | Condiciones (6) | Blockers Critical | Blockers High | Evidencia | Última revisión |
|-----------|----------|-----------|-----------------|-------------------|---------------|-----------|-----------------|
| TGSS / RED / SILTRA | `not_ready` | `false` | 0/6 | 3 | 4 | 0 docs | Pendiente |
| SEPE / Contrat@ | `not_ready` | `false` | 0/6 | 2 | 4 | 0 docs | Pendiente |
| SEPE / Certific@2 | `not_ready` | `false` | 0/6 | 2 | 4 | 0 docs | Pendiente |
| AEAT / Modelo 111 | `not_ready` | `false` | 0/6 | 2 | 4 | 0 docs | Pendiente |
| AEAT / Modelo 190 | `not_ready` | `false` | 0/6 | 2 | 4 | 0 docs | Pendiente |

---

## Detalle de Blockers por Organismo

### TGSS / RED / SILTRA

| # | Dimensión | Severidad | Descripción | Acción | Owner |
|---|-----------|-----------|-------------|--------|-------|
| 1 | Credencial | 🔴 Critical | Autorización RED no configurada | Solicitar autorización RED | Admin RRHH |
| 2 | Credencial | 🔴 Critical | Certificado FNMT no configurado | Obtener certificado | Admin RRHH |
| 3 | Credencial | 🔴 Critical | WinSuite32/SILTRA no configurado | Instalar WinSuite32 | IT |
| 4 | Certificado | 🔴 Critical | Certificado electrónico: not_configured | Obtener/renovar certificado | Admin |
| 5 | Formato | 🟠 High | Formato oficial no validado | Validar FAN contra spec | Técnico |
| 6 | Parser | 🟠 High | Parser no verificado | Verificar con sample TGSS | Técnico |
| 7 | Sandbox | 🟠 High | 0/3 escenarios sandbox superados | Ejecutar sandbox | RRHH+IT |
| 8 | UAT | 🟠 High | 0/1 escenarios UAT superados | Ejecutar UAT | RRHH |

### SEPE / Contrat@

| # | Dimensión | Severidad | Descripción | Acción |
|---|-----------|-----------|-------------|--------|
| 1 | Credencial | 🔴 Critical | Autorización Contrat@ no configurada | Solicitar en SEPE |
| 2 | Certificado | 🔴 Critical | Certificado: not_configured | Obtener FNMT/DNIe |
| 3 | Formato | 🟠 High | Formato XML no validado | Validar contra XSD |
| 4 | Parser | 🟠 High | Parser no verificado | Verificar con sample |
| 5 | Sandbox | 🟠 High | 0/4 escenarios sandbox | Ejecutar sandbox |
| 6 | UAT | 🟠 High | 0/1 escenarios UAT | Ejecutar UAT |

### SEPE / Certific@2 — Misma estructura (2 critical + 4 high)

### AEAT / Modelo 111 — 2 critical + 4 high

### AEAT / Modelo 190 — 2 critical + 4 high

---

## Camino al Go-Live

Para cada organismo, el camino mínimo es:

1. **Obtener credenciales** (1-10 días) → desbloquea Cred + Cert
2. **Validar formato con spec** (2-5 días) → desbloquea Fmt
3. **Verificar parser con sample** (1-3 días) → desbloquea Parser
4. **Ejecutar sandbox** (1-3 días) → desbloquea Sandbox
5. **Ejecutar UAT** (3-10 días) → desbloquea UAT
6. **canGoLive se computa automáticamente** → Go-Live

**Estimación total**: 8-31 días hábiles por organismo (asumiendo secuencial).

---

## Nota sobre `canGoLive` dinámico

En LM4, `canGoLive` ya no es `false as const`. Se computa dinámicamente:

```typescript
const canGoLive = hasRequiredCredentials 
  && hasValidCertificate 
  && hasFormatAligned 
  && parserVerified 
  && hasSandboxPassed 
  && hasUATPassed;
```

Actualmente evalúa a `false` para todos los organismos porque ninguna condición se cumple. Cuando un operador registre credenciales reales y ejecute escenarios exitosos, el sistema transitará automáticamente.
