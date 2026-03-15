

# [RRHH-MOBILE.1] Plan por fases — App Móvil RRHH (Portal del Empleado)

---

## Estado actual

- **PWA ya configurada**: `vite-plugin-pwa` activo con manifest, service worker, caching y meta tags mobile.
- **Portal del Empleado completo** (V2-ES.9): 8 secciones funcionales en `/mi-portal` con guard, RLS, hooks y datos reales.
- **Navegación actual**: sidebar desktop + Sheet lateral en mobile (botón flotante FAB). No tiene bottom tabs nativos.
- **Componentes existentes**: EmployeePortalHome, Payslips (678 líneas), Documents, Requests, Time (364 líneas), Leave (867 líneas), Profile, Help — todos con datos desde Supabase.
- **Responsive parcial**: Los componentes usan `sm:`, `md:`, `lg:` breakpoints pero no están diseñados mobile-first. La navegación mobile es un Sheet lateral, no tabs inferiores.

**Diagnóstico clave**: La base funcional es sólida. El trabajo principal es **UX mobile-first** (bottom navigation, layouts compactos, acciones táctiles), no backend ni lógica nueva.

---

## FASE 1 — Shell móvil y navegación (Fundación)

**Objetivo**: Reemplazar la navegación lateral/Sheet por bottom tabs nativos cuando `isMobile`, crear el layout mobile-first del portal.

### Tareas:
1. **Crear `EmployeePortalMobileShell.tsx`** — Layout mobile con:
   - Header compacto sticky (nombre + avatar + logout)
   - Content area full-height con scroll
   - Bottom tab bar fijo con 5 tabs: Inicio, Nóminas, Solicitudes, Tiempo, Perfil
   - Documentos accesible desde Inicio (card) y Perfil (enlace)
   - Leave integrado dentro de tab Tiempo (sub-tab o sección)
   - Help accesible desde Perfil (enlace)

2. **Modificar `EmployeePortalShell.tsx`** — Detección `useIsMobile()`:
   - Si mobile → renderizar `EmployeePortalMobileShell`
   - Si desktop → mantener shell actual sin cambios

3. **Crear `EmployeePortalBottomNav.tsx`** — Bottom tab bar:
   - 5 tabs con iconos grandes (48px touch target mínimo)
   - Tab activo con indicador visual
   - Badges de conteo en Solicitudes (pendientes) y Tiempo (anomalías)

4. **Crear `EmployeePortalMobileHeader.tsx`** — Header mobile compacto:
   - Logo/icono + "Mi Portal" + avatar con dropdown (perfil, ayuda, salir)
   - Sin título largo, sin texto secundario

### Decisión de navegación:

```text
┌─────────────────────────────┐
│  [Logo] Mi Portal    [👤▾]  │  ← Header sticky
├─────────────────────────────┤
│                             │
│      Content Area           │  ← Scroll
│      (sección activa)       │
│                             │
├─────────────────────────────┤
│ 🏠  📄  📩  ⏰  👤         │  ← Bottom tabs
│ Inicio Nóminas Sol. Tiempo Perfil │
└─────────────────────────────┘
```

**Vacaciones/Leave**: Integrado como sub-sección dentro de "Tiempo" (coherencia: tiempo = fichaje + ausencias). Justificación: reduce tabs a 5 (máximo recomendado) sin perder funcionalidad.

**Documentos**: Accesible desde card en Inicio y desde sección en Perfil. No justifica tab propio por frecuencia de uso baja.

**Ayuda**: Accesible desde menú del avatar en header.

---

## FASE 2 — Adaptación mobile de cada sección

**Objetivo**: Optimizar cada sección existente para pantallas pequeñas sin duplicar componentes.

### Tareas por sección:

1. **Inicio (EmployeePortalHome)** — Ajustes mobile:
   - KPI cards en 2x2 grid (ya funciona) — verificar touch targets
   - Quick actions como cards grandes en vez de botones ghost
   - Ocultar sidebar derecha de "últimos movimientos" — mover abajo como sección lineal
   - Añadir card "Mis documentos" con badge de alertas
   - Añadir card "Vacaciones" con saldo rápido

2. **Nóminas (EmployeePayslipsSection)** — Ajustes:
   - Lista de nóminas sin tabla — ya usa cards, verificar ancho
   - Sheet de detalle full-screen en mobile (ya usa Sheet)
   - Botón descarga PDF prominente
   - Comparativa anterior simplificada (solo delta %)

3. **Solicitudes (EmployeeRequestsSection)** — Ajustes:
   - Lista con cards en vez de tabla si hay tabla
   - Formulario de nueva solicitud como fullscreen Sheet
   - Filtros colapsados por defecto en mobile
   - Estados con colores claros y badges grandes

4. **Tiempo (EmployeeTimeSection + Leave)** — Ajustes:
   - Sub-tabs: "Fichaje" | "Vacaciones"
   - Botón "Fichar" como CTA primario grande (si existe acción de fichaje)
   - Calendario de leave simplificado a lista en mobile
   - Resumen de jornada hoy prominente

5. **Perfil (EmployeeProfileSection)** — Ajustes:
   - Formulario simple en stack vertical
   - Enlace a "Mis documentos"
   - Enlace a "Ayuda RRHH"
   - Campos protegidos claramente marcados

