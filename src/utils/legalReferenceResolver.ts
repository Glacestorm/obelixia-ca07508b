/**
 * Legal Reference Resolver
 * Parses legal citations (Art. 55 ET, Art. 56.1 LGSS, etc.) and generates
 * URLs to official legal databases (BOE, EUR-Lex, BOPA, etc.)
 */

interface LegalLinkResult {
  original: string;
  label: string;
  url: string;
  source: string;
}

// Spanish legislation — BOE consolidated links
const SPANISH_LAWS: Record<string, { name: string; boeId: string; url?: string }> = {
  'ET': { name: 'Estatuto de los Trabajadores', boeId: 'BOE-A-2015-11430' },
  'ESTATUTO DE LOS TRABAJADORES': { name: 'Estatuto de los Trabajadores', boeId: 'BOE-A-2015-11430' },
  'LGSS': { name: 'Ley General de la Seguridad Social', boeId: 'BOE-A-2015-11724' },
  'LISOS': { name: 'Ley de Infracciones y Sanciones del Orden Social', boeId: 'BOE-A-2000-15060' },
  'LIS': { name: 'Ley del Impuesto sobre Sociedades', boeId: 'BOE-A-2014-12328' },
  'LIRPF': { name: 'Ley del Impuesto sobre la Renta', boeId: 'BOE-A-2006-20764' },
  'LIVA': { name: 'Ley del IVA', boeId: 'BOE-A-1992-28740' },
  'LGT': { name: 'Ley General Tributaria', boeId: 'BOE-A-2003-23186' },
  'LSC': { name: 'Ley de Sociedades de Capital', boeId: 'BOE-A-2010-10544' },
  'CC': { name: 'Código Civil', boeId: 'BOE-A-1889-4763' },
  'CCOM': { name: 'Código de Comercio', boeId: 'BOE-A-1885-6627' },
  'CP': { name: 'Código Penal', boeId: 'BOE-A-1995-25444' },
  'LOPD': { name: 'LOPDGDD', boeId: 'BOE-A-2018-16673' },
  'LOPDGDD': { name: 'LOPDGDD', boeId: 'BOE-A-2018-16673' },
  'LPRL': { name: 'Ley de Prevención de Riesgos Laborales', boeId: 'BOE-A-1995-24292' },
  'LRJS': { name: 'Ley Reguladora de la Jurisdicción Social', boeId: 'BOE-A-2011-15936' },
  'LETA': { name: 'Estatuto del Trabajo Autónomo', boeId: 'BOE-A-2007-13409' },
  'LEC': { name: 'Ley de Enjuiciamiento Civil', boeId: 'BOE-A-2000-323' },
  'RIRPF': { name: 'Reglamento del IRPF', boeId: 'BOE-A-2007-6820' },
  'RIS': { name: 'Reglamento del Impuesto sobre Sociedades', boeId: 'BOE-A-2004-14600' },
  'RIVA': { name: 'Reglamento del IVA', boeId: 'BOE-A-1992-28925' },
  'RGR': { name: 'Reglamento General de Recaudación', boeId: 'BOE-A-2005-14803' },
  'TRLGSS': { name: 'Texto Refundido LGSS', boeId: 'BOE-A-2015-11724' },
  'TREBEP': { name: 'Estatuto Básico del Empleado Público', boeId: 'BOE-A-2015-11719' },
  'LC': { name: 'Ley Concursal (TRLC)', boeId: 'BOE-A-2020-4859' },
  'TRLC': { name: 'Texto Refundido de la Ley Concursal', boeId: 'BOE-A-2020-4859' },
};

// EU regulations
const EU_REGULATIONS: Record<string, { name: string; celexId: string }> = {
  'GDPR': { name: 'Reglamento General de Protección de Datos', celexId: '32016R0679' },
  'RGPD': { name: 'Reglamento General de Protección de Datos', celexId: '32016R0679' },
  'MIFID II': { name: 'Directiva MiFID II', celexId: '32014L0065' },
  'MIFID': { name: 'Directiva MiFID II', celexId: '32014L0065' },
  'PSD2': { name: 'Directiva de Servicios de Pago 2', celexId: '32015L2366' },
  'DORA': { name: 'Reglamento DORA', celexId: '32022R2554' },
  'ATAD': { name: 'Directiva Anti-elusión Fiscal', celexId: '32016L1164' },
  'CRR': { name: 'Reglamento de Requisitos de Capital', celexId: '32013R0575' },
  'CRD': { name: 'Directiva de Requisitos de Capital', celexId: '32013L0036' },
};

