# Perfil Legal Unificado del Empleado — Arquitectura Cross-Module

## Propósito
Motor que computa las interrelaciones legales entre todos los campos del formulario
de empleado y las persiste para consumo por agentes IA de múltiples módulos.

## Legislación Aplicada
- **ET Art. 15, 12, 14, 49.1.c, 53, 56** — Tipos de contrato, jornada, prueba, indemnización
- **LGSS Art. 147-148** — Bases de cotización, topes por grupo
- **LGSS DA 7ª** — Tipo desempleo temporal vs indefinido
- **RIRPF Art. 80-88** — Retenciones IRPF, tipo mínimo, tipo voluntario
- **RDL 32/2021** — Reforma laboral
- **RDL 3/2026** — Cotizaciones SS 2026
- **OM 27/12/1994 Art. 2** — Contenido obligatorio nómina
- **LGSS Art. 15 / RD 84/1996 Art. 29** — CCC
- **Ley 22/2009 Art. 74** — Competencias CCAA en IRPF

## Interrelaciones de Campos

### Contrato RD → SS + IRPF + Indemnización
| Campo origen | Campos afectados | Lógica |
|---|---|---|
| `contract_type_rd` | `desempleo_ss` | Temporal → 8,30% / Indefinido → 7,05% (LGSS DA 7ª) |
| `contract_type_rd` | `irpf_minimo` | Contrato < 1 año → mínimo 2% (RIRPF Art. 86.2) |
| `contract_type_rd` | `indemnizacion` | Temporal → 12 d/año (ET Art. 49.1.c) |
| `contract_type_rd` + `hire_date` | `duracion_maxima` | Verificación expiración contrato (ET Art. 15.5) |

### Grupo Cotización → Bases SS
| Campo origen | Campos afectados | Lógica |
|---|---|---|
| `contribution_group` | `base_minima`, `base_maxima` | Topes por grupo (LGSS Art. 148) |
| `contribution_group` + `base_salary` | `base_cotizacion_efectiva` | max(min_grupo, min(salario, max_grupo)) |
| `contribution_group` ≥ 8 | `tipo_base` | Base diaria vs mensual |

### Empresa Fiscal + CCC → Nómina + Artefactos
| Campo origen | Campos afectados | Lógica |
|---|---|---|
| `empresa_fiscal_nif` | Modelo 190 | NIF pagador IRPF |
| `ccc` | RLC/RNT, boletines SS | Identifica empleador ante TGSS |
| `empresa_fiscal_nif` ↔ `ccc` | Validación cruzada | Ambos obligatorios (OM 27/12/1994) |

### IRPF → Nómina
| Campo origen | Campos afectados | Lógica |
|---|---|---|
| `irpf_percentage` (solicitado) | `irpf_efectivo` | max(legal, solicitado) (Art. 88.5 RIRPF) |
| `autonomous_community` | `escala_irpf` | Escala autonómica (Ley 22/2009) |

## Persistencia
- **Tabla**: `erp_employee_legal_profiles`
- **Campos clave**: `profile_data` (JSONB completo), `ai_context` (texto para inyección IA)
- **Se actualiza**: Al guardar el formulario de empleado

## Consumo por Agentes IA
Los agentes usan `useAgentEmployeeContext` para:
1. Obtener contexto de un empleado específico (`getForEmployee`)
2. Obtener resumen de toda la plantilla (`getForCompany`)
3. Inyectar en system prompt con instrucciones por dominio (`buildAgentSystemPromptWithEmployee`)

### Agentes Destino
- **HR Supervisor** — Consultas laborales, compliance
- **Legal Supervisor** — Validación normativa, contratos
- **Copilot Laboral** — Análisis explicable, simulaciones
- **Accounting Agent** — Asientos nómina, provisiones SS
- **Fiscal Agent** — Modelos 111/190, RLC/RNT, CRA
