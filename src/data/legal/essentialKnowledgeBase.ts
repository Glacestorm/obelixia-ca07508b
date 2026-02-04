/**
 * Base de Conocimiento Jurídico Esencial
 * Contenido imprescindible para el funcionamiento del Módulo Legal
 * Incluye: Legislación, Reglamentos, Normativas, Convenios
 */

export interface EssentialKnowledgeItem {
  title: string;
  content: string;
  summary: string;
  knowledge_type: 'law' | 'regulation' | 'precedent' | 'doctrine' | 'template' | 'circular' | 'convention' | 'treaty';
  jurisdiction_code: string;
  legal_area: string;
  sub_area?: string;
  reference_code?: string;
  effective_date?: string;
  source_url?: string;
  source_name?: string;
  tags: string[];
  keywords: string[];
}

// ============================================
// LEGISLACIÓN ESPAÑOLA
// ============================================
export const SPANISH_LEGISLATION: EssentialKnowledgeItem[] = [
  // LABORAL
  {
    title: 'Estatuto de los Trabajadores',
    content: `Real Decreto Legislativo 2/2015, de 23 de octubre, por el que se aprueba el texto refundido de la Ley del Estatuto de los Trabajadores.
    
CONTENIDO PRINCIPAL:
- Título I: Relación individual de trabajo (arts. 1-60)
  - Fuentes de la relación laboral
  - Derechos y deberes laborales básicos
  - Contrato de trabajo: forma, duración, modalidades
  - Derechos y deberes derivados del contrato
  - Salario y garantías salariales
  - Tiempo de trabajo (jornada, horas extras, descansos, vacaciones)
  - Movilidad funcional y geográfica
  - Modificación sustancial de condiciones de trabajo
  - Suspensión del contrato
  - Extinción del contrato (causas, procedimiento, indemnizaciones)

- Título II: Derechos de representación colectiva (arts. 61-76)
  - Órganos de representación
  - Procedimiento electoral

- Título III: Negociación colectiva y convenios (arts. 82-92)
  - Concepto y eficacia
  - Legitimación
  - Procedimiento de negociación
  - Aplicación e interpretación

ASPECTOS CLAVE PARA VALIDACIÓN:
- Art. 41: Modificación sustancial requiere procedimiento específico
- Art. 49-56: Extinción del contrato y causas de despido
- Art. 53: Despido objetivo
- Art. 54: Despido disciplinario
- Art. 55-56: Forma y efectos del despido`,
    summary: 'Norma fundamental del derecho laboral español que regula las relaciones individuales y colectivas de trabajo',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Laboral',
    sub_area: 'Contrato de trabajo',
    reference_code: 'RDL 2/2015',
    effective_date: '2015-10-24',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430',
    source_name: 'BOE',
    tags: ['laboral', 'estatuto trabajadores', 'contrato', 'despido', 'jornada'],
    keywords: ['estatuto', 'trabajadores', 'contrato', 'despido', 'salario', 'jornada', 'vacaciones', 'indemnización']
  },
  {
    title: 'Ley de Prevención de Riesgos Laborales',
    content: `Ley 31/1995, de 8 de noviembre, de prevención de Riesgos Laborales.

OBJETO: Promover la seguridad y la salud de los trabajadores mediante la aplicación de medidas y el desarrollo de actividades necesarias para la prevención de riesgos derivados del trabajo.

PRINCIPIOS DE LA ACCIÓN PREVENTIVA (Art. 15):
a) Evitar los riesgos
b) Evaluar los riesgos que no se puedan evitar
c) Combatir los riesgos en su origen
d) Adaptar el trabajo a la persona
e) Tener en cuenta la evolución de la técnica
f) Sustituir lo peligroso por lo que entrañe poco o ningún peligro
g) Planificar la prevención
h) Anteponer protección colectiva a la individual
i) Dar instrucciones a los trabajadores

OBLIGACIONES DEL EMPRESARIO:
- Plan de prevención de riesgos
- Evaluación de riesgos
- Planificación de la actividad preventiva
- Información, consulta y participación
- Formación de los trabajadores
- Medidas de emergencia
- Vigilancia de la salud
- Documentación

INFRACCIONES Y SANCIONES:
- Leves: hasta 2.450€
- Graves: 2.451€ - 49.180€
- Muy graves: 49.181€ - 983.736€`,
    summary: 'Marco normativo para garantizar la seguridad y salud de los trabajadores',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Laboral',
    sub_area: 'Prevención de riesgos',
    reference_code: 'L 31/1995',
    effective_date: '1995-11-10',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1995-24292',
    source_name: 'BOE',
    tags: ['laboral', 'prevención', 'riesgos', 'seguridad', 'salud'],
    keywords: ['prevención', 'riesgos', 'seguridad', 'salud', 'evaluación', 'plan']
  },
  // FISCAL
  {
    title: 'Ley General Tributaria',
    content: `Ley 58/2003, de 17 de diciembre, General Tributaria.

PRINCIPIOS DEL SISTEMA TRIBUTARIO:
- Capacidad económica
- Justicia, generalidad, igualdad, progresividad
- Equitativa distribución de la carga tributaria
- No confiscatoriedad

OBLIGACIONES TRIBUTARIAS:
1. Obligación tributaria principal: pago de la cuota
2. Obligaciones formales:
   - Presentar declaraciones y autoliquidaciones
   - Solicitar NIF
   - Llevar y conservar libros de contabilidad
   - Expedir y entregar facturas
   - Aportar información tributaria

PROCEDIMIENTOS:
- De gestión (verificación, comprobación limitada, inspección)
- De inspección
- De recaudación
- Sancionador

INFRACCIONES Y SANCIONES:
- Dejar de ingresar: 50%-150% de la cuota
- Solicitar indebidamente devoluciones: 50%-150%
- Incumplir obligaciones de facturación: 1%-2% del importe
- Resistencia a la inspección: multa fija 150€-600.000€

PRESCRIPCIÓN: 4 años para:
- Determinar la deuda tributaria
- Exigir el pago de deudas liquidadas
- Solicitar devoluciones
- Obtener devoluciones derivadas de la normativa`,
    summary: 'Marco jurídico general del sistema tributario español',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Fiscal',
    sub_area: 'General',
    reference_code: 'L 58/2003',
    effective_date: '2003-12-18',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186',
    source_name: 'BOE',
    tags: ['fiscal', 'tributario', 'impuestos', 'hacienda', 'AEAT'],
    keywords: ['tributaria', 'impuestos', 'declaración', 'inspección', 'sanción', 'prescripción']
  },
  {
    title: 'Ley del Impuesto sobre el Valor Añadido (LIVA)',
    content: `Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido.

HECHO IMPONIBLE:
- Entregas de bienes y prestaciones de servicios por empresarios
- Adquisiciones intracomunitarias
- Importaciones de bienes

TIPOS IMPOSITIVOS (2024):
- General: 21%
- Reducido: 10% (alimentos, transporte, hostelería)
- Superreducido: 4% (pan, leche, medicamentos, libros)

RÉGIMEN DE DEDUCCIONES:
- IVA soportado en operaciones sujetas y no exentas
- Regla de prorrata (cuando hay operaciones exentas)
- Requisitos formales: factura, registro

OBLIGACIONES FORMALES:
- Expedir y entregar facturas
- Llevar libros registro de IVA
- Presentar declaraciones periódicas (Mod. 303, 390)
- Sistema Inmediato de Información (SII) para grandes empresas

OPERACIONES INTRACOMUNITARIAS:
- Declaración recapitulativa (Mod. 349)
- Registro de operadores intracomunitarios (ROI)
- Inversión del sujeto pasivo`,
    summary: 'Regulación del IVA como impuesto indirecto sobre el consumo',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Fiscal',
    sub_area: 'IVA',
    reference_code: 'L 37/1992',
    effective_date: '1993-01-01',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740',
    source_name: 'BOE',
    tags: ['IVA', 'fiscal', 'impuestos', 'facturación'],
    keywords: ['IVA', 'factura', 'deducción', 'prorrata', 'intracomunitario', 'SII']
  },
  {
    title: 'Ley del Impuesto sobre Sociedades',
    content: `Ley 27/2014, de 27 de noviembre, del Impuesto sobre Sociedades.

HECHO IMPONIBLE:
- Obtención de renta por el contribuyente (sociedades, entidades jurídicas)

TIPO DE GRAVAMEN GENERAL: 25%
- Tipos reducidos:
  - Entidades de nueva creación: 15% (primeros dos ejercicios con BI positiva)
  - Cooperativas: 20%
  - Entidades sin fines lucrativos: 10%

BASE IMPONIBLE:
- Resultado contable ± ajustes fiscales
- Imputación temporal: devengo
- Gastos no deducibles (art. 15): multas, liberalidades, pérdidas de juego

DEDUCCIONES:
- Por I+D+i
- Por creación de empleo
- Por inversiones medioambientales
- Por producciones cinematográficas

PAGOS FRACCIONADOS (art. 40):
- Modelo 202: abril, octubre, diciembre
- Modalidades: 18% cuota o % sobre BI

OBLIGACIONES FORMALES:
- Declaración anual (Mod. 200)
- Plazo: 25 días naturales siguientes a 6 meses desde cierre ejercicio
- Llevanza de contabilidad según Código de Comercio`,
    summary: 'Impuesto directo sobre la renta de sociedades y entidades jurídicas',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Fiscal',
    sub_area: 'Impuesto Sociedades',
    reference_code: 'L 27/2014',
    effective_date: '2015-01-01',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328',
    source_name: 'BOE',
    tags: ['impuesto sociedades', 'fiscal', 'empresas'],
    keywords: ['sociedades', 'base imponible', 'deducción', 'pago fraccionado', 'contabilidad']
  },
  // MERCANTIL Y COMPRAS
  {
    title: 'Ley de morosidad comercial (Ley 15/2010)',
    content: `Ley 15/2010, de 5 de julio, de modificación de la Ley 3/2004, de 29 de diciembre, por la que se establecen medidas de lucha contra la morosidad en las operaciones comerciales.

PLAZOS MÁXIMOS DE PAGO:
- Entre empresas: 60 días desde entrega/prestación
- Sector público a proveedores: 30 días

CÓMPUTO DEL PLAZO:
- Desde la fecha de recepción de mercancías/servicios
- Si hay procedimiento de aceptación/comprobación: desde finalización del mismo

INTERESES DE DEMORA:
- Tipo legal: tipo BCE + 8 puntos
- Devengo automático sin necesidad de reclamación

CLÁUSULAS ABUSIVAS (art. 9):
- Nulas las que excluyan la indemnización por costes de cobro
- Nulas las que excluyan el devengo de intereses de demora
- Nulas las que amplíen plazos más allá de lo permitido

INDEMNIZACIÓN POR COSTES DE COBRO:
- Mínimo 40€ por operación
- Gastos adicionales de cobro razonables

INFRACCIONES EN CONTRATACIÓN PÚBLICA:
- El incumplimiento de plazos puede generar:
  - Intereses de demora automáticos
  - Reclamación por vía contenciosa

RELEVANCIA PARA MÓDULO COMPRAS:
- Validar plazos de pago en contratos con proveedores
- Alertar sobre condiciones potencialmente abusivas
- Control automático de vencimientos`,
    summary: 'Plazos máximos de pago y medidas contra la morosidad en operaciones comerciales',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Mercantil',
    sub_area: 'Contratación comercial',
    reference_code: 'L 15/2010',
    effective_date: '2010-07-07',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-10708',
    source_name: 'BOE',
    tags: ['morosidad', 'plazos pago', 'proveedores', 'compras'],
    keywords: ['morosidad', 'pago', 'proveedor', '60 días', 'interés demora', 'compras']
  },
  {
    title: 'Código de Comercio',
    content: `Real Decreto de 22 de agosto de 1885 por el que se publica el Código de Comercio.

LIBRO I: DE LOS COMERCIANTES Y DEL COMERCIO EN GENERAL
- Capacidad para ejercer el comercio
- Registro Mercantil
- Contabilidad de los empresarios

LIBRO II: DE LOS CONTRATOS ESPECIALES DEL COMERCIO
- Compraventa mercantil (arts. 325-345)
  - Perfección del contrato
  - Transmisión de riesgos
  - Obligaciones comprador/vendedor
- Comisión mercantil
- Transporte terrestre
- Contratos de seguro

LIBRO III: DEL COMERCIO MARÍTIMO

LIBRO IV: DE LA SUSPENSIÓN DE PAGOS Y QUIEBRAS

OBLIGACIONES CONTABLES:
- Libro diario
- Libro de inventarios y cuentas anuales
- Conservación durante 6 años
- Formulación de cuentas anuales

COMPRAVENTA MERCANTIL (arts. 325-345):
- Art. 325: Es mercantil la compraventa de cosas muebles para revenderlas
- Art. 336: Entrega en lugar y tiempo convenidos
- Art. 337: Pago al contado salvo pacto en contrario
- Art. 339: Vicios ocultos - reclamación en 30 días`,
    summary: 'Normativa fundamental del derecho mercantil español',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Mercantil',
    sub_area: 'General',
    reference_code: 'RD 22/08/1885',
    effective_date: '1885-08-22',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627',
    source_name: 'BOE',
    tags: ['mercantil', 'comercio', 'compraventa', 'contabilidad'],
    keywords: ['comercio', 'compraventa', 'mercantil', 'contrato', 'contabilidad']
  },
  // PROTECCIÓN DE DATOS
  {
    title: 'Ley Orgánica de Protección de Datos (LOPDGDD)',
    content: `Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales.

OBJETO:
- Adaptar el ordenamiento jurídico español al RGPD
- Garantizar los derechos digitales de la ciudadanía

PRINCIPIOS (adaptación RGPD):
- Licitud, lealtad y transparencia
- Limitación de la finalidad
- Minimización de datos
- Exactitud
- Limitación del plazo de conservación
- Integridad y confidencialidad
- Responsabilidad proactiva

BASES DE LEGITIMACIÓN:
1. Consentimiento
2. Ejecución de contrato
3. Obligación legal
4. Interés vital
5. Interés público
6. Interés legítimo

DERECHOS (arts. 13-18):
- Acceso
- Rectificación
- Supresión ("derecho al olvido")
- Limitación del tratamiento
- Portabilidad
- Oposición
- No decisiones automatizadas

DELEGADO DE PROTECCIÓN DE DATOS (arts. 34-37):
- Obligatorio para: sector público, tratamiento a gran escala, categorías especiales
- Funciones: informar, supervisar, cooperar con autoridad

SANCIONES:
- Leves: hasta 40.000€
- Graves: 40.001€ - 300.000€
- Muy graves: 300.001€ - 20.000.000€ o 4% facturación`,
    summary: 'Adaptación del RGPD al ordenamiento español y derechos digitales',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Protección de datos',
    sub_area: 'RGPD',
    reference_code: 'LO 3/2018',
    effective_date: '2018-12-07',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673',
    source_name: 'BOE',
    tags: ['LOPD', 'RGPD', 'protección datos', 'privacidad'],
    keywords: ['datos personales', 'consentimiento', 'RGPD', 'privacidad', 'DPO']
  }
];