// Andorran legislation
const ANDORRAN_LAWS: Record<string, { name: string; url: string }> = {
  'CRL': { name: 'Codi de Relacions Laborals', url: 'https://www.bopa.ad/bopa/032050/Pagines/GD20190213_13_30_27.aspx' },
  'CODI DE RELACIONS LABORALS': { name: 'Codi de Relacions Laborals', url: 'https://www.bopa.ad/bopa/032050/Pagines/GD20190213_13_30_27.aspx' },
  'APDA': { name: 'Llei de Protecció de Dades (Llei 29/2021)', url: 'https://www.bopa.ad' },
  'LLEI 95/2010': { name: 'Llei de Societats Anònimes i de Responsabilitat Limitada', url: 'https://www.bopa.ad' },
  'LLEI 20/2007': { name: 'Llei de Societats Anònimes i de Responsabilitat Limitada', url: 'https://www.bopa.ad' },
  'LLEI 29/2021': { name: 'Llei de Protecció de Dades Personals', url: 'https://www.bopa.ad' },
  'LLEI 31/2018': { name: 'Llei de Relacions Laborals', url: 'https://www.bopa.ad' },
};

function buildBoeUrl(boeId: string, article?: string): string {
  // BOE consolidated legislation viewer
  const base = `https://www.boe.es/buscar/act.php?id=${boeId}`;
  if (article) {
    // Clean article number — BOE uses "a" prefix for articles
    const artNum = article.replace(/\./g, '-');
    return `${base}#a${artNum}`;
  }
  return base;
}

function buildEurLexUrl(celexId: string, article?: string): string {
  const base = `https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:${celexId}`;
  return base;
}

/**
 * Resolves a single legal reference string into a clickable URL.
 * Supports patterns like: "Art. 55 ET", "Art. 56.1 LGSS", "GDPR Art. 6", "Llei 29/2021"
 */
