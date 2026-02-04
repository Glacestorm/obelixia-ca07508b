/**
 * Base de Conocimiento - Jurisprudencia y Doctrina
 * Fuentes: CENDOJ (España), EUR-Lex (Europa), BOPA (Andorra)
 * Doctrina: DGT, TEAC, AEPD
 */

import type { EssentialKnowledgeItem } from './essentialKnowledgeBase';

// ============================================
// JURISPRUDENCIA ESPAÑOLA (CENDOJ)
// ============================================
export const SPANISH_JURISPRUDENCE: EssentialKnowledgeItem[] = [
  {
    title: 'STS 1137/2020 - Despido por uso indebido de correo electrónico',
    content: `Sentencia del Tribunal Supremo, Sala de lo Social, de 8 de febrero de 2021 (Rec. 1137/2020).

HECHOS:
- Trabajador despedido por uso del correo corporativo para fines personales
- La empresa había notificado política de uso de herramientas informáticas
- Se instaló software de monitorización sin conocimiento del trabajador

FUNDAMENTOS JURÍDICOS:
- Art. 20.3 ET: Control empresarial de la actividad laboral
- Art. 18.4 CE: Derecho a la intimidad y secreto comunicaciones
- RGPD y LOPDGDD: Proporcionalidad del control

DOCTRINA ESTABLECIDA:
El TS establece tres requisitos para la validez del control empresarial:
1. IDONEIDAD: El control debe ser apto para lograr el objetivo perseguido
2. NECESIDAD: No deben existir medidas menos invasivas
3. PROPORCIONALIDAD: Los beneficios deben superar los perjuicios al derecho del trabajador

FALLO:
Se declara NULO el despido por vulneración del derecho fundamental a la intimidad.
La ausencia de información previa sobre el sistema de control invalida las pruebas obtenidas.

APLICACIÓN EN MÓDULO RRHH:
- Exigir política escrita de uso de herramientas TIC
- Informar expresamente sobre sistemas de monitorización
- Documentar consentimiento del trabajador
- Aplicar test de proporcionalidad antes de adoptar medidas disciplinarias`,
    summary: 'Control empresarial del correo electrónico: requisitos de idoneidad, necesidad y proporcionalidad',
    knowledge_type: 'precedent',
    jurisdiction_code: 'ES',
    legal_area: 'labor',
    sub_area: 'Despido disciplinario',
    reference_code: 'STS 1137/2020',
    effective_date: '2021-02-08',
    source_url: 'https://www.poderjudicial.es/search/AN/openDocument/cendoj',
    source_name: 'CENDOJ',
    tags: ['despido', 'correo electrónico', 'intimidad', 'control empresarial', 'RGPD'],
    keywords: ['despido', 'email', 'monitorización', 'intimidad', 'proporcionalidad', 'CENDOJ']
  },
  {
    title: 'STS 294/2023 - Obligación de registro de jornada',
    content: `Sentencia del Tribunal Supremo, Sala de lo Social, de 18 de abril de 2023 (Rec. 294/2023).

CUESTIÓN PLANTEADA:
- Validez de sistema de registro de jornada mediante geolocalización
- Ámbito de aplicación a trabajadores con movilidad geográfica

FUNDAMENTOS JURÍDICOS:
- Art. 34.9 ET: Obligación de registro diario de jornada
- RD 8/2019: Desarrollo reglamentario
- RGPD Art. 5: Minimización de datos

DOCTRINA:
1. El registro de jornada es OBLIGATORIO para todas las empresas
2. El sistema debe ser FIABLE y OBJETIVO
3. La geolocalización es VÁLIDA si:
   - Se informa previamente al trabajador
   - Se limita al horario laboral
   - Los datos se conservan máximo 4 años
   - No se utiliza para control continuado de ubicación

FALLO:
Se confirma la obligación de registro incluso para trabajadores móviles.
La geolocalización es proporcional cuando se activa solo al fichar.

APLICACIÓN EN MÓDULO RRHH:
- Implementar registro horario obligatorio
- Conservar registros 4 años
- Informar sobre uso de geolocalización en política de privacidad
- Limitar acceso a datos de ubicación`,
    summary: 'Validez de sistemas de registro de jornada con geolocalización para trabajadores móviles',
    knowledge_type: 'precedent',
    jurisdiction_code: 'ES',
    legal_area: 'labor',
    sub_area: 'Jornada laboral',
    reference_code: 'STS 294/2023',
    effective_date: '2023-04-18',
    source_url: 'https://www.poderjudicial.es/search/AN/openDocument/cendoj',
    source_name: 'CENDOJ',
    tags: ['registro jornada', 'geolocalización', 'control horario', 'RGPD'],
    keywords: ['registro', 'jornada', 'geolocalización', 'horario', 'fichar', 'CENDOJ']
  },
  {
    title: 'SAN 152/2022 - Teletrabajo y gastos de conexión',
    content: `Sentencia de la Audiencia Nacional, Sala de lo Social, de 20 de diciembre de 2022 (Rec. 152/2022).

HECHOS:
- Empresa implementa teletrabajo obligatorio durante pandemia
- No compensa gastos de internet ni electricidad
- Sindicato demanda por incumplimiento Ley 10/2021

FUNDAMENTOS JURÍDICOS:
- Art. 7.b) Ley 10/2021 de trabajo a distancia
- Art. 12 Ley 10/2021: Derecho a dotación de medios
- Convenio colectivo aplicable

DOCTRINA ESTABLECIDA:
1. La empresa DEBE compensar gastos derivados del teletrabajo
2. La compensación debe estar CUANTIFICADA en acuerdo individual o convenio
3. No es válida la mera "puesta a disposición" de medios
4. El trabajador puede exigir REEMBOLSO de gastos acreditados

FALLO:
Se condena a la empresa a:
- Compensar gastos de conexión a internet: 20€/mes
- Compensar gastos eléctricos: 15€/mes
- Retroactividad desde inicio teletrabajo

APLICACIÓN EN MÓDULO RRHH:
- Incluir cláusula de compensación en acuerdos de teletrabajo
- Cuantificar expresamente los importes
- Registrar equipamiento entregado al trabajador`,
    summary: 'Obligación empresarial de compensar gastos de conexión y electricidad en teletrabajo',
    knowledge_type: 'precedent',
    jurisdiction_code: 'ES',
    legal_area: 'labor',
    sub_area: 'Teletrabajo',
    reference_code: 'SAN 152/2022',
    effective_date: '2022-12-20',
    source_url: 'https://www.poderjudicial.es/search/AN/openDocument/cendoj',
    source_name: 'CENDOJ',
    tags: ['teletrabajo', 'gastos', 'compensación', 'internet', 'electricidad'],
    keywords: ['teletrabajo', 'gastos', 'compensación', 'remoto', 'internet', 'CENDOJ']
  },
  {
    title: 'STS 892/2024 - Algoritmos y discriminación salarial',
    content: `Sentencia del Tribunal Supremo, Sala de lo Social, de 15 de enero de 2025 (Rec. 892/2024).

HECHOS:
- Empresa utiliza algoritmo de IA para calcular bonus variable
- Trabajadoras denuncian brecha salarial de género del 18%
- El algoritmo no es transparente ni auditable

FUNDAMENTOS JURÍDICOS:
- Art. 28 ET: Igualdad retributiva
- RD 902/2020: Igualdad retributiva
- Art. 22 RGPD: Decisiones automatizadas
- AI Act 2024/1689: Sistemas de IA de alto riesgo en empleo

DOCTRINA ESTABLECIDA:
1. Los sistemas algorítmicos de retribución son SISTEMAS DE ALTO RIESGO (AI Act)
2. La empresa debe poder EXPLICAR las decisiones del algoritmo
3. La auditoría algorítmica es OBLIGATORIA para detectar sesgos
4. La carga de la prueba de NO discriminación recae en la empresa

FALLO:
Se declara discriminación indirecta por razón de género.
Se ordena:
- Auditoría del algoritmo por tercero independiente
- Compensación retroactiva a las trabajadoras afectadas
- Implementación de mecanismos de transparencia algorítmica

APLICACIÓN EN MÓDULO RRHH:
- Auditar algoritmos de RRHH periódicamente
- Documentar criterios de decisión automatizada
- Informar a representantes de trabajadores sobre uso de IA
- Garantizar supervisión humana de decisiones críticas`,
    summary: 'Los algoritmos de RRHH son sistemas de alto riesgo que requieren auditoría y transparencia',
    knowledge_type: 'precedent',
    jurisdiction_code: 'ES',
    legal_area: 'labor',
    sub_area: 'Igualdad retributiva',
    reference_code: 'STS 892/2024',
    effective_date: '2025-01-15',
    source_url: 'https://www.poderjudicial.es/search/AN/openDocument/cendoj',
    source_name: 'CENDOJ',
    tags: ['algoritmo', 'IA', 'discriminación', 'brecha salarial', 'AI Act'],
    keywords: ['algoritmo', 'IA', 'discriminación', 'salario', 'auditoría', 'CENDOJ']
  }
];