// ============================================
// LEGISLACIÓN ANDORRA
// ============================================
export const ANDORRAN_LEGISLATION: EssentialKnowledgeItem[] = [
  {
    title: 'Llei qualificada de protecció de dades personals (APDA)',
    content: `Llei 29/2021, del 28 d'octubre, qualificada de protecció de dades personals.

OBJECTE: Regular el tractament de les dades personals i la seva lliure circulació.

PRINCIPIS:
- Licitud, lleialtat i transparència
- Limitació de la finalitat
- Minimització de dades
- Exactitud
- Limitació del termini de conservació
- Integritat i confidencialitat
- Responsabilitat proactiva

DRETS DELS INTERESSATS:
- Dret d'accés
- Dret de rectificació
- Dret de supressió
- Dret a la limitació del tractament
- Dret a la portabilitat
- Dret d'oposició

AUTORITAT DE CONTROL: Agència Andorrana de Protecció de Dades (APDA)

SANCIONS:
- Infraccions lleus: fins a 10.000€
- Infraccions greus: 10.001€ - 100.000€
- Infraccions molt greus: 100.001€ - 600.000€

TRANSFERÈNCIES INTERNACIONALS:
- Adequació: UE reconeguda
- Clàusules contractuals tipus
- Binding Corporate Rules`,
    summary: 'Marc normatiu andorrà de protecció de dades personals',
    knowledge_type: 'law',
    jurisdiction_code: 'AD',
    legal_area: 'Protección de datos',
    sub_area: 'APDA',
    reference_code: 'L 29/2021',
    effective_date: '2021-11-11',
    source_url: 'https://www.bopa.ad',
    source_name: 'BOPA',
    tags: ['APDA', 'protecció dades', 'Andorra', 'privacitat'],
    keywords: ['dades personals', 'APDA', 'Andorra', 'privacitat', 'consentiment']
  },
  {
    title: 'Impost General Indirecte (IGI)',
    content: `Llei 11/2012, del 21 de juny, de l'impost general indirecte.

FET IMPOSABLE:
- Lliuraments de béns i prestacions de serveis per empresaris
- Importacions de béns

TIPUS IMPOSITIUS:
- General: 4,5%
- Reduït: 1% (aliments bàsics, aigua)
- Incrementat: 9,5% (serveis bancaris, assegurances)
- Superreduït: 0% (sanitat, educació)
- Especial: varies (tabac, hidrocarburs)

OBLIGACIONS FORMALS:
- Facturació
- Llibres registre
- Declaracions trimestrals
- Declaració anual resum

RÈGIM DE DEDUCCIONS:
- IGI suportat en operacions subjectes
- Prorrata en operacions exemptes

OPERACIONS EXEMPLES:
- Serveis mèdics i sanitaris
- Ensenyament
- Serveis financers i d'assegurances`,
    summary: 'Impuesto indirecto general de Andorra, equivalente al IVA',
    knowledge_type: 'law',
    jurisdiction_code: 'AD',
    legal_area: 'Fiscal',
    sub_area: 'IGI',
    reference_code: 'L 11/2012',
    effective_date: '2013-01-01',
    source_url: 'https://www.bopa.ad',
    source_name: 'BOPA',
    tags: ['IGI', 'fiscal', 'Andorra', 'impost'],
    keywords: ['IGI', 'impost', 'Andorra', 'factura', 'deducció']
  }
];

