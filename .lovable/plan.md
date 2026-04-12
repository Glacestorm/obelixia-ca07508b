

## S9.11-P6 — Evaluación de tabs ocultas en MVP

### Evaluacion

| Tab | Madurez | Riesgo | Valor inmediato | Veredicto |
|-----|---------|--------|-----------------|-----------|
| **Auditoría documental** | Alta — componente completo, read-only, con filtros y resumen por tipo de accion | Muy bajo — solo lectura, sin escritura, sin side effects | Alto — visibilidad de compliance sin salir del expediente | **Activar** |
| Consentimientos | Media — funcional pero con operaciones de escritura (registrar, revocar) | Medio — acciones destructivas (revocar), formulario con UUID manual | Medio — valioso pero requiere flujo supervisado | Dejar oculta |
| Retención documental | Media — funcional pero con crear/eliminar politicas | Alto — acciones destructivas (eliminar política), configuracion regulatoria sensible | Bajo en MVP — es config avanzada, no consulta diaria | Dejar oculta |

### Decision

Activar **solo Auditoría documental**. Es la unica tab que es 100% read-only, no genera falsas expectativas de edicion, y aporta valor de compliance inmediato.

### Implementacion

**Archivo**: `src/components/erp/hr/document-expedient/DocumentExpedientModule.tsx`

Cambio minimo: mostrar la tab "Auditoría" incluso en `mvpMode`, manteniendo Consentimientos y Retención ocultas.

```text
Antes:  {showFull && <TabsTrigger value="audit">...}
Despues: <TabsTrigger value="audit">...  (siempre visible)

Antes:  {showFull && <TabsContent value="audit">...}
Despues: <TabsContent value="audit">...  (siempre renderizado)
```

Las otras dos tabs (`consents`, `retention`) siguen controladas por `showFull`.

### Checklist de regresion

- Expediente documental sigue siendo ligero (solo 1 tab nueva, read-only)
- No se crean falsas expectativas regulatorias (auditoría es solo consulta)
- Modo MVP no se rompe (Consentimientos y Retención siguen ocultas)
- No hay cambios de backend, SQL, RLS ni auth
- DocumentAuditPanel ya tiene estados de loading y vacio implementados

