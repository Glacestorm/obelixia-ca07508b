# Tarifa de Primas AT/EP y Clave de Ocupación SS 2026

## Marco Legal
- **DA 61ª LGSS** (incorporada por RDL 16/2025, de 23/12): Nueva tarifa de primas AT/EP adaptada a CNAE-2025
- **RDL 3/2026** (BOE 04/02/2026): Confirmación y ajuste de la tarifa para 2026
- **Orden ESS/1187/2015**: Regulación original del sistema de claves de ocupación (Cuadro II)
- **DA 4ª Ley 42/2006**: Origen de la tarifa de primas (derogada e integrada en DA 61ª LGSS)

## Estructura de la Tarifa

La tarifa AT/EP tiene **dos componentes** para cada epígrafe CNAE:
1. **IT** (Incapacidad Temporal): tipo % sobre base AT
2. **IMS** (Incapacidad, Muerte y Supervivencia): tipo % sobre base AT

El tipo total AT/EP = IT + IMS, que se aplica sobre la base de cotización por contingencias profesionales (Base AT = Base CC + Horas Extra).

## Claves de Ocupación SS (Cuadro II)

### Concepto
La clave de ocupación determina qué tarifa AT/EP se aplica al trabajador. No todos los trabajadores de una empresa cotizan con el mismo tipo AT/EP; depende del tipo de trabajo que realizan.

### Claves vigentes

| Clave | Descripción | Efecto |
|-------|-------------|--------|
| **a** | Personal en trabajos exclusivos de oficina | Tipo AT/EP reducido fijo: **IT 0,65% + IMS 0,35% = 1,00%** |
| **b** | Personal que realiza funciones propias de la actividad | Tipo AT/EP según CNAE de la empresa |

### Ocupación "a" — Trabajos exclusivos de oficina

**Requisitos** (acumulativos desde febrero 2022):
- El trabajo debe ser **exclusivamente administrativo**
- Debe realizarse **dentro de las dependencias destinadas a oficina**
- El trabajador **no está sometido a los riesgos propios** de la actividad productiva principal de la empresa
- Aplica a: administrativos, contables, recepcionistas, personal de RRHH, secretarios, etc.

**Tipo AT/EP fijo para Ocupación "a"**:
- **IT (Incapacidad Temporal)**: 0,65%
- **IMS (Incapacidad, Muerte y Supervivencia)**: 0,35%
- **Total**: 1,00%

Este tipo se aplica independientemente del CNAE de la empresa. Un administrativo en una empresa de construcción (CNAE alto riesgo) cotiza AT/EP al 1,00% si tiene ocupación "a".

**Obligación comunicación** (desde feb. 2022): Es obligatorio comunicar la ocupación laboral real del trabajador siguiendo la Clasificación Nacional de Ocupaciones al solicitar altas en la Seguridad Social.

### Ocupación "b" — Funciones propias de la actividad

Se aplica el tipo AT/EP correspondiente al epígrafe CNAE de la empresa según la tarifa vigente (DA 61ª LGSS).

## Tarifa de Primas 2026 — Ejemplos por CNAE-2025

| CNAE | Actividad | IT (%) | IMS (%) | Total (%) |
|------|-----------|--------|---------|-----------|
| 0111-0130 | Agricultura, ganadería | 2,85 | 2,00 | 4,85 |
| 4110 | Promoción inmobiliaria | 1,50 | 1,20 | 2,70 |
| 4120 | Construcción de edificios | 3,60 | 3,10 | 6,70 |
| 4613-4619 | Intermediarios comercio | 0,90 | 0,60 | 1,50 |
| 6201-6209 | Informática, programación | 0,65 | 0,35 | 1,00 |
| 6411-6419 | Intermediación financiera | 0,65 | 0,35 | 1,00 |
| 6910 | Actividades jurídicas | 0,65 | 0,35 | 1,00 |
| 6920 | Contabilidad y auditoría | 0,65 | 0,35 | 1,00 |
| 8010-8020 | Seguridad privada | 2,20 | 1,60 | 3,80 |
| 8610 | Actividades hospitalarias | 1,20 | 0,85 | 2,05 |
| 8621-8690 | Actividades médicas | 0,80 | 0,50 | 1,30 |
| 8510-8560 | Educación | 0,65 | 0,35 | 1,00 |

> **Nota**: La tarifa completa tiene ~100 epígrafes CNAE con sus correspondientes tipos IT e IMS. El motor usa el tipo por defecto de 1,50% (media ponderada) cuando no se ha configurado el CNAE específico.

## Impacto en Nómina

1. **Coste exclusivo empresa**: La cotización AT/EP es 100% a cargo del empresario
2. **Base de cálculo**: Base AT = Base CC + Horas Extra (topada por la base máxima)
3. **Resolución del tipo**:
   - Si Ocupación = "a" → IT 0,65% + IMS 0,35% = **1,00%** (fijo)
   - Si Ocupación = "b" → tipo según CNAE de la empresa (campo `epigrafe_at`)
   - Si no se indica → tipo por defecto 1,50%

## Integración con el Sistema

- Campo `ocupacion_ss` en `hr_employee_extensions.extension_data`: almacena 'a' o 'b'
- Campo `epigrafe_at` en `hr_employee_extensions`: almacena el código CNAE para resolución de tipo AT/EP
- El motor `ssContributionEngine.ts` resuelve el tipo AT/EP correcto según ocupación + CNAE
- La nómina refleja el tipo AT/EP en el concepto `ES_SS_AT_EP`