// ============================================
// NORMATIVA EUROPEA
// ============================================
export const EU_LEGISLATION: EssentialKnowledgeItem[] = [
  {
    title: 'Reglamento General de Protección de Datos (RGPD)',
    content: `Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016.

ÁMBITO DE APLICACIÓN:
- Tratamiento de datos personales en contexto de establecimiento UE
- Tratamiento de datos de residentes UE por responsables fuera UE

PRINCIPIOS FUNDAMENTALES (Art. 5):
1. Licitud, lealtad y transparencia
2. Limitación de la finalidad
3. Minimización de datos
4. Exactitud
5. Limitación del plazo de conservación
6. Integridad y confidencialidad
7. Responsabilidad proactiva

BASES DE LEGITIMACIÓN (Art. 6):
a) Consentimiento
b) Ejecución de contrato
c) Cumplimiento obligación legal
d) Protección de intereses vitales
e) Misión de interés público
f) Interés legítimo

DERECHOS DEL INTERESADO:
- Información (arts. 13-14)
- Acceso (art. 15)
- Rectificación (art. 16)
- Supresión - olvido (art. 17)
- Limitación (art. 18)
- Portabilidad (art. 20)
- Oposición (art. 21)
- No decisiones automatizadas (art. 22)

SANCIONES (Art. 83):
- Hasta 10.000.000€ o 2% facturación global
- Hasta 20.000.000€ o 4% facturación global (infracciones graves)`,
    summary: 'Marco normativo europeo de protección de datos personales',
    knowledge_type: 'regulation',
    jurisdiction_code: 'EU',
    legal_area: 'Protección de datos',
    sub_area: 'RGPD',
    reference_code: 'R (UE) 2016/679',
    effective_date: '2018-05-25',
    source_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32016R0679',
    source_name: 'EUR-Lex',
    tags: ['RGPD', 'GDPR', 'protección datos', 'UE', 'privacidad'],
    keywords: ['RGPD', 'datos personales', 'consentimiento', 'DPO', 'privacidad']
  },
  {
    title: 'Reglamento DORA (Resiliencia Operativa Digital)',
    content: `Reglamento (UE) 2022/2554 sobre la resiliencia operativa digital del sector financiero.

OBJETIVO: Establecer requisitos uniformes para la seguridad de las redes y sistemas de información que sustentan los procesos operativos de las entidades financieras.

ÁMBITO DE APLICACIÓN:
- Entidades de crédito
- Empresas de inversión
- Entidades de pago
- Entidades de dinero electrónico
- Empresas de seguros
- Proveedores de servicios TIC críticos

PILARES PRINCIPALES:

1. GESTIÓN DEL RIESGO TIC (Arts. 5-16):
- Marco de gestión del riesgo TIC
- Funciones y responsabilidades
- Identificación de funciones críticas
- Protección y prevención
- Detección de incidentes
- Respuesta y recuperación

2. GESTIÓN DE INCIDENTES (Arts. 17-23):
- Clasificación de incidentes
- Notificación a autoridades
- Plazos: 4 horas (inicial), 72 horas (intermedio), 1 mes (final)

3. PRUEBAS DE RESILIENCIA (Arts. 24-27):
- Pruebas básicas anuales
- Pruebas avanzadas (TLPT) cada 3 años
- Pruebas de penetración

4. RIESGO DE TERCEROS TIC (Arts. 28-44):
- Due diligence de proveedores
- Disposiciones contractuales mínimas
- Supervisión de proveedores críticos

5. INTERCAMBIO DE INFORMACIÓN (Art. 45):
- Compartir información sobre ciberamenazas

ENTRADA EN VIGOR: 17 enero 2025`,
    summary: 'Regulación europea de resiliencia operativa digital para el sector financiero',
    knowledge_type: 'regulation',
    jurisdiction_code: 'EU',
    legal_area: 'Bancario',
    sub_area: 'Tecnología financiera',
    reference_code: 'R (UE) 2022/2554',
    effective_date: '2025-01-17',
    source_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32022R2554',
    source_name: 'EUR-Lex',
    tags: ['DORA', 'resiliencia', 'ciberseguridad', 'banca', 'fintech'],
    keywords: ['DORA', 'resiliencia', 'TIC', 'incidentes', 'ciberseguridad', 'banca']
  },
  {
    title: 'Directiva NIS2 (Seguridad de Redes y Sistemas)',
    content: `Directiva (UE) 2022/2555 relativa a medidas destinadas a garantizar un elevado nivel común de ciberseguridad en toda la Unión.

OBJETIVO: Mejorar la ciberseguridad en la UE mediante la imposición de obligaciones a entidades esenciales e importantes.

ENTIDADES ESENCIALES (Anexo I):
- Energía (electricidad, gas, petróleo)
- Transporte (aéreo, ferroviario, marítimo, carretera)
- Banca
- Infraestructuras de mercados financieros
- Sanidad
- Agua potable
- Aguas residuales
- Infraestructura digital
- Administración pública
- Espacio

ENTIDADES IMPORTANTES (Anexo II):
- Servicios postales
- Gestión de residuos
- Fabricación, producción y distribución de productos químicos
- Producción, transformación y distribución de alimentos
- Fabricación
- Proveedores digitales
- Investigación

OBLIGACIONES DE GESTIÓN DE RIESGOS:
- Políticas de análisis de riesgos
- Gestión de incidentes
- Continuidad de las actividades
- Seguridad de la cadena de suministro
- Seguridad en la adquisición de sistemas
- Evaluación de la eficacia de las medidas
- Prácticas de ciberhigiene
- Uso de criptografía
- Seguridad de recursos humanos
- Control de acceso y gestión de activos

NOTIFICACIÓN DE INCIDENTES:
- Alerta temprana: 24 horas
- Notificación del incidente: 72 horas
- Informe final: 1 mes

SANCIONES:
- Entidades esenciales: hasta 10M€ o 2% facturación
- Entidades importantes: hasta 7M€ o 1,4% facturación`,
    summary: 'Directiva europea sobre ciberseguridad de redes y sistemas de información',
    knowledge_type: 'regulation',
    jurisdiction_code: 'EU',
    legal_area: 'Tecnología',
    sub_area: 'Ciberseguridad',
    reference_code: 'D (UE) 2022/2555',
    effective_date: '2024-10-18',
    source_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32022L2555',
    source_name: 'EUR-Lex',
    tags: ['NIS2', 'ciberseguridad', 'infraestructuras críticas'],
    keywords: ['NIS2', 'ciberseguridad', 'incidentes', 'infraestructuras', 'notificación']
  },
  {
    title: 'Reglamento AI Act (Inteligencia Artificial)',
    content: `Reglamento (UE) 2024/1689 por el que se establecen normas armonizadas en materia de inteligencia artificial.

OBJETIVO: Establecer un marco jurídico uniforme para el desarrollo, comercialización y uso de sistemas de IA en la UE.

CLASIFICACIÓN DE RIESGOS:

1. RIESGO INACEPTABLE (Prohibidos):
- Manipulación cognitiva subliminal
- Explotación de vulnerabilidades (edad, discapacidad)
- Puntuación social por autoridades públicas
- Identificación biométrica remota en tiempo real en espacios públicos
- Categorización biométrica para inferir datos sensibles
- Reconocimiento de emociones en lugar de trabajo/educación
- Scraping masivo de imágenes faciales

2. ALTO RIESGO:
- Identificación biométrica
- Infraestructuras críticas
- Educación y formación profesional
- Empleo y gestión de trabajadores
- Acceso a servicios esenciales
- Aplicación de la ley
- Migración y control de fronteras
- Administración de justicia

3. RIESGO LIMITADO:
- Obligaciones de transparencia
- Chatbots (informar que es IA)
- Sistemas de reconocimiento de emociones
- Deepfakes (etiquetar contenido)

4. RIESGO MÍNIMO:
- Libre uso (videojuegos, filtros spam)

OBLIGACIONES ALTO RIESGO:
- Sistema de gestión de riesgos
- Gobernanza de datos
- Documentación técnica
- Registros automáticos (trazabilidad)
- Transparencia e información
- Supervisión humana
- Precisión, robustez, ciberseguridad

SANCIONES:
- IA prohibida: hasta 35M€ o 7% facturación
- Alto riesgo (incumplimiento): hasta 15M€ o 3%
- Información incorrecta: hasta 7,5M€ o 1,5%`,
    summary: 'Primera regulación integral de IA en el mundo',
    knowledge_type: 'regulation',
    jurisdiction_code: 'EU',
    legal_area: 'Tecnología',
    sub_area: 'Inteligencia Artificial',
    reference_code: 'R (UE) 2024/1689',
    effective_date: '2024-08-01',
    source_url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R1689',
    source_name: 'EUR-Lex',
    tags: ['AI Act', 'inteligencia artificial', 'regulación IA'],
    keywords: ['IA', 'inteligencia artificial', 'alto riesgo', 'AI Act', 'algoritmo']
  }
];

