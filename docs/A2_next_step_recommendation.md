# A2 — Recomendación Estratégica del Siguiente Bloque

**Fecha**: 2026-04-11  
**Versión**: 2.0  
**Contexto**: Post-P2 / Post-G1 / Post-G2 / Post-H2 / Post-LM4

---

## Estado Actual del Producto

- **Cobertura**: 89.7% del ciclo laboral español (14/14 procesos)
- **Readiness interno**: 8/14 procesos `ready`, 0 `partial`
- **Gaps internos prioritarios**: **0** (cerrados por P2)
- **Go-live oficial**: 0/5 organismos (bloqueado por credenciales externas)
- **Tests**: 79+ (0 failures)
- **Madurez global**: Enterprise-grade consolidado

---

## Opciones Evaluadas

### Opción A — LM5: Formatos Nativos + Primeros Conectores

| Aspecto | Detalle |
|---------|---------|
| **Foco** | Generadores binarios/posicionales nativos (AFI/FAN/BOE 111/190), builders XML (Contrat@/Certific@2), primeros conectores reales |
| **Prerequisito** | Especificaciones oficiales exactas (BOE, TGSS spec documents) |
| **Impacto** | Desbloquea 6 procesos `preparatory` hacia `spec_aligned`; acerca a producción real |
| **Complejidad** | Alta — formatos posicionales de longitud fija, binarios SILTRA, esquemas XSD oficiales |
| **Riesgo** | Medio — sin credenciales reales no se puede validar end-to-end |
| **Valor** | Alto si hay cliente con credenciales listo para piloto |
| **Duración estimada** | 4-6 semanas |

### Opción B — S9: Compliance & Quality Diferencial

| Aspecto | Detalle |
|---------|---------|
| **Foco** | LISMI/LGD, VPT neutro en género, Registro Retributivo, motor de convenios con IA |
| **Prerequisito** | Ninguno técnico |
| **Impacto** | Amplia cobertura legal/compliance; diferencial competitivo vs A3/Sage |
| **Complejidad** | Media — normativa conocida, lógica nueva |
| **Riesgo** | Bajo — no toca funcionalidad existente |
| **Valor** | Alto para posicionamiento enterprise (empresas >50 empleados) |
| **Duración estimada** | 3-5 semanas |

### Opción C — G2.2: Expatriados Fase 2

| Aspecto | Detalle |
|---------|---------|
| **Foco** | Admin UI para knowledge packs, freshness monitoring, 8 corredores bilaterales nuevos (LATAM + APAC), edge function server-side |
| **Prerequisito** | G2.1 completo (✅) |
| **Impacto** | Cobertura de movilidad LATAM/APAC; administración normativa |
| **Complejidad** | Media |
| **Riesgo** | Bajo |
| **Valor** | Medio — nicho pero diferencial para empresas con presencia global |
| **Duración estimada** | 2-3 semanas |

### Opción D — G1.2: Fiscal Supervisor + Agent Refresh

| Aspecto | Detalle |
|---------|---------|
| **Foco** | Fiscal Supervisor con sub-agents (IVA, IS, retenciones), H2.0 adoption en más agents, CRM agent audit |
| **Prerequisito** | G1.1 completo (✅) |
| **Impacto** | IA fiscal completa; consistencia de datos maestros en toda la capa AI |
| **Complejidad** | Media-Alta (3-4 edge functions nuevas para fiscal) |
| **Riesgo** | Bajo |
| **Valor** | Medio — mejora infraestructura AI sin impacto funcional directo |
| **Duración estimada** | 2-3 semanas |

---

## Análisis Comparativo

| Criterio | LM5 | S9 | G2.2 | G1.2 |
|----------|-----|-----|------|------|
| Impacto en cobertura funcional | ⬆️ Sube 6 procesos de preparatory | ⬆️ +4-7 features compliance | → Movilidad +8 corredores | → Infraestructura AI |
| Impacto en go-live | ⬆️⬆️ Directo | → Indirecto | → Ninguno | → Ninguno |
| Impacto en valoración | ⬆️ | ⬆️⬆️ Diferencial | ⬆️ | ⬆️ |
| Riesgo | Medio | Bajo | Bajo | Bajo |
| ROI inmediato | Alto (si hay cliente) | Alto (posicionamiento) | Medio | Medio |
| Dependencia externa | Sí (specs oficiales) | No | No | No |

---

## Recomendación Final

### 🟢 Recomendación primaria: **S9 — Compliance & Quality Diferencial**

**Justificación**:

1. **Máximo ROI sin dependencia externa**: S9 no requiere credenciales, specs oficiales ni acceso a sandbox de organismos. Todo el trabajo es interno y verificable.

2. **Diferencial competitivo**: LISMI/LGD, Registro Retributivo y VPT son obligatorios para empresas >50 empleados en España. Ningún competidor de gama media (A3/Sage) los ofrece integrados nativamente.

3. **Sube la valoración**: Añadir compliance obligatorio eleva la cobertura hacia ~93% y posiciona el producto como enterprise-compliant, no solo enterprise-capable.

4. **Motor de convenios con IA**: Es el feature más diferencial a largo plazo — ningún ERP del mercado interpreta convenios colectivos con IA.

5. **No bloquea LM5**: S9 y LM5 son ortogonales. S9 puede ejecutarse ahora y LM5 cuando haya credenciales reales.

### 🔵 Recomendación secundaria: **LM5 — cuando haya cliente con credenciales**

Si existe un cliente real con credenciales oficiales disponibles, LM5 tiene prioridad absoluta sobre S9 porque desbloquea producción real. Pero en ausencia de credenciales, LM5 es parcialmente especulativo (se pueden generar formatos pero no validarlos end-to-end).

### Ejecución recomendada

| Fase | Bloque | Cuándo |
|------|--------|--------|
| Inmediata | **S9** — Compliance & Quality | Ahora |
| Siguiente (si hay credenciales) | **LM5** — Formatos + conectores | Cuando el cliente aporte credenciales |
| Paralela opcional | **G2.2** items P1 (admin UI, freshness) | Si hay capacidad |
| Diferida | **G1.2** — Fiscal supervisor | Post-S9 |

---

## Riesgos de No Actuar

| Si no hacemos... | Consecuencia |
|------------------|-------------|
| S9 | El producto carece de compliance obligatorio (LISMI, Registro Retributivo) — riesgo legal para clientes enterprise |
| LM5 | Los 6 procesos `preparatory` siguen sin producción oficial — aceptable si no hay cliente con credenciales |
| G2.2 | Los packs pueden quedar stale (>90 días) sin monitoring — riesgo menor |
| G1.2 | Fiscal sin supervisor — aceptable, fiscal agent funciona individualmente |

---

*Documento generado como recomendación estratégica A2.*  
*Versión: 2.0 — 2026-04-11*
