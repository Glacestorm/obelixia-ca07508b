# LM2 — Sandbox / UAT Checklist por Organismo

## Fecha: 2026-04-11

---

## TGSS / RED / SILTRA

### Prerequisitos
- [ ] Autorización RED vigente
- [ ] Certificado electrónico válido (FNMT o equivalente)
- [ ] WinSuite32/SILTRA instalado y configurado
- [ ] Cuenta de cotización de pruebas (CCC)

### Formato validado
- [ ] Fichero FAN posicional validado contra spec oficial TGSS
- [ ] AFI: registro tipo 0 (cabecera) + tipo 1 (trabajador) correctos
- [ ] Bases cotización: formato de remesa validado en SILTRA

### Test scenarios
- [ ] Alta AFI con datos de prueba → envío SILTRA → acuse
- [ ] Baja AFI → envío → confirmación
- [ ] Remesa de bases → envío → RLC/RNT de respuesta

### Estado actual: `official_handoff_ready` ⚠️
- Bloqueado por: credenciales RED, WinSuite32, formato FAN pendiente validación

---

## SEPE / Contrat@

### Prerequisitos
- [ ] Autorización Contrat@ vigente
- [ ] Certificado electrónico / DNIe
- [ ] Acceso a entorno de pruebas Contrat@ (si existe)

### Formato validado
- [ ] XML Contrat@ validado contra XSD oficial
- [ ] Campos obligatorios: NIF empresa, NIF trabajador, código contrato, CNO, fecha inicio

### Test scenarios
- [ ] Alta contrato indefinido → envío XML → referencia SEPE
- [ ] Baja contrato → comunicación → acuse
- [ ] Prórroga contrato temporal → comunicación → confirmación
- [ ] Rechazo simulado → corrección → reenvío

### Estado actual: `official_handoff_ready` ⚠️
- Bloqueado por: credenciales Contrat@, validación XSD

---

## SEPE / Certific@2

### Prerequisitos
- [ ] Autorización Contrat@ (da acceso a Certific@2)
- [ ] Certificado electrónico
- [ ] Datos de la empresa validados en SEPE

### Formato validado
- [ ] Payload Certific@2 con estructura oficial
- [ ] Causa baja SEPE correcta (12 causas soportadas)
- [ ] Bases de cotización últimos 180 días calculadas

### Test scenarios
- [ ] Certificado empresa por fin de contrato → envío → referencia SEPE
- [ ] Certificado por despido objetivo → envío → acuse
- [ ] Rechazo por datos incorrectos → corrección → reenvío

### Estado actual: `official_handoff_ready` ⚠️
- Bloqueado por: autorización Contrat@, sin API pública

---

## AEAT / Modelo 111

### Prerequisitos
- [ ] Certificado electrónico / DNIe / Cl@ve
- [ ] NIF declarante dado de alta en Sede AEAT
- [ ] Acceso a entorno de pruebas AEAT (si disponible)

### Formato validado
- [ ] Fichero BOE posicional Modelo 111 correcto
- [ ] Registro tipo 1 (declarante) + tipo 2 (perceptor) validados
- [ ] Totales cuadrados: retenciones vs. bases
- [ ] Soporte mensual Y trimestral

### Test scenarios
- [ ] Modelo 111 trimestral con 5 perceptores → fichero BOE → importar en Sede → CSV
- [ ] Modelo 111 mensual → misma secuencia
- [ ] Error de validación AEAT → corrección → reenvío

### Estado actual: `official_handoff_ready` ⚠️
- Bloqueado por: certificado electrónico, validación formato BOE

---

## AEAT / Modelo 190

### Prerequisitos
- [ ] Mismos que Modelo 111
- [ ] Datos anuales completos (todas las nóminas del ejercicio)

### Formato validado
- [ ] Fichero BOE posicional Modelo 190 correcto
- [ ] Registro tipo 1 (declarante) + tipo 2 (perceptor con clave/subclave)
- [ ] Totales anuales cuadrados

### Test scenarios
- [ ] Modelo 190 ejercicio completo → fichero BOE → CSV justificante
- [ ] Discrepancia con 111 trimestral → alerta → corrección

### Estado actual: `official_handoff_ready` ⚠️
- Bloqueado por: certificado electrónico, validación formato BOE, datos anuales de prueba

---

## Resumen de readiness

| Organismo | Readiness actual | Próximo nivel | Bloqueador principal |
|-----------|-----------------|---------------|---------------------|
| TGSS | `official_handoff_ready` | `sandbox_ready` | Credencial RED + WinSuite32 |
| Contrat@ | `official_handoff_ready` | `sandbox_ready` | Credencial Contrat@ |
| Certific@2 | `official_handoff_ready` | `sandbox_ready` | Autorización + sin API |
| AEAT 111 | `official_handoff_ready` | `sandbox_ready` | Certificado + formato BOE |
| AEAT 190 | `official_handoff_ready` | `sandbox_ready` | Certificado + formato BOE |
