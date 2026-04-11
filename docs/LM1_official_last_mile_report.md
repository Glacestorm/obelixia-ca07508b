# LM1 — Official Last Mile Report (Consolidated with LM2)

## Fecha: 2026-04-11

## 1. Conectores reales viables encontrados

| Organismo | Conector directo | Motivo |
|-----------|-----------------|--------|
| TGSS / RED / SILTRA | **No** | Requiere WinSuite32/SILTRA + autorización RED. No existe API REST pública |
| SEPE / Contrat@ | **Parcial** | Existen servicios web XML, pero sin credenciales/autorización configuradas |
| SEPE / Certific@2 | **No** | Aplicación web oficial sin API pública |
| AEAT / Modelo 111 | **No** | Presentación vía Sede Electrónica con certificado/DNIe/Cl@ve |
| AEAT / Modelo 190 | **No** | Mismo canal que 111 |

**Resultado**: Ningún conector directo automatizable en el entorno actual. Todos operan en modo `assisted_handoff`.

## 2. Qué se implementó

### Engines (lógica pura, sin side effects)
- **`officialAdaptersEngine.ts`**: 5 adaptadores oficiales, taxonomía de 9 errores, readiness computation, handoff packages
- **`officialResponseParserEngine.ts`**: Parsers TGSS/SEPE/AEAT con auto-detección de organismo y mapping a ReceiptType

### Hooks (lógica con side effects)
- **`useHRSignature.ts`**: Reutiliza `energy-signature-provider` (Signaturit + fallback interno)
- **`useSubmissionCorrection.ts`**: Ciclo industrializado corrección → regeneración → reenvío con ledger
- **`useLastMileMetrics.ts`**: KPIs por organismo, errores recurrentes, alertas vencimiento

### UI
- **`LastMileOperationsDashboard.tsx`**: Bandeja operativa unificada con KPIs, filtros, alertas
- **`ImportOfficialResponseDialog.tsx`**: Importación manual de respuestas oficiales
- **Tab "Última Milla"** integrado en `OfficialIntegrationsHub`

## 3. Handoff oficial asistido

Todos los organismos quedan en modo `assisted_handoff` con:
- Instrucciones paso a paso por organismo
- Paquete de handoff estructurado (payload + metadata + instrucciones)
- Parser de respuesta para cuando el operador importe el acuse
- Trazabilidad completa (evidence + ledger)

## 4. Firma reutilizada

- `useHRSignature` invoca `energy-signature-provider` existente
- Soporta Signaturit (si `SIGNATURIT_TOKEN` disponible) con fallback a firma interna
- Registra evidencia de firma en `erp_hr_evidence`
- No duplica solución de firma

## 5. Gaps abiertos

| Gap | Bloquea go-live | Solución requerida |
|-----|-----------------|-------------------|
| Credenciales RED/SILTRA | Sí | Autorización RED + certificado electrónico |
| Credenciales Contrat@ | Sí | Autorización Contrat@ + certificado/DNIe |
| Credenciales AEAT | Sí | Certificado electrónico / Cl@ve |
| WinSuite32/SILTRA | Sí (TGSS) | Software intermediario para remesas |
| Formato FAN posicional real | Parcial | Validar contra especificación oficial TGSS |
| Formato BOE posicional real | Parcial | Validar contra BOE del 111/190 |
| Pruebas sandbox/UAT | Sí | Acceso a entornos de prueba de cada organismo |

## 6. Impacto sobre última milla oficial

| Métrica | Antes (LM0) | Después (LM1+LM2) |
|---------|-------------|-------------------|
| Adaptadores por organismo | 0 | 5 |
| Parsers de respuesta | 0 | 3 (TGSS, SEPE, AEAT) |
| Firma HR centralizada | No | Sí (Signaturit + interna) |
| Taxonomía de errores | Inexistente | 9 tipos con severidad y acción |
| Corrección/reenvío | Manual | Industrializado con ledger |
| Bandeja operativa | No existe | Unificada con KPIs |
| ReadinessLevel máximo | N/A | `official_handoff_ready` |

## Real Go-Live Blockers

1. **Credenciales oficiales** — Ningún organismo tiene credenciales configuradas
2. **Certificado electrónico** — Requerido por TGSS, SEPE y AEAT
3. **Software intermediario** — WinSuite32/SILTRA para TGSS
4. **Validación de formato** — Ficheros FAN/BOE pendientes de validación contra spec oficial
5. **Pruebas sandbox** — Sin acceso a entornos de prueba de organismos
6. **`isRealSubmissionBlocked === true`** — Invariante de seguridad activo
