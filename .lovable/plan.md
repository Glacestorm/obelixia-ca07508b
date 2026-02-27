

# Plan: OCR, Actualización y Enriquecimiento del Curso Contabilidad Empresarial 360

## Contenido extraido de los PDFs

Se han procesado 6 documentos PDF escaneados que contienen un curso completo de contabilidad de la "Sociedad Europea para el Desarrollo Empresarial", organizado en **18 sesiones** con tres tipos de material cada una:

| Sesiones | Contenido principal |
|----------|-------------------|
| 1 | Definicion contabilidad, Balance, Activo/Pasivo, Capital, Reservas, Fondos Propios |
| 2 | Plan General Contabilidad, grupos/subgrupos, Inmovilizado Material, Amortizaciones, Provisiones, Principios contables |
| 3 | Existencias, Deudores, Clientes, IVA soportado/repercutido, Tesoreria |
| 4 | Pasivo Fijo/Circulante, Proveedores, Acreedores, Hacienda Publica |
| 6-7 | Balances completos (Activo/Pasivo), operaciones mensuales empresa ALFA, asientos |
| 14 | Comprobaciones contables, conciliaciones bancarias, arqueo de caja |
| 16 | Analisis de Balances, masas patrimoniales, Fondo de Maniobra, Origen/Aplicacion de Fondos |
| 17 | Ratios financieros, analisis de tendencias, representacion grafica |
| 18 | Analisis economico: rentabilidad, rotacion existencias, supervivencia, mecanizacion |

Cada sesion incluye: **Texto teorico** + **Tests V/F** (14-30 preguntas) + **Ejercicios practicos** (balances, asientos, calculos).

---

## Correspondencia con el curso existente

El curso "Contabilidad Empresarial 360" ya tiene 6 bloques y 22 lecciones en la base de datos. El contenido de los PDFs se mapea asi:

| Bloque existente | Sesiones PDF relevantes |
|-----------------|------------------------|
| Bloque 0 - Fundamentos estrategicos (4 lecciones) | Sesiones 1, 2 (teoria base) |
| Bloque I - Estructura contable (4 lecciones) | Sesiones 2, 7 (PGC, asientos, partida doble) |
| Bloque II - Operativa diaria (5 lecciones) | Sesiones 3, 14 (existencias, IVA, tesoreria, conciliaciones) |
| Bloque III - Activos y financiacion (4 lecciones) | Sesiones 2, 4, 6 (inmovilizado, amortizaciones, financiacion) |
| Bloque IV - Ajustes y cierre (3 lecciones) | Sesiones 14 (comprobaciones, cierre) |
| Bloque V - Avanzada y estrategica (2 lecciones) | Sesiones 16, 17, 18 (analisis, ratios, tendencias) |

---

## Fases de implementacion

### FASE 1: Creacion de la Edge Function de procesamiento OCR-IA
- Crear edge function `academia-content-enricher` que recibe el contenido OCR extraido y lo transforma en contenido pedagogico moderno
- La IA actualizara: pesetas a euros, PGC 1990 a PGC 2007/2025, referencias a SII/TicketBAI/VeriFactu, normativa vigente 2026
- Generara contenido Markdown estructurado con ejemplos actualizados, notas de actualizacion normativa, y llamadas a la accion

### FASE 2: Enriquecimiento del contenido de las 22 lecciones
- Invocar la edge function para cada leccion, pasando el contenido OCR correspondiente como contexto
- Actualizar el campo `content` (Markdown) de cada leccion en `academia_lessons` con el contenido enriquecido
- Cada leccion incluira: teoria original actualizada + ejemplos con euros + referencias PGC 2007/2025 + tips practicos + enlaces al ERP

### FASE 3: Generacion de tests y ejercicios actualizados
- Usar el contenido OCR de los tests V/F para crear/actualizar los quizzes en `academia_quizzes` + `academia_quiz_questions`
- Actualizar las 110 preguntas existentes con el material real de los PDFs, adaptado a normativa 2026
- Anadir ejercicios practicos como recursos descargables en `academia_course_resources` (plantillas Excel, CSV de asientos)

### FASE 4: Creacion de recursos complementarios
- Insertar en `academia_course_resources` plantillas y material descargable derivado de los ejercicios de los PDFs:
  - Plantilla de Balance (sesion 1)
  - Hoja de Conciliacion Bancaria (sesion 14)
  - Plantilla de Arqueo de Caja (sesion 14)
  - Calculadora de Ratios Financieros (sesiones 17-18)
  - Hoja de Fondo de Maniobra (sesion 16)
- Cada recurso vinculado a la leccion correspondiente

### FASE 5: Integracion con el modulo ERP
- Crear enlaces cruzados entre las lecciones del curso y los modulos del ERP (contabilidad, tesoreria, fiscal)
- En cada leccion relevante, anadir seccion "Practica en tu ERP" con instrucciones para usar el simulador contable existente
- Actualizar los `academia_simulator_datasets` con escenarios basados en los ejercicios de los PDFs (empresa ALFA, panadero, alfarero)

### FASE 6: Verificacion y ajustes
- Verificar que las 22 lecciones tienen contenido actualizado
- Comprobar que los 22 quizzes reflejan el material real de los PDFs
- Validar que los recursos se descargan correctamente
- Test end-to-end del flujo: Catalogo → Detalle → Leccion → Quiz → Recursos

---

## Actualizaciones normativas a aplicar

El material original data de los anos 90 (usa pesetas, referencia al PGC de 1990). Se actualizara a:

- **Moneda**: Pesetas → Euros (conversion 1€ = 166,386 ptas)
- **PGC**: Real Decreto 1643/90 → PGC 2007 (RD 1514/2007) + reformas 2021-2025
- **IVA**: Modelo actual con SII, Ley Crea y Crece, factura electronica obligatoria
- **Digital**: Contabilidad manual → ERP, digitalizacion obligatoria, VeriFactu/TicketBAI
- **Normativa**: NIIF-UE, Ley 11/2023 digitalizacion, normas de sostenibilidad (CSRD/ESRS)
- **Ejemplos**: Actualizados a contexto empresarial 2026

