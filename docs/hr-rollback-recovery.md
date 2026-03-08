# 🔄 ROLLBACK Y RECUPERACIÓN — Módulo RRHH

## Versión: 1.0 | Fecha: 2026-03-08

---

## 1. Rollback de Edge Functions

### Procedimiento
1. Identificar la función problemática
2. Revertir el código en el repositorio al commit anterior estable
3. Lovable Cloud re-despliega automáticamente al hacer push
4. Verificar con curl que la función responde correctamente
5. Monitorear logs durante 15 minutos

### Funciones críticas (orden de prioridad de rollback)
1. `hr-premium-api` — Afecta integraciones externas
2. `hr-enterprise-integrations` — Afecta sincronización con sistemas externos
3. `hr-reporting-engine` — Afecta reporting diario
4. `hr-compliance-automation` — Afecta cumplimiento regulatorio
5. `hr-board-pack` — Menos urgente (bajo demanda)

---

## 2. Control de Migraciones

### Reglas
- Las migraciones de base de datos NO se revierten automáticamente
- Si una migración introduce un bug: crear una **nueva migración correctiva**
- Nunca eliminar columnas en caliente que estén en uso por la UI
- Procedimiento: crear migración inversa → desplegar → verificar

### Migración de emergencia
```sql
-- Ejemplo: desactivar una columna problemática sin borrarla
ALTER TABLE erp_hr_employees ALTER COLUMN problematic_field SET DEFAULT NULL;
-- O renombrar temporalmente
ALTER TABLE erp_hr_employees RENAME COLUMN problematic_field TO _deprecated_problematic_field;
```

---

## 3. Desactivación Temporal de Módulos

Si un submodulo RRHH causa problemas:

### Opción A: Desactivar en UI
- Los paneles premium se pueden desactivar ocultando la ruta en el router
- No requiere rollback de backend

### Opción B: Desactivar Edge Function
- Modificar la función para retornar respuesta de mantenimiento:
```typescript
return new Response(JSON.stringify({
  success: false,
  error: 'maintenance',
  message: 'Módulo en mantenimiento temporalmente'
}), { status: 503, headers: corsHeaders });
```

### Opción C: Desactivar via Feature Flag
- Añadir check en la función: `if (maintenance_mode) return 503`
- Controlar via variable de entorno o tabla de configuración

---

## 4. Fallback en Integraciones

Si una integración externa falla:
1. Los datos locales siguen intactos y operativos
2. Marcar la integración como `status: 'paused'` en `erp_hr_integration_configs`
3. Los webhooks se encolan y reintentan automáticamente
4. Cuando el sistema externo vuelva: reactivar integración
5. Ejecutar sincronización manual si hay datos pendientes

---

## 5. Fallos en Reportes / Board Packs

Si un reporte se genera con datos erróneos:
1. Cambiar estado a `draft` o `rejected`
2. Revisar datos fuente en las tablas de origen
3. Corregir datos si es necesario
4. Re-generar el reporte
5. Verificar antes de distribuir

Si la generación falla completamente:
1. Revisar logs de la edge function
2. Verificar AI Gateway
3. Reintentar con payload simplificado
4. Si persiste: generar reporte manual desde datos exportados

---

## 6. Vuelta a Estado Estable

### Checklist de recuperación rápida
- [ ] Identificar la causa raíz
- [ ] Aislar el componente afectado (desactivar si es necesario)
- [ ] Verificar que el resto del módulo opera normalmente
- [ ] Aplicar fix o rollback
- [ ] Verificar con tests
- [ ] Re-activar componente
- [ ] Monitorear 30 minutos
- [ ] Documentar incidencia
