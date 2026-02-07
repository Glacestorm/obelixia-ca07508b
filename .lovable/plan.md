
# Plan: Sistema de IA Híbrida - Migración de Auditoría e Integración en Módulos

## Resumen Ejecutivo
Crearemos la tabla `ai_audit_logs` para el cumplimiento normativo, integraremos el `AIAnalyticsPanel` en el dashboard principal, y reorganizaremos la IA Híbrida como submódulo dentro de "Utilidades" tanto en ERP como en CRM para mejor organización.

---

## Fase 1: Migración de Base de Datos para `ai_audit_logs`

### Nueva Tabla: `ai_audit_logs`

La tabla soportará el hook `useAIComplianceAudit` existente con campos para:

```text
+-------------------+------------------------+----------------------------+
| Campo             | Tipo                   | Descripción                |
+-------------------+------------------------+----------------------------+
| id                | UUID (PK)              | Identificador único        |
| event_type        | TEXT                   | Tipo de evento de auditoría|
| user_id           | UUID                   | Usuario que realizó acción |
| user_email        | TEXT                   | Email del usuario          |
| entity_type       | TEXT                   | Tipo de entidad afectada   |
| entity_id         | TEXT                   | ID de la entidad           |
| action            | TEXT                   | Descripción de la acción   |
| details           | JSONB                  | Detalles adicionales       |
| data_classification| TEXT                  | Nivel de clasificación     |
| ip_address        | INET                   | Dirección IP del cliente   |
| user_agent        | TEXT                   | User agent del navegador   |
| compliance_flags  | TEXT[]                 | Frameworks afectados       |
| risk_level        | TEXT                   | low/medium/high/critical   |
| was_blocked       | BOOLEAN                | Si fue bloqueado           |
| metadata          | JSONB                  | Metadatos adicionales      |
| created_at        | TIMESTAMPTZ            | Fecha de creación          |
+-------------------+------------------------+----------------------------+
```

### Índices Optimizados
- `idx_audit_logs_created_at` - Para búsquedas temporales
- `idx_audit_logs_event_type` - Filtrado por tipo
- `idx_audit_logs_user_id` - Búsquedas por usuario
- `idx_audit_logs_risk_level` - Filtrado por riesgo
- `idx_audit_logs_compliance` - Búsquedas por framework (GIN)

### Políticas RLS
- Service role con acceso completo
- Usuarios autenticados pueden ver sus propios logs

---

## Fase 2: Integración de AIAnalyticsPanel en Dashboard

### Actualizar `AIUnifiedDashboard.tsx`

Añadir una sexta pestaña "Analytics" que muestre el `AIAnalyticsPanel` existente:

```text
Tabs actuales:           Nueva estructura:
+----------+             +----------+
| Overview |             | Overview |
| Providers|             | Providers|
| Credits  |      →      | Credits  |
| Privacy  |             | Privacy  |
| Routing  |             | Routing  |
+----------+             | Analytics| ← NUEVO
                         +----------+
```

---

## Fase 3: Reorganización en Módulos ERP y CRM

### Estructura Propuesta

La IA Híbrida se integrará dentro de la pestaña **"Utilidades"** existente en el ERP (y se creará en CRM), proporcionando un acceso más organizado:

```text
ERP Modular Dashboard
├── Resumen
├── [Módulos: Maestros, Ventas, Compras, etc.]
├── Configuración [Empresas, Usuarios, Roles]
├── Agentes IA
├── Supervisor
├── Migración
└── Utilidades ← Aquí se añade
    ├── Generador de Auditorías (existente)
    └── IA Híbrida Universal ← NUEVO SUBMÓDULO
```

```text
CRM Modular Dashboard
├── Resumen
├── [Módulos: Pipeline, Contactos, Inbox, etc.]
├── Agentes IA
├── Integraciones
├── Config
├── Supervisor
└── Utilidades ← NUEVO TAB
    └── IA Híbrida Universal
```

### Componentes a Modificar

**1. ERPModularDashboard.tsx**
- Expandir la pestaña "Utilidades" con sub-navegación
- Añadir opción "IA Híbrida" junto a "Generador de Auditorías"

**2. CRMModularDashboard.tsx**
- Añadir nueva pestaña "Utilidades"
- Incluir AIUnifiedDashboard como submódulo

---

## Fase 4: Optimizaciones Adicionales

### 4.1 Mejoras al Sistema de Auditoría
- Función de limpieza automática según retención (2 años GDPR)
- Trigger para alertas en eventos críticos

### 4.2 Mejoras de Rendimiento
- Índices parciales para queries frecuentes
- Particionado por fecha para tablas grandes (futuro)

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `migrations/ai_audit_logs.sql` | Crear | Nueva tabla de auditoría |
| `AIUnifiedDashboard.tsx` | Modificar | Añadir tab Analytics |
| `ERPModularDashboard.tsx` | Modificar | Submódulo IA en Utilidades |
| `CRMModularDashboard.tsx` | Modificar | Nueva tab Utilidades + IA |

---

## Beneficios de la Nueva Organización

1. **Centralización**: IA Híbrida accesible desde ambos módulos (CRM/ERP)
2. **Consistencia**: Misma experiencia de usuario en ambos contextos
3. **Escalabilidad**: Fácil añadir más utilidades en el futuro
4. **Compliance**: Auditoría integrada con sistema de privacidad
5. **Mantenibilidad**: Componentes reutilizables

---

## Sección Técnica

### SQL de Migración (ai_audit_logs)
```sql
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  data_classification TEXT,
  ip_address INET,
  user_agent TEXT,
  compliance_flags TEXT[] DEFAULT '{}',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  was_blocked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_ai_audit_logs_created ON public.ai_audit_logs(created_at DESC);
CREATE INDEX idx_ai_audit_logs_type ON public.ai_audit_logs(event_type);
CREATE INDEX idx_ai_audit_logs_user ON public.ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_logs_risk ON public.ai_audit_logs(risk_level);
CREATE INDEX idx_ai_audit_logs_compliance ON public.ai_audit_logs USING GIN (compliance_flags);

-- RLS
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
ON public.ai_audit_logs FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Users view own audit logs"
ON public.ai_audit_logs FOR SELECT
USING (auth.uid() = user_id);
```

### Estructura de Utilidades en UI
```tsx
// Dentro de ERPModularDashboard - TabsContent "utilities"
<Tabs defaultValue="audit">
  <TabsList>
    <TabsTrigger value="audit">Auditorías</TabsTrigger>
    <TabsTrigger value="ai-hybrid">IA Híbrida</TabsTrigger>
  </TabsList>
  <TabsContent value="audit">
    <UnifiedAuditGenerator defaultScope="erp" />
  </TabsContent>
  <TabsContent value="ai-hybrid">
    <AIUnifiedDashboard />
  </TabsContent>
</Tabs>
```
