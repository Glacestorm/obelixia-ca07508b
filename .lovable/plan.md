

# Plan Definitivo: Motor de Ciclo de Vida Contractual Completo

## Organización por Fases (sin duplicidades)

Se consolidan los 3 planes anteriores en 5 fases secuenciales. Cada fase es independiente y no rompe las anteriores.

---

### FASE 1: Motor de Alertas de Vencimiento + Conversión Legal
**Objetivo**: Engine puro que calcula alertas escalonadas y genera payloads de conversión a indefinido.

**Nuevo**: `src/engines/erp/hr/contractExpiryAlertEngine.ts`

| Dias restantes | Nivel | Accion |
|---|---|---|
| > 60 | info | Informativo |
| 30-60 | notice | Planificacion |
| 15-30 | warning | Preparar documentacion |
| 7-15 | urgent | Comunicar decision |
| 1-7 | critical | Actuar inmediatamente |
| 0 o pasado | overdue | Conversion a indefinido de oficio |

Funciones principales:
- `computeContractExpiryAlert(contractData, today)` — devuelve nivel, dias, consecuencia legal, obligaciones
- `buildIndefiniteConversionPayload(employeeData)` — genera payload contrato tipo 189, TA.2 V03 (ET Art. 15.5, RDL 32/2021)

**Nuevo**: `src/engines/erp/hr/artifactGenerationModeEngine.ts`
- Enum `GenerationMode: 'automatic' | 'manual'`
- Persistencia en localStorage (MVP), preparado para BD
- Logica: en modo auto genera al guardar; en manual, bajo demanda
- Todos los artefactos editables post-generacion en panel de revision

**Modificar**: `src/engines/erp/hr/index.ts` — anadir exports del nuevo engine

---

### FASE 2: Auto-generacion TA.2 y Contrat@ + Alertas en Formulario
**Objetivo**: Integrar la auto-generacion de ficheros oficiales en el flujo de guardado del empleado.

**Modificar**: `src/components/erp/hr/HREmployeeFormDialog.tsx`

Cambios en `handleSave`:
- Tras alta exitosa (ES, modo auto): llamar `buildAFIAlta` + `buildContrataPayload`, persistir via `useOfficialArtifacts`, toast resumen
- Tras informar baja (estado terminated, modo auto): llamar `buildAFIBaja` con subtipo segun contexto, persistir, toast
- Selector auto/manual visible en seccion Empleo

Cambios en UI (seccion Fecha de Baja):
- Badge visual con dias restantes y color segun engine de Fase 1
- Si contrato expirado sin accion: alerta roja + boton "Generar contrato indefinido" que llama `buildIndefiniteConversionPayload`
- Campos de prorroga vacios por defecto; alertas solo al informar fechas

---

### FASE 3: Ficheros Faltantes del PDF (extensiones correctas)
**Objetivo**: Completar todos los ficheros del ciclo de vida laboral que faltan segun el PDF analizado.

| Archivo nuevo | Genera | Extension | Plazo legal |
|---|---|---|---|
| `src/engines/erp/hr/fdiArtifactEngine.ts` | FDI para INSS (IT/AT) | `.FDI` | Inmediato tras baja medica |
| `src/engines/erp/hr/deltaArtifactEngine.ts` | Delt@ parte accidente | `PAT_*.xml` | 5 dias habiles |
| `src/engines/erp/hr/certificaArtifactEngine.ts` | Certific@2 SEPE | `certificado.xml` | 10 dias naturales |
| `src/engines/erp/hr/afiInactivityEngine.ts` | AFI Inactividad/PNR | `.AFI` | Dia inicio/reincorporacion |

Cada engine sigue el patron existente de `afiArtifactEngine`: types, build function, promote status, serialize for snapshot.

---

### FASE 4: Marcado de Empleados + Widget + Reporting
**Objetivo**: Visibilidad de incidencias contractuales en tabla, dashboard y reporting exportable.

**Modificar**: `src/components/erp/hr/HREmployeesPanel.tsx`
- Badge de urgencia por fila (color segun nivel de alerta)
- Nuevo filtro: "Incidencias contractuales"
- Marcado especial para empleados con conversion pendiente a indefinido

