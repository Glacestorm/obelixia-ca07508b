
# Plan de Mejoras Avanzadas del Modulo RRHH

## Objetivo General
Implementar acciones operativas desde la ayuda, control de acceso basado en roles para el Agente IA, sistema de innovacion 2026+ con implementacion real, y verificacion de todos los botones operativos.

---

## Fase 1: Ayuda Activa con Formularios Operativos

### Descripcion
Transformar el indice de ayuda en un centro de comandos donde cada clic en una opcion (como "Calculo de finiquitos") abra directamente un formulario especializado con opciones de calculo automatico supervisadas por el Agente IA.

### Cambios Tecnicos

**1.1 Nuevo Componente: HRSeveranceCalculatorDialog**
- Formulario para calculo de finiquitos e indemnizaciones
- Seleccion de empleado desde la base de datos
- Tipo de extincion: voluntaria, objetivo, improcedente, fin de contrato
- Fechas de contrato y salario base
- Calculo automatico via Edge Function `erp-hr-ai-agent`
- Supervision del Agente IA con explicaciones paso a paso

**1.2 Nuevo Componente: HRIndemnizationCalculatorDialog**
- Formulario especializado para indemnizaciones por despido
- Aplicacion automatica de limites legales (20/33 dias por anno)
- Visualizacion del calculo desglosado

**1.3 Actualizacion de HRHelpIndex.tsx**
- Nuevas acciones rapidas: `severance_form`, `indemnization_form`, `compliance_audit`, `prl_check`
- Cada badge de accion rapida abre el formulario correspondiente
- Integracion con `onAskAgent` para supervision IA

**1.4 Actualizacion de HRModule.tsx**
- Estados para nuevos dialogs: `showSeveranceDialog`, `showIndemnizationDialog`
- Callbacks para abrir dialogs desde HRHelpIndex
- Prop adicional en HRHelpIndex: `onOpenSeveranceDialog`, `onOpenIndemnizationDialog`

---

## Fase 2: Control de Acceso del Agente IA por Roles

### Descripcion
El Agente IA de RRHH debe conocer todos los datos de empleados, pero solo usuarios con rol de RRHH (o superior jerarquico) pueden consultar esta informacion.

### Cambios Tecnicos

**2.1 Migracion de Base de Datos**
```text
- Tabla: erp_hr_agent_access_control
  - user_id (FK auth.users)
  - company_id
  - can_view_all_employees: boolean
  - can_view_salaries: boolean
  - can_view_sensitive_data: boolean
  - hierarchy_level: integer (1=CEO, 2=Director, 3=Manager, 4=Employee)
  - created_at, updated_at
```

**2.2 Actualizacion Edge Function: erp-hr-ai-agent**
- Nueva accion: `validate_access`
- Verificar permisos del usuario antes de devolver datos sensibles
- Consultar `erp_hr_employee_module_access` para validar rol RRHH
- Verificar posicion jerarquica vs empleado consultado
- Respuesta filtrada segun permisos

**2.3 Nueva Funcion SQL: check_hr_agent_access**
```text
SECURITY DEFINER function que:
- Recibe user_id y target_employee_id
- Verifica si usuario tiene acceso RRHH (read/write/admin)
- Verifica posicion jerarquica
- Retorna nivel de acceso permitido
```

**2.4 Actualizacion HRAIAgentPanel.tsx**
- Verificar permisos del usuario al iniciar chat
- Mostrar mensaje de acceso denegado si no tiene permisos
- Indicador visual del nivel de acceso del usuario

---

## Fase 3: Sistema de Innovacion 2026+ Implementable

### Descripcion
Cada idea futurista del panel 2026+ tendra un boton "Implementar" que activara esa funcionalidad progresivamente. Ademas, un sistema de busqueda periodica de nuevas ideas.

### Cambios Tecnicos

**3.1 Migracion de Base de Datos**
```text
- Tabla: erp_hr_innovation_features
  - id, feature_code, feature_name
  - description, category
  - is_implemented: boolean
  - implemented_at: timestamp
  - implementation_config: jsonb
  - created_at

- Tabla: erp_hr_innovation_ideas
  - id, title, description
  - source: 'ai_discovery' | 'manual' | 'external'
  - relevance_score: integer
  - is_reviewed: boolean
  - is_approved: boolean
  - discovered_at: timestamp
```

**3.2 Nueva Edge Function: erp-hr-innovation-discovery**
- Acciones: `discover_trends`, `check_new_ideas`, `implement_feature`, `get_pending_ideas`
- Busqueda de tendencias HR via IA (Lovable AI)
- Evaluacion de relevancia y aplicabilidad
- Ejecucion semanal automatica (cron job)

**3.3 Actualizacion HRTrends2026Panel.tsx**
- Boton "Implementar" en cada TrendCard (si no esta implementado)
- Indicador de estado: "Implementado" / "En progreso" / "Disponible"
- Seccion nueva: "Ideas Descubiertas" con ideas pendientes de revision
- Panel de configuracion post-implementacion
- Llamada a Edge Function para activar feature

**3.4 Nuevo Componente: HRInnovationImplementDialog**
- Wizard de implementacion por fases
- Configuracion de parametros especificos
- Confirmacion y activacion

---

## Fase 4: Verificacion y Operatividad de Todos los Botones

### Descripcion
Auditoria completa de todos los botones del modulo RRHH para asegurar que cada uno tiene una funcion operativa real.

### Botones a Verificar y Completar

