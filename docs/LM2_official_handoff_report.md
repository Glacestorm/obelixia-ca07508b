# LM2 — Official Handoff Report

## Fecha: 2026-04-11

## 1. Flujos operativos industrializados

### Prioridad A — Contrat@ y AEAT (111/190)
- **Canal**: `assisted_handoff`
- **Estado**: Handoff package completo con instrucciones paso a paso
- **Parser de respuesta**: Implementado (referencia SEPE, CSV AEAT)
- **Corrección/reenvío**: Industrializado con taxonomía de errores
- **Firma**: Disponible vía Signaturit/interna
- **ReadinessLevel**: `official_handoff_ready`

### Prioridad B — TGSS / RED / SILTRA
- **Canal**: `assisted_handoff`
- **Estado**: Handoff package con instrucciones WinSuite32/SILTRA
- **Parser de respuesta**: Implementado (referencia TGSS, errores por registro)
- **Corrección/reenvío**: Industrializado
- **Firma**: Disponible pero requiere certificado electrónico real
- **ReadinessLevel**: `official_handoff_ready`

### Prioridad C — Certific@2
- **Canal**: `assisted_handoff`
- **Estado**: Handoff asistido con instrucciones de uso de Certific@2
- **Parser de respuesta**: Implementado (referencia SEPE)
- **ReadinessLevel**: `official_handoff_ready`

## 2. Organismos en handoff asistido

**Todos** (5/5) — ninguno tiene conector directo viable en el entorno actual.

| Organismo | Handoff Package | Parser | Corrección | Firma | Readiness |
|-----------|----------------|--------|-----------|-------|-----------|
| Contrat@ | ✅ | ✅ | ✅ | ✅ | `official_handoff_ready` |
| AEAT 111 | ✅ | ✅ | ✅ | ✅ | `official_handoff_ready` |
| AEAT 190 | ✅ | ✅ | ✅ | ✅ | `official_handoff_ready` |
| TGSS/RED | ✅ | ✅ | ✅ | ✅ | `official_handoff_ready` |
| Certific@2 | ✅ | ✅ | ✅ | ✅ | `official_handoff_ready` |

## 3. Listos para sandbox/UAT

Ninguno puede pasar a `sandbox_ready` sin:
- Credenciales del organismo configuradas
- Certificado electrónico disponible
- Acceso a entorno de pruebas del organismo

## 4. Bloqueos para go-live real

| Bloqueador | Afecta a | Solución |
|-----------|----------|---------|
| Sin credenciales RED | TGSS | Tramitar autorización RED |
| Sin credenciales Contrat@ | SEPE | Tramitar autorización Contrat@ |
| Sin certificado electrónico | Todos | Obtener certificado FNMT o similar |
| Sin Cl@ve | AEAT | Registrar Cl@ve PIN/permanente |
| Sin WinSuite32 | TGSS | Instalar WinSuite32/SILTRA |
| `isRealSubmissionBlocked === true` | Todos | Requiere desactivación explícita tras UAT |
| Formato oficial no validado | TGSS, AEAT | Validar contra especificación BOE/FAN |

## 5. Prioridad LM3

Si se abordasen en un LM3:
1. **Obtener credenciales Contrat@** → primer candidato a conector directo (WS XML)
2. **Validar formato BOE 111/190** contra especificación oficial
3. **Pruebas sandbox** con entorno AEAT de pruebas (si disponible)
4. **Validar formato FAN** contra documentación TGSS
