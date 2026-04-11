# G2.1 — Phase 1 Corridor Coverage Matrix

## Corredores Fase 1

| Corredor | Régimen SS | CDI | Art.7.p | Permiso Trabajo | Split Payroll | Shadow | Tax Eq | Confianza | Support Level Base |
|----------|-----------|-----|---------|-----------------|---------------|--------|--------|-----------|-------------------|
| ES↔FR | UE (883/2004) | ✅ CDI 1995 | ✅ | ❌ Libre circ. | ❌ | ✅ | ❌ | 90% | `supported_production` |
| ES↔PT | UE (883/2004) | ✅ CDI 1993 | ✅ | ❌ Libre circ. | ❌ | ❌ | ❌ | 92% | `supported_production` |
| ES↔DE | UE (883/2004) | ✅ CDI 2011 | ✅ | ❌ Libre circ. | ❌ | ✅ | ✅ | 91% | `supported_production` |
| ES↔IT | UE (883/2004) | ✅ CDI 1977 | ✅ | ❌ Libre circ. | ❌ | ❌ | ❌ | 89% | `supported_production` |
| ES↔AD | Bilateral | ✅ CDI 2015 | ✅ | ✅ Cupo | ✅ | ✅ | ❌ | 85% | `supported_with_review` |
| ES↔GB | Bilateral TCA | ✅ CDI 2013 | ✅ | ✅ Skilled Worker | ✅ | ✅ | ✅ | 87% | `supported_with_review` |
| ES↔CH | UE vía ALCP | ✅ CDI 1966 | ✅ | ✅ Permiso L/B | ✅ | ✅ | ✅ | 88% | `supported_with_review` |
| ES↔US | Bilateral | ✅ CDI 1990 | ✅ | ✅ L-1/E-2/H-1B | ✅ | ✅ | ✅ | 82% | `supported_with_review` |
| ES↔MX | Bilateral | ✅ CDI 1992 | ✅ | ✅ Resid. temp. | ✅ | ✅ | ✅ | 80% | `supported_with_review` |

## Leyenda

- **Régimen SS**: Marco de Seguridad Social aplicable
- **CDI**: Convenio de Doble Imposición vigente
- **Art.7.p**: Exención LIRPF Art. 7.p aplicable (hasta 60.100€/año)
- **Permiso Trabajo**: Si requiere trámite migratorio
- **Split/Shadow/Tax Eq**: Recomendación de payroll del pack
- **Support Level Base**: Sin triggers adicionales (PE risk, >24m, etc. pueden elevar a review)

## Cobertura por Zona

| Zona | Corredores | % Cobertura |
|------|-----------|-------------|
| UE/EEE | FR, PT, DE, IT | 100% clasificación automática |
| UE vía ALCP | CH | Clasificación auto, fiscal cantonal manual |
| Bilateral | AD, GB, US, MX | Clasificación auto, revisión recomendada |

## Corredores Fase 2 (Pendientes)

| Corredor | Régimen | Prioridad |
|----------|---------|-----------|
| ES↔CL | Bilateral | Alta |
| ES↔CO | Bilateral | Alta |
| ES↔AR | Bilateral | Media |
| ES↔BR | Bilateral | Media |
| ES↔JP | Bilateral | Media |
| ES↔CN | Bilateral | Media |
| ES↔IN | Bilateral | Baja |
| ES↔AU | Bilateral | Baja |

## Casos sin Pack

Cuando no existe pack para un corredor (fuera de Fase 1/2), el supervisor:
1. Marca `hasCorridorPack = false`
2. Eleva a `supported_with_review` como mínimo
3. Genera trigger `warning` indicando ausencia de pack
4. Clasifica usando motores genéricos (internationalMobilityEngine + internationalTaxEngine)
5. Requiere revisión manual obligatoria

Para corredores sin convenio SS ni CDI, el resultado es `out_of_scope` + `critical_review_required`.
