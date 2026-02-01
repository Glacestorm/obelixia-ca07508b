
# Plan: Integrar Agente Fiscal en el Centro de Control de Agentes IA

## Problema Identificado

El **Agente Fiscal** no aparece en el Centro de Control de Agentes IA porque el componente `SupervisorAgentsDashboard.tsx` utiliza una lista estática de agentes ERP que no incluye al Agente Fiscal.

Actualmente hay 8 agentes ERP listados:
- Maestros, Ventas, Compras, Inventario, Contabilidad, Tesorería, Comercio, Logística

**Falta el Agente Fiscal** que sí está correctamente definido en la configuración central (`erpAgentConfig.ts`).

---

## Solución Propuesta

### Paso 1: Añadir Agente Fiscal al Array ERP_AGENTS

**Archivo**: `src/components/admin/agents/SupervisorAgentsDashboard.tsx`

Añadir una nueva entrada al array `ERP_AGENTS` (después de línea 116):

```typescript
const ERP_AGENTS: AgentModule[] = [
  // ... agentes existentes ...
  { id: 'erp-logistica', name: 'Agente Logística', ... },
  // NUEVO: Agente Fiscal
  { 
    id: 'erp-fiscal', 
    name: 'Agente Fiscal', 
    domain: 'erp', 
    module: 'Fiscal', 
    status: 'active', 
    healthScore: 95, 
    lastActivity: new Date(), 
    tasksCompleted: 178, 
    capabilities: ['sii_management', 'vat_calculation', 'intrastat_reporting', 'tax_compliance', 'fiscal_calendar', 'multi_jurisdiction'], 
    metrics: { declarations: 45, sii_entries: 890, compliance_score: 98 } 
  },
];
```

### Resultado Esperado

Una vez añadido:

| Antes | Después |
|-------|---------|
| "8 agentes ERP" | "9 agentes ERP" |
| Tab "ERP (8)" | Tab "ERP (9)" |
| Sin Agente Fiscal en lista | Agente Fiscal visible |
| Sin Fiscal en Supervisor | Fiscal en selector Supervisor |

---

## Ubicaciones que se Actualizarán Automáticamente

Como el código usa `ERP_AGENTS.length`, estas ubicaciones se actualizarán automáticamente:

1. **Header** (línea 480): `Supervisor General + 9 agentes ERP + 6 agentes CRM`
2. **Tab ERP** (línea 532): `ERP (9)`
3. **Grid de agentes** (línea 672-680): Mostrará 9 tarjetas
4. **Selector Supervisor** (línea 734-750): Listará 9 agentes bajo "ERP"

---

## Detalles Técnicos

### Capacidades del Agente Fiscal

Basándome en la configuración existente en `erpAgentConfig.ts`:

```text
┌─────────────────────────────────────────────────────┐
│            AGENTE FISCAL - Capacidades              │
├─────────────────────────────────────────────────────┤
│  sii_management       │ Gestión SII (Libro registro)│
│  vat_calculation      │ Cálculo de IVA              │
│  intrastat_reporting  │ Declaraciones Intrastat     │
│  tax_compliance       │ Cumplimiento tributario     │
│  fiscal_calendar      │ Calendario fiscal           │
│  multi_jurisdiction   │ Multi-jurisdicción          │
└─────────────────────────────────────────────────────┘
```

### Métricas Específicas

```typescript
metrics: { 
  declarations: 45,      // Declaraciones procesadas
  sii_entries: 890,      // Registros SII enviados
  compliance_score: 98   // Puntuación cumplimiento
}
```

---

## Tiempo Estimado

- **Implementación**: ~2 minutos
- **Verificación**: Inmediata tras despliegue

---

## Verificación Post-Implementación

Tras aplicar el cambio:

1. Navegar a `/obelixia-admin/erp` o al Centro de Control de Agentes
2. Verificar que la pestaña "ERP" muestre "(9)" en lugar de "(8)"
3. Confirmar que el Agente Fiscal aparece en:
   - Grid de agentes ERP
   - Selector de agentes en pestaña "Supervisor"
   - Preview de agentes (si está entre los primeros 4)
4. Probar el botón "Interactuar" del Agente Fiscal
