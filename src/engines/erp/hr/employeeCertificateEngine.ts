/**
 * employeeCertificateEngine.ts — C6: Motor de Certificados Automáticos
 * 
 * Genera certificados internos de empresa con sellado SHA-256,
 * código de verificación único y trazabilidad de emisión.
 * 
 * DISCLAIMER: Los certificados generados son documentos internos de empresa.
 * NO sustituyen certificados emitidos por organismos oficiales (TGSS, SEPE, AEAT).
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type CertificateType = 'seniority' | 'employment_status' | 'annual_compensation' | 'general_employment';

export interface CertificateTypeDef {
  type: CertificateType;
  label: string;
  description: string;
  requiredFields: string[];
}

export interface EmployeeData {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  hireDate: string;
  jobTitle: string;
  department?: string;
  baseSalary?: number;
  contractType?: string;
  companyName: string;
  companyCif?: string;
  status?: string;
}

export interface CertificateRequest {
  type: CertificateType;
  employee: EmployeeData;
  requestedAt: string;
  requestedBy: string; // user_id
  year?: number;       // for annual_compensation
}

export interface CertificateEmission {
  id: string;
  verificationCode: string;
  type: CertificateType;
  employeeId: string;
  employeeName: string;
  companyName: string;
  issuedAt: string;
  sealHash: string;
  content: CertificateContent;
  metadata: {
    requestedBy: string;
    generationMs: number;
    engineVersion: string;
  };
}

export interface CertificateContent {
  title: string;
  bodyParagraphs: string[];
  issuedIn: string;
  date: string;
  signerRole: string;
  disclaimer: string;
}

export interface AuditEntry {
  certificateId: string;
  verificationCode: string;
  action: 'generated' | 'downloaded' | 'verified';
  performedBy: string;
  performedAt: string;
}

// ─── Definiciones ────────────────────────────────────────────────────────────

export const CERTIFICATE_TYPES: CertificateTypeDef[] = [
  {
    type: 'seniority',
    label: 'Certificado de Antigüedad',
    description: 'Acredita la fecha de alta y antigüedad del trabajador en la empresa.',
    requiredFields: ['firstName', 'lastName', 'nationalId', 'hireDate', 'companyName'],
  },
  {
    type: 'employment_status',
    label: 'Certificado de Situación Laboral',
    description: 'Certifica la situación laboral actual del empleado (activo, puesto, jornada).',
    requiredFields: ['firstName', 'lastName', 'nationalId', 'hireDate', 'jobTitle', 'companyName'],
  },
  {
    type: 'annual_compensation',
    label: 'Certificado de Retribuciones Anuales',
    description: 'Detalla las retribuciones brutas anuales percibidas por el trabajador.',
    requiredFields: ['firstName', 'lastName', 'nationalId', 'baseSalary', 'companyName'],
  },
  {
    type: 'general_employment',
    label: 'Certificado Laboral de Empresa',
    description: 'Certificado genérico de prestación de servicios en la empresa.',
    requiredFields: ['firstName', 'lastName', 'nationalId', 'hireDate', 'jobTitle', 'companyName'],
  },
];

export const ENGINE_VERSION = '1.0.0';
export const CERTIFICATE_DISCLAIMER =
  'Este certificado es un documento interno emitido por la empresa. ' +
  'NO constituye un certificado oficial emitido por la Seguridad Social, SEPE ni la AEAT. ' +
  'Su validez está limitada al ámbito interno y a terceros que lo acepten como tal.';

// ─── Generación de código de verificación ────────────────────────────────────

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I
  let code = 'CERT-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Sellado SHA-256 ─────────────────────────────────────────────────────────

export async function computeCertificateSeal(emission: Omit<CertificateEmission, 'sealHash'>): Promise<string> {
  const canonical = [
    emission.id,
    emission.verificationCode,
    emission.type,
    emission.employeeId,
    emission.issuedAt,
    JSON.stringify(emission.content.bodyParagraphs),
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Cálculo de antigüedad ──────────────────────────────────────────────────

export function computeSeniority(hireDate: string, referenceDate?: string): {
  years: number; months: number; days: number; totalDays: number; formatted: string;
} {
  const hire = new Date(hireDate);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const totalDays = Math.floor((ref.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));

  let years = ref.getFullYear() - hire.getFullYear();
  let months = ref.getMonth() - hire.getMonth();
  let days = ref.getDate() - hire.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mes${months !== 1 ? 'es' : ''}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`);

  return { years, months, days, totalDays, formatted: parts.join(', ') };
}

// ─── Generación de contenido ─────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function generateCertificateContent(req: CertificateRequest): CertificateContent {
  const { employee: e, type } = req;
  const fullName = `${e.firstName} ${e.lastName}`;
  const today = formatDate(new Date().toISOString());
  const seniority = computeSeniority(e.hireDate);

  const common = {
    issuedIn: 'A los efectos oportunos',
    date: today,
    signerRole: 'Departamento de Recursos Humanos',
    disclaimer: CERTIFICATE_DISCLAIMER,
  };

  switch (type) {
    case 'seniority':
      return {
        ...common,
        title: 'CERTIFICADO DE ANTIGÜEDAD',
        bodyParagraphs: [
          `${e.companyName}${e.companyCif ? ` (CIF: ${e.companyCif})` : ''} certifica que:`,
          `D./Dña. ${fullName}, con documento de identidad ${e.nationalId}, presta servicios en esta empresa desde el ${formatDate(e.hireDate)}.`,
          `A fecha de emisión del presente certificado, su antigüedad es de ${seniority.formatted}.`,
          `Y para que conste a los efectos oportunos, se expide el presente certificado.`,
        ],
      };

    case 'employment_status':
      return {
        ...common,
        title: 'CERTIFICADO DE SITUACIÓN LABORAL',
        bodyParagraphs: [
          `${e.companyName}${e.companyCif ? ` (CIF: ${e.companyCif})` : ''} certifica que:`,
          `D./Dña. ${fullName}, con documento de identidad ${e.nationalId}, se encuentra actualmente en situación de alta en esta empresa.`,
          `Puesto: ${e.jobTitle || 'No especificado'}${e.department ? ` — Departamento: ${e.department}` : ''}.`,
          `Tipo de contrato: ${e.contractType || 'No especificado'}.`,
          `Fecha de alta: ${formatDate(e.hireDate)}. Antigüedad: ${seniority.formatted}.`,
          `Y para que conste a los efectos oportunos, se expide el presente certificado.`,
        ],
      };

    case 'annual_compensation':
      return {
        ...common,
        title: 'CERTIFICADO DE RETRIBUCIONES ANUALES',
        bodyParagraphs: [
          `${e.companyName}${e.companyCif ? ` (CIF: ${e.companyCif})` : ''} certifica que:`,
          `D./Dña. ${fullName}, con documento de identidad ${e.nationalId}, percibe una retribución bruta anual de ${e.baseSalary ? formatCurrency(e.baseSalary * 12) : 'no disponible'}.`,
          `Salario base mensual: ${e.baseSalary ? formatCurrency(e.baseSalary) : 'no disponible'}.`,
          req.year ? `Ejercicio fiscal de referencia: ${req.year}.` : '',
          `Los importes indicados son brutos, antes de retenciones y cotizaciones.`,
          `Y para que conste a los efectos oportunos, se expide el presente certificado.`,
        ].filter(Boolean),
      };

    case 'general_employment':
      return {
        ...common,
        title: 'CERTIFICADO LABORAL DE EMPRESA',
        bodyParagraphs: [
          `${e.companyName}${e.companyCif ? ` (CIF: ${e.companyCif})` : ''} certifica que:`,
          `D./Dña. ${fullName}, con documento de identidad ${e.nationalId}, presta/ha prestado servicios profesionales en esta empresa.`,
          `Puesto desempeñado: ${e.jobTitle || 'No especificado'}.`,
          `Fecha de incorporación: ${formatDate(e.hireDate)}. Antigüedad acumulada: ${seniority.formatted}.`,
          `Y para que conste a los efectos oportunos, se expide el presente certificado.`,
        ],
      };
  }
}

// ─── Emisión completa ────────────────────────────────────────────────────────

export async function emitCertificate(req: CertificateRequest): Promise<CertificateEmission> {
  const startTime = Date.now();
  const content = generateCertificateContent(req);
  const id = crypto.randomUUID();
  const verificationCode = generateVerificationCode();

  const partial: Omit<CertificateEmission, 'sealHash'> = {
    id,
    verificationCode,
    type: req.type,
    employeeId: req.employee.id,
    employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
    companyName: req.employee.companyName,
    issuedAt: new Date().toISOString(),
    content,
    metadata: {
      requestedBy: req.requestedBy,
      generationMs: 0,
      engineVersion: ENGINE_VERSION,
    },
  };

  const sealHash = await computeCertificateSeal(partial);

  return {
    ...partial,
    sealHash,
    metadata: {
      ...partial.metadata,
      generationMs: Date.now() - startTime,
    },
  };
}

// ─── Validación de datos ─────────────────────────────────────────────────────

export function validateCertificateRequest(req: CertificateRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const typeDef = CERTIFICATE_TYPES.find(t => t.type === req.type);
  if (!typeDef) {
    errors.push(`Tipo de certificado no reconocido: ${req.type}`);
    return { valid: false, errors };
  }

  const e = req.employee;
  if (!e.firstName?.trim()) errors.push('Nombre del empleado requerido');
  if (!e.lastName?.trim()) errors.push('Apellidos del empleado requeridos');
  if (!e.nationalId?.trim()) errors.push('Documento de identidad requerido');
  if (!e.hireDate) errors.push('Fecha de alta requerida');
  if (!e.companyName?.trim()) errors.push('Nombre de empresa requerido');

  if (req.type === 'annual_compensation' && !e.baseSalary) {
    errors.push('Salario base requerido para certificado de retribuciones');
  }

  return { valid: errors.length === 0, errors };
}
