/**
 * Edge Function: Logistics Accounting
 * Genera asientos contables para operaciones logísticas
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountingRequest {
  action: 'generate_entry' | 'generate_batch' | 'preview_entry' | 'get_rules';
  shipment_id?: string;
  shipment_ids?: string[];
  company_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, shipment_id, shipment_ids, company_id } = await req.json() as AccountingRequest;

    console.log(`[logistics-accounting] Action: ${action}, Company: ${company_id}`);

    switch (action) {
      case 'generate_entry': {
        if (!shipment_id) {
          throw new Error('shipment_id is required');
        }

        const result = await generateEntry(supabase, company_id, shipment_id);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_batch': {
        if (!shipment_ids || shipment_ids.length === 0) {
          throw new Error('shipment_ids is required');
        }

        let generated = 0;
        const errors: string[] = [];

        for (const sid of shipment_ids) {
          try {
            await generateEntry(supabase, company_id, sid);
            generated++;
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`${sid}: ${errMsg}`);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          generated, 
          total: shipment_ids.length,
          errors 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'preview_entry': {
        if (!shipment_id) {
          throw new Error('shipment_id is required');
        }

        const preview = await previewEntry(supabase, company_id, shipment_id);
        return new Response(JSON.stringify({ success: true, preview }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_rules': {
        const { data: rules, error } = await supabase
          .from('erp_logistics_accounting_rules')
          .select('*')
          .eq('company_id', company_id)
          .eq('is_active', true);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, rules }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[logistics-accounting] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateEntry(supabase: any, companyId: string, shipmentId: string) {
  // 1. Obtener datos del envío
  const { data: shipment, error: shipmentError } = await supabase
    .from('erp_logistics_shipments')
    .select(`
      *,
      erp_logistics_carriers(name, code)
    `)
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single();

  if (shipmentError || !shipment) {
    throw new Error('Envío no encontrado');
  }

  if (shipment.accounting_entry_id) {
    throw new Error('El envío ya tiene asiento contable');
  }

  // 2. Obtener regla de contabilización
  const { data: rule } = await supabase
    .from('erp_logistics_accounting_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('operation_type', 'shipment_cost')
    .eq('is_active', true)
    .single();

  // Usar regla o valores por defecto (PGC español)
  const debitAccountCode = rule?.debit_account_code || '6240'; // Portes
  const creditAccountCode = rule?.credit_account_code || '4100'; // Proveedores
  const autoPost = rule?.auto_post || false;

  // 3. Buscar cuentas contables
  const { data: debitAccount } = await supabase
    .from('erp_chart_accounts')
    .select('id, code, name')
    .eq('company_id', companyId)
    .eq('code', debitAccountCode)
    .single();

  const { data: creditAccount } = await supabase
    .from('erp_chart_accounts')
    .select('id, code, name')
    .eq('company_id', companyId)
    .eq('code', creditAccountCode)
    .single();

  if (!debitAccount || !creditAccount) {
    throw new Error(`Cuentas contables no encontradas: ${debitAccountCode}, ${creditAccountCode}`);
  }

  // 4. Obtener diario de compras
  const { data: journal } = await supabase
    .from('erp_journals')
    .select('id')
    .eq('company_id', companyId)
    .eq('journal_type', 'purchase')
    .eq('is_active', true)
    .single();

  if (!journal) {
    throw new Error('No hay diario de compras configurado');
  }

  // 5. Generar número de asiento
  const entryNumber = `LOG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  // 6. Crear asiento
  const { data: entry, error: entryError } = await supabase
    .from('erp_journal_entries')
    .insert({
      company_id: companyId,
      journal_id: journal.id,
      entry_number: entryNumber,
      entry_date: new Date().toISOString().split('T')[0],
      reference: shipment.tracking_number,
      description: `Coste envío ${shipment.erp_logistics_carriers?.name || 'operadora'} - ${shipment.tracking_number || shipmentId}`,
      total_debit: shipment.total_cost || 0,
      total_credit: shipment.total_cost || 0,
      is_balanced: true,
      is_posted: autoPost,
      source_type: 'logistics_shipment',
      source_id: shipmentId
    })
    .select()
    .single();

  if (entryError) throw entryError;

  // 7. Crear líneas del asiento
  const lines = [
    {
      entry_id: entry.id,
      line_number: 1,
      account_id: debitAccount.id,
      description: `Porte ${shipment.erp_logistics_carriers?.name || ''}`,
      debit_amount: shipment.total_cost || 0,
      credit_amount: 0
    },
    {
      entry_id: entry.id,
      line_number: 2,
      account_id: creditAccount.id,
      description: `Acreedor ${shipment.erp_logistics_carriers?.name || ''}`,
      debit_amount: 0,
      credit_amount: shipment.total_cost || 0
    }
  ];

  const { error: linesError } = await supabase
    .from('erp_journal_entry_lines')
    .insert(lines);

  if (linesError) throw linesError;

  // 8. Actualizar envío con referencia al asiento
  await supabase
    .from('erp_logistics_shipments')
    .update({ accounting_entry_id: entry.id })
    .eq('id', shipmentId);

  console.log(`[logistics-accounting] Entry created: ${entry.id} for shipment: ${shipmentId}`);

  return {
    success: true,
    entry_id: entry.id,
    entry_number: entryNumber,
    amount: shipment.total_cost,
    is_posted: autoPost
  };
}

async function previewEntry(supabase: any, companyId: string, shipmentId: string) {
  const { data: shipment, error } = await supabase
    .from('erp_logistics_shipments')
    .select(`
      *,
      erp_logistics_carriers(name, code)
    `)
    .eq('id', shipmentId)
    .eq('company_id', companyId)
    .single();

  if (error || !shipment) {
    throw new Error('Envío no encontrado');
  }

  const { data: rule } = await supabase
    .from('erp_logistics_accounting_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('operation_type', 'shipment_cost')
    .eq('is_active', true)
    .single();

  return {
    shipment_id: shipmentId,
    tracking_number: shipment.tracking_number,
    carrier: shipment.erp_logistics_carriers?.name,
    amount: shipment.total_cost,
    lines: [
      {
        account_code: rule?.debit_account_code || '6240',
        account_name: 'Transportes',
        debit: shipment.total_cost,
        credit: 0
      },
      {
        account_code: rule?.credit_account_code || '4100',
        account_name: 'Proveedores',
        debit: 0,
        credit: shipment.total_cost
      }
    ],
    auto_post: rule?.auto_post || false
  };
}
