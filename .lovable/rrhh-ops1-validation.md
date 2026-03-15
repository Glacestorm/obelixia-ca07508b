# RRHH-OPS.1 — Validación y cierre del circuito DEMO + PREPROD + PROD

## I. RESUMEN EJECUTIVO

Se ha implementado un sistema completo de convivencia DEMO/PREPROD/PROD para el módulo RRHH con:
- **Contexto de entorno** (`HREnvironmentContext`) con 3 modos persistentes
- **Banner visual** siempre visible en la cabecera del módulo
- **Guards de seed** que bloquean generación/purga en modos no-DEMO
- **Navegador de circuito demo** (Demo Journey Panel) con 15 pasos enlazados
- **SOPs de operación** mínima para piloto/preproducción
- **Cero regresiones** — todo existente se mantiene intacto

---

## II. CONVIVENCIA DEMO / PREPROD / PROD

### Arquitectura implementada

| Aspecto | DEMO | PREPROD | PROD |
|---------|------|---------|------|
| Seeds permitidos | ✅ Sí | ❌ No | ❌ No |
| Purge permitido | ✅ Sí | ❌ No | ❌ No |
| Demo tools visibles | ✅ Sí | ❌ No | ❌ No |
| Confirmación doble | No | ✅ Sí | ✅ Sí |
| Banner color | 🟡 Ámbar | 🔵 Azul | 🟢 Verde |
| Datos demo | ✅ Ficticios | ❌ Reales/test | ❌ Reales |

### Componentes creados
- `src/contexts/HREnvironmentContext.tsx` — Contexto + Provider + hook
- `src/components/erp/hr/shared/HREnvironmentBanner.tsx` — Banner con selector
- Guard en `HRDemoSeedPanel` — Bloquea seeds fuera de modo DEMO

---

## III. CIRCUITO DEMO MAESTRO — 100% COBERTURA

| # | Paso | Perfil | Estado | Pantalla |
|---|------|--------|--------|----------|
| 1 | Registro empleado | Carlos Ruiz | ✅ Listo | employees |
| 2 | Contrato + expediente | Carlos Ruiz | ✅ Listo | contracts |
| 3 | Comunicación incorporación | Carlos Ruiz | 🔵 Simulación | es-official-submissions |
| 4 | Nómina compleja (HH.EE + seguro + stock + permiso + IT) | Carlos/David/Elena/Javier | ✅ Listo | payroll |
| 5 | Permiso por nacimiento | Ana Belén Torres | ✅ Listo | vacations |
| 6 | Desplazamiento internacional | Sofía Martínez | ✅ Listo | global-mobility |
| 7 | Correction run / atrasos | David Moreno | 🔵 Simulación | payroll-engine |
| 8 | Reducción jornada guarda legal | Carmen Alonso | ✅ Listo | es-localization |
| 9 | Informe costes y nómina | (global) | ✅ Listo | util-reporting |
| 10 | Seguros sociales | (global) | 🔵 Simulación | es-official-submissions |
| 11 | Registro horario | (todos) | ✅ Listo | time-clock |
| 12 | Modelos 111/190 | (global) | 🔵 Simulación | es-official-submissions |
| 13 | Liquidación despido disciplinario | Roberto Díaz | ✅ Listo | settlements |
| 14 | Liquidación despido objetivo | Isabel Muñoz | ✅ Listo | settlements |
| 15 | Comunicación salida | Roberto/Isabel | 🔵 Simulación | es-official-submissions |

**Cobertura: 100%** (10 listos + 5 simulación preparatoria)

---

## IV. NAVEGADOR DEMO JOURNEY

Panel nuevo accesible en **Utilidades → Circuito Demo**.
- Lista 15 pasos con estado visual (verde/azul/ámbar)
- Cada paso enlaza directamente a su pantalla
- Muestra perfil demo principal
- Barra de progreso global (100%)
- Notas contextuales por paso

---

## V. PROTECCIONES DE SEED

1. **Guard de entorno**: Seeds bloqueados con UI informativa en PREPROD/PROD
2. **Marcaje de datos**: `is_demo_master: true`, `demo_batch_id`, `demo_profile_code`
3. **Purge seguro**: Solo afecta registros con marcas demo
4. **Modo persistente**: Se almacena en localStorage, sobrevive a recargas

---

## VI. SOPs OPERATIVOS

Documento `.lovable/rrhh-sops-operaciones.md` con 10 procedimientos:
1. Alta de empleado
2. Contrato
3. Gestión documental
4. Cierre nómina mensual
5. Incidencias especiales (IT, nacimiento, reducción, stock options)
6. Nómina de atrasos
7. Seguros sociales
8. Modelos fiscales
9. Baja/despido
10. Portal del empleado

---

## VII. ACCESO BACKOFFICE ↔ PORTAL

| Punto de acceso | Estado |
|-----------------|--------|
| Botón desde expediente empleado | ✅ Implementado |
| Botón desde dashboard ejecutivo | ✅ Implementado |
| Ruta /mi-portal | ✅ Funcional con guard |
| Preview read-only | 📋 Planificado |
| Retorno al backoffice | Via navegación estándar |

---

## VIII. VALIDACIÓN FINAL

### Checklist

| Check | DEMO | PREPROD | PROD |
|-------|------|---------|------|
| Demo funciona igual o mejor | ✅ | N/A | N/A |
| Seeds no contaminan operativo | ✅ | ✅ Bloqueados | ✅ Bloqueados |
| Circuito maestro recorrible | ✅ 15/15 | N/A | N/A |
| Portal empleado correcto | ✅ | ✅ | ✅ |
| Sin regresiones seguridad | ✅ | ✅ | ✅ |
| Banner entorno visible | ✅ | ✅ | ✅ |

### Estado por entorno
- **DEMO**: ✅ Demo-ready completo
- **PREPROD**: ✅ Preprod-ready (seeds bloqueados, UI protegida)
- **PROD**: 🟡 Prod-ready parcial (requiere datos reales para operación)

---

## IX. RIESGOS RESIDUALES

1. Portal del Empleado requiere vinculación manual `user_id ↔ employee_id` para interacción real
2. Integraciones oficiales mantienen `isRealSubmissionBlocked() === true` por diseño
3. Board Packs requieren pre-generación manual para demo

---

## X. RECOMENDACIÓN FINAL

✅ **El módulo RRHH puede mantenerse como demo potente + operación real simultáneamente.**

La convivencia DEMO/PREPROD/PROD está implementada y funcional. El circuito demo maestro cubre el 100% del caso solicitado (15/15 pasos). Las protecciones impiden contaminación entre entornos.

Para declarar el módulo 100% operativo en producción faltan:
1. Datos reales de al menos una empresa piloto
2. Vinculación de usuarios reales a empleados para Portal
3. Activación selectiva de conectores oficiales (SILTRA, Contrat@, AEAT) cuando se desbloquee envío real
