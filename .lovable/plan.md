
## Plan: Modo Mantenimiento con Interruptor Admin

### Concepto
1. **Tabla en base de datos** `site_settings` con una fila para `maintenance_mode` (boolean) — fuente de verdad persistente.
2. **Hook `useMaintenanceMode`** que lee ese setting y expone `isMaintenanceMode` + `toggleMaintenanceMode`.
3. **Interruptor en el Admin Sidebar** (`ObelixiaAdminSidebar.tsx`) — nuevo item en la categoría "Sistema" llamado "Modo Mantenimiento" con un toggle switch directamente visible.
4. **Componente `MaintenancePage.tsx`** — página fullscreen con el estilo visual de la landing (fondo `#0a0f1a`, gradientes azul/violeta, partículas animadas), logo cerebro pulsante (`ObelixiaLogo`), nombre "ObelixIA", y un resumen de features diferenciales.
5. **Intercepción en `App.tsx`** — si `maintenance_mode === true` y el usuario NO es admin autenticado, renderiza `MaintenancePage` en lugar de las rutas normales. Los admins autenticados siguen viendo todo normal para poder desactivar el modo.

### Migración SQL
```sql
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
-- Lectura pública (todos necesitan saber si hay mantenimiento)
CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
-- Solo admins escriben
CREATE POLICY "Admins can update site_settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert site_settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, value) VALUES ('maintenance_mode', '{"enabled": false}'::jsonb);
```

### Hook `useMaintenanceMode.ts`
- Consulta `site_settings` donde `key = 'maintenance_mode'`
- Expone `{ isMaintenanceMode, loading, toggle }`
- `toggle` hace UPDATE del valor jsonb

### MaintenancePage.tsx
Página visualmente premium con:
- Fondo idéntico al hero (`#0a0f1a` + gradientes azul/violeta + grid sutil + partículas flotantes)
- Logo cerebro pulsante animado (reutilizando `ObelixiaLogo` size="xl")
- Título: "Estamos mejorando ObelixIA"
- Subtítulo: "Volvemos enseguida con más potencia"
- 6 feature cards minimalistas con iconos (IA integrada, BI en tiempo real, ERP modular, Nómina legal española, Automatizaciones inteligentes, Seguridad enterprise)
- Barra de progreso animada sutil
- Email de contacto o enlace a soporte

### Integración en App.tsx
- Importar `useMaintenanceMode`
- Crear componente wrapper `MaintenanceGuard` que:
  - Si `isMaintenanceMode && !isAdmin` → renderiza `<MaintenancePage />`
  - Si no → renderiza children normalmente
- Envolver `<AppRoutes />` con `<MaintenanceGuard>`

### Toggle en Admin
- En `ObelixiaAdminSidebar.tsx`, añadir al final de la categoría "Sistema" un item especial con Switch inline
- O mejor: en `ObelixiaAdminHeader.tsx`, añadir un botón/switch discreto con tooltip "Modo Mantenimiento"

### Archivos a crear/modificar
1. **Crear** `src/hooks/useMaintenanceMode.ts`
2. **Crear** `src/components/maintenance/MaintenancePage.tsx`
3. **Modificar** `src/App.tsx` — wrapper MaintenanceGuard
4. **Modificar** `src/components/obelixia-admin/ObelixiaAdminHeader.tsx` — toggle switch
5. **Migración** — tabla `site_settings`
