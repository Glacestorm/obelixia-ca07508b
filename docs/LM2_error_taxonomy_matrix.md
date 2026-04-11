# LM2 — Error Taxonomy Matrix

## Fecha: 2026-04-11

## Taxonomía de errores oficiales (9 tipos)

| Tipo | Severidad | Acción sugerida | Auto-retry | Manual fix | Patrones de detección |
|------|-----------|----------------|-----------|-----------|----------------------|
| `validation_error` | medium | Corregir datos del artefacto y regenerar | ❌ | ✅ | validat*, campo obligatorio, formato incorrecto, NIF inválido |
| `schema_error` | high | Verificar estructura contra especificación oficial | ❌ | ✅ | schema, XSD, estructura, posición incorrecta, longitud |
| `credential_error` | critical | Renovar o configurar credenciales del organismo | ❌ | ✅ | credential, autorización, autenticación, certificado caducado, acceso denegado |
| `signature_error` | high | Verificar certificado de firma y reintentar | ❌ | ✅ | firma, signature, certificado firma, signaturit |
| `submission_error` | high | Reintentar envío; si persiste, contactar soporte | ✅ | ❌ | envío, submission, timeout, conexión, servicio no disponible |
| `response_parse_error` | medium | Verificar formato de respuesta importada | ❌ | ✅ | parse, respuesta no reconocida, formato respuesta |
| `organism_rejection` | high | Revisar motivo de rechazo, corregir y reenviar | ❌ | ✅ | rechaz*, reject*, denegad*, error organismo |
| `timeout_or_missing_receipt` | medium | Verificar en portal del organismo si fue procesado | ✅ | ❌ | timeout, acuse no recibido, sin respuesta, plazo |
| `manual_intervention_required` | critical | Escalar a responsable RRHH | ❌ | ✅ | manual, intervención, escalar |

## Flujo de clasificación

```
Error recibido
  → classifyError(message, organism)
    → Match contra patrones regex
    → Si no match → manual_intervention_required (default)
    → Devuelve: { type, severity, suggestedAction, autoRetryAllowed, requiresManualFix }
```

## Errores por organismo (esperados)

### TGSS / RED / SILTRA
- `validation_error`: NIF duplicado, NAF no encontrado, código de cuenta inexistente
- `schema_error`: Longitud de registro incorrecta, tipo de registro no reconocido
- `credential_error`: Autorización RED caducada, certificado no válido para RED

### SEPE / Contrat@
- `validation_error`: Código de contrato no válido, CNO incorrecto
- `organism_rejection`: Contrato duplicado, trabajador ya dado de alta
- `credential_error`: Autorización Contrat@ caducada

### AEAT
- `validation_error`: NIF perceptor inválido, importes no cuadran
- `schema_error`: Posición incorrecta en fichero BOE, tipo de registro desconocido
- `organism_rejection`: Declaración fuera de plazo, NIF declarante no coincide