export function resolveLegalReference(reference: string): LegalLinkResult | null {
  const ref = reference.trim();
  
  // Pattern 1: "Art. XX.Y ABBREVIATION" or "Artículo XX ABBREVIATION"
  const artPattern = /(?:Art(?:ículo|\.)\s*)(\d+(?:\.\d+)?(?:\s*(?:bis|ter|quater))?)\s+(?:del?\s+)?([A-ZÁÉÍÓÚa-záéíóú\s]+)/i;
  const match1 = ref.match(artPattern);
  if (match1) {
    const article = match1[1].trim();
    const lawAbbr = match1[2].trim().toUpperCase();
    
    // Check Spanish laws
    if (SPANISH_LAWS[lawAbbr]) {
      const law = SPANISH_LAWS[lawAbbr];
      return {
        original: ref,
        label: `Art. ${article} ${lawAbbr}`,
        url: buildBoeUrl(law.boeId, article),
        source: 'BOE'
      };
    }
    
    // Check EU regulations
    if (EU_REGULATIONS[lawAbbr]) {
      const reg = EU_REGULATIONS[lawAbbr];
      return {
        original: ref,
        label: `Art. ${article} ${lawAbbr}`,
        url: buildEurLexUrl(reg.celexId, article),
        source: 'EUR-Lex'
      };
    }
    
    // Check Andorran laws
    if (ANDORRAN_LAWS[lawAbbr]) {
      const law = ANDORRAN_LAWS[lawAbbr];
      return {
        original: ref,
        label: `Art. ${article} ${lawAbbr}`,
        url: law.url,
        source: 'BOPA'
      };
    }
  }

  // Pattern 2: "ABBREVIATION Art. XX" (reversed)
  const reversePattern = /^([A-ZÁÉÍÓÚa-z\s]+)\s+(?:Art(?:ículo|\.)\s*)(\d+(?:\.\d+)?)/i;
  const match2 = ref.match(reversePattern);
  if (match2) {
    const lawAbbr = match2[1].trim().toUpperCase();
    const article = match2[2].trim();
    
    if (SPANISH_LAWS[lawAbbr]) {
      return {
        original: ref,
        label: `Art. ${article} ${lawAbbr}`,
        url: buildBoeUrl(SPANISH_LAWS[lawAbbr].boeId, article),
        source: 'BOE'
      };
    }
    if (EU_REGULATIONS[lawAbbr]) {
      return {
        original: ref,
        label: `Art. ${article} ${lawAbbr}`,
        url: buildEurLexUrl(EU_REGULATIONS[lawAbbr].celexId, article),
        source: 'EUR-Lex'
      };
    }
  }

  // Pattern 3: Just the law abbreviation without article
  const abbr = ref.toUpperCase().replace(/[^A-ZÁÉÍÓÚ\s\/\d]/g, '').trim();
  if (SPANISH_LAWS[abbr]) {
    return {
      original: ref,
      label: ref,
      url: buildBoeUrl(SPANISH_LAWS[abbr].boeId),
      source: 'BOE'
    };
  }
  if (EU_REGULATIONS[abbr]) {
    return {
      original: ref,
      label: ref,
      url: buildEurLexUrl(EU_REGULATIONS[abbr].celexId),
      source: 'EUR-Lex'
    };
  }
  if (ANDORRAN_LAWS[abbr]) {
    return {
      original: ref,
      label: ref,
      url: ANDORRAN_LAWS[abbr].url,
      source: 'BOPA'
    };
  }

  // Pattern 4: "Llei XX/YYYY" or "Ley XX/YYYY"
  const leyPattern = /(?:Llei|Ley)\s+(\d+\/\d{4})/i;
  const match4 = ref.match(leyPattern);
  if (match4) {
    const leyId = `LLEI ${match4[1]}`.toUpperCase();
    if (ANDORRAN_LAWS[leyId]) {
      return {
        original: ref,
        label: ref,
        url: ANDORRAN_LAWS[leyId].url,
        source: 'BOPA'
      };
    }
    // Try BOE search for Spanish laws
    return {
      original: ref,
      label: ref,
      url: `https://www.boe.es/buscar/doc.php?coleccion=iberlex&id=${match4[1].replace('/', '')}`,
      source: 'BOE'
    };
  }

  // Pattern 5: "RD XX/YYYY" or "Real Decreto XX/YYYY"
  const rdPattern = /(?:R\.?D\.?|Real\s+Decreto)\s+(?:Legislativo\s+)?(\d+\/\d{4})/i;
  const match5 = ref.match(rdPattern);
  if (match5) {
    return {
      original: ref,
      label: ref,
      url: `https://www.boe.es/buscar/doc.php?id=BOE-A-${match5[1].split('/')[1]}-${match5[1].split('/')[0]}`,
      source: 'BOE'
    };
  }

  return null;
}

/**
 * Regex pattern that matches legal article references in running text.
 * Used to detect and linkify references inside markdown content.
 */
const INLINE_LEGAL_PATTERN = /(?:Art(?:ículo|\.)\s*\d+(?:\.\d+)?(?:\s*(?:bis|ter|quater))?\s+(?:del?\s+)?(?:ET|LGSS|LISOS|LIS|LIRPF|LIVA|LGT|LSC|CC|CCOM|CP|LOPD|LOPDGDD|LPRL|LRJS|LETA|LEC|RIRPF|RIS|RIVA|RGR|TRLGSS|TREBEP|LC|TRLC|GDPR|RGPD|MIFID(?:\s*II)?|PSD2|DORA|CRL|APDA))/gi;

/**
 * Transforms markdown text, wrapping legal references in clickable links.
 * Returns the processed markdown string with [ref](url) links.
 */
export function linkifyLegalReferences(text: string): string {
  return text.replace(INLINE_LEGAL_PATTERN, (match) => {
    const resolved = resolveLegalReference(match);
    if (resolved) {
      return `[${match}](${resolved.url})`;
    }
    return match;
  });
}

export type { LegalLinkResult };
