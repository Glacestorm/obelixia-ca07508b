# SOPs — Operaciones Mínimas RRHH (Preproducción/Producción)

## 1. Alta de Empleado
1. Ir a **People → Empleados → Nuevo Empleado**
2. Completar datos obligatorios: nombre, DNI/NIE, NAF, email, departamento, puesto
3. El sistema crea automáticamente: ficha, expediente documental vacío, saldos de ausencias
4. Ir a **ES Localización → Alta/Afiliación** para preparar comunicación TGSS
5. Verificar readiness en el panel de registro antes de proceder

## 2. Contrato
1. Desde ficha del empleado → **Contratos → Nuevo Contrato**
2. Seleccionar tipo (indefinido, temporal, prácticas...)
3. Completar condiciones: salario bruto, jornada, convenio, centro de trabajo
4. El sistema genera documento borrador y vincula al expediente documental

## 3. Gestión Documental
1. Desde expediente del empleado → **Documentos**
2. Subir documentos requeridos: DNI, contrato firmado, certificado bancario
3. El motor de completitud indica documentos faltantes (checklist verde/ámbar)
4. Los documentos se versionan automáticamente

## 4. Cierre de Nómina Mensual
1. Ir a **Payroll → Períodos** → abrir período mensual
2. Registrar incidencias del mes: horas extra, ausencias, IT, etc.
3. Ejecutar **Payroll Run** tipo "inicial"
4. Revisar resultados → aprobar o recalcular
5. Cerrar período → genera snapshot inmutable

## 5. Incidencias Especiales
- **IT/Accidente**: registrar en incidencias con tipo y fechas
- **Permiso nacimiento**: solicitar desde vacaciones/permisos o portal administrativo
- **Reducción jornada**: modificación contractual + incidencia de nómina
- **Stock options**: incidencia tipo ES_STOCK_OPTIONS en payroll incidents

## 6. Nómina de Atrasos
1. Crear **Payroll Run** tipo "correction" en el motor de nómina
2. Indicar período de referencia y concepto a regularizar
3. El sistema genera snapshot con diff respecto al run original

## 7. Seguros Sociales
1. Ir a **ES Localización → Integraciones Oficiales**
2. Seleccionar trámite SILTRA/FAN
3. Ejecutar dry-run → revisar evidence pack
4. Aprobar internamente en el buzón de aprobaciones
5. ⚠️ Envío real bloqueado por diseño en esta versión

## 8. Modelos Fiscales (111/190)
1. Ir a **ES Localización → Integraciones Oficiales → AEAT**
2. Seleccionar modelo y período
3. Ejecutar simulación/dry-run
4. Descargar evidence pack para revisión

## 9. Baja / Despido
1. Ir a **People → Finiquitos** o usar la calculadora de indemnización
2. Seleccionar tipo: disciplinario (0 días/año) u objetivo (20 días/año)
3. El sistema calcula automáticamente según antigüedad y salario
4. Preparar comunicación de baja TGSS en ES Localización

## 10. Portal del Empleado
- Acceso en `/mi-portal` (requiere user_id vinculado a empleado)
- Módulos: Mis nóminas, Mis documentos, Mis solicitudes, Mi tiempo, Mis vacaciones
- El empleado solo ve sus propios datos (RLS estricto)
- Para demo: botón "Abrir Portal Empleado" desde el expediente

---

## Notas de Seguridad
- Todos los datos se particionan por `company_id`
- Las acciones sensibles quedan en audit log inmutable
- Las integraciones oficiales mantienen `isRealSubmissionBlocked() === true`
- En modo PROD, seeds y purge están deshabilitados