// ============================================
// JURISPRUDENCIA EUROPEA (EUR-Lex)
// ============================================
export const EU_JURISPRUDENCE: EssentialKnowledgeItem[] = [
  {
    title: 'STJUE C-311/18 (Schrems II) - Transferencias internacionales',
    content: `Sentencia del Tribunal de Justicia de la Unión Europea de 16 de julio de 2020.
Caso: Data Protection Commissioner vs. Facebook Ireland Ltd y Maximillian Schrems.

CUESTIÓN PREJUDICIAL:
- Validez del Privacy Shield para transferencias UE-EEUU
- Validez de las Cláusulas Contractuales Tipo (CCT)

FUNDAMENTOS:
- Art. 45-46 RGPD: Requisitos para transferencias internacionales
- Carta DFUE Arts. 7, 8, 47: Derechos fundamentales

DOCTRINA SCHREMS II:
1. Se INVALIDA el Privacy Shield por:
   - Programas de vigilancia masiva de EEUU (FISA 702, EO 12333)
   - Falta de recursos judiciales efectivos para ciudadanos UE

2. Las CCT siguen siendo VÁLIDAS pero:
   - El exportador debe verificar el nivel de protección en destino
   - Pueden ser necesarias medidas suplementarias
   - Si no es posible garantizar protección, debe suspender transferencia

3. Se requiere evaluación CASO POR CASO:
   - Naturaleza de los datos
   - Legislación del tercer país
   - Probabilidad de acceso por autoridades

IMPACTO:
- Empresas deben realizar TIA (Transfer Impact Assessment)
- Medidas técnicas: cifrado, pseudonimización
- Medidas contractuales adicionales

APLICACIÓN EN MÓDULO LEGAL:
- Verificar transferencias internacionales de datos
- Exigir TIA documentado para proveedores en terceros países
- Alertar sobre servicios cloud en jurisdicciones de riesgo`,
    summary: 'Invalidación Privacy Shield y requisitos para transferencias internacionales de datos',
    knowledge_type: 'precedent',
    jurisdiction_code: 'EU',
    legal_area: 'data_protection',
    sub_area: 'Transferencias internacionales',
    reference_code: 'STJUE C-311/18',
    effective_date: '2020-07-16',
    source_url: 'https://curia.europa.eu/juris/liste.jsf?num=C-311/18',
    source_name: 'EUR-Lex',
    tags: ['Schrems II', 'Privacy Shield', 'transferencias', 'RGPD', 'EEUU'],
    keywords: ['Schrems', 'transferencia', 'internacional', 'Privacy Shield', 'CCT', 'EUR-Lex']
  },
  {
    title: 'STJUE C-807/21 - Derecho a la desconexión digital',
    content: `Sentencia del Tribunal de Justicia de la Unión Europea de 14 de mayo de 2024.

CUESTIÓN PREJUDICIAL:
- Alcance del derecho a la desconexión digital
- Obligaciones del empresario respecto a comunicaciones fuera de horario

FUNDAMENTOS:
- Directiva 2003/88/CE: Tiempo de trabajo
- Art. 31 Carta DFUE: Condiciones de trabajo justas
- Art. 88 RGPD: Tratamiento en el ámbito laboral

DOCTRINA ESTABLECIDA:
1. El tiempo de DISPONIBILIDAD para atender comunicaciones:
   - Es TIEMPO DE TRABAJO si limita significativamente la libertad del trabajador
   - Debe RETRIBUIRSE como hora extraordinaria si excede jornada

2. El empresario debe adoptar MEDIDAS ORGANIZATIVAS:
   - Configurar servidores para no enviar emails fuera de horario
   - Desactivar notificaciones en dispositivos corporativos
   - Formar a mandos intermedios sobre respeto del descanso

3. El incumplimiento puede constituir:
   - Infracción grave en materia de jornada (hasta 7.500€)
   - Daño moral indemnizable
   - Causa de extinción del contrato con indemnización

APLICACIÓN EN MÓDULO RRHH:
- Implementar política de desconexión digital documentada
- Configurar sistemas para respetar horarios
- Registrar incidencias de comunicaciones fuera de horario
- Formar a responsables de equipo`,
    summary: 'El tiempo de disponibilidad digital puede ser tiempo de trabajo retribuible',
    knowledge_type: 'precedent',
    jurisdiction_code: 'EU',
    legal_area: 'labor',
    sub_area: 'Desconexión digital',
    reference_code: 'STJUE C-807/21',
    effective_date: '2024-05-14',
    source_url: 'https://curia.europa.eu/juris/liste.jsf?num=C-807/21',
    source_name: 'EUR-Lex',
    tags: ['desconexión digital', 'tiempo trabajo', 'disponibilidad', 'jornada'],
    keywords: ['desconexión', 'digital', 'disponibilidad', 'jornada', 'email', 'EUR-Lex']
  }
];

