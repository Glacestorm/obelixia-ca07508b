
# Plan de Continuación — Prioridades 3 y 4

## ✅ Ya completado (Prioridades 1 y 2)
- 4 Edge Functions: `payroll-it-engine`, `payroll-calculation-engine`, `payroll-irpf-engine`, `payroll-supervisor`
- Tabla `erp_audit_nomina_cycles`
- Componentes `PayslipTextManager`, `HREmployeeConceptsSection`, `HRLaborDocumentsPanel`
- Hooks de conexión backend (6 hooks)
- Engines: `crossValidationEngine`, `laborDocumentEngine`

---

## 📋 Prioridad 3 — Enriquecer engines existentes

### Fase 3A: Validaciones legales bloqueantes en payroll engine
- Validación SMI bloqueante (ET Art. 27): bruto mensual ≥ SMI 2026
- Verificación horas extras >80h/año (ET Art. 35)
- Corrección automática base mínima por grupo SS
- Fichero: `src/lib/hr/payroll/validators/payslip-validator.ts`

### Fase 3B: Hitos IT 365/545 en it-engine
- Alertas automáticas al alcanzar 365 días de IT (revisión obligatoria INSS)
- Alerta 545 días (extinción automática prestación)
- Cálculo base reguladora por tipo contingencia (EC/AT/ANL/MAT) con fórmulas LGSS Arts. 169-170
- Ficheros: `src/lib/hr/it-engine.ts` o engine existente

### Fase 3C: Registro de 9 agentes IA
- INSERT en `erp_ai_agents_registry` de los agentes definidos en el Plan Maestro:
  - PAYROLL-SUP-001, PAY-AGT-001 a 006, AGT-GDPR-001, AGT-AUDIT-001
- Cada uno con `knowledge_base` JSON legal correspondiente

---

## 📋 Prioridad 4 — Funcionalidades avanzadas

### Fase 4A: Motor predictivo IT con IA real
- Reemplazar mocks en `HRPredictivePage.tsx` con llamadas a IA
- Predicción duración IT por CIE-10 + CNO
- Edge function o invocación directa a Lovable AI

### Fase 4B: Validación cruzada real en HRPredictivePage
- Conectar `crossValidationEngine` con datos reales de empleados
- Validación contrato ↔ grupo SS ↔ base ↔ IRPF ↔ TA.2
- Detección automática pluriempleo por cruce NAF

### Fase 4C: Generación de documentos laborales
- Carta de despido (ET Art. 49)
- Finiquito calculado completo
- Certificado de empresa para desempleo (RD 625/1985)
- Parte DELTA (accidentes de trabajo)
- Informe para ITSS

### Fase 4D: Dashboard 12 KPIs de cumplimiento normativo
- Panel con 12 KPIs legales en tiempo real definidos en el Plan Maestro
- Integración en `HRAuditDashboard` o panel dedicado

### Fase 4E: Portal auditor externo (opcional)
- Rol `auditor_externo` con acceso read-only filtrado
- Vista específica con datos anonimizados según necesidad

---

**Orden de ejecución:** 3A → 3B → 3C → 4A → 4B → 4C → 4D → 4E
