

# S8.5 — Rediseño Landing HR: De tarjetas a Cockpit ERP Profesional

## Diagnóstico

Has subido dos PDFs que muestran la UI clásica de un ERP de nómina profesional (tipo Meta4/A3Equipo/Sage):
- **Nomina-5.pdf**: Ficha de empleado con barra de herramientas (Ver/Limpiar/Captura/Búsqueda/Historial), cabecera contextual (Entidad/Empleado/Rel. laboral), y pestañas de detalle (Perfiles, Datos personales, Motivos, Básicos, Opcionales)
- **Informar_procesos_entre_fechas-5.pdf**: Gestión de IT con cabecera + pestañas técnicas (Bases IT, Partes baja/alta, Confirmación, Otros datos, ERE)

Ambos comparten un **patrón de navegación ERP**: toolbar superior + contexto fijo + tabs de detalle. No son tarjetas sueltas.

## Veredicto: Las tarjetas NO son la mejor opción

Las tarjetas del `HRHubPage` actual son un índice pasivo — clickas y te vas a otra página. No aportan contexto operativo ni permiten trabajar sin navegación. Para un módulo de nómina profesional, lo ideal es un **cockpit contextual** que combine:

1. **Cabecera persistente** con el contexto activo (empresa, período, empleado seleccionado)
2. **Navegación por mega-menu** (ya existe en `HRNavigationMenu`)
3. **Área de trabajo con pestañas** que carguen paneles lazy sin cambiar de página

**Buena noticia: esto YA EXISTE en `HRModule.tsx`** — el módulo ERP de RRHH ya implementa exactamente este patrón con 100+ paneles lazy, mega-menu de 7 categorías, y stats en vivo.

## Recomendación estratosférica

En lugar de rediseñar desde cero, la mejor opción es:

1. **Eliminar la superficie duplicada** (`/obelixia-admin/hr/*` con sus 13 páginas standalone y tarjetas)
2. **Potenciar el HRModule existente** como punto único de entrada
3. **Añadir un "modo cockpit" inspirado en los PDFs** al HRModule: una cabecera contextual tipo ERP clásico con Entidad/Empleado/Período siempre visible

## Plan por Fases

### FASE 0 — Documentación y mapeo (sin código)
- Generar `docs/S8_5_hr_cockpit_integration.md`
- Mapear las 13 páginas standalone → panel equivalente en HRModule
- Confirmar que no hay funcionalidad exclusiva en Superficie B

### FASE 1 — Cabecera Cockpit ERP (aditivo, sin romper nada)
Crear `HRCockpitHeader.tsx` — componente inspirado en los PDFs:
```
┌─────────────────────────────────────────────────────────┐
│  🏢 Entidad: [Empresa actual]  👤 Empleado: [---]      │
│  📅 Período: [2026-04]   🔄 Rel. laboral: [---]        │
│  ─────────────────────────────────────────────────       │
│  [Ver] [Limpiar] [Búsqueda] [Historial] [Ayuda]        │
└─────────────────────────────────────────────────────────┘
```
- Se integra encima del mega-menu actual en `HRModule.tsx`
- Propaga el contexto (empresa, empleado, período) a los paneles hijos
- Opcional: selector de empleado inline para operar sin salir del cockpit

### FASE 2 — Absorción de motores legales exclusivos
Los componentes de `src/components/hr/` que no tienen equivalente en `src/components/erp/hr/`:
- `bridge/HRBridgeDashboard` → ya tiene `LazyHRIntegrationDashboard`
- `garnishments/GarnishmentSimulator` → ya tiene `LazyHRSettlementsPanel`
- `it/HRITProcessPanel` → ya tiene `LazyHRLeaveIncidentsPanel`
- `multi-employment/` → ya tiene paneles en Global
- `payroll/PayrollSimulatorPanel` → ya tiene `LazyHRPayrollEngine`

Si algún componente tiene funcionalidad exclusiva (ej. simulador de embargos Art. 607), se registra como nuevo panel lazy en `HRModuleLazy.tsx` y se añade al mega-menu.

### FASE 3 — Redirects y eliminación de duplicados
1. Convertir `HRHubPage` en redirect a `/obelixia-admin/erp?tab=hr`
2. Añadir redirects para las 13 rutas standalone:
   ```
   /obelixia-admin/hr/payroll → /obelixia-admin/erp?tab=hr (panel payroll-engine)
   /obelixia-admin/hr/audit → /obelixia-admin/erp?tab=hr (panel compliance-evidence)
   ...
   ```
3. Eliminar las 13 páginas de `src/pages/admin/hr/`
4. Limpiar rutas de `src/config/routes.ts`

### FASE 4 — Alineación S8 Error Contract (ya planificado)
Aplicar `extractErrorMessage()` a los hooks afectados — es el S8.4 ya aprobado.

### FASE 5 — Verificación integral S1-S8
- [ ] Multi-tenant: todos los paneles reciben `companyId` del `ERPContext`
- [ ] RLS intacto (no se tocan tablas ni edge functions)
- [ ] Error contract S8 funcional en superficie unificada
- [ ] Lazy loading en todos los paneles absorbidos
- [ ] Error boundaries activos

## Qué NO se toca
- Edge functions (0 cambios backend)
- Tablas y RLS (0 cambios de datos)
- Lógica de negocio de ningún panel existente
- `HRNavigationMenu` (ya es excelente)

## Resultado final
Un único cockpit profesional en `/obelixia-admin/erp?tab=hr` que:
- Tiene cabecera contextual tipo ERP clásico (inspirada en los PDFs)
- Mantiene el mega-menu de 7 categorías con 100+ paneles
- Absorbe los motores legales exclusivos de la superficie standalone
- Cumple S1-S8 sin residuos
- Zero duplicación de funcionalidad

## Entregable documental
`docs/S8_5_hr_cockpit_integration.md` con inventario completo, mapeo, y este plan ejecutable.