6. **Documentos (EmployeeDocumentsSection)** — Ajustes:
   - Lista card-based
   - Acciones de descarga/upload con touch targets grandes
   - Accesible desde Inicio y Perfil, no tab propio

### Patrón de implementación:
- **No duplicar componentes** — usar `useIsMobile()` y variantes condicionales dentro de cada sección existente
- Usar `cn()` para clases condicionales mobile vs desktop
- Sheets/Dialogs → fullscreen en mobile (`className="sm:max-w-lg"` → mobile usa `side="bottom"` o fullscreen)

---

## FASE 3 — PWA polish y experiencia instalable

**Objetivo**: Asegurar que la PWA funciona como app real desde home screen.

### Tareas:
1. **Actualizar manifest PWA** para Portal del Empleado:
   - Añadir shortcut a `/mi-portal` en manifest
   - `start_url: '/mi-portal'` como opción (o mantener `/` con deep link)
   - Nombre: "RRHH - Portal Empleado"

2. **Añadir `/~oauth` a `navigateFallbackDenylist`** (ya requerido por docs, verificar que existe)

3. **Splash screen / loading states** optimizados para mobile:
   - Skeleton screens en vez de spinners
   - Pull-to-refresh en secciones principales (si viable con bajo esfuerzo)

4. **Offline resilience**:
   - Verificar que el service worker cachea correctamente las rutas del portal
   - Mensaje offline amigable si no hay conexión
   - Datos cacheados del último fetch visibles offline (ya soportado por NetworkFirst en Supabase API)

5. **Install prompt**:
   - Banner discreto en `/mi-portal` para instalar la app
   - Solo mostrar si `beforeinstallprompt` disponible

---

## FASE 4 — Notificaciones y centro de actividad

**Objetivo**: Añadir centro de actividad mínimo si es viable con bajo riesgo.

### Tareas:
1. **Badge de notificaciones** en header mobile:
   - Count de: solicitudes pendientes + docs con alertas + nómina nueva
   - Datos ya disponibles en `DashboardSummary`

2. **Panel de actividad reciente** (reutilizar `lastActivity` del dashboard):
   - Accesible desde icono campana en header
   - Sheet desde arriba con lista de últimos movimientos
   - Sin backend nuevo — usa datos existentes del hook

3. **Push notifications**: Documentar como futuro (requiere backend de push y permisos del navegador). No implementar en MVP.

---

## FASE 5 — Preparación para Manager y RRHH ligero (solo arquitectura)

**Objetivo**: Dejar la base preparada sin implementar.

### Tareas:
1. **Abstraer el role check** en el shell mobile:
   - `usePortalRole()` → `'employee' | 'manager' | 'hr_light'`
   - Bottom nav condicional por rol (tabs adicionales para manager)

2. **Documentar evolución**:
   - Manager: tab "Equipo" con aprobaciones, ausencias del equipo
   - RRHH ligero: tab "Gestión" con alertas, tareas urgentes, solicitudes pendientes del equipo

3. **No implementar** — solo dejar la arquitectura de routing/nav extensible

---

## Resumen de entregables por fase

| Fase | Entregable | Esfuerzo | Prioridad |
|------|-----------|----------|-----------|
| 1 | Shell mobile + bottom tabs + header | Medio | Bloqueante |
| 2 | Adaptación mobile de 6 secciones | Medio-Alto | Bloqueante |
| 3 | PWA polish + install + offline | Bajo | Alta |
| 4 | Centro de actividad + badges | Bajo | Media |
| 5 | Arquitectura manager/HR (solo docs) | Mínimo | Baja |

### Archivos nuevos estimados:
- `src/components/erp/hr/employee-portal/EmployeePortalMobileShell.tsx`
- `src/components/erp/hr/employee-portal/EmployeePortalBottomNav.tsx`
- `src/components/erp/hr/employee-portal/EmployeePortalMobileHeader.tsx`

### Archivos modificados:
- `EmployeePortalShell.tsx` (branch mobile/desktop)
- `EmployeePortalHome.tsx` (layout mobile)
- `EmployeeTimeSection.tsx` (integrar leave como sub-tab)
- `EmployeePayslipsSection.tsx` (mobile polish)
- `EmployeeRequestsSection.tsx` (mobile polish)
- `EmployeeProfileSection.tsx` (add links docs/help)
- `vite.config.ts` (manifest shortcut update)

### Lo que NO entra en el MVP:
- Motor de nómina / cálculo
- Backoffice RRHH
- Configuración avanzada
- Reporting denso / Board Pack
- Fiscalidad / SILTRA / AEAT
- Workflows complejos
- Enterprise / Talent
- Utilidades admin

### Arquitectura: PWA first
- **Por qué**: PWA ya configurada, zero friction de distribución, funciona en iOS/Android, no requiere app stores, service worker activo, offline support parcial ya existe.
- **Limitaciones aceptadas**: Sin push notifications nativo (Web Push viable pero limitado en iOS), sin acceso a hardware avanzado.
- **Evolución futura**: Si se necesita app store o hardware nativo, Capacitor se añade sobre la misma base React sin reescribir.

