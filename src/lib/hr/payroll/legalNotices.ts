/**
 * Avisos legales canónicos del recibo de nómina ES (S9.22).
 * Fuente única para preview, slip, PDF generator, ack block y revisión interna.
 * No replicar literales en componentes — importar desde aquí.
 */
export const PAYROLL_LEGAL_NOTICES = {
  RECEIPT_DELIVERY:
    "La empresa debe entregar el recibo (físico o digital). El trabajador debe recibirlo y, si la empresa lo solicita, firmarlo o acusarlo recibo.",
  ACK_MEANING:
    "La firma o acuse acredita la recepción del recibo, no la conformidad con los conceptos ni la renuncia a reclamación.",
  CLAIM_TERM:
    "Plazo general de reclamación de cantidades: 1 año (art. 59.2 ET).",
  RETENTION:
    "Conservación documental obligatoria durante 4 años conforme a la normativa laboral y de Seguridad Social aplicable, con referencia sancionadora en el art. 21 LISOS y a la conservación reglamentaria de documentación justificativa en el RD 84/1996.",
  INTERNAL_REVIEW_SCOPE:
    "Canal interno de revisión por RRHH. No constituye impugnación jurídica formal ni sustituye la reclamación previa administrativa o judicial. Los plazos legales corren con independencia de este flujo.",
  SYSTEM_GENERATED_PDF:
    "Recibo provisional generado por el sistema. No firmado electrónicamente. Pendiente de documento oficial firmado por la empresa.",
} as const;

export type PayrollLegalNoticeKey = keyof typeof PAYROLL_LEGAL_NOTICES;