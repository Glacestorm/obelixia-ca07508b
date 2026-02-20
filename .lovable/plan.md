

# Incorporar curso "Contabilidad practica" al modulo Academia

## Resumen

Insertar el curso completo de **"Contabilidad practica: de cero a cuentas anuales (22 sesiones)"** en la base de datos del modulo Academia. Los datos incluyen:

- **1 curso** con metadatos completos (titulo, descripcion, objetivos, tags, etc.)
- **6 modulos** organizados tematicamente
- **22 lecciones** (sesiones de 45 minutos cada una)

## Datos del curso

| Elemento | Detalle |
|----------|---------|
| Titulo | Contabilidad practica: de cero a cuentas anuales |
| Categoria | Finanzas |
| Nivel | Beginner |
| Duracion | 16 horas |
| Precio | Gratuito |
| Instructor | ObelixIA Academia |
| Estado | No publicado (is_published: false), Destacado (is_featured: true) |

### Estructura de modulos

| Modulo | Sesiones | Tema |
|--------|----------|------|
| 1. Fundamentos y herramientas | 1-4 | Bienvenida, marco conceptual, PGC, documentacion |
| 2. Registro contable y fiscalidad | 5-8 | Partida doble, libros, ciclo contable, IVA |
| 3. Operaciones habituales (I) | 9-12 | Compras, ventas, inmovilizado, existencias |
| 4. Operaciones habituales (II) | 13-16 | Tesoreria, clientes, proveedores, financiacion |
| 5. Devengo, impuestos y cierre | 17-19 | Nominas, periodificaciones, Impuesto Sociedades |
| 6. Cuentas anuales y analisis | 20-22 | Cierre, cuentas anuales, analisis financiero |

## Plan tecnico

### Paso unico: Migracion SQL

Ejecutar el SQL seed proporcionado con una correccion:
- El campo `resources` en `academia_lessons` es tipo `jsonb`, pero el SQL original usa `ARRAY[]::text[]`
- Se corregira a `'[]'::jsonb` en cada INSERT de lecciones

La migracion usa `ON CONFLICT (id) DO UPDATE` para que sea idempotente (se puede ejecutar multiples veces sin duplicar datos).

No se requieren cambios de codigo frontend ya que el modulo Academia ya muestra cursos, modulos y lecciones dinamicamente desde la base de datos.

