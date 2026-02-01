
# Plan de Optimización del Módulo RRHH

## Contexto del Problema

El módulo de RRHH actualmente tiene **22 pestañas** en su navegación horizontal, lo que causa que no quepan visualmente en la pantalla (ver imagen). Además, cuando se accede al módulo de RRHH, la barra de navegación superior del ERP mantiene visibles los accesos a todos los módulos (Maestros, Ventas, Compras, etc.), lo cual es redundante porque estos ya son accesibles desde la pestaña "Resumen".

---

## Objetivos

1. **Reorganizar el menú del módulo RRHH** agrupando las 22 pestañas en categorías lógicas
2. **Ocultar las pestañas de módulos ERP** (Maestros, Ventas, Compras, Almacén, Contabilidad, Tesorería, Comercio, Logística, Fiscal, RRHH) cuando se está dentro de un módulo específico, mostrándolas solo en "Resumen"
3. **Revisar y completar los botones de las 8 nuevas Fases** para que sean 100% funcionales

---

## Plan de Implementación

### FASE A: Reorganización del Menú del Módulo RRHH

**Problema actual:** 22 pestañas en línea horizontal que no caben en pantalla.

**Solución propuesta:** Agrupar las pestañas en **5 categorías principales** usando un sistema de navegación jerárquico con submenús:

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard │ Talento ▼ │ Operaciones ▼ │ Desarrollo ▼ │ Herramientas ▼ │ Tendencias │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Estructura de categorías:**

| Categoría | Pestañas incluidas |
|-----------|-------------------|
| **Dashboard** | Panel ejecutivo (actual) |
| **Talento** | Empleados, Reclutamiento, Onboarding, Offboarding, Puestos |
| **Operaciones** | Nóminas, Seg. Social, Vacaciones, Contratos, Sindicatos, Documentos, Organización |
| **Desarrollo** | Desempeño, Formación, Analytics, Beneficios, PRL |
| **Herramientas** | Agente IA, Noticias, Normativa, Ayuda |
| **Tendencias** | 2026+ |

**Cambios técnicos:**
- Crear componente `HRNavigationMenu.tsx` con navegación desplegable
- Modificar `HRModule.tsx` para usar el nuevo sistema de navegación
- Mantener compatibilidad con deep linking existente

---

### FASE B: Ocultación Condicional de Módulos en Navegación ERP

**Problema actual:** Cuando estás en el módulo RRHH, la barra superior sigue mostrando todas las pestañas de módulos (Maestros, Ventas, Compras...), ocupando espacio innecesario.

**Solución propuesta:** Modificar `ERPModularDashboard.tsx` para ocultar dinámicamente las pestañas de módulos cuando `activeTab` no sea "overview".

**Lógica:**
- Si `activeTab === 'overview'`: Mostrar todas las pestañas de módulos
- Si `activeTab !== 'overview'` (ej: 'hr', 'sales', 'tax'): Ocultar pestañas de módulos y mostrar solo:
  - Botón "Resumen" (para volver al dashboard)
  - Pestañas de configuración (Empresas, Usuarios, Roles, Ejercicios, Series, Auditoría, Agentes IA, Supervisor)

**Cambios técnicos:**
- Crear variable `isInsideModule = activeTab !== 'overview'`
- Filtrar condicionalmente las `TabsTrigger` de módulos
- Añadir indicador visual del módulo activo en el header

---

### FASE C: Revisión Exhaustiva de Botones de las 8 Fases

A continuación se detalla el estado de funcionalidad de cada fase y las correcciones necesarias:

#### Fase 1: Puestos de Trabajo (HRJobPositionsPanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Nuevo Puesto" | ✅ Funcional | - |
| Editar puesto | ✅ Funcional | - |
| Eliminar puesto | ✅ Funcional | - |
| Añadir Responsabilidad | ✅ Funcional | - |
| Añadir Obligación | ✅ Funcional | - |

#### Fase 2: Reclutamiento (HRRecruitmentPanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Nueva Oferta" | ✅ Funcional | - |
| "Añadir Candidato" | ✅ Funcional | - |
| "Publicar oferta" | ✅ Funcional | - |
| "Analizar con IA" (candidato) | ✅ Funcional | - |
| **"Enviar Email"** | ❌ Sin handler | Implementar dialog de email |
| **"Agendar Entrevista"** | ❌ Sin handler | Implementar dialog de entrevista |
| Cambiar estado candidato | ✅ Funcional | - |

#### Fase 3: Onboarding (HROnboardingPanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Generar Plan IA" | ✅ Funcional | - |
| "Completar tarea" | ✅ Funcional | - |
| Ver tareas detalle | ✅ Funcional | - |
| **"Nuevo Onboarding"** | ⚠️ Dialog vacío | Implementar formulario completo con selector de empleado |

#### Fase 5: Offboarding (HROffboardingPanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Nuevo Proceso" | ✅ Funcional | - |
| Análisis IA | ✅ Funcional | - |
| Generar tareas | ✅ Funcional | - |
| **Ver análisis legal** | ⚠️ Solo muestra datos | Añadir botón de acción para solicitar revisión legal |

