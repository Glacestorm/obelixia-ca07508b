# LM3 — Go-Live Blocker Matrix

## Fecha: 2026-04-11

---

## Regla dura de Go-Live

Un organismo **NO puede** marcarse como `go_live_ready` sin cumplir **todas** estas condiciones:

1. ✅ Credenciales obligatorias configuradas y validadas
2. ✅ Certificado electrónico válido vinculado
3. ✅ Formato de fichero ≥ `spec_aligned`
4. ✅ Parser de respuesta verificado con muestra real
5. ✅ ≥1 escenario sandbox superado
6. ✅ ≥1 escenario UAT superado

---

## Matriz de Blockers por Organismo

### TGSS / RED / SILTRA

| Dimensión | Blocker | Severidad | Acción | Owner | Esfuerzo |
|-----------|---------|-----------|--------|-------|----------|
| Credencial | Autorización RED no configurada | 🔴 Critical | Solicitar autorización RED | Admin RRHH | 1-5 días |
| Credencial | WinSuite32/SILTRA no instalado | 🔴 Critical | Instalar y configurar WinSuite32 | IT | 1-2 días |
| Certificado | No disponible | 🔴 Critical | Obtener FNMT/DNIe | Admin | 1-10 días |
| Formato | FAN no validado contra spec | 🟠 High | Validar contra spec TGSS | Técnico | 2-5 días |
| Parser | No verificado | 🟠 High | Verificar con respuesta sample | Técnico | 1-3 días |
| Sandbox | 0/3 escenarios | 🟠 High | Ejecutar con CCC de prueba | RRHH+IT | 1-3 días |
| UAT | 0/1 escenarios | 🟠 High | Ejecutar ciclo completo | RRHH | 3-10 días |

**can_go_live_now: ❌ NO**

---

### SEPE / Contrat@

| Dimensión | Blocker | Severidad | Acción | Owner | Esfuerzo |
|-----------|---------|-----------|--------|-------|----------|
| Credencial | Autorización Contrat@ no configurada | 🔴 Critical | Solicitar en SEPE | Admin RRHH | 1-5 días |
| Certificado | No disponible | 🔴 Critical | Obtener FNMT/DNIe | Admin | 1-10 días |
| Formato | XML no validado contra XSD | 🟠 High | Validar contra XSD oficial | Técnico | 2-5 días |
| Parser | No verificado | 🟠 High | Verificar con respuesta sample | Técnico | 1-3 días |
| Sandbox | 0/4 escenarios | 🟠 High | Ejecutar con datos prueba | RRHH+IT | 1-3 días |
| UAT | 0/1 escenarios | 🟠 High | Ejecutar ciclo real | RRHH | 3-10 días |

**can_go_live_now: ❌ NO**

---

### SEPE / Certific@2

| Dimensión | Blocker | Severidad | Acción | Owner | Esfuerzo |
|-----------|---------|-----------|--------|-------|----------|
| Credencial | Autorización Contrat@ requerida | 🔴 Critical | Solicitar en SEPE | Admin RRHH | 1-5 días |
| Certificado | No disponible | 🔴 Critical | Obtener FNMT/DNIe | Admin | 1-10 días |
| Formato | Payload no validado | 🟠 High | Validar estructura | Técnico | 2-5 días |
| Parser | No verificado | 🟠 High | Verificar con sample | Técnico | 1-3 días |
| Sandbox | 0/2 escenarios | 🟠 High | Ejecutar con datos prueba | RRHH+IT | 1-3 días |
| UAT | 0/1 escenarios | 🟠 High | Ejecutar con datos reales | RRHH | 3-10 días |

**can_go_live_now: ❌ NO**

---

### AEAT / Modelo 111

| Dimensión | Blocker | Severidad | Acción | Owner | Esfuerzo |
|-----------|---------|-----------|--------|-------|----------|
| Credencial | Certificado/Cl@ve no configurado | 🔴 Critical | Obtener certificado AEAT | Admin | 1-10 días |
| Certificado | No disponible | 🔴 Critical | Obtener FNMT/DNIe/Cl@ve | Admin | 1-10 días |
| Formato | BOE 111 no validado | 🟠 High | Validar contra spec BOE | Técnico | 2-5 días |
| Parser | No verificado | 🟠 High | Verificar con CSV sample | Técnico | 1-3 días |
| Sandbox | 0/2 escenarios | 🟠 High | Ejecutar en Sede AEAT test | RRHH+IT | 1-3 días |
| UAT | 0/1 escenarios | 🟠 High | Presentación real | RRHH | 3-10 días |

**can_go_live_now: ❌ NO**

---

### AEAT / Modelo 190

| Dimensión | Blocker | Severidad | Acción | Owner | Esfuerzo |
|-----------|---------|-----------|--------|-------|----------|
| Credencial | Certificado/Cl@ve no configurado | 🔴 Critical | Obtener certificado AEAT | Admin | 1-10 días |
| Certificado | No disponible | 🔴 Critical | Obtener FNMT/DNIe/Cl@ve | Admin | 1-10 días |
| Formato | BOE 190 no validado | 🟠 High | Validar contra spec BOE | Técnico | 2-5 días |
| Parser | No verificado | 🟠 High | Verificar con CSV sample | Técnico | 1-3 días |
| Sandbox | 0/2 escenarios | 🟠 High | Ejecutar en Sede AEAT test | RRHH+IT | 1-3 días |
| UAT | 0/1 escenarios | 🟠 High | Presentación real anual | RRHH | 3-10 días |

**can_go_live_now: ❌ NO**

---

## Resumen

| Organismo | Blockers Critical | Blockers High | can_go_live_now |
|-----------|------------------|---------------|-----------------|
| TGSS | 3 | 4 | ❌ |
| Contrat@ | 2 | 4 | ❌ |
| Certific@2 | 2 | 4 | ❌ |
| AEAT 111 | 2 | 4 | ❌ |
| AEAT 190 | 2 | 4 | ❌ |