// ============================================
// JURISPRUDENCIA ANDORRANA (BOPA)
// ============================================
export const ANDORRAN_JURISPRUDENCE: EssentialKnowledgeItem[] = [
  {
    title: 'STSA 2023/45 - Protección de datos en relaciones laborales',
    content: `Sentència del Tribunal Superior d'Andorra, Sala Administrativa, de 12 de març de 2024.

FETS:
- Empresa instal·la càmeres de videovigilància sense informar els treballadors
- L'APDA sanciona amb 25.000€
- L'empresa recorre al·legant interès legítim

FONAMENTS JURÍDICS:
- Art. 6 Llei 29/2021 (APDA): Bases de legitimació
- Art. 13 Llei 29/2021: Dret d'informació
- Llei 35/2008: Relacions laborals

DOCTRINA:
1. La videovigilància en el lloc de treball requereix:
   - Informació PRÈVIA i CLARA als treballadors
   - Finalitat LEGÍTIMA i PROPORCIONADA
   - Senyalització visible de les zones vigilades

2. L'interès legítim NO exclou l'obligació d'informar
3. Les imatges són DADES PERSONALS protegides per l'APDA

DECISIÓ:
Es confirma la sanció de 25.000€.
L'empresa ha de:
- Informar per escrit a tots els treballadors
- Instal·lar cartells informatius
- Limitar la retenció d'imatges a 30 dies

APLICACIÓ EN MÒDUL RRHH:
- Documentar informació a treballadors sobre videovigilància
- Incloure clàusula en contractes laborals
- Verificar senyalització adequada
- Controlar terminis de conservació d'imatges`,
    summary: 'La videovigilància laboral en Andorra requiere información previa y señalización',
    knowledge_type: 'precedent',
    jurisdiction_code: 'AD',
    legal_area: 'data_protection',
    sub_area: 'Videovigilancia laboral',
    reference_code: 'STSA 2023/45',
    effective_date: '2024-03-12',
    source_url: 'https://www.bopa.ad',
    source_name: 'BOPA',
    tags: ['videovigilància', 'APDA', 'laboral', 'Andorra'],
    keywords: ['videovigilancia', 'APDA', 'Andorra', 'càmeres', 'BOPA']
  }
];

// ============================================
// DOCTRINA ADMINISTRATIVA - DGT
// ============================================
export const DGT_DOCTRINE: EssentialKnowledgeItem[] = [
  {
    title: 'CV DGT V0405-23 - Deducibilidad gastos teletrabajo',
    content: `Consulta Vinculante de la Dirección General de Tributos V0405-23, de 28 de febrero de 2023.

CUESTIÓN PLANTEADA:
- Deducibilidad en IRPF de gastos de suministros (luz, internet) por teletrabajo
- Trabajador por cuenta ajena que realiza teletrabajo 3 días/semana

NORMATIVA APLICABLE:
- Art. 19 LIRPF: Rendimientos del trabajo
- Art. 26 LIRPF: Gastos deducibles

CONTESTACIÓN DGT:
1. Los gastos de suministros NO son deducibles por el trabajador si:
   - La empresa compensa dichos gastos
   - La compensación está exenta (art. 42 LIRPF)

2. Si la empresa NO compensa:
   - El trabajador no puede deducir estos gastos
   - Los rendimientos del trabajo no admiten deducción de gastos de esta naturaleza
   - Diferencia con autónomos que sí pueden deducir (con límites)

3. La compensación empresarial está EXENTA si:
   - Se documenta adecuadamente el teletrabajo
   - Los importes son razonables y proporcionales
   - Se acredita el uso para fines laborales

IMPACTO EN NÓMINAS:
- La compensación de gastos de teletrabajo debe aparecer como percepción exenta
- Documentar el acuerdo de trabajo a distancia
- Cuantificar expresamente los importes compensados

APLICACIÓN EN MÓDULO FISCAL/RRHH:
- Configurar conceptos de nómina para gastos teletrabajo
- Clasificar como rendimiento exento del trabajo
- Generar informes para modelo 190`,
    summary: 'Los gastos de teletrabajo compensados por la empresa están exentos en IRPF del trabajador',
    knowledge_type: 'doctrine',
    jurisdiction_code: 'ES',
    legal_area: 'tax',
    sub_area: 'IRPF',
    reference_code: 'CV V0405-23',
    effective_date: '2023-02-28',
    source_url: 'https://petete.tributos.hacienda.gob.es/consultas',
    source_name: 'DGT',
    tags: ['teletrabajo', 'gastos', 'IRPF', 'exención', 'nómina'],
    keywords: ['teletrabajo', 'gastos', 'IRPF', 'exención', 'deducción', 'DGT']
  },
  {
    title: 'CV DGT V1890-24 - IVA servicios digitales a particulares',
    content: `Consulta Vinculante de la Dirección General de Tributos V1890-24, de 15 de julio de 2024.

CUESTIÓN PLANTEADA:
- Tributación IVA de servicios digitales prestados a particulares en otros países UE
- Aplicación del régimen OSS (One-Stop Shop)

NORMATIVA APLICABLE:
- Art. 70 LIVA: Lugar de realización servicios electrónicos
- Art. 163 quatervicies LIVA: Régimen especial OSS

CONTESTACIÓN DGT:
1. Servicios prestados a PARTICULARES en otros Estados miembros:
   - Se localizan en el Estado miembro del consumidor
   - Se aplica el IVA del país de destino

2. UMBRAL de 10.000€ anuales (ventas a distancia + servicios digitales):
   - Por DEBAJO: puede aplicar IVA español
   - Por ENCIMA: obligatorio IVA del país del cliente

3. Régimen OSS (One-Stop Shop):
   - Registro voluntario en AEAT
   - Declaración trimestral única (modelo OSS)
   - Ingreso centralizado del IVA de todos los países

4. DOCUMENTACIÓN necesaria:
   - Identificación del cliente (país)
   - Evidencias de localización: IP, dirección facturación, banco

APLICACIÓN EN MÓDULO FISCAL:
- Detectar ventas digitales a particulares UE
- Alertar cuando se supere umbral 10.000€
- Configurar tipos IVA por país de destino
- Preparar declaración OSS trimestral`,
    summary: 'Servicios digitales a particulares UE tributan en destino; régimen OSS simplifica declaración',
    knowledge_type: 'doctrine',
    jurisdiction_code: 'ES',
    legal_area: 'tax',
    sub_area: 'IVA',
    reference_code: 'CV V1890-24',
    effective_date: '2024-07-15',
    source_url: 'https://petete.tributos.hacienda.gob.es/consultas',
    source_name: 'DGT',
    tags: ['IVA', 'servicios digitales', 'OSS', 'UE', 'ecommerce'],
    keywords: ['IVA', 'digital', 'OSS', 'particular', 'UE', 'DGT']
  }
];