// ============================================
// NORMATIVA DE COMPRAS Y CONTRATACIÓN
// ============================================
export const PROCUREMENT_LEGISLATION: EssentialKnowledgeItem[] = [
  {
    title: 'Ley de Contratos del Sector Público',
    content: `Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público.

ÁMBITO: Contratación de las Administraciones Públicas.

TIPOS DE CONTRATOS:
- Obras
- Concesión de obras
- Concesión de servicios
- Suministro
- Servicios

PRINCIPIOS DE CONTRATACIÓN:
- Libertad de acceso
- Publicidad y transparencia
- No discriminación e igualdad de trato
- Eficiencia en el gasto público
- Integridad

PROCEDIMIENTOS DE ADJUDICACIÓN:
1. Abierto: cualquier empresa puede presentar oferta
2. Restringido: solo empresas invitadas
3. Negociado sin publicidad: supuestos tasados
4. Diálogo competitivo: contratos complejos
5. Asociación para la innovación: desarrollo de productos nuevos

UMBRALES ARMONIZADOS (2024):
- Obras: 5.538.000€
- Suministros y servicios (Administración General): 143.000€
- Suministros y servicios (otros poderes adjudicadores): 221.000€

CRITERIOS DE ADJUDICACIÓN:
- Mejor relación calidad-precio
- Criterios sociales y medioambientales
- Coste del ciclo de vida

GARANTÍAS:
- Provisional: hasta 3% presupuesto de licitación
- Definitiva: 5% precio de adjudicación

MODIFICACIÓN DE CONTRATOS (Arts. 203-207):
- Solo por causas previstas en pliegos
- Límite: 50% del precio inicial`,
    summary: 'Regulación de la contratación de las Administraciones Públicas españolas',
    knowledge_type: 'law',
    jurisdiction_code: 'ES',
    legal_area: 'Administrativo',
    sub_area: 'Contratación pública',
    reference_code: 'L 9/2017',
    effective_date: '2018-03-09',
    source_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902',
    source_name: 'BOE',
    tags: ['contratación pública', 'licitación', 'concurso'],
    keywords: ['contratación', 'licitación', 'adjudicación', 'concurso', 'pliego']
  },
  {
    title: 'Incoterms 2020',
    content: `Reglas de la Cámara de Comercio Internacional para la interpretación de términos comerciales.

GRUPOS:

GRUPO E - SALIDA:
- EXW (Ex Works): En fábrica
  * Mínima obligación del vendedor
  * Comprador asume todos los riesgos y costes

GRUPO F - SIN PAGO TRANSPORTE PRINCIPAL:
- FCA (Free Carrier): Franco transportista
- FAS (Free Alongside Ship): Franco al costado del buque
- FOB (Free On Board): Franco a bordo

GRUPO C - CON PAGO TRANSPORTE PRINCIPAL:
- CFR (Cost and Freight): Coste y flete
- CIF (Cost, Insurance and Freight): Coste, seguro y flete
- CPT (Carriage Paid To): Transporte pagado hasta
- CIP (Carriage and Insurance Paid To): Transporte y seguro pagados hasta

GRUPO D - LLEGADA:
- DAP (Delivered at Place): Entregada en lugar
- DPU (Delivered at Place Unloaded): Entregada en lugar descargada
- DDP (Delivered Duty Paid): Entregada derechos pagados
  * Máxima obligación del vendedor
  * Vendedor asume todos los riesgos y costes

RELEVANCIA PARA COMPRAS:
- Determina momento de transmisión del riesgo
- Define responsabilidad de costes (transporte, seguro, aduanas)
- Obligatorio especificar en contratos internacionales
- Afecta al tratamiento de IVA/IGI en importaciones`,
    summary: 'Términos comerciales internacionales que regulan obligaciones en compraventa internacional',
    knowledge_type: 'convention',
    jurisdiction_code: 'INT',
    legal_area: 'Mercantil',
    sub_area: 'Comercio internacional',
    reference_code: 'Incoterms 2020',
    effective_date: '2020-01-01',
    source_url: 'https://iccwbo.org/resources-for-business/incoterms-rules/',
    source_name: 'ICC',
    tags: ['Incoterms', 'comercio internacional', 'compras', 'importación'],
    keywords: ['Incoterms', 'FOB', 'CIF', 'DDP', 'importación', 'exportación']
  },
  {
    title: 'IVA en operaciones intracomunitarias',
    content: `Régimen especial de IVA para operaciones entre Estados miembros de la UE.

ADQUISICIONES INTRACOMUNITARIAS DE BIENES:
- Transporte de bienes de un Estado miembro a otro
- Adquirente: empresario o profesional
- Sujeto pasivo: el adquirente (inversión del sujeto pasivo)
- Tipo aplicable: tipo del país de destino

ENTREGAS INTRACOMUNITARIAS DE BIENES:
- Exentas de IVA cuando:
  * El adquirente está identificado en otro Estado miembro
  * Los bienes se transportan fuera de España
  * El adquirente tiene NIF-IVA válido

OBLIGACIONES FORMALES:
- Registro de Operadores Intracomunitarios (ROI)
- Declaración recapitulativa (Modelo 349)
- Factura sin IVA con mención "Operación exenta art. 25 LIVA"
- Conservar justificante de transporte

VALIDACIÓN NIF-IVA:
- Sistema VIES de la Comisión Europea
- Obligatorio verificar antes de aplicar exención

SERVICIOS ENTRE EMPRESARIOS (B2B):
- Regla general: tributación en sede del destinatario
- Inversión del sujeto pasivo

RELEVANCIA PARA COMPRAS:
- Verificar estatus ROI del proveedor
- Obtener justificantes de transporte
- Modelo 349 con operaciones del período`,
    summary: 'Tratamiento fiscal de compras y ventas entre empresas de la UE',
    knowledge_type: 'regulation',
    jurisdiction_code: 'EU',
    legal_area: 'Fiscal',
    sub_area: 'IVA intracomunitario',
    reference_code: 'Dir 2006/112/CE',
    effective_date: '2007-01-01',
    source_url: 'https://eur-lex.europa.eu',
    source_name: 'EUR-Lex',
    tags: ['IVA', 'intracomunitario', 'ROI', 'VIES'],
    keywords: ['intracomunitario', 'ROI', 'VIES', 'modelo 349', 'exención']
  }
];

// ============================================
// EXPORT COMPLETO
// ============================================
export const ALL_ESSENTIAL_KNOWLEDGE: EssentialKnowledgeItem[] = [
  ...SPANISH_LEGISLATION,
  ...ANDORRAN_LEGISLATION,
  ...EU_LEGISLATION,
  ...PROCUREMENT_LEGISLATION
];

export const KNOWLEDGE_CATEGORIES = {
  SPANISH: SPANISH_LEGISLATION,
  ANDORRAN: ANDORRAN_LEGISLATION,
  EUROPEAN: EU_LEGISLATION,
  PROCUREMENT: PROCUREMENT_LEGISLATION
};

export default ALL_ESSENTIAL_KNOWLEDGE;
