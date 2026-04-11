# P1.7B-RA — Expatriates Case Matrix

## Country × Regime × Support Level Matrix

### UE/EEE/Suiza — `supported_production`

| País | Código | Convenio SS | CDI | Support Level |
|------|--------|-------------|-----|---------------|
| Alemania | DE | CE 883/2004 | ✅ | `supported_production` |
| Francia | FR | CE 883/2004 | ✅ | `supported_production` |
| Italia | IT | CE 883/2004 | ✅ | `supported_production` |
| Portugal | PT | CE 883/2004 | ✅ | `supported_production` |
| Países Bajos | NL | CE 883/2004 | ✅ | `supported_production` |
| Bélgica | BE | CE 883/2004 | ✅ | `supported_production` |
| Austria | AT | CE 883/2004 | ✅ | `supported_production` |
| Irlanda | IE | CE 883/2004 | ✅ | `supported_production` |
| Polonia | PL | CE 883/2004 | ✅ | `supported_production` |
| Rumania | RO | CE 883/2004 | ✅ | `supported_production` |
| Grecia | GR | CE 883/2004 | ✅ | `supported_production` |
| Suecia | SE | CE 883/2004 | ✅ | `supported_production` |
| Dinamarca | DK | CE 883/2004 | ✅ | `supported_production` |
| Finlandia | FI | CE 883/2004 | ✅ | `supported_production` |
| Rep. Checa | CZ | CE 883/2004 | ✅ | `supported_production` |
| Hungría | HU | CE 883/2004 | ✅ | `supported_production` |
| Bulgaria | BG | CE 883/2004 | ✅ | `supported_production` |
| Croacia | HR | CE 883/2004 | ✅ | `supported_production` |
| Eslovaquia | SK | CE 883/2004 | ✅ | `supported_production` |
| Eslovenia | SI | CE 883/2004 | ✅ | `supported_production` |
| Lituania | LT | CE 883/2004 | ✅ | `supported_production` |
| Letonia | LV | CE 883/2004 | ✅ | `supported_production` |
| Estonia | EE | CE 883/2004 | ✅ | `supported_production` |
| Chipre | CY | CE 883/2004 | ✅ | `supported_production` |
| Luxemburgo | LU | CE 883/2004 | ✅ | `supported_production` |
| Malta | MT | CE 883/2004 | ✅ | `supported_production` |
| Islandia | IS | CE 883/2004 (EEE) | ✅ | `supported_production` |
| Liechtenstein | LI | CE 883/2004 (EEE) | ✅ | `supported_production` |
| Noruega | NO | CE 883/2004 (EEE) | ✅ | `supported_production` |
| Suiza | CH | CE 883/2004 (bilateral) | ✅ | `supported_production` |

### Bilateral — `supported_with_review` (base)

| País | Código | Convenio SS | CDI | Support Level Base | Notas |
|------|--------|-------------|-----|--------------------|-------|
| Reino Unido | GB | Bilateral post-Brexit | ✅ | `supported_production` | Tratamiento especial, cobertura amplia |
| Andorra | AD | Bilateral | ✅ | `supported_production` | Tratamiento especial |
| Estados Unidos | US | Bilateral | ✅ | `supported_with_review` | Hasta 5 años, certificado cobertura |
| Canadá | CA | Bilateral | ✅ | `supported_with_review` | Totalización períodos |
| México | MX | Bilateral | ✅ | `supported_with_review` | Desplazamiento temporal |
| Chile | CL | Bilateral | ✅ | `supported_with_review` | Totalización cotizaciones |
| Colombia | CO | Bilateral | ✅ | `supported_with_review` | Hasta 2 años prorrogable |
| Argentina | AR | Bilateral | ✅ | `supported_with_review` | Totalización |
| Uruguay | UY | Bilateral | ✅ | `supported_with_review` | Cobertura temporal |
| Brasil | BR | Bilateral | ✅ | `supported_with_review` | Desplazamiento temporal |
| Perú | PE | Bilateral | ✅ | `supported_with_review` | Totalización períodos |
| Venezuela | VE | Bilateral | ✅ | `supported_with_review` | Aplicación limitada |
| Paraguay | PY | Bilateral | ✅ | `supported_with_review` | Totalización |
| Rep. Dominicana | DO | Bilateral | ✅ | `supported_with_review` | Cobertura temporal |
| Ecuador | EC | Bilateral | ✅ | `supported_with_review` | Totalización |
| Filipinas | PH | Bilateral | ✅ | `supported_with_review` | Totalización períodos |
| Marruecos | MA | Bilateral | ✅ | `supported_with_review` | Desplazamiento con certificado |
| Túnez | TN | Bilateral | ✅ | `supported_with_review` | Desplazamiento temporal |
| Ucrania | UA | Bilateral | ✅ | `supported_with_review` | Desplazamiento temporal |
| Japón | JP | Bilateral | ✅ | `supported_with_review` | Hasta 5 años |
| Corea del Sur | KR | Bilateral | ✅ | `supported_with_review` | Desplazamiento temporal |
| Australia | AU | Bilateral | ✅ | `supported_with_review` | Totalización |
| Rusia | RU | Bilateral | ✅ | `supported_with_review` | Totalización |
| China | CN | Bilateral | ✅ | `supported_with_review` | Exención cotización temporal |
| India | IN | Bilateral | ✅ | `supported_with_review` | En vigor reciente |

### Sin convenio SS — `supported_with_review` / `out_of_scope`

| País | CDI | Support Level | Notas |
|------|-----|---------------|-------|
| Emiratos Árabes | ✅ | `supported_with_review` | CDI disponible pero sin SS bilateral |
| Arabia Saudí | ✅ | `supported_with_review` | CDI disponible |
| Singapur | ✅ | `supported_with_review` | CDI disponible |
| Tailandia | ✅ | `supported_with_review` | CDI disponible |
| Sudáfrica | ✅ | `supported_with_review` | CDI disponible |
| Israel | ✅ | `supported_with_review` | CDI disponible |
| Turquía | ✅ | `supported_with_review` | CDI disponible |
| Egipto | ✅ | `supported_with_review` | CDI disponible |
| País sin CDI ni SS | ❌ | `out_of_scope` (si triggers críticos) | Derivar a especialista |

## Escalation Rules

### De `supported_production` a `supported_with_review`

Un caso UE/EEE/CH escala a revisión si:
- Duración > 24 meses (pérdida cobertura A1)
- PE risk flag activado
- Split payroll activo
- Residencia fiscal limítrofe (>183 días fuera)

### De `supported_with_review` a `out_of_scope`

Un caso bilateral escala a fuera de alcance si:
- Sin CDI + trigger crítico (PE risk)
- Cadena multi-país
- Derivados financieros

## Art. 7.p LIRPF — Elegibilidad por escenario

| Escenario | Elegible | Notas |
|-----------|----------|-------|
| Desplazamiento temporal UE, <183d | ✅ | Si beneficiario no residente ES |
| Desplazamiento temporal UE, >183d | ✅ con revisión | Revisar residencia fiscal |
| Desplazamiento bilateral, trabajo efectivo | ✅ | CDI disponible |
| Teletrabajo desde España para empresa extranjera | ❌ | No hay trabajo efectivo en el extranjero |
| País sin CDI ni intercambio info | ❌ | Requisito Art. 7.p no cumplido |
| Transferencia permanente | ❌ | No es desplazamiento temporal |