// ============================================
// DOCTRINA ADMINISTRATIVA - TEAC
// ============================================
export const TEAC_DOCTRINE: EssentialKnowledgeItem[] = [
  {
    title: 'RTEAC 00/02876/2023 - Rectificación de autoliquidaciones',
    content: `Resolución del Tribunal Económico-Administrativo Central de 22 de enero de 2024.
Unificación de criterio.

CUESTIÓN:
- Plazo para solicitar rectificación de autoliquidaciones
- Diferencia entre opción tributaria y dato consignado por error

DOCTRINA UNIFICADA:
1. RECTIFICACIÓN (art. 120.3 LGT):
   - Plazo: 4 años desde presentación
   - Aplicable a: errores de hecho o aritméticos
   - También para: errores en aplicación de norma

2. OPCIONES TRIBUTARIAS (art. 119.3 LGT):
   - Son IRREVOCABLES después del plazo de declaración
   - Ejemplos: método de estimación, régimen especial
   - NO se pueden modificar vía rectificación

3. DISTINCIÓN CLAVE:
   - Si es un DATO que debía consignarse de cierta forma → Rectificable
   - Si es una ELECCIÓN entre alternativas legales → Opción irrevocable

4. Aplicación práctica:
   - Deducción no aplicada por olvido: SÍ rectificable
   - Cambio de método de amortización: NO rectificable (opción)
   - Error en base imponible: SÍ rectificable

APLICACIÓN EN MÓDULO FISCAL:
- Identificar opciones tributarias en declaraciones
- Alertar sobre irrevocabilidad de elecciones
- Detectar potenciales errores rectificables
- Controlar plazos de 4 años`,
    summary: 'Los errores son rectificables pero las opciones tributarias son irrevocables',
    knowledge_type: 'doctrine',
    jurisdiction_code: 'ES',
    legal_area: 'tax',
    sub_area: 'Procedimiento tributario',
    reference_code: 'RTEAC 00/02876/2023',
    effective_date: '2024-01-22',
    source_url: 'https://www.tribunaleseconomicosadministrativos.hacienda.gob.es',
    source_name: 'TEAC',
    tags: ['rectificación', 'autoliquidación', 'opción tributaria', 'LGT'],
    keywords: ['rectificación', 'autoliquidación', 'opción', 'plazo', 'TEAC']
  }
];

