# Tipos de Contrato RD — Implicaciones Legales en Nómina (2026)

## Marco Legal
- **ET Art. 15** (redacción RDL 32/2021): Tipos de contratos laborales
- **RDL 32/2021** (BOE 30/12/2021): Reforma laboral — reestructuración de la contratación temporal
- **ET Art. 14**: Periodo de prueba
- **ET Art. 49.1.c**: Indemnización por fin de contrato temporal: **12 días/año**
- **ET Art. 53**: Despido objetivo: **20 días/año** (max 12 mensualidades)
- **ET Art. 56**: Despido improcedente: **33 días/año** (max 24 mensualidades, contratos post-12/02/2012)
- **RIRPF Art. 86.2**: Tipo mínimo retención 2% para contratos de duración determinada < 1 año
- **LGSS DA 7ª**: Tipo de cotización por desempleo diferenciado temporal/indefinido

## Tipos de Contrato y su Impacto

### Indefinidos (códigos 1xx, 2xx)

| Código | Descripción | SS Desempleo | IRPF mín. | Indemn. fin | P. prueba |
|--------|------------|-------------|-----------|-------------|-----------|
| 100 | Indefinido ordinario TC | General 7,05% | No aplica | 0 d/año | 6 meses |
| 130 | Indefinido ordinario TP | General 7,05% | No aplica | 0 d/año | 6 meses |
| 150 | Indefinido discapacidad | General 7,05% | No aplica | 0 d/año | 6 meses |
| 189 | Fijo-discontinuo | General 7,05% | No aplica | 0 d/año | 6 meses |
| 200 | Indefinido serv. doméstico | General 7,05% | No aplica | 0 d/año | 2 meses |

### Temporales — Circunstancias de producción (códigos 4xx, 5xx)

| Código | Descripción | SS Desempleo | IRPF mín. 2% | Indemn. fin | Dur. máx. |
|--------|------------|-------------|-------------|-------------|-----------|
| 401 | Temporal obra/servicio (pre-reforma) | Temporal 8,30% | Sí | 12 d/año | 6 meses |
| 402 | Temporal eventual | Temporal 8,30% | Sí | 12 d/año | 6 meses |
| 410 | Sustitución (interinidad) | Temporal 8,30% | No (*) | 12 d/año | Sin límite |
| 501 | Duración determinada TC | Temporal 8,30% | Sí | 12 d/año | 6 meses |
| 502 | Sustitución TP | Temporal 8,30% | No (*) | 12 d/año | Sin límite |
| 503 | Producción — imprevisible | Temporal 8,30% | Sí | 12 d/año | 6 meses |
| 504 | Producción — ocasional previsible | Temporal 8,30% | Sí | 12 d/año | 90 días/año |

(*) Sustitución: duración indeterminada → no se aplica tipo mínimo 2% salvo duración real < 12 meses.

### Formativos (códigos 42x)

| Código | Descripción | SS Desempleo | IRPF mín. 2% | Indemn. fin | Dur. máx. |
|--------|------------|-------------|-------------|-------------|-----------|
| 420 | Formativo prácticas profesionales | Temporal 8,30% | Sí | 12 d/año | 12 meses |
| 421 | Formativo alternancia (dual) | Temporal 8,30% | No | 0 d/año | 24 meses |

### Otros

| Código | Descripción | SS Desempleo | IRPF mín. 2% | Indemn. fin |
|--------|------------|-------------|-------------|-------------|
| 300 | Contrato de relevo | Temporal 8,30% | No | 12 d/año |

## Reglas de Cálculo en Nómina

### 1. Cotización por Desempleo (LGSS DA 7ª)
- **Indefinido**: 7,05% total (5,50% empresa + 1,55% trabajador)
- **Temporal**: 8,30% total (6,70% empresa + 1,60% trabajador)
- Se determina por la naturaleza del contrato, NO por su duración real

### 2. IRPF — Tipo Mínimo (RIRPF Art. 86.2)
- Contratos de duración determinada < 1 año: tipo mínimo **2%**
- Se aplica cuando el tipo calculado resulta < 2%
- Sustitución (410, 502): duración indeterminada → no aplica automáticamente
- Formación en alternancia (421): no aplica (duración hasta 24 meses)

### 3. Indemnización por Fin de Contrato (ET Art. 49.1.c)
- Temporal: **12 días de salario por año de servicio**
- Indefinido: **0 días** (solo indemnización por despido)
- Formación en alternancia (421): **0 días**
- Fórmula: `salario_diario × 12 × días_trabajados / 365`

### 4. Periodo de Prueba (ET Art. 14)
- Indefinido: 6 meses (técnicos titulados), 2 meses (resto)
- Temporal < 6 meses: máx. 1 mes
- Formativo prácticas (420): máx. 1 mes
- Formativo alternancia (421): sin periodo de prueba

### 5. Resolución Automática
Cuando el campo `tipo_contrato_rd` tiene valor, el motor:
1. Resuelve el perfil legal del contrato
2. Establece `isTemporaryForSS` → tipo desempleo correcto
3. Establece `contratoInferiorAnual` → tipo mínimo IRPF 2% si aplica
4. Registra indemnización aplicable y normativa de referencia
5. Añade las referencias legales a la trazabilidad de la nómina
