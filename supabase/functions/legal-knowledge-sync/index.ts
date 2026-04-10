import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { validateCronOrServiceAuth, corsHeaders } from "../_shared/cron-auth.ts";
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";

/**
 * Legal Knowledge Sync - Edge Function
 * Sincroniza diariamente la Base de Conocimiento Esencial Jurídica
 * Ejecutada por cron job cada 24h
 */

interface EssentialKnowledgeItem {
  title: string;
  content: string;
  summary: string;
  knowledge_type: string;
  jurisdiction_code: string;
  legal_area: string;
  sub_area: string;
  reference_code: string;
  effective_date: string | null;
  source_url: string | null;
  source_name: string;
  tags: string[];
  keywords: string[];
}

// Base de conocimiento esencial con contenido actualizado
const ESSENTIAL_KNOWLEDGE: EssentialKnowledgeItem[] = [
  // === LEGISLACIÓN ESPAÑOLA ===
  {
    title: "Estatuto de los Trabajadores",
    content: `Real Decreto Legislativo 2/2015, de 23 de octubre, por el que se aprueba el texto refundido de la Ley del Estatuto de los Trabajadores.

CONTENIDO ESENCIAL:
- Derechos y deberes laborales básicos
- Tipos de contratos de trabajo
- Jornada laboral y descansos
- Salarios y garantías salariales
- Modificación, suspensión y extinción del contrato
- Representación colectiva
- Negociación colectiva y convenios

APLICACIÓN EN ERP:
- Validación de contratos laborales
- Control de jornada (Art. 34.9)
- Cálculo de indemnizaciones
- Períodos de prueba y preaviso`,
    summary: "Normativa fundamental de las relaciones laborales en España, aplicable a contratos, jornadas, salarios e indemnizaciones.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "laboral",
    sub_area: "contratos",
    reference_code: "RDLeg 2/2015",
    effective_date: "2015-10-24",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430",
    source_name: "BOE",
    tags: ["laboral", "contratos", "jornada", "despido", "indemnización"],
    keywords: ["estatuto trabajadores", "contrato trabajo", "despido", "jornada laboral"]
  },
  {
    title: "Ley General Tributaria",
    content: `Ley 58/2003, de 17 de diciembre, General Tributaria (LGT).

CONTENIDO ESENCIAL:
- Principios generales del sistema tributario
- Obligaciones tributarias
- Procedimientos de gestión, inspección, recaudación y revisión
- Infracciones y sanciones tributarias
- Recursos y reclamaciones

APLICACIÓN EN ERP:
- Cálculo de plazos fiscales
- Gestión de obligaciones tributarias
- Control de prescripción (4 años)
- Documentación requerida por AEAT`,
    summary: "Marco legal fundamental del sistema tributario español, regula obligaciones, procedimientos y sanciones fiscales.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "fiscal",
    sub_area: "general",
    reference_code: "Ley 58/2003",
    effective_date: "2003-12-18",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186",
    source_name: "BOE",
    tags: ["fiscal", "tributario", "AEAT", "obligaciones", "sanciones"],
    keywords: ["ley general tributaria", "obligaciones fiscales", "AEAT", "prescripción"]
  },
  {
    title: "Ley del Impuesto sobre el Valor Añadido (LIVA)",
    content: `Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido.

TIPOS DE IVA (2024):
- General: 21%
- Reducido: 10%
- Superreducido: 4%

REGÍMENES ESPECIALES:
- Simplificado
- Agricultura, ganadería y pesca
- Bienes usados
- Agencias de viajes
- Recargo de equivalencia

OBLIGACIONES SII:
- Suministro Inmediato de Información
- Plazos de presentación
- Registros obligatorios`,
    summary: "Normativa del IVA en España con tipos impositivos, regímenes especiales y obligaciones SII.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "fiscal",
    sub_area: "IVA",
    reference_code: "Ley 37/1992",
    effective_date: "1993-01-01",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    source_name: "BOE",
    tags: ["IVA", "SII", "fiscal", "facturación"],
    keywords: ["IVA", "impuesto valor añadido", "SII", "tipos impositivos"]
  },
  {
    title: "Ley del Impuesto sobre Sociedades",
    content: `Ley 27/2014, de 27 de noviembre, del Impuesto sobre Sociedades.

TIPO GENERAL: 25%

TIPOS REDUCIDOS:
- Entidades de nueva creación: 15% (2 primeros años)
- Cooperativas fiscalmente protegidas: 20%
- Micropymes: tipo reducido progresivo

DEDUCCIONES PRINCIPALES:
- I+D+i
- Creación de empleo
- Inversiones medioambientales

PAGOS FRACCIONADOS:
- Modelo 202: abril, octubre, diciembre`,
    summary: "Impuesto sobre beneficios empresariales con tipo general del 25% y deducciones aplicables.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "fiscal",
    sub_area: "sociedades",
    reference_code: "Ley 27/2014",
    effective_date: "2015-01-01",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328",
    source_name: "BOE",
    tags: ["sociedades", "IS", "fiscal", "deducciones"],
    keywords: ["impuesto sociedades", "beneficios empresariales", "deducciones fiscales"]
  },
  {
    title: "Ley de morosidad comercial (Ley 15/2010)",
    content: `Ley 15/2010, de 5 de julio, de modificación de la Ley 3/2004, por la que se establecen medidas de lucha contra la morosidad en las operaciones comerciales.

PLAZOS MÁXIMOS DE PAGO:
- Sector privado: 60 días
- Sector público: 30 días

INTERESES DE DEMORA:
- Tipo BCE + 8 puntos (tipo legal de demora)

OBLIGACIONES:
- Facturación electrónica obligatoria
- Información en memoria anual
- Período medio de pago a proveedores (PMP)

APLICACIÓN EN ERP:
- Control automático de plazos
- Alertas de vencimiento
- Cálculo de intereses moratorios`,
    summary: "Regula plazos máximos de pago (60 días privado, 30 días público) e intereses de demora.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "mercantil",
    sub_area: "compras",
    reference_code: "Ley 15/2010",
    effective_date: "2010-07-07",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2010-10708",
    source_name: "BOE",
    tags: ["morosidad", "pagos", "proveedores", "compras"],
    keywords: ["morosidad comercial", "plazos pago", "intereses demora", "PMP"]
  },
  {
    title: "Código de Comercio",
    content: `Real Decreto de 22 de agosto de 1885 por el que se publica el Código de Comercio.

LIBROS Y DOCUMENTOS MERCANTILES:
- Libro de inventarios y cuentas anuales
- Libro diario
- Conservación durante 6 años
- Legalización en Registro Mercantil

CONTRATOS MERCANTILES:
- Compraventa mercantil
- Comisión mercantil
- Depósito mercantil
- Transporte terrestre

OBLIGACIONES CONTABLES:
- Principios contables
- Formulación de cuentas anuales
- Auditoría obligatoria`,
    summary: "Código fundamental del derecho mercantil español, regula libros contables, contratos y sociedades.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "mercantil",
    sub_area: "general",
    reference_code: "RD 22/08/1885",
    effective_date: "1885-08-22",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627",
    source_name: "BOE",
    tags: ["mercantil", "contratos", "contabilidad", "registro"],
    keywords: ["código comercio", "libros contables", "contratos mercantiles"]
  },
  {
    title: "Ley Orgánica de Protección de Datos (LOPDGDD)",
    content: `Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales.

DERECHOS DIGITALES:
- Derecho a la desconexión digital
- Derecho a la intimidad frente a dispositivos
- Derechos en relación con la IA

DELEGADO DE PROTECCIÓN DE DATOS (DPO):
- Cuándo es obligatorio
- Funciones y responsabilidades

SANCIONES:
- Leves: hasta 40.000€
- Graves: hasta 300.000€
- Muy graves: hasta 20M€ o 4% facturación

REGISTRO DE ACTIVIDADES:
- Obligatorio para todas las empresas
- Contenido mínimo del registro`,
    summary: "Ley española de protección de datos que complementa el RGPD con derechos digitales específicos.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "proteccion_datos",
    sub_area: "LOPD",
    reference_code: "LO 3/2018",
    effective_date: "2018-12-07",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673",
    source_name: "BOE",
    tags: ["LOPD", "protección datos", "privacidad", "DPO"],
    keywords: ["LOPDGDD", "protección datos", "privacidad", "RGPD"]
  },
  {
    title: "Prevención de Blanqueo de Capitales (Ley 10/2010)",
    content: `Ley 10/2010, de 28 de abril, de prevención del blanqueo de capitales y de la financiación del terrorismo.

SUJETOS OBLIGADOS:
- Entidades financieras
- Notarios y registradores
- Auditores y contables
- Promotores inmobiliarios
- Abogados (operaciones específicas)

OBLIGACIONES:
- Diligencia debida
- Identificación de titulares reales
- Comunicación al SEPBLAC
- Conservación documental (10 años)

MEDIDAS REFORZADAS:
- PEPs (Personas Expuestas Políticamente)
- Países de alto riesgo`,
    summary: "Normativa antiblanqueo con obligaciones de diligencia debida y comunicación al SEPBLAC.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "compliance",
    sub_area: "AML",
    reference_code: "Ley 10/2010",
    effective_date: "2010-04-29",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2010-6737",
    source_name: "BOE",
    tags: ["AML", "blanqueo", "SEPBLAC", "compliance"],
    keywords: ["blanqueo capitales", "AML", "SEPBLAC", "KYC"]
  },
  // === LEGISLACIÓN ANDORRANA ===
  {
    title: "Llei qualificada de protecció de dades personals (APDA)",
    content: `Llei 29/2021, del 28 d'octubre, qualificada de protecció de dades personals.

PRINCIPIS:
- Licitud, lleialtat i transparència
- Limitació de la finalitat
- Minimització de dades
- Exactitud
- Limitació del termini de conservació

DRETS DELS INTERESSATS:
- Accés, rectificació, supressió
- Limitació, portabilitat, oposició

AUTORITAT DE CONTROL:
- Agència Andorrana de Protecció de Dades (APDA)

SANCIONS:
- Fins a 40.000€ (infraccions lleus)
- Fins a 100.000€ (infraccions greus)`,
    summary: "Ley andorrana de protección de datos alineada con estándares europeos RGPD.",
    knowledge_type: "legislation",
    jurisdiction_code: "AD",
    legal_area: "proteccion_datos",
    sub_area: "APDA",
    reference_code: "Llei 29/2021",
    effective_date: "2021-11-25",
    source_url: "https://www.bopa.ad/bopa/033067/Documents/GD20211105_11_21_38.pdf",
    source_name: "BOPA",
    tags: ["APDA", "Andorra", "protección datos", "privacidad"],
    keywords: ["APDA", "protecció dades", "Andorra", "privacitat"]
  },
  {
    title: "Impost General Indirecte (IGI)",
    content: `Llei 11/2012, del 21 de juny, de l'Impost General Indirecte (IGI).

TIPUS D'IGI:
- General: 4,5%
- Reduït: 1%
- Superreduït: 0%
- Incrementat: 9,5%

EXEMPCIÓ:
- Serveis sanitaris i educatius
- Operacions immobiliàries (segona transmissió)

OBLIGACIONS:
- Declaracions trimestrals
- Registre de factures
- Model 400 (trimestral)

COMPARATIVA:
- Significativament inferior al IVA español (21%)`,
    summary: "Impuesto indirecto andorrano con tipo general del 4,5%, muy inferior al IVA europeo.",
    knowledge_type: "legislation",
    jurisdiction_code: "AD",
    legal_area: "fiscal",
    sub_area: "IGI",
    reference_code: "Llei 11/2012",
    effective_date: "2013-01-01",
    source_url: "https://www.impostos.ad/",
    source_name: "Govern d'Andorra",
    tags: ["IGI", "Andorra", "fiscal", "impuestos"],
    keywords: ["IGI", "impost indirecte", "Andorra", "IVA andorrano"]
  },
  // === NORMATIVA EUROPEA ===
  {
    title: "Reglamento General de Protección de Datos (RGPD)",
    content: `Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo (GDPR/RGPD).

PRINCIPIOS FUNDAMENTALES:
- Licitud, lealtad y transparencia
- Limitación de finalidad
- Minimización de datos
- Exactitud
- Limitación del plazo de conservación
- Integridad y confidencialidad

BASES LEGITIMADORAS:
- Consentimiento
- Ejecución de contrato
- Obligación legal
- Intereses vitales
- Interés público
- Interés legítimo

DERECHOS ARCO+:
- Acceso, Rectificación, Cancelación, Oposición
- Portabilidad, Limitación, Olvido

TRANSFERENCIAS INTERNACIONALES:
- Decisiones de adecuación
- Cláusulas contractuales tipo
- Binding Corporate Rules`,
    summary: "Reglamento europeo de protección de datos con alcance global, base del marco de privacidad en la UE.",
    knowledge_type: "regulation",
    jurisdiction_code: "EU",
    legal_area: "proteccion_datos",
    sub_area: "RGPD",
    reference_code: "Reg. 2016/679",
    effective_date: "2018-05-25",
    source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    source_name: "EUR-Lex",
    tags: ["RGPD", "GDPR", "privacidad", "datos personales"],
    keywords: ["RGPD", "GDPR", "protección datos", "privacidad", "consentimiento"]
  },
  {
    title: "Reglamento DORA (Resiliencia Operativa Digital)",
    content: `Reglamento (UE) 2022/2554 sobre la resiliencia operativa digital del sector financiero (DORA).

FECHA APLICACIÓN: 17 de enero de 2025

ÁMBITO:
- Entidades financieras
- Proveedores de servicios TIC críticos

REQUISITOS PRINCIPALES:
1. Gestión del riesgo TIC
2. Notificación de incidentes
3. Pruebas de resiliencia (TLPT)
4. Gestión de terceros TIC
5. Intercambio de información

SANCIONES:
- Hasta 10M€ o 5% volumen negocios
- Amonestaciones públicas
- Retirada de autorización`,
    summary: "Normativa europea de ciberresiliencia para el sector financiero, aplicable desde enero 2025.",
    knowledge_type: "regulation",
    jurisdiction_code: "EU",
    legal_area: "compliance",
    sub_area: "ciberseguridad",
    reference_code: "Reg. 2022/2554",
    effective_date: "2025-01-17",
    source_url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj",
    source_name: "EUR-Lex",
    tags: ["DORA", "ciberseguridad", "finanzas", "resiliencia"],
    keywords: ["DORA", "resiliencia digital", "sector financiero", "ciberseguridad"]
  },
  {
    title: "Directiva NIS2 (Seguridad de Redes y Sistemas)",
    content: `Directiva (UE) 2022/2555 relativa a medidas destinadas a garantizar un elevado nivel común de ciberseguridad en la Unión (NIS2).

TRANSPOSICIÓN: 17 de octubre de 2024

SECTORES ESENCIALES:
- Energía, transporte, banca
- Infraestructuras de mercados financieros
- Sector sanitario
- Agua potable y residual
- Infraestructura digital
- Administración pública

SECTORES IMPORTANTES:
- Servicios postales
- Gestión de residuos
- Fabricación
- Proveedores digitales
- Investigación

OBLIGACIONES:
- Gestión de riesgos de ciberseguridad
- Notificación de incidentes (24h)
- Seguridad en la cadena de suministro`,
    summary: "Directiva europea de ciberseguridad que amplía el ámbito de NIS1 a más sectores.",
    knowledge_type: "directive",
    jurisdiction_code: "EU",
    legal_area: "compliance",
    sub_area: "ciberseguridad",
    reference_code: "Dir. 2022/2555",
    effective_date: "2024-10-17",
    source_url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    source_name: "EUR-Lex",
    tags: ["NIS2", "ciberseguridad", "infraestructuras críticas"],
    keywords: ["NIS2", "ciberseguridad", "infraestructuras críticas", "incidentes"]
  },
  {
    title: "Reglamento AI Act (Inteligencia Artificial)",
    content: `Reglamento (UE) 2024/1689 por el que se establecen normas armonizadas en materia de inteligencia artificial (AI Act).

ENTRADA EN VIGOR: 1 de agosto de 2024
APLICACIÓN GRADUAL: 2025-2027

CLASIFICACIÓN POR RIESGO:
1. Riesgo inaceptable (prohibidos)
2. Alto riesgo (regulados)
3. Riesgo limitado (transparencia)
4. Riesgo mínimo (libre uso)

SISTEMAS DE ALTO RIESGO:
- Biometría
- Infraestructuras críticas
- Educación y formación
- Empleo y trabajadores
- Servicios esenciales
- Migración y fronteras
- Justicia y democracia

OBLIGACIONES OPERADORES:
- Evaluación de conformidad
- Registro en base de datos UE
- Sistema de gestión de calidad
- Documentación técnica`,
    summary: "Primera regulación integral de IA a nivel mundial, establece marco de riesgos y obligaciones.",
    knowledge_type: "regulation",
    jurisdiction_code: "EU",
    legal_area: "tecnologia",
    sub_area: "IA",
    reference_code: "Reg. 2024/1689",
    effective_date: "2024-08-01",
    source_url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    source_name: "EUR-Lex",
    tags: ["AI Act", "inteligencia artificial", "regulación IA"],
    keywords: ["AI Act", "inteligencia artificial", "IA", "regulación"]
  },
  // === COMPRAS Y CONTRATACIÓN ===
  {
    title: "Ley de Contratos del Sector Público",
    content: `Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público (LCSP).

TIPOS DE CONTRATOS:
- Obras
- Concesión de obras
- Concesión de servicios
- Suministros
- Servicios

PROCEDIMIENTOS:
- Abierto
- Restringido
- Negociado
- Diálogo competitivo
- Asociación para la innovación
- Contrato menor

UMBRALES COMUNITARIOS (2024):
- Obras: 5.538.000€
- Servicios: 143.000€ (AGE) / 221.000€ (resto)
- Suministros: 143.000€ (AGE) / 221.000€ (resto)

CONTRATO MENOR:
- Obras: hasta 40.000€
- Servicios/suministros: hasta 15.000€`,
    summary: "Normativa de contratación pública con umbrales, procedimientos y requisitos.",
    knowledge_type: "legislation",
    jurisdiction_code: "ES",
    legal_area: "mercantil",
    sub_area: "compras_publicas",
    reference_code: "Ley 9/2017",
    effective_date: "2018-03-09",
    source_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902",
    source_name: "BOE",
    tags: ["contratación pública", "licitaciones", "compras"],
    keywords: ["LCSP", "contratación pública", "licitaciones", "sector público"]
  },
  {
    title: "Incoterms 2020",
    content: `Términos comerciales internacionales publicados por la Cámara de Comercio Internacional (ICC).

CATEGORÍAS:
- E: EXW (En fábrica)
- F: FCA, FAS, FOB
- C: CFR, CIF, CPT, CIP
- D: DPU, DAP, DDP

TRANSPORTE MARÍTIMO:
- FAS: Franco al Costado del Buque
- FOB: Franco a Bordo
- CFR: Coste y Flete
- CIF: Coste, Seguro y Flete

CUALQUIER MODO:
- EXW: En Fábrica
- FCA: Franco Porteador
- CPT: Transporte Pagado Hasta
- CIP: Transporte y Seguro Pagados Hasta
- DPU: Entregada en Lugar Descargada
- DAP: Entregada en Lugar
- DDP: Entregada Derechos Pagados

APLICACIÓN EN COMPRAS:
- Determinación del momento de entrega
- Transferencia de riesgos
- Costes y seguros`,
    summary: "Términos comerciales internacionales que definen responsabilidades en comercio exterior.",
    knowledge_type: "standard",
    jurisdiction_code: "INT",
    legal_area: "mercantil",
    sub_area: "comercio_internacional",
    reference_code: "Incoterms 2020",
    effective_date: "2020-01-01",
    source_url: "https://iccwbo.org/resources-for-business/incoterms-rules/",
    source_name: "ICC",
    tags: ["Incoterms", "comercio internacional", "importación", "exportación"],
    keywords: ["Incoterms", "comercio internacional", "FOB", "CIF", "DDP"]
  },
  {
    title: "IVA en operaciones intracomunitarias",
    content: `Régimen especial del IVA para operaciones entre estados miembros de la UE.

ADQUISICIONES INTRACOMUNITARIAS:
- Exentas en origen (país vendedor)
- Sujetas en destino (país comprador)
- Modelo 349: declaración recapitulativa

ENTREGAS INTRACOMUNITARIAS:
- Exentas con requisitos:
  - NIF-IVA válido del adquirente
  - Transporte efectivo a otro Estado
  - Documentación acreditativa

VENTAS A DISTANCIA (B2C):
- Umbral único: 10.000€/año
- Ventanilla única OSS

VERIFICACIÓN NIF-IVA:
- Sistema VIES obligatorio

MODELOS FISCALES:
- Modelo 303: autoliquidación
- Modelo 349: operaciones intracomunitarias
- Modelo 390: resumen anual`,
    summary: "Régimen del IVA para comercio entre países UE con exenciones y obligaciones declarativas.",
    knowledge_type: "regulation",
    jurisdiction_code: "EU",
    legal_area: "fiscal",
    sub_area: "IVA_intracomunitario",
    reference_code: "Dir. 2006/112/CE",
    effective_date: "2007-01-01",
    source_url: "https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32006L0112",
    source_name: "EUR-Lex",
    tags: ["IVA", "intracomunitario", "VIES", "comercio UE"],
    keywords: ["IVA intracomunitario", "VIES", "operaciones UE", "349"]
  }
];

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === DUAL-PATH AUTH (shared utilities) ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let authSource: 'cron' | 'service_role' | 'user' = 'user';

    // Path 1: Cron / service_role via validateCronOrServiceAuth
    const cronCheck = validateCronOrServiceAuth(req);
    if (cronCheck.valid && (cronCheck.source === 'cron' || cronCheck.source === 'service_role')) {
      authSource = cronCheck.source;
    } else {
      // Path 2: User — validateAuth(req) + admin role check
      const authResult = await validateAuth(req);
      if (isAuthError(authResult)) {
        return new Response(JSON.stringify(authResult.body), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Admin role check using service_role (justified — role lookup on restricted table)
      const adminClient = createClient(supabaseUrl, supabaseKey);
      const { data: roles, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', authResult.userId);

      if (roleError) {
        console.error('[legal-knowledge-sync] Role check failed:', roleError.message);
        return new Response(JSON.stringify({ error: 'Authorization check failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userRoles = (roles || []).map(r => r.role);
      const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin');
      if (!isAdmin) {
        console.warn(`[legal-knowledge-sync] User ${authResult.userId} lacks admin role. Roles: ${userRoles.join(',')}`);
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      authSource = 'user';
    }

    console.log(`[legal-knowledge-sync] Starting sync from source: ${authSource}`);

    // Service role client for DB operations — justified: global catalog upserts, not tenant-scoped
    const supabase = createClient(supabaseUrl, supabaseKey);

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const item of ESSENTIAL_KNOWLEDGE) {
      try {
        // Verificar si existe
        const { data: existing } = await supabase
          .from('legal_knowledge_base')
          .select('id, updated_at')
          .eq('title', item.title)
          .eq('jurisdiction_code', item.jurisdiction_code)
          .maybeSingle();

        if (existing) {
          // Actualizar si existe
          const { error } = await supabase
            .from('legal_knowledge_base')
            .update({
              content: item.content,
              summary: item.summary,
              legal_area: item.legal_area,
              sub_area: item.sub_area,
              reference_code: item.reference_code,
              effective_date: item.effective_date,
              source_url: item.source_url,
              source_name: item.source_name,
              tags: item.tags,
              keywords: item.keywords,
              is_verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) throw error;
          updated++;
        } else {
          // Insertar nuevo
          const { error } = await supabase
            .from('legal_knowledge_base')
            .insert([{
              ...item,
              is_active: true,
              is_verified: true,
              view_count: 0,
              helpful_count: 0,
              created_by: null // Sistema, no usuario
            }]);

          if (error) throw error;
          inserted++;
        }
      } catch (err) {
        console.error(`[legal-knowledge-sync] Error syncing ${item.title}:`, err);
        errors++;
        errorDetails.push(`${item.title}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Registrar resultado en logs
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: authSource,
      stats: {
        total: ESSENTIAL_KNOWLEDGE.length,
        inserted,
        updated,
        errors,
        errorDetails: errors > 0 ? errorDetails : undefined
      }
    };

    console.log(`[legal-knowledge-sync] Completed: ${inserted} inserted, ${updated} updated, ${errors} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[legal-knowledge-sync] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
