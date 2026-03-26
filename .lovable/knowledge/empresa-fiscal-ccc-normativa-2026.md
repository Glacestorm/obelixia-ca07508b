# Empresa Fiscal y Código de Cuenta de Cotización (C.C.C.) — Normativa España 2026

## Empresa Fiscal

### Marco Legal
- **ET Art. 1.2**: Definición de empleador (persona física, jurídica o comunidad de bienes)
- **ET Art. 42-44**: Subcontratación, cesión de trabajadores y sucesión de empresa
- **RD 1065/2007 Art. 20**: Obligaciones de identificación fiscal (NIF)
- **OM 27/12/1994 Art. 2**: Contenido obligatorio de la nómina — identificación del empresario
- **LGSS Art. 15**: Inscripción de empresas en la Seguridad Social

### Definición
La **Empresa Fiscal** es la entidad jurídica que actúa como empleador legal del trabajador. Se identifica mediante:
- **NIF/CIF**: Número de Identificación Fiscal de la empresa
- **Razón social**: Denominación legal completa

### Obligatoriedad
Según la OM 27/12/1994, la nómina debe contener obligatoriamente:
1. Nombre o razón social de la empresa
2. Domicilio de la empresa o del centro de trabajo
3. CIF/NIF de la empresa
4. Código de Cuenta de Cotización (C.C.C.)
5. Datos del trabajador

### Relevancia en grupos empresariales
En grupos de empresas (ET Art. 42-44), el empleador fiscal puede diferir de la empresa operativa:
- El trabajador presta servicios en una filial pero el contrato es con la matriz
- En ETTs, la empresa fiscal es la ETT (no la empresa usuaria)
- En fusiones/escisiones, se produce sucesión empresarial (ET Art. 44)

### Impacto en nómina
- Determina el NIF que aparece en el modelo 190 (resumen anual IRPF)
- Determina el pagador a efectos de IRPF (relevante para el límite de 22.000€/14.000€ dos pagadores)
- Identifica al responsable de las obligaciones tributarias y de Seguridad Social

---

## Código de Cuenta de Cotización (C.C.C.)

### Marco Legal
- **LGSS Art. 15**: Inscripción de empresas — obligación de solicitar CCC
- **RD 84/1996 Art. 29-31**: Reglamento General sobre inscripción de empresas
- **Orden ESS/1727/2013**: Modifica el Sistema RED para gestión del CCC
- **OM 27/12/1994 Art. 2**: Contenido obligatorio de la nómina

### Definición
El C.C.C. es el código numérico asignado por la **Tesorería General de la Seguridad Social (TGSS)** que identifica al empresario a efectos de cotización. Formato: `PP/NNNNNNN/DD` donde:
- **PP**: Código de provincia (01-52)
- **NNNNNNN**: Número secuencial (7 dígitos)
- **DD**: Dígitos de control (2 dígitos)

### Tipos de CCC
- **CCC Principal**: Primer código asignado al inscribir la empresa
- **CCC Secundarios**: Para actividades diferentes en la misma provincia (Art. 29.3 RD 84/1996)
- **CCC por provincia**: Obligatorio uno por cada provincia donde tenga trabajadores

### Obligaciones
1. **Inscripción previa**: Antes de iniciar actividad con trabajadores (LGSS Art. 15.1)
2. **Comunicación de variaciones**: Cambios en datos identificativos (30 días)
3. **Baja**: Cuando cese la actividad con trabajadores en esa provincia

### Impacto en nómina y cotización
- Identifica al empresario en los boletines de cotización (TC1/TC2, ahora RLC/RNT)
- Agrupa a los trabajadores para liquidación de cuotas
- Determina la tarifa de AT/EP aplicable (asociada al CNAE del CCC)
- Es obligatorio en la nómina (OM 27/12/1994)
- Se usa en las comunicaciones al Sistema RED y Contrat@

### Validación
El formato del CCC debe cumplir:
- Longitud: 11 dígitos (sin separadores) o formato PP/NNNNNNN/DD
- Provincia: 01-52 (códigos provinciales válidos)
- Dígitos de control: algoritmo módulo 97

### Relación con otros identificadores
| Identificador | Quién lo tiene | Para qué sirve |
|--------------|---------------|----------------|
| NIF/CIF | Empresa | Identificación fiscal (AEAT) |
| C.C.C. | Empresa | Cotización a la SS (TGSS) |
| NAF | Trabajador | Afiliación a la SS |
| NSS | Trabajador | Número de Seguridad Social |
