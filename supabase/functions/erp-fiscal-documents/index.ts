/**
 * erp-fiscal-documents - Edge function para generación de documentos fiscales
 * Genera PDFs, XLSX, XBRL para modelos AEAT y estados financieros
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentRequest {
  action: 'generate' | 'export' | 'list' | 'get';
  document_type?: string;
  company_id?: string;
  period?: string;
  format?: 'pdf' | 'xlsx' | 'xbrl';
  document_data?: unknown;
  save_to_db?: boolean;
  user_id?: string;
  document_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json() as DocumentRequest;
    const { action, document_type, company_id, period, format = 'pdf', document_data, save_to_db, user_id, document_id } = body;

    console.log(`[erp-fiscal-documents] Processing action: ${action}, type: ${document_type}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'generate': {
        if (!company_id || !document_type || !period) {
          throw new Error('company_id, document_type and period are required');
        }

        // Fetch accounting data for calculations
        const { data: journalData } = await supabase
          .from('erp_journal_entries')
          .select('*, lines:erp_journal_entry_lines(*)')
          .eq('company_id', company_id)
          .eq('status', 'posted');

        // Calculate document data based on type
        const calculatedData = await calculateDocumentData(document_type, journalData || [], period);

        // Generate document content
        const documentContent = generateDocumentContent(document_type, calculatedData, format);

        result = {
          success: true,
          document: {
            type: document_type,
            period,
            format,
            calculated_data: calculatedData,
            content: documentContent,
            generated_at: new Date().toISOString()
          }
        };
        break;
      }

      case 'export': {
        if (!document_type) {
          throw new Error('document_type is required');
        }

        // Generate file content based on format
        const fileContent = generateFileContent(document_type, document_data, format);

        // Save to database if requested
        if (save_to_db && company_id) {
          const { data: savedDoc, error: saveError } = await supabase
            .from('erp_fiscal_generated_documents')
            .insert({
              company_id,
              document_type,
              period: period || new Date().toISOString().split('T')[0],
              fiscal_year: new Date().getFullYear(),
              generated_by: user_id,
              file_format: format,
              status: 'draft',
              calculated_data: document_data,
              form_fields: document_data
            })
            .select()
            .single();

          if (saveError) {
            console.error('[erp-fiscal-documents] Save error:', saveError);
          } else {
            result.saved_document_id = savedDoc.id;
          }
        }

        result = {
          success: true,
          file_content: fileContent,
          format,
          mime_type: getMimeType(format),
          filename: `${document_type}_${period || 'export'}.${format}`
        };
        break;
      }

      case 'list': {
        if (!company_id) {
          throw new Error('company_id is required');
        }

        const { data: documents, error } = await supabase
          .from('erp_fiscal_generated_documents')
          .select('*')
          .eq('company_id', company_id)
          .order('generated_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        result = {
          success: true,
          documents: documents || []
        };
        break;
      }

      case 'get': {
        if (!document_id) {
          throw new Error('document_id is required');
        }

        const { data: document, error } = await supabase
          .from('erp_fiscal_generated_documents')
          .select('*')
          .eq('id', document_id)
          .single();

        if (error) throw error;

        result = {
          success: true,
          document
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-fiscal-documents] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Calculate document data based on accounting entries
async function calculateDocumentData(
  documentType: string,
  journalEntries: any[],
  period: string
): Promise<Record<string, unknown>> {
  const calculations: Record<string, unknown> = {
    period,
    generated_at: new Date().toISOString(),
    entries_processed: journalEntries.length
  };

  // Parse period (Q1-2026 or 2026)
  const isQuarterly = period.startsWith('Q');
  const year = parseInt(period.split('-').pop() || new Date().getFullYear().toString());
  const quarter = isQuarterly ? parseInt(period.charAt(1)) : null;

  // Filter entries by period
  const filteredEntries = journalEntries.filter(entry => {
    const entryDate = new Date(entry.entry_date);
    const entryYear = entryDate.getFullYear();
    const entryQuarter = Math.floor(entryDate.getMonth() / 3) + 1;
    
    if (entryYear !== year) return false;
    if (quarter && entryQuarter !== quarter) return false;
    return true;
  });

  switch (documentType) {
    case 'modelo_303': {
      // IVA calculation
      let baseImponible = 0;
      let cuotaRepercutida = 0;
      let cuotaSoportada = 0;

      filteredEntries.forEach(entry => {
        (entry.lines || []).forEach((line: any) => {
          const code = line.account_code || '';
          // Simplified logic - real implementation would be more sophisticated
          if (code.startsWith('477')) {
            cuotaRepercutida += line.credit || 0;
          } else if (code.startsWith('472')) {
            cuotaSoportada += line.debit || 0;
          } else if (code.startsWith('7')) {
            baseImponible += line.credit || 0;
          }
        });
      });

      calculations.base_imponible = baseImponible;
      calculations.cuota_repercutida = cuotaRepercutida;
      calculations.cuota_soportada = cuotaSoportada;
      calculations.resultado = cuotaRepercutida - cuotaSoportada;
      calculations.tipo_general = 21;
      break;
    }

    case 'modelo_390': {
      // Annual VAT summary
      calculations.total_operations = filteredEntries.length;
      calculations.base_anual = 0;
      calculations.cuota_anual = 0;
      break;
    }

    case 'balance_pgc': {
      // Balance sheet calculation
      let activo = 0;
      let pasivo = 0;
      let patrimonio = 0;

      filteredEntries.forEach(entry => {
        (entry.lines || []).forEach((line: any) => {
          const code = line.account_code || '';
          const saldo = (line.debit || 0) - (line.credit || 0);
          
          if (code.startsWith('1') || code.startsWith('2')) {
            activo += saldo;
          } else if (code.startsWith('3') || code.startsWith('4')) {
            pasivo += Math.abs(saldo);
          } else if (code.startsWith('5')) {
            patrimonio += saldo;
          }
        });
      });

      calculations.activo_total = activo;
      calculations.pasivo_total = pasivo;
      calculations.patrimonio_neto = patrimonio;
      break;
    }

    case 'cuenta_pyg': {
      // P&L calculation
      let ingresos = 0;
      let gastos = 0;

      filteredEntries.forEach(entry => {
        (entry.lines || []).forEach((line: any) => {
          const code = line.account_code || '';
          
          if (code.startsWith('7')) {
            ingresos += line.credit || 0;
          } else if (code.startsWith('6')) {
            gastos += line.debit || 0;
          }
        });
      });

      calculations.ingresos_explotacion = ingresos;
      calculations.gastos_explotacion = gastos;
      calculations.resultado_explotacion = ingresos - gastos;
      break;
    }
  }

  return calculations;
}

// Generate document content structure
function generateDocumentContent(
  documentType: string,
  data: Record<string, unknown>,
  format: string
): Record<string, unknown> {
  return {
    header: {
      document_type: documentType,
      period: data.period,
      generated_at: data.generated_at
    },
    body: data,
    footer: {
      format,
      version: '1.0'
    }
  };
}

// Generate actual file content (base64 encoded)
function generateFileContent(
  documentType: string,
  data: unknown,
  format: string
): string {
  // For now, return a placeholder - real implementation would use proper PDF/XLSX generation
  const content = JSON.stringify({
    type: documentType,
    data,
    format,
    generated: new Date().toISOString()
  }, null, 2);

  // Convert to base64
  return btoa(content);
}

function getMimeType(format: string): string {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xbrl': return 'application/xml';
    default: return 'application/octet-stream';
  }
}
