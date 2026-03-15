# RRHH-PILOT.1 — Guía de Piloto Interno Real

## A. DISEÑO DEL PILOTO

### Identificación de empresa piloto
- Usar una **empresa diferente** (company_id distinto) al de la demo comercial
- Crear la empresa piloto en `erp_companies` con datos reales
- Seleccionarla en el ERPCompanySelector para trabajar con datos reales

### Separación de entornos
| Contexto | company_id | Env RRHH | Seeds permitidos | Datos |
|----------|-----------|----------|-----------------|-------|
| DEMO | `[id-demo]` | demo | ✅ Todos | Ficticios |
| PILOTO | `[id-piloto]` | preprod | ❌ Ninguno | Reales |
| PRODUCCIÓN | `[id-prod]` | prod | ❌ Ninguno | Reales |

### Protección
- El banner `HREnvironmentBanner` muestra el modo activo
- En modo `preprod`/`prod`: seeds bloqueados, demo tools ocultos
- El Checklist Piloto (Utilidades → Piloto) valida el estado

---

## B. DATOS REALES MÍNIMOS DE ARRANQUE

### Checklist de datos (14 puntos)

| # | Dato | Tabla | Obligatorio | Cómo cargar |
|---|------|-------|-------------|-------------|
| 1 | Empresa piloto | `erp_companies` | ✅ | Manual via ERP |
| 2 | Entidad legal | `erp_hr_legal_entities` | Recomendado | Empresa → Legal entities |
| 3 | Centro de trabajo | `erp_hr_work_centers` | Recomendado | Empresa → Centros |
| 4 | Departamentos | `erp_hr_departments` | ✅ | RRHH → Organización |
| 5 | Empleados | `erp_hr_employees` | ✅ | RRHH → Empleados → Alta |
| 6 | Contratos | `erp_hr_contracts` | ✅ | RRHH → Contratos |
| 7 | Conceptos salariales | `erp_hr_payroll_concepts` | ✅ | Seed automático o manual |
| 8 | Períodos de nómina | `erp_hr_payroll_periods` | Recomendado | RRHH → Nómina → Períodos |
| 9 | Tipos de ausencia | `erp_hr_leave_types` | Recomendado | RRHH → Vacaciones config |
| 10 | Saldos de vacaciones | `erp_hr_leave_balances` | Recomendado | Manual |
| 11 | Calendario laboral | `erp_hr_holiday_calendar` | Opcional | ES Localización |
| 12 | Datos fiscales empleado | `erp_hr_employee_details` | Recomendado | Expediente empleado |
| 13 | Vinculación portal (user_id) | `erp_hr_employees.user_id` | Recomendado | UPDATE manual |
| 14 | Convenio colectivo | `erp_hr_collective_agreements` | Opcional | RRHH → Convenios |

---

## C. AISLAMIENTO DEMO VS PILOTO

### Mecanismos activos
1. **company_id diferente**: Cada empresa tiene su propio silo de datos (multi-tenant RLS)
2. **HREnvironmentContext**: Bloquea seeds en modo preprod/prod
3. **metadata.is_demo_master**: Marca datos demo para filtrado
4. **Checklist Piloto**: Detecta si hay mezcla demo/real en misma empresa

### Riesgos mitigados
- ❌ No se puede ejecutar Seed Demo Maestro en empresa piloto (modo preprod)
- ❌ No se puede purgar datos en empresa piloto
- ✅ Demo tools solo visibles en modo demo

---

## D. VALIDACIÓN FUNCIONAL — CORE OPERATIVO

| # | Dominio | Estado piloto | Ajustes necesarios | Datos reales requeridos |
|---|---------|--------------|--------------------|-----------------------|
| 1 | Empleados | ✅ Listo | — | Fichas completas |
| 2 | Contratos | ✅ Listo | — | Contratos reales |
| 3 | Expediente documental | ✅ Listo | Subir docs reales | Documentos escaneados |
| 4 | Nómina ordinaria | ✅ Listo | Conceptos + períodos | Base salarial, IRPF |
| 5 | Incidencias/permisos | ✅ Listo | Tipos de ausencia | — |
| 6 | Vacaciones | ✅ Listo | Saldos iniciales | Convenio/días |
| 7 | Registro horario | ✅ Listo | — | Fichajes reales |
| 8 | Portal empleado | ✅ Listo | user_id linkage | Auth users |
| 9 | Settlements | ✅ Listo | — | Solo si aplica |
| 10 | Reporting | ⚠️ Parcial | Requiere ≥1 nómina | Datos de nómina |

---

## E. PILOTO DE NÓMINA REAL

### Flujo de validación

```
1. Configurar conceptos salariales → erp_hr_payroll_concepts
2. Crear período mensual → erp_hr_payroll_periods
3. Registrar incidencias del mes → erp_hr_payroll_incidents
4. Ejecutar Payroll Run (tipo: initial) → erp_hr_payroll_runs
5. Revisar resultado → erp_hr_payroll_records
6. Contrastar con referencia externa → Panel Reconciliación
7. Registrar discrepancias → Reconciliación → Registrar contraste
8. Resolver y documentar → Exportar CSV con evidencias
```

