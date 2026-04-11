# P1.7B-RB — Demo Yellow-to-Green Report

## Contexto

La guía de demo RRHH España identifica stock options y equity compensation como punto amarillo.
Este reporte documenta la transición tras P1.7B-RB.

## Matriz de Transición

| Caso | Estado Previo | Estado Actual | Nivel |
|------|---------------|---------------|-------|
| Stock options estándar | 🟡 Solo concepto nómina | 🟢 Motor completo + simulador | `supported_production` |
| Exención 12.000€ (Art. 42.3.f) | 🟡 No modelada | 🟢 Cálculo automático + requisitos | `supported_production` |
| Renta irregular (Art. 18.2) | 🟡 No modelada | 🟢 Reducción 30% automática | `supported_production` |
| Vesting schedule | 🔴 Inexistente | 🟢 Timeline cliff + linear + graded | `supported_production` |
| Simulador de ejercicio | 🔴 Inexistente | 🟢 Simulación fiscal completa | `supported_production` |
| Cotización SS en ejercicio | 🟡 Implícita por concepto | 🟢 Cálculo explícito | `supported_production` |
| Stock options startup | 🔴 Inexistente | 🟡 Modelado con revisión obligatoria | `supported_with_review` |
| Exención startup 50.000€ | 🔴 No modelada | 🟡 Cálculo + verificación manual | `supported_with_review` |
| RSU | 🔴 Inexistente | 🟡 Clasificado con revisión | `supported_with_review` |
| Phantom shares | 🔴 Inexistente | 🔴 Fuera de alcance (etiquetado) | `out_of_scope` |
| Equity internacional | 🔴 Inexistente | 🔴 Fuera de alcance (combinar P1.7B-RA) | `out_of_scope` |

## Resumen de Transición

| Color | Antes | Después |
|-------|-------|---------|
| 🟢 Verde funcional | 0 | 6 casos |
| 🟡 Ámbar (review) | 1 | 3 casos |
| 🔴 Rojo (sin soporte) | 5+ | 2 casos (etiquetados honestamente) |

## Impacto en Demo

### Antes
- Stock options aparecía solo como concepto de nómina (`ES_STOCK_OPTIONS`)
- Sin panel dedicado
- Sin tratamiento fiscal visible
- Sin simulador
- Punto débil evidente en demo con cliente español

### Después
- Panel dedicado con 4 pestañas (Planes, Grants, Simulador, Reglas)
- Vesting timeline visual con cliff + mensual
- Simulador de ejercicio con desglose fiscal completo
- Clasificación honesta de soporte por tipo de plan
- Reglas fiscales de referencia integradas
- Integrado en navegación Global
- Substep en preflight de nómina

## Impacto en Producto Real

1. **Motor fiscal productivo**: Art. 42.3.f, Ley 28/2022, Art. 18.2 LIRPF modelados con requisitos
2. **Conexión payroll**: `computePayrollImpact()` genera línea de nómina `ES_STOCK_OPTIONS`
3. **Preflight**: substep condicional detecta grants activos y su nivel de soporte
4. **Clasificación honesta**: nunca se finge automatización total para RSU/phantom/startup

## Backlog Residual

| Item | Prioridad | Motivo |
|------|-----------|--------|
| Persistencia en DB de grants | Media | Actualmente usa metadata + demo state |
| Conexión real con ejercicio en nómina | Media | Motor listo, falta trigger operativo |
| Equity internacional (multi-país) | Baja | Requiere combinar con P1.7B-RA |
| Phantom shares engine | Baja | Requiere asesoría contable especializada |
| Auditoría de plans en ledger | Baja | Estructura de ledger compatible, falta instrumentación |

## Recomendación Siguiente Fase

- **LM4** si el foco es última milla oficial
- **P2.0** si el foco es persistencia real de grants en tabla dedicada
- **H1.3F** si el foco es hardening de módulos restantes