**4.1 HRPayrollPanel.tsx**
- "Nueva Nomina" → abre HRPayrollEntryDialog (verificar operativo)
- "Calcular Todas" → ejecutar calculo masivo via Edge Function
- "Exportar SEPA" → generar archivo XML SEPA real
- "Ver Nomina" → abrir dialog de visualizacion de nomina

**4.2 HRVacationsPanel.tsx**
- "Solicitar Vacaciones" → HRVacationRequestDialog (verificar)
- "Aprobar" → actualizar estado en DB + sincronizar con IA
- "Rechazar" → dialog de motivo + actualizar DB

**4.3 HRContractsPanel.tsx**
- "Nuevo Contrato" → crear HRContractFormDialog
- "Ver Contrato" → visualizador PDF/dialog
- "Finalizar" → crear HRContractTerminationDialog

**4.4 HREmployeesPanel.tsx**
- "Nuevo Empleado" → HREmployeeFormDialog (verificar completo)
- "Editar" → mismo dialog en modo edicion
- "Ver Ficha" → dialog de visualizacion readonly
- Busqueda avanzada → verificar filtros operativos

**4.5 HRAlertsPanel.tsx**
- "Marcar Leida" → actualizar DB
- "Enviar por WhatsApp" → invocar send-hr-alert con canal WhatsApp
- "Enviar por Email" → invocar send-hr-alert con canal Email
- "Configurar Preferencias" → abrir dialog de preferencias

**4.6 HRSafetyPanel.tsx**
- "Registrar Incidente" → crear HRIncidentFormDialog
- "Ver Evaluacion" → visualizador de evaluacion PRL
- "Generar Informe" → Edge Function para PDF

**4.7 Nuevos Dialogs Necesarios**
- HRContractFormDialog
- HRContractTerminationDialog
- HRIncidentFormDialog
- HRPayrollViewerDialog
- HRAlertPreferencesDialog (verificar existencia)

---

## Fase 5: Sincronizacion Completa con Agente IA

### Descripcion
El Agente IA debe conocer en tiempo real: empleados, ausencias, alertas, y cualquier evento relevante.

### Cambios Tecnicos

**5.1 Actualizacion Edge Function: erp-hr-ai-agent**
- Nueva accion: `get_all_employees` (con filtro de permisos)
- Nueva accion: `get_department_structure`
- Nueva accion: `get_active_incidents`
- Enriquecimiento del contexto del chat con todos los datos disponibles

**5.2 Trigger de Base de Datos**
```text
Trigger en erp_hr_employees, erp_hr_leave_requests, erp_hr_alerts:
- Al INSERT/UPDATE marcar flag ai_sync_pending = true
- Permitir al agente consultar cambios pendientes
```

**5.3 Actualizacion HRAIAgentPanel.tsx**
- Indicador de "ultima sincronizacion"
- Boton "Actualizar Contexto"
- Visualizacion de datos que el agente conoce actualmente

---

## Fase 6: Tab de Alertas Integrada en Navegacion

### Descripcion
Agregar tab de Alertas visible en la navegacion principal del modulo HR con contador de alertas no leidas.

### Cambios Tecnicos

**6.1 Actualizacion HRModule.tsx**
- Agregar TabsTrigger para "alerts" con icono Bell
- Badge con contador de alertas criticas
- Estado `alertsCount` obtenido de hook o DB

---

## Resumen de Archivos a Crear/Modificar

### Nuevos Archivos
1. `src/components/erp/hr/HRSeveranceCalculatorDialog.tsx`
2. `src/components/erp/hr/HRIndemnizationCalculatorDialog.tsx`
3. `src/components/erp/hr/HRContractFormDialog.tsx`
4. `src/components/erp/hr/HRContractTerminationDialog.tsx`
5. `src/components/erp/hr/HRIncidentFormDialog.tsx`
6. `src/components/erp/hr/HRPayrollViewerDialog.tsx`
7. `src/components/erp/hr/HRInnovationImplementDialog.tsx`
8. `supabase/functions/erp-hr-innovation-discovery/index.ts`
9. `supabase/migrations/XXXXX_hr_innovation_and_access.sql`

### Archivos a Modificar
1. `src/components/erp/hr/HRHelpIndex.tsx` - Acciones rapidas operativas
2. `src/components/erp/hr/HRModule.tsx` - Nuevos dialogs y tab alertas
3. `src/components/erp/hr/HRTrends2026Panel.tsx` - Botones implementar
4. `src/components/erp/hr/HRPayrollPanel.tsx` - Botones operativos
5. `src/components/erp/hr/HRContractsPanel.tsx` - Botones operativos
6. `src/components/erp/hr/HRSafetyPanel.tsx` - Botones operativos
7. `src/components/erp/hr/HRAlertsPanel.tsx` - Acciones multicanal
8. `supabase/functions/erp-hr-ai-agent/index.ts` - Control acceso + empleados
9. `supabase/config.toml` - Nueva funcion innovation-discovery
10. `src/components/erp/hr/index.ts` - Exports nuevos componentes

---

## Orden de Ejecucion Recomendado

1. **Fase 1** - Ayuda activa (alto impacto UX)
2. **Fase 4** - Botones operativos (funcionalidad core)
3. **Fase 2** - Control acceso IA (seguridad)
4. **Fase 5** - Sincronizacion IA (inteligencia)
5. **Fase 3** - Innovacion 2026+ (valor futuro)
6. **Fase 6** - Tab alertas (visibilidad)

