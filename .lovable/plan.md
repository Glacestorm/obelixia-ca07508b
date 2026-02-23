

# Curso "Contabilidad Empresarial 360" - Plan de Implementacion Completa por Fases

## Estado actual del proyecto

Tras analizar el codigo en profundidad, el modulo Academia tiene una **brecha critica**: las paginas que ven los clientes (Catalogo, Detalle de curso, Reproductor de lecciones) usan **datos ficticios hardcodeados** en lugar de leer de la base de datos. Esto significa que aunque insertes los datos del curso, **ningun cliente podra verlo ni seguirlo**.

### Lo que YA funciona (backend)
- Tablas de base de datos completas: `academia_courses`, `academia_modules`, `academia_lessons`, `academia_quizzes`, `academia_quiz_questions`, `academia_enrollments`, `academia_lesson_progress`
- Panel de administracion (`CourseManagement.tsx`) lee cursos desde la base de datos
- Edge functions de IA (tutor, rutas de aprendizaje, gamificacion)
- Sistema de quizzes adaptativos, gamificacion, certificados

### Lo que NO funciona para el cliente
1. **CourseCatalog.tsx** - Usa array hardcodeado, no consulta la base de datos
2. **CourseDetail.tsx** - Usa datos mock, no carga el curso real
3. **LearningPlayer.tsx** - Usa lecciones ficticias de un "CRM Avanzado", no carga contenido real
4. **Sin flujo de inscripcion funcional** - No hay boton que inscriba al usuario en `academia_enrollments`
5. **Sin control de acceso** - No verifica si el usuario esta inscrito antes de mostrar contenido

---

## Plan por Fases

### FASE 1: Insercion de datos (yo lo hago)
**Que se hace:** Ejecutar el SQL seed para insertar en la base de datos:
- 1 curso (Contabilidad Empresarial 360, 297 EUR, nivel intermedio, 30h)
- 6 modulos (Bloques 0-V)
- 22 lecciones con contenido Markdown completo
- 22 quizzes (1 por leccion)
- 110 preguntas de quiz (5 por quiz)

**Correccion necesaria:** El SQL ya tiene el campo `resources` como `jsonb` (correcto). Se usara `ON CONFLICT (id) DO NOTHING` para seguridad.

**Quien:** Yo, automaticamente.

---

### FASE 2: Catalogo de cursos dinamico (yo lo hago)
**Que se hace:** Reescribir `CourseCatalog.tsx` para que cargue cursos desde la base de datos en lugar de usar datos mock.

- Consultar `academia_courses` filtrando por `is_published = true`
- Mantener filtros existentes (categoria, nivel, precio)
- Mostrar los cursos reales, incluyendo el nuevo de Contabilidad

**Quien:** Yo.

---

### FASE 3: Detalle de curso dinamico (yo lo hago)
**Que se hace:** Reescribir `CourseDetail.tsx` para que cargue desde la base de datos:

- Cargar curso por `courseId` desde URL
- Cargar modulos y lecciones asociados
- Mostrar contenido real: descripcion, objetivos, prerequisitos, estructura de modulos
- Mostrar precio real (297 EUR) y boton de inscripcion

**Quien:** Yo.

---

### FASE 4: Flujo de inscripcion (yo lo hago)
**Que se hace:** Implementar el boton "Inscribirse" que:

- Para cursos gratuitos: inscribe directamente en `academia_enrollments`
- Para cursos de pago (como este de 297 EUR): marca como "pendiente" hasta pago
- Verifica si el usuario ya esta inscrito
- Requiere autenticacion (login/registro)

**Quien:** Yo.

---

### FASE 5: Reproductor de lecciones dinamico (yo lo hago)
**Que se hace:** Reescribir `LearningPlayer.tsx` para cargar datos reales:

- Cargar modulos y lecciones del curso desde la base de datos
- Renderizar el contenido Markdown de cada leccion (el campo `content` ya tiene todo el material)
- Cargar quizzes reales desde `academia_quizzes` + `academia_quiz_questions`
- Registrar progreso en `academia_lesson_progress`
- Navegacion entre lecciones secuencial
- Verificar inscripcion antes de mostrar contenido

**Quien:** Yo.

---

### FASE 6: Verificacion y ajustes finales (yo lo hago)
**Que se hace:**
- Verificar que el flujo completo funciona: Catalogo -> Detalle -> Inscripcion -> Reproductor -> Quiz -> Progreso
- Asegurar que el contenido Markdown se renderiza correctamente
- Verificar que los quizzes cargan las 5 preguntas con feedback
- Comprobar que el progreso se guarda entre sesiones

**Quien:** Yo.

---

## Lo que tu tendras que hacer (acciones manuales)

| Accion | Necesario para... | Urgencia |
|--------|-------------------|----------|
| Subir videos (`video_url` esta null en las 22 lecciones) | Tener contenido en video ademas del texto | Opcional - el curso funciona solo con texto |
| Subir recursos reales (CSV, plantillas, checklists) | Que los enlaces de recursos descarguen archivos reales | Opcional - ahora muestra titulos sin archivo |
| Configurar pasarela de pago | Cobrar los 297 EUR del curso | Necesario si quieres vender |
| Crear thumbnail del curso | Imagen de portada en el catalogo | Recomendado |

## Resultado esperado tras las 6 fases

Un cliente podra:
1. Ver el curso en el catalogo publico
2. Ver el detalle con los 6 bloques y 22 sesiones
3. Inscribirse (gratis o pago segun configuracion)
4. Acceder al reproductor y leer cada leccion completa
5. Hacer el quiz de 5 preguntas al final de cada leccion
6. Ver su progreso guardado y continuar donde lo dejo
7. Usar el tutor IA y la ruta de aprendizaje adaptativa (ya existente)