**Nuevo**: `src/components/erp/hr/widgets/HRContractExpiryWidget.tsx`
- Panel resumen: contratos agrupados por urgencia
- Contadores por nivel (critical, urgent, warning, etc.)
- Botones de accion rapida (prorrogar / generar indefinido / comunicar baja)

**Nuevo**: `src/components/erp/hr/reports/HRContractExpiryReport.tsx`
- Tabla: nombre, tipo contrato, fechas, dias restantes, urgencia, accion requerida
- Plazos por organismo: TGSS 3 dias, SEPE 10 dias, Delta 5 dias habiles
- Exportacion CSV + boton impresion
- Resumen ejecutivo con estadisticas

---

### FASE 5: Copiloto de Voz Contractual
**Objetivo**: Asistente de voz contextual durante el proceso de alta/gestion de empleado.

**Nuevo**: `src/hooks/erp/hr/useContractVoiceCopilot.ts`
- Web Speech API nativa (`SpeechRecognition` + `speechSynthesis`)
- Locale `es-ES` automatico
- Reutiliza edge function existente `hr-labor-copilot` (ya desplegada) anadiendo contexto contractual
- Limpieza Markdown para lectura fluida, ciclo pausa/reanudacion (patron ya usado en el modulo Legal)

**Nuevo**: `src/components/erp/hr/copilot/HRContractVoiceCopilot.tsx`
- FAB en esquina inferior-derecha del formulario de empleado
- Panel lateral compacto: indicador de escucha, historial breve, respuestas con referencia legal
- Recibe contexto del formulario actual (tipo contrato, fechas, prorroga, convenio)

**Ubicacion**: Dentro del `DialogContent` de `HREmployeeFormDialog`, posicion fija inferior-derecha. No interfiere con campos, siempre visible, patron UX reconocido.

---

### FASE 6: Integracion en Modulo
**Modificar**: `src/components/erp/hr/HRModule.tsx` y `HRModuleLazy.tsx`
- Lazy-load de widget (Fase 4), report (Fase 4) y copiloto (Fase 5)
- Registrar en navegacion correspondiente

---

## Resumen de Archivos

| Archivo | Accion | Fase |
|---|---|---|
| `src/engines/erp/hr/contractExpiryAlertEngine.ts` | Nuevo | 1 |
| `src/engines/erp/hr/artifactGenerationModeEngine.ts` | Nuevo | 1 |
| `src/engines/erp/hr/index.ts` | Modificar (barrel) | 1 |
| `src/components/erp/hr/HREmployeeFormDialog.tsx` | Modificar | 2 |
| `src/engines/erp/hr/fdiArtifactEngine.ts` | Nuevo | 3 |
| `src/engines/erp/hr/deltaArtifactEngine.ts` | Nuevo | 3 |
| `src/engines/erp/hr/certificaArtifactEngine.ts` | Nuevo | 3 |
| `src/engines/erp/hr/afiInactivityEngine.ts` | Nuevo | 3 |
| `src/components/erp/hr/HREmployeesPanel.tsx` | Modificar | 4 |
| `src/components/erp/hr/widgets/HRContractExpiryWidget.tsx` | Nuevo | 4 |
| `src/components/erp/hr/reports/HRContractExpiryReport.tsx` | Nuevo | 4 |
| `src/hooks/erp/hr/useContractVoiceCopilot.ts` | Nuevo | 5 |
| `src/components/erp/hr/copilot/HRContractVoiceCopilot.tsx` | Nuevo | 5 |
| `src/components/erp/hr/HRModule.tsx` | Modificar | 6 |
| `src/components/erp/hr/HRModuleLazy.tsx` | Modificar | 6 |

**Totales**: 0 migraciones. 0 edge functions nuevas (reutiliza `hr-labor-copilot`). 9 archivos nuevos. 5 archivos modificados. Todo client-side excepto la llamada al copiloto existente.

## Reutilizacion verificada (sin duplicidades)

- `buildAFIAlta` / `buildAFIBaja` / `buildAFIVariacion` → ya en `afiArtifactEngine.ts`
- `buildContrataPayload` → ya en `shared/contrataPayloadBuilder.ts`
- `useOfficialArtifacts` → ya existe para persistir artefactos
- `hr-labor-copilot` → edge function ya desplegada con streaming y contexto
- `useHRLaborCopilot` → hook existente, el voice copilot lo complementa sin solaparse
- Web Speech API voice pattern → ya implementado en modulo Legal, se replica el patron