### Puntos de control
- [ ] Base de cotización CC = referencia
- [ ] Base de cotización CP = referencia
- [ ] Retención IRPF = referencia (±0.01%)
- [ ] SS Trabajador = referencia
- [ ] SS Empresa = referencia
- [ ] Neto a percibir = referencia (±0.01€)
- [ ] Horas extra tributan correctamente
- [ ] Retribución flexible no cotiza incorrectamente

---

## F. PORTAL DEL EMPLEADO — ACTIVACIÓN PILOTO

### Checklist de activación
1. [ ] Crear usuario de autenticación para el empleado piloto
2. [ ] Vincular `user_id` en `erp_hr_employees`
3. [ ] Verificar acceso a `/mi-portal`
4. [ ] Confirmar visualización de nóminas
5. [ ] Confirmar visualización de documentos
6. [ ] Confirmar fichajes visibles
7. [ ] Confirmar solicitudes funcionales
8. [ ] Verificar estados vacíos razonables (sin datos → mensaje claro)
9. [ ] Probar en vista responsive/móvil

---

## G. REPORTING PARA PILOTO

| Reporte | Fiable en piloto | Requiere |
|---------|-----------------|----------|
| Dashboard ejecutivo | ✅ | ≥5 empleados |
| Informe costes | ✅ | ≥1 nómina |
| Reporting Engine | ✅ | Datos de nómina |
| Board Pack | ⚠️ Demo-friendly | Volumen significativo |
| Analytics BI | ⚠️ Mejor con +datos | ≥3 meses de datos |
| People Analytics | ⚠️ Mejor con +datos | ≥10 empleados |

---

## H. SOPs MÍNIMOS DEL PILOTO

### 1. Alta de empleado
1. RRHH → Empleados → Nueva alta
2. Completar: nombre, NIF/NIE, email, puesto, departamento
3. Guardar → crear contrato → vincular documentos

### 2. Modificación contractual
1. RRHH → Contratos → Buscar contrato
2. Editar condiciones → registrar cambio
3. Subir adenda firmada al expediente documental

### 3. Subida documental
1. Empleados → Expediente → Documentos
2. Subir archivo → clasificar tipo → guardar
3. Verificar en checklist documental

### 4. Cierre de nómina mensual
1. RRHH → Nómina → Períodos → Abrir período
2. RRHH → Nómina → Incidencias → Cargar variables
3. RRHH → Motor de Nómina → Ejecutar Payroll Run
4. Revisar → contrastar con referencia → aprobar

### 5. Gestión de incidencias
1. RRHH → Incidencias → Registrar
2. Clasificar tipo (IT, permiso, etc.)
3. Vincular a empleado y período

### 6. Vacaciones/permisos
1. Empleado solicita via Portal o admin registra
2. RRHH → Vacaciones → Aprobar/rechazar
3. Impacto automático en nómina si procede

### 7. Fichajes
1. Empleado ficha via Portal → Mi tiempo
2. Admin revisa en RRHH → Registro Horario
3. Correcciones manuales si procede

### 8. Settlement / Baja
1. RRHH → Finiquitos → Nueva liquidación
2. Seleccionar tipo: despido, baja voluntaria, fin contrato
3. Calcular → revisar → aprobar
4. Comunicación preparatoria (dry-run, sin envío real)

### 9. Reporting mensual
1. RRHH → Utilidades → Reporting Engine
2. Seleccionar periodo → generar informe
3. Exportar PDF/Excel

---

## I. CHECKLIST GO / NO-GO

### Bloqueantes (NO-GO si falla alguno)
- [ ] Empresa piloto creada con company_id propio
- [ ] Entorno RRHH en modo PREPROD o PROD
- [ ] ≥1 departamento creado
- [ ] ≥1 empleado real con datos completos
- [ ] ≥1 contrato activo
- [ ] ≥5 conceptos salariales configurados
- [ ] Sin mezcla de datos demo/real en misma empresa

### Recomendados (piloto más completo)
- [ ] Entidad legal configurada
- [ ] Centro de trabajo registrado
- [ ] Períodos de nómina del ejercicio
- [ ] Tipos de ausencia configurados
- [ ] ≥1 empleado con user_id vinculado (portal)
- [ ] Datos fiscales mínimos (NIF/NIE)
- [ ] Calendario laboral cargado

### Opcionales (mejora de experiencia)
- [ ] Fichajes de prueba registrados
- [ ] ≥1 nómina procesada para reporting
- [ ] Convenio colectivo configurado

---

## J. RECOMENDACIÓN FINAL

### Estado actual: **PILOTO VIABLE** ✅

El módulo RRHH puede arrancar un piloto interno real hoy mismo con:

1. **Crear empresa piloto** → company_id independiente
2. **Cambiar a modo PREPROD** → banner + protecciones activas
3. **Cargar datos mínimos** → 14 puntos del checklist
4. **Ejecutar Checklist Piloto** → Utilidades → validación automática
5. **Operar internamente** → todos los dominios core funcionales
6. **Contrastar nómina** → Panel de Reconciliación vs referencia

### Siguientes pasos tras piloto exitoso
1. **P2**: Validar ≥3 meses consecutivos de nómina
2. **P3**: Ampliar a ≥10 empleados
3. **P4**: Activar Portal del Empleado para usuarios reales
4. **P5**: Preparar integración con conectores oficiales (V2-ES.10+)
5. **P6**: Go-live producción completa