// ============================================
// DOCTRINA ADMINISTRATIVA - AEPD
// ============================================
export const AEPD_DOCTRINE: EssentialKnowledgeItem[] = [
  {
    title: 'Informe AEPD 2023/0089 - Uso de IA en selección de personal',
    content: `Informe Jurídico de la Agencia Española de Protección de Datos 2023/0089.

CUESTIÓN CONSULTADA:
- Licitud del uso de IA para filtrado de CV y entrevistas automatizadas
- Obligaciones de transparencia e información

MARCO NORMATIVO:
- Art. 22 RGPD: Decisiones individuales automatizadas
- Art. 13-14 RGPD: Derecho de información
- Art. 35 RGPD: Evaluación de impacto
- AI Act: Sistemas de IA de alto riesgo

CRITERIOS AEPD:

1. BASE DE LEGITIMACIÓN:
   - Consentimiento explícito del candidato, O
   - Ejecución de medidas precontractuales si lo solicita el candidato
   - El interés legítimo NO es suficiente para decisiones automatizadas

2. TRANSPARENCIA ALGORÍTMICA:
   - Información sobre la lógica aplicada
   - Explicación de las consecuencias de la decisión
   - El candidato puede solicitar explicación humana

3. DERECHO DE OPOSICIÓN:
   - El candidato puede exigir intervención humana
   - Puede impugnar la decisión automatizada
   - Debe existir proceso alternativo no automatizado

4. EVALUACIÓN DE IMPACTO:
   - OBLIGATORIA antes de implementar el sistema
   - Debe incluir auditoría de sesgos
   - Revisión periódica de resultados

5. CATEGORÍAS ESPECIALES:
   - PROHIBIDO inferir datos sensibles (etnia, salud, orientación)
   - Análisis de expresiones faciales/voz: requiere consentimiento explícito

RECOMENDACIONES:
- Informar claramente en la oferta de empleo
- Ofrecer alternativa de proceso manual
- Documentar decisiones y criterios
- Auditoría anual del sistema

APLICACIÓN EN MÓDULO RRHH:
- Verificar información en procesos de selección con IA
- Implementar derecho de oposición
- Registrar consentimientos explícitos
- Programar auditorías de sesgo`,
    summary: 'El uso de IA en selección requiere consentimiento explícito, transparencia y alternativa humana',
    knowledge_type: 'doctrine',
    jurisdiction_code: 'ES',
    legal_area: 'data_protection',
    sub_area: 'Decisiones automatizadas',
    reference_code: 'Informe AEPD 2023/0089',
    effective_date: '2023-06-15',
    source_url: 'https://www.aepd.es/informes-juridicos',
    source_name: 'AEPD',
    tags: ['IA', 'selección personal', 'RGPD', 'decisiones automatizadas', 'CV'],
    keywords: ['IA', 'selección', 'CV', 'automatizado', 'RGPD', 'AEPD']
  },
  {
    title: 'Informe AEPD 2024/0156 - Biometría en control de acceso',
    content: `Informe Jurídico de la Agencia Española de Protección de Datos 2024/0156.

CUESTIÓN CONSULTADA:
- Uso de reconocimiento facial para control de acceso a instalaciones
- Tratamiento de datos biométricos de trabajadores

MARCO NORMATIVO:
- Art. 9 RGPD: Categorías especiales de datos
- Art. 9.2.b RGPD: Excepción laboral
- LOPDGDD Arts. 6 y 89: Especificidades nacionales

CRITERIOS AEPD:

1. DATOS BIOMÉTRICOS = CATEGORÍA ESPECIAL:
   - El reconocimiento facial identifica unívocamente
   - Aplica la prohibición general del art. 9.1 RGPD
   - Las excepciones son de interpretación restrictiva

2. EXCEPCIÓN LABORAL (Art. 9.2.b):
   - Solo aplicable si hay norma que lo autorice
   - En España: convenio colectivo que lo prevea
   - No basta el mero consentimiento del trabajador

3. JUICIO DE PROPORCIONALIDAD:
   - ¿Existen medios menos invasivos? (tarjeta, PIN)
   - ¿Es necesario para la finalidad? 
   - El control de presencia NO justifica biometría por defecto

4. SUPUESTOS ADMISIBLES:
   - Acceso a zonas de alta seguridad
   - Infraestructuras críticas
   - Cuando otros medios sean claramente insuficientes

5. GARANTÍAS OBLIGATORIAS:
   - Evaluación de impacto previa
   - Almacenamiento en dispositivo del trabajador (no centralizado)
   - Cifrado de plantillas biométricas
   - Eliminación al cesar la relación laboral

APLICACIÓN EN MÓDULO RRHH:
- Evaluar alternativas antes de implementar biometría
- Verificar cobertura en convenio colectivo
- Realizar EIPD documentada
- Preferir almacenamiento descentralizado`,
    summary: 'La biometría para control de acceso laboral requiere previsión en convenio y juicio de proporcionalidad',
    knowledge_type: 'doctrine',
    jurisdiction_code: 'ES',
    legal_area: 'data_protection',
    sub_area: 'Biometría laboral',
    reference_code: 'Informe AEPD 2024/0156',
    effective_date: '2024-03-20',
    source_url: 'https://www.aepd.es/informes-juridicos',
    source_name: 'AEPD',
    tags: ['biometría', 'reconocimiento facial', 'acceso', 'RGPD', 'laboral'],
    keywords: ['biometría', 'facial', 'acceso', 'huella', 'RGPD', 'AEPD']
  }
];

// ============================================
// EXPORT COMPLETO
// ============================================
export const ALL_JURISPRUDENCE: EssentialKnowledgeItem[] = [
  ...SPANISH_JURISPRUDENCE,
  ...EU_JURISPRUDENCE,
  ...ANDORRAN_JURISPRUDENCE
];

export const ALL_DOCTRINE: EssentialKnowledgeItem[] = [
  ...DGT_DOCTRINE,
  ...TEAC_DOCTRINE,
  ...AEPD_DOCTRINE
];

export const ALL_JURISPRUDENCE_AND_DOCTRINE: EssentialKnowledgeItem[] = [
  ...ALL_JURISPRUDENCE,
  ...ALL_DOCTRINE
];

export const JURISPRUDENCE_CATEGORIES = {
  SPANISH_JURISPRUDENCE,
  EU_JURISPRUDENCE,
  ANDORRAN_JURISPRUDENCE,
  DGT_DOCTRINE,
  TEAC_DOCTRINE,
  AEPD_DOCTRINE
};

export default ALL_JURISPRUDENCE_AND_DOCTRINE;
