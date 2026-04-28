# RRHH — Wiring de navegación del Circuito Demo Maestro

Estado: **CERRADO** · Tipo: navegación/UX · Sin cambios funcionales.

## Objetivo
Hacer visible y accesible con un click el `HRDemoJourneyPanel` desde el menú principal de RRHH, para poder ejecutar el recorrido demo del Empleado DEMO (15 pasos, 12 perfiles) y navegar desde cada tarjeta al panel correspondiente.

## Estado previo
- `HRDemoJourneyPanel.tsx` ya existía con los 15 pasos definidos.
- `HRModule.tsx` (línea 680) ya renderizaba `LazyHRDemoJourneyPanel` cuando `activeModule === 'util-demo-journey'` y pasaba `onNavigate={(moduleId) => setActiveModule(moduleId)}`.
- `HRModuleLazy.tsx` (línea 209) ya exportaba `LazyHRDemoJourneyPanel`.
- **Faltaba** únicamente la entrada del menú para llegar a `util-demo-journey`.

## Cambios realizados
| Archivo | Cambio |
|---|---|
| `src/components/erp/hr/HRNavigationMenu.tsx` | Añadido ítem destacado `▶ Recorrido demo` (`util-demo-journey`) como primer elemento del subgrupo "Centro de Mando" del mega-menú de Utilidades. Icono `Route`. |
| `docs/qa/RRHH_DEMO_JOURNEY_NAVIGATION_WIRING.md` | Este documento. |

No se han modificado: motor de nómina, `simulateES`, `salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`, RLS, BD, edge functions, dependencias ni CI.

## Cómo acceder al recorrido demo
1. Abrir el módulo RRHH.
2. En el mega-menú superior, abrir **Utilidades**.
3. En el subgrupo **Centro de Mando**, hacer click en **▶ Recorrido demo**.
4. Se renderiza `HRDemoJourneyPanel` con las 15 tarjetas del circuito.
5. Click en cualquier tarjeta → navegación directa al `moduleId` correspondiente del circuito (mismo `setActiveModule` del módulo).

## Pasos principales del Circuito Demo Maestro
1. Registro empleado DEMO (Carlos Ruiz Martín)
2. Contrato y expediente documental
3. Comunicación incorporación a administraciones (dry-run TGSS/RED)
4. Nómina con incidencias complejas (HE, seguro médico flex, stock options, permiso no retribuido, IT por AT)
5. Permiso por nacimiento (INSS preview)
6. Desplazamiento internacional temporal (Art. 7.p LIRPF)
7. Nómina de atrasos / correction run con snapshot diff
8. Reducción de jornada por guarda legal (Art. 37.6 ET)
9. Informe de costes y nómina
10. Envío seguros sociales (FAN/TC2 dry-run SILTRA)
11. Registro horario del trabajador
12. Modelos 111 y 190 AEAT (dry-run)
13. Liquidación por despido disciplinario (indemnización = 0)
14. Liquidación por despido objetivo (20 d/año)
15. Comunicación de salida a la administración (baja TGSS + Certific@2 SEPE, dry-run)

## Confirmación de seguridad y compliance
- `isRealSubmissionBlocked() === true` se mantiene estrictamente.
- Comunicaciones oficiales (TGSS, SEPE, AEAT, INSS, DELT@) siguen en **modo preview/dry-run** con evidence pack. **No se envía nada a producción.**
- `persisted_priority_apply` sigue **OFF**.
- `PAYROLL_EFFECTIVE_CASUISTICA_MODE` no se ha tocado.
- No se han generado artefactos FDI / AFI / DELT@ reales.
- No se ha usado `service_role` en ningún flujo.

## Riesgos residuales
- **Bajo**: cambio puramente declarativo (un ítem nuevo en un array de menú). No afecta a runtime fuera de la presentación del menú.
- **Bajo**: la navegación reusa el mismo `setActiveModule` ya existente; cualquier `moduleId` no mapeado en `HRModule.tsx` simplemente no renderiza nada (sin crash).
- **Nulo en compliance**: no toca cálculos, motores, BD, RLS, ni envíos oficiales.

## Próximos pasos sugeridos (no incluidos en este BUILD)
- Opcional: añadir badge "Demo" al ítem si en el futuro se introduce soporte de `badge` en el `MenuItem`.
- Opcional: tracking analítico al abrir el recorrido demo desde comercial.
- WIZ-A (guía asistida convenio dudoso) sigue **NO implementada** y no se ha tocado en este turno.