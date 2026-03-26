# Base de Conocimiento — Retenciones IRPF (Modelo 145)

## Normativa aplicable

### Ley 35/2006 del IRPF (LIRPF)
- **Art. 18.2**: Reducción del 30% para rendimientos irregulares (período de generación >2 años)
- **Art. 63-69**: Escala general y autonómica del impuesto
- **Art. 80 bis**: Deducción por obtención de rendimientos del trabajo
- **Art. 81 bis**: Deducción por maternidad
- **Art. 82-86**: Mínimo personal y familiar

### Reglamento IRPF (RD 439/2007) — RIRPF
- **Art. 80-86**: Tipo de retención sobre rendimientos del trabajo
- **Art. 82**: Determinación del importe previo de retención
- **Art. 83**: Mínimo personal y familiar para calcular tipo de retención
- **Art. 85**: Situación familiar del perceptor (Modelo 145 apartado 1)
- **Art. 86**: Hijos, descendientes, ascendientes
- **Art. 87**: Regularización del tipo de retención
- **Art. 88**: Comunicación de datos al pagador (Modelo 145)
- **Art. 89**: Plazo de comunicación de variaciones (10 días)

---

## Campos del Modelo 145 y su efecto en el cálculo de retención

### 1. Situación familiar (Art. 85 RIRPF)
| Situación | Descripción | Efecto en IRPF |
|-----------|-------------|-----------------|
| 1 | Monoparental (hijos a cargo exclusivo) | Aumenta mínimo personal aplicable |
| 2 | Casado/a, cónyuge rentas ≤ 1.500€/año | Mínimo por cónyuge (3.400€) |
| 3 | Otras situaciones | Mínimo personal estándar |

### 2. Discapacidad del perceptor (Art. 60 LIRPF)
| Grado | Mínimo adicional |
|-------|-----------------|
| ≥ 33% y < 65% | 3.000€ |
| ≥ 65% | 9.000€ |
| Con ayuda terceros/movilidad reducida | +3.000€ adicionales |

### 3. Movilidad geográfica (Art. 19.2.f LIRPF)
- Reducción adicional en rendimientos netos del trabajo
- Incremento de la reducción por obtención de rendimientos del trabajo durante el año del cambio y el siguiente
- Gastos deducibles: 2.000€ base + 2.000€ adicionales = 4.000€

### 4. Rendimientos irregulares previos
- Si se comunicó reducción Art. 18.2 en retención pero no se aplicó en autoliquidación: el pagador NO aplicará la reducción

### 5. Descendientes (Art. 58 LIRPF) — Mínimo por descendientes
| Descendiente | Mínimo anual |
|-------------|--------------|
| 1º | 2.400€ |
| 2º | 2.700€ |
| 3º | 4.000€ |
| 4º y siguientes | 4.500€ |
| Menor de 3 años | +2.800€ adicional |

**Discapacidad del descendiente:**
| Grado | Mínimo adicional |
|-------|-----------------|
| ≥ 33% y < 65% | 3.000€ |
| ≥ 65% | 9.000€ |
| Con ayuda terceros | +3.000€ |

**Cómputo por entero**: Si el descendiente convive exclusivamente con el perceptor, se computa al 100%. En caso contrario, se divide entre progenitores (50%).

### 6. Ascendientes (Art. 59 LIRPF) — Mínimo por ascendientes
| Condición | Mínimo anual |
|-----------|--------------|
| > 65 años | 1.150€ |
| > 75 años | +1.400€ adicional |

**Convivencia con otros descendientes**: El mínimo se prorratea entre el número de descendientes que conviven.

**Discapacidad del ascendiente**: Mismos importes que descendientes.

### 7. Pensión compensatoria (Art. 82.3.a RIRPF)
- Se resta de la base imponible del pagador para calcular el tipo de retención
- Reduce directamente la cuota de retención

### 8. Anualidades por alimentos (Art. 82.3.b RIRPF)
- Tributación especial: se aplican las escalas a las anualidades de forma separada
- Efecto: reduce el tipo medio de retención

### 9. Deducción vivienda habitual (DT 18ª LIRPF)
- Solo pre-2013
- Reducción de 2 puntos porcentuales en el tipo de retención
- Límite: retribuciones < 33.007,20€/año

---

## Escala general estatal 2024-2026 (Art. 63 LIRPF)

| Base liquidable hasta (€) | Cuota íntegra (€) | Resto base hasta (€) | Tipo (%) |
|---------------------------|-------------------|----------------------|----------|
| 0 | 0 | 12.450 | 9,50 |
| 12.450 | 1.182,75 | 7.750 | 12,00 |
| 20.200 | 2.112,75 | 15.000 | 15,00 |
| 35.200 | 4.362,75 | 24.800 | 18,50 |
| 60.000 | 8.950,75 | 240.000 | 22,50 |
| 300.000 | 62.950,75 | en adelante | 24,50 |

## Mínimo personal y familiar base
- **Mínimo del contribuyente**: 5.550€
- **Incremento >65 años**: +1.150€
- **Incremento >75 años**: +1.400€ adicional

---

## Fórmula de cálculo del tipo de retención

```
1. Base de retención = Retribución íntegra anual
   - Seguridad Social (cuota obrera)
   - Reducción rendimientos trabajo (Art. 19.2 LIRPF)
   - Pensión compensatoria
   - Anualidades por alimentos

2. Mínimo personal y familiar = Mínimo contribuyente 
   + Mínimo descendientes + Mínimo ascendientes
   + Discapacidad perceptor + Discapacidad familiares

3. Cuota retención = Escala(Base retención) - Escala(Mínimo PF)

4. Tipo retención = (Cuota retención / Retribución íntegra) * 100

5. Ajustes:
   - Deducción vivienda: -2 puntos (si aplica)
   - Tipo mínimo: según situación y contrato
```

---

## Referencias legales descargables
- Ley 35/2006: https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764
- RD 439/2007 (RIRPF): https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820
- Modelo 145: https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G603/mod145_es_es.pdf
