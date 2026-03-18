

# Plan: Añadir Anticipo y Seguro Médico a la Nómina de Laura Fernández Gil (DM-004)

## Empleada seleccionada

**Laura Fernández Gil** — Product Manager, salario bruto anual 48.000€, escenario `flex_benefits`. Es la candidata ideal porque su escenario ya está diseñado para retribución flexible pero no tiene datos de anticipo ni seguro médico.

## Situación actual

- La nómina de Laura (marzo 2026) tiene `complements: null` y `other_deductions: []`
- Los conceptos `ES_ANTICIPO` y `ES_RETRIB_FLEX_SEGURO` ya existen en el catálogo de conceptos
- El bridge de nómina ya acepta `anticipos` y `seguroMedico` como inputs
- El seed de demo NO genera estos conceptos para ningún empleado

## Cambios a realizar

### 1. Actualizar datos en base de datos (INSERT tool para UPDATE)

Actualizar la nómina de marzo 2026 de Laura Fernández Gil para incluir:
- `complements`: `[{"code": "ES_RETRIB_FLEX_SEGURO", "name": "Seguro médico empresa", "amount": 100, "cotizaSS": false, "tributaIRPF": false}]`
- `other_deductions`: `[{"code": "ES_ANTICIPO", "name": "Anticipo a descontar", "amount": 500}]`
- Recalcular: `total_deductions` += 500, `net_salary` -= 500

### 2. Actualizar seed de demo (`erp-hr-seed-demo-master/index.ts`)

Añadir bloque para el escenario `flex_benefits`:
```
if (p.scenario === 'flex_benefits') {
  complements = { seguro_medico: 100 };
  otherDeductions = [{ code: 'ES_ANTICIPO', name: 'Anticipo a descontar', amount: 500 }];
}
```

Esto asegura que al regenerar datos demo, Laura siempre tenga estos conceptos.

### 3. Sin cambios en

- Cabeceras (Admin, ObelixIA) -- intactas
- Catálogo de conceptos -- ya existen ambos conceptos
- Motor de nómina / bridge -- ya soporta ambos inputs
- RLS / estructura de tablas -- sin cambios

## Resultado esperado

Al navegar a la nómina de Laura Fernández Gil (marzo 2026) se verán:
- **Percepciones**: Salario base 3.428,57€ + Seguro médico empresa 100€
- **Deducciones**: SS trabajador + IRPF + **Anticipo a descontar 500€**