#### Fase 6: Desempeño (HRPerformancePanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Nuevo Ciclo" | ✅ Funcional | - |
| Crear objetivo | ⚠️ Dialog existe | Conectar con empleados reales |
| "Sugerir Objetivos IA" | ✅ Funcional | - |
| "Predecir Flight Risk" | ✅ Funcional | - |
| **Generar 9-Box Grid** | ⚠️ Solo visualización demo | Implementar llamada a IA para poblar grid real |
| **Configurar Bonus** | ❌ No implementado | Crear dialog de configuración de políticas de bonus |

#### Fase 7: Formación (HRTrainingPanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Análisis IA" (gaps) | ✅ Funcional | - |
| **"Nueva Competencia"** | ⚠️ Dialog declarado | Implementar formulario completo |
| **"Nueva Formación"** | ⚠️ Dialog declarado | Implementar formulario de catálogo |
| **"Nuevo Plan Formativo"** | ❌ No existe | Crear dialog de plan anual |
| **"Inscribir empleado"** | ❌ No existe | Crear dialog de inscripción |

#### Fase 8: Analytics Avanzado (HRAdvancedAnalyticsPanel)
| Botón/Acción | Estado | Corrección necesaria |
|--------------|--------|---------------------|
| "Actualizar" (cargar KPIs) | ✅ Funcional | - |
| **"Ver detalles" Flight Risk** | ⚠️ Solo tabla | Añadir dialog con plan de acción |
| **"Lanzar encuesta eNPS"** | ❌ No existe | Crear funcionalidad de encuesta |
| **"Exportar 9-Box"** | ❌ No existe | Implementar export PDF/Excel |

---

### FASE D: Implementación de Formularios Faltantes

Basado en la revisión anterior, se crearán los siguientes componentes:

1. **HREmailCandidateDialog.tsx** - Envío de emails a candidatos
2. **HRInterviewScheduleDialog.tsx** - Agendar entrevistas
3. **HROnboardingStartDialog.tsx** - Iniciar onboarding con empleado
4. **HRBonusConfigDialog.tsx** - Configuración de políticas de bonus
5. **HRCompetencyFormDialog.tsx** - Crear/editar competencias
6. **HRTrainingCatalogDialog.tsx** - Añadir formaciones al catálogo
7. **HRTrainingPlanDialog.tsx** - Crear plan formativo anual
8. **HRTrainingEnrollDialog.tsx** - Inscribir empleados en formación
9. **HRFlightRiskActionDialog.tsx** - Plan de acción para empleados en riesgo
10. **HRENPSSurveyDialog.tsx** - Lanzar encuesta eNPS

---

## Resumen de Archivos a Modificar

| Archivo | Tipo de cambio |
|---------|----------------|
| `src/components/erp/ERPModularDashboard.tsx` | Modificar - Navegación condicional |
| `src/components/erp/hr/HRModule.tsx` | Modificar - Nueva navegación agrupada |
| `src/components/erp/hr/HRNavigationMenu.tsx` | **Crear** - Componente de navegación |
| `src/components/erp/hr/HRRecruitmentPanel.tsx` | Modificar - Añadir handlers email/entrevista |
| `src/components/erp/hr/HROnboardingPanel.tsx` | Modificar - Dialog de inicio completo |
| `src/components/erp/hr/HRPerformancePanel.tsx` | Modificar - Añadir config bonus, 9-Box real |
| `src/components/erp/hr/HRTrainingPanel.tsx` | Modificar - Completar dialogs |
| `src/components/erp/hr/HRAdvancedAnalyticsPanel.tsx` | Modificar - Añadir acciones |
| `src/components/erp/hr/dialogs/*.tsx` | **Crear** - 10 nuevos dialogs |
| `src/components/erp/hr/index.ts` | Modificar - Exportar nuevos componentes |

---

## Orden de Ejecución

1. **Fase A** (Prioridad Alta): Reorganizar menú RRHH - Impacto visual inmediato
2. **Fase B** (Prioridad Alta): Ocultar módulos en navegación - Mejora UX
3. **Fase C** (Prioridad Media): Revisar y documentar botones faltantes
4. **Fase D** (Prioridad Media): Implementar dialogs faltantes uno a uno

---

## Sección Técnica

### Componente HRNavigationMenu propuesto

```text
Interface:
- activeModule: string
- onModuleChange: (module: string) => void
- stats: { pendingPayrolls, pendingVacations, safetyAlerts }

Estructura:
- Tabs primario (5 categorías + Dashboard + Tendencias)
- Dropdown/Popover para submenús
- Badges con contadores en categorías relevantes
- Animaciones suaves en transiciones
```

### Lógica de ocultación en ERPModularDashboard

```text
const moduleTabIds = ['maestros', 'sales', 'purchases', 'inventory', 
                      'accounting', 'treasury', 'trade', 'logistics', 
                      'tax', 'hr'];

const isInsideModule = moduleTabIds.includes(activeTab) || activeTab !== 'overview';

// En el render del TabsList:
{!isInsideModule && hasPermission('masters.read') && (
  <TabsTrigger value="maestros">Maestros</TabsTrigger>
)}
// ... repetir para cada módulo
```
