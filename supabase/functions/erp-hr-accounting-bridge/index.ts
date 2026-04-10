/**
 * Edge Function: erp-hr-accounting-bridge
 * Genera asientos contables automáticos desde RRHH
 * Cumple PGC 2007 y normativa fiscal española
 *
 * S6.3B: Migrated to validateTenantAccess + userClient. adminClient: 0.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError } from '../_shared/error-contract.ts';

interface PayrollData {
  id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  gross_salary: number;
  net_salary: number;
  irpf_amount: number;
  irpf_percentage: number;
  ss_employee: number;
  ss_company: number;
  extras: number;
  deductions: number;
}

interface SettlementData {
  id: string;
  employee_id: string;
  employee_name: string;
  termination_type: 'voluntary' | 'objective' | 'unfair' | 'ere';
  gross_amount: number;
  net_amount: number;
  severance_amount: number;
  pending_salary: number;
  pending_vacation: number;
  irpf_amount: number;
  ss_amount: number;
}

interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
}

const PGC_ACCOUNTS = {
  SUELDOS: { code: '640', name: 'Sueldos y salarios' },
  INDEMNIZACIONES: { code: '641', name: 'Indemnizaciones' },
  SS_EMPRESA: { code: '642', name: 'Seguridad Social a cargo de la empresa' },
  OTROS_GASTOS_SOCIALES: { code: '649', name: 'Otros gastos sociales' },
  REMUNERACIONES_PENDIENTES: { code: '465', name: 'Remuneraciones pendientes de pago' },
  HP_IRPF: { code: '4751', name: 'H.P. acreedora por retenciones practicadas' },
  ORGANISMOS_SS: { code: '476', name: 'Organismos de la Seguridad Social, acreedores' },
  BANCOS: { code: '572', name: 'Bancos c/c' },
  PROVISION_REESTRUCTURACION: { code: '1410', name: 'Provisión para reestructuraciones' },
  GASTOS_EXCEPCIONALES: { code: '678', name: 'Gastos excepcionales' },
};

// Need corsHeaders at module level for handler functions
let _corsHeaders: Record<string, string> = {};

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  _corsHeaders = corsHeaders;
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    const companyId = payload?.company_id;

    // S6.3B: Standard auth gate
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    const { userId, userClient } = authResult;

    console.log(`[erp-hr-accounting-bridge] Action: ${action}, User: ${userId}`);

    switch (action) {
      case 'generate_payroll_entry':
        return await generatePayrollEntry(userClient, payload);
      
      case 'generate_settlement_entry':
        return await generateSettlementEntry(userClient, payload);
      
      case 'generate_ss_contribution_entry':
        return await generateSSContributionEntry(userClient, payload);
      
      case 'generate_batch_payroll_entries':
        return await generateBatchPayrollEntries(userClient, payload);
      
      case 'reverse_entry':
        return await reverseEntry(userClient, payload);
      
      case 'validate_entry':
        return await validateEntry(userClient, payload);
      
      case 'get_accounting_status':
        return await getAccountingStatus(userClient, payload);
      
      default:
        return validationError(`Unknown action: ${action}`, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('[erp-hr-accounting-bridge] Error:', error);
    return internalError(_corsHeaders);
  }
});

async function generatePayrollEntry(supabase: any, payload: {
  company_id: string;
  payroll: PayrollData;
  entry_date: string;
  journal_id?: string;
  auto_post?: boolean;
}) {
  const { company_id, payroll, entry_date, journal_id, auto_post = false } = payload;
  const ss_total = payroll.ss_employee + payroll.ss_company;
  
  const lines: JournalEntryLine[] = [
    {
      account_code: PGC_ACCOUNTS.SUELDOS.code,
      account_name: PGC_ACCOUNTS.SUELDOS.name,
      debit: payroll.gross_salary,
      credit: 0,
      description: `Sueldo ${payroll.employee_name} - ${payroll.period}`
    },
    {
      account_code: PGC_ACCOUNTS.SS_EMPRESA.code,
      account_name: PGC_ACCOUNTS.SS_EMPRESA.name,
      debit: payroll.ss_company,
      credit: 0,
      description: `SS empresa ${payroll.employee_name} - ${payroll.period}`
    },
    {
      account_code: PGC_ACCOUNTS.HP_IRPF.code,
      account_name: PGC_ACCOUNTS.HP_IRPF.name,
      debit: 0,
      credit: payroll.irpf_amount,
      description: `Retención IRPF ${payroll.irpf_percentage}% - ${payroll.employee_name}`
    },
    {
      account_code: PGC_ACCOUNTS.ORGANISMOS_SS.code,
      account_name: PGC_ACCOUNTS.ORGANISMOS_SS.name,
      debit: 0,
      credit: ss_total,
      description: `Cuotas SS (empresa + trabajador) - ${payroll.employee_name}`
    },
    {
      account_code: PGC_ACCOUNTS.REMUNERACIONES_PENDIENTES.code,
      account_name: PGC_ACCOUNTS.REMUNERACIONES_PENDIENTES.name,
      debit: 0,
      credit: payroll.net_salary,
      description: `Neto a pagar ${payroll.employee_name} - ${payroll.period}`
    }
  ];

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Asiento descuadrado',
        details: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
      }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const entryData = {
    company_id,
    journal_id,
    entry_date,
    description: `Nómina ${payroll.employee_name} - ${payroll.period}`,
    reference: `NOM-${payroll.id}`,
    status: auto_post ? 'posted' : 'draft',
    total_debit: totalDebit,
    total_credit: totalCredit,
    source_type: 'hr_payroll',
    source_id: payroll.id,
    metadata: {
      employee_id: payroll.employee_id,
      employee_name: payroll.employee_name,
      period: payroll.period,
      generated_by: 'erp-hr-accounting-bridge'
    }
  };

  const { data: journalEntry, error: entryError } = await supabase
    .from('erp_journal_entries')
    .insert([entryData])
    .select()
    .single();

  if (entryError) {
    console.error('Error creating journal entry:', entryError);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const entryLines = lines.map((line, index) => ({
    entry_id: journalEntry.id,
    line_number: index + 1,
    account_code: line.account_code,
    account_name: line.account_name,
    debit_amount: line.debit,
    credit_amount: line.credit,
    description: line.description
  }));

  const { error: linesError } = await supabase
    .from('erp_journal_entry_lines')
    .insert(entryLines);

  if (linesError) {
    console.error('Error creating entry lines:', linesError);
  }

  await supabase
    .from('erp_hr_journal_entries')
    .insert([{
      company_id,
      source_type: 'payroll',
      source_id: payroll.id,
      journal_entry_id: journalEntry.id,
      entry_date,
      auto_generated: true,
      validation_status: auto_post ? 'validated' : 'pending'
    }]);

  await supabase
    .from('erp_hr_integration_log')
    .insert([{
      company_id,
      integration_type: 'accounting',
      action: 'generate_payroll_entry',
      source_type: 'payroll',
      source_id: payroll.id,
      target_type: 'journal_entry',
      target_id: journalEntry.id,
      status: 'success',
      details: { lines_count: lines.length, total_amount: totalDebit }
    }]);

  return new Response(
    JSON.stringify({
      success: true,
      journal_entry_id: journalEntry.id,
      entry_number: journalEntry.entry_number,
      total_debit: totalDebit,
      total_credit: totalCredit,
      lines_count: lines.length,
      status: journalEntry.status
    }),
    { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateSettlementEntry(supabase: any, payload: {
  company_id: string;
  settlement: SettlementData;
  entry_date: string;
  journal_id?: string;
  auto_post?: boolean;
}) {
  const { company_id, settlement, entry_date, journal_id, auto_post = false } = payload;
  const lines: JournalEntryLine[] = [];
  
  if (settlement.pending_salary > 0 || settlement.pending_vacation > 0) {
    const salaryAmount = settlement.pending_salary + settlement.pending_vacation;
    lines.push({
      account_code: PGC_ACCOUNTS.SUELDOS.code,
      account_name: PGC_ACCOUNTS.SUELDOS.name,
      debit: salaryAmount,
      credit: 0,
      description: `Salario y vacaciones pendientes - ${settlement.employee_name}`
    });
  }
  
  if (settlement.severance_amount > 0) {
    const accountCode = settlement.termination_type === 'unfair' 
      ? PGC_ACCOUNTS.GASTOS_EXCEPCIONALES.code 
      : PGC_ACCOUNTS.INDEMNIZACIONES.code;
    const accountName = settlement.termination_type === 'unfair'
      ? PGC_ACCOUNTS.GASTOS_EXCEPCIONALES.name
      : PGC_ACCOUNTS.INDEMNIZACIONES.name;
    
    lines.push({
      account_code: accountCode,
      account_name: accountName,
      debit: settlement.severance_amount,
      credit: 0,
      description: `Indemnización ${settlement.termination_type} - ${settlement.employee_name}`
    });
  }
  
  if (settlement.termination_type === 'ere') {
    lines.push({
      account_code: PGC_ACCOUNTS.PROVISION_REESTRUCTURACION.code,
      account_name: PGC_ACCOUNTS.PROVISION_REESTRUCTURACION.name,
      debit: settlement.severance_amount,
      credit: 0,
      description: `Aplicación provisión reestructuración - ${settlement.employee_name}`
    });
    lines.push({
      account_code: PGC_ACCOUNTS.INDEMNIZACIONES.code,
      account_name: PGC_ACCOUNTS.INDEMNIZACIONES.name,
      debit: 0,
      credit: settlement.severance_amount,
      description: `Provisión aplicada - ${settlement.employee_name}`
    });
  }
  
  if (settlement.irpf_amount > 0) {
    lines.push({
      account_code: PGC_ACCOUNTS.HP_IRPF.code,
      account_name: PGC_ACCOUNTS.HP_IRPF.name,
      debit: 0,
      credit: settlement.irpf_amount,
      description: `Retención IRPF finiquito - ${settlement.employee_name}`
    });
  }
  
  if (settlement.ss_amount > 0) {
    lines.push({
      account_code: PGC_ACCOUNTS.ORGANISMOS_SS.code,
      account_name: PGC_ACCOUNTS.ORGANISMOS_SS.name,
      debit: 0,
      credit: settlement.ss_amount,
      description: `SS finiquito - ${settlement.employee_name}`
    });
  }
  
  lines.push({
    account_code: PGC_ACCOUNTS.REMUNERACIONES_PENDIENTES.code,
    account_name: PGC_ACCOUNTS.REMUNERACIONES_PENDIENTES.name,
    debit: 0,
    credit: settlement.net_amount,
    description: `Finiquito neto a pagar - ${settlement.employee_name}`
  });

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Asiento descuadrado',
        details: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
      }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const entryData = {
    company_id,
    journal_id,
    entry_date,
    description: `Finiquito ${settlement.employee_name} (${settlement.termination_type})`,
    reference: `FIN-${settlement.id}`,
    status: auto_post ? 'posted' : 'draft',
    total_debit: totalDebit,
    total_credit: totalCredit,
    source_type: 'hr_settlement',
    source_id: settlement.id,
    metadata: {
      employee_id: settlement.employee_id,
      employee_name: settlement.employee_name,
      termination_type: settlement.termination_type,
      generated_by: 'erp-hr-accounting-bridge'
    }
  };

  const { data: journalEntry, error: entryError } = await supabase
    .from('erp_journal_entries')
    .insert([entryData])
    .select()
    .single();

  if (entryError) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const entryLines = lines.map((line, index) => ({
    entry_id: journalEntry.id,
    line_number: index + 1,
    account_code: line.account_code,
    account_name: line.account_name,
    debit_amount: line.debit,
    credit_amount: line.credit,
    description: line.description
  }));

  await supabase.from('erp_journal_entry_lines').insert(entryLines);

  await supabase.from('erp_hr_journal_entries').insert([{
    company_id,
    source_type: 'settlement',
    source_id: settlement.id,
    journal_entry_id: journalEntry.id,
    entry_date,
    auto_generated: true,
    validation_status: 'pending'
  }]);

  return new Response(
    JSON.stringify({
      success: true,
      journal_entry_id: journalEntry.id,
      total_debit: totalDebit,
      lines_count: lines.length
    }),
    { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateSSContributionEntry(supabase: any, payload: {
  company_id: string;
  period: string;
  ss_company_total: number;
  ss_employee_total: number;
  entry_date: string;
  journal_id?: string;
}) {
  const { company_id, period, ss_company_total, ss_employee_total, entry_date, journal_id } = payload;
  const ss_total = ss_company_total + ss_employee_total;
  
  const lines: JournalEntryLine[] = [
    {
      account_code: PGC_ACCOUNTS.SS_EMPRESA.code,
      account_name: PGC_ACCOUNTS.SS_EMPRESA.name,
      debit: ss_company_total,
      credit: 0,
      description: `Cuota patronal SS ${period}`
    },
    {
      account_code: PGC_ACCOUNTS.ORGANISMOS_SS.code,
      account_name: PGC_ACCOUNTS.ORGANISMOS_SS.name,
      debit: 0,
      credit: ss_total,
      description: `Deuda TGSS ${period}`
    }
  ];

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  const entryData = {
    company_id,
    journal_id,
    entry_date,
    description: `Cotizaciones SS ${period}`,
    reference: `SS-${period}`,
    status: 'draft',
    total_debit: totalDebit,
    total_credit: totalCredit,
    source_type: 'hr_ss_contribution',
    source_id: period,
    metadata: {
      period,
      ss_company_total,
      ss_employee_total,
      generated_by: 'erp-hr-accounting-bridge'
    }
  };

  const { data: journalEntry, error } = await supabase
    .from('erp_journal_entries')
    .insert([entryData])
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const entryLines = lines.map((line, index) => ({
    entry_id: journalEntry.id,
    line_number: index + 1,
    account_code: line.account_code,
    account_name: line.account_name,
    debit_amount: line.debit,
    credit_amount: line.credit,
    description: line.description
  }));

  await supabase.from('erp_journal_entry_lines').insert(entryLines);

  return new Response(
    JSON.stringify({
      success: true,
      journal_entry_id: journalEntry.id,
      total_amount: ss_total
    }),
    { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateBatchPayrollEntries(supabase: any, payload: {
  company_id: string;
  period: string;
  payrolls: PayrollData[];
  entry_date: string;
  journal_id?: string;
  consolidate?: boolean;
}) {
  const { company_id, period, payrolls, entry_date, journal_id, consolidate = true } = payload;
  
  if (consolidate) {
    const totals = payrolls.reduce((acc, p) => ({
      gross: acc.gross + p.gross_salary,
      net: acc.net + p.net_salary,
      irpf: acc.irpf + p.irpf_amount,
      ss_employee: acc.ss_employee + p.ss_employee,
      ss_company: acc.ss_company + p.ss_company
    }), { gross: 0, net: 0, irpf: 0, ss_employee: 0, ss_company: 0 });

    const ss_total = totals.ss_employee + totals.ss_company;

    const lines: JournalEntryLine[] = [
      {
        account_code: PGC_ACCOUNTS.SUELDOS.code,
        account_name: PGC_ACCOUNTS.SUELDOS.name,
        debit: totals.gross,
        credit: 0,
        description: `Nóminas ${period} (${payrolls.length} empleados)`
      },
      {
        account_code: PGC_ACCOUNTS.SS_EMPRESA.code,
        account_name: PGC_ACCOUNTS.SS_EMPRESA.name,
        debit: totals.ss_company,
        credit: 0,
        description: `SS empresa ${period}`
      },
      {
        account_code: PGC_ACCOUNTS.HP_IRPF.code,
        account_name: PGC_ACCOUNTS.HP_IRPF.name,
        debit: 0,
        credit: totals.irpf,
        description: `Retenciones IRPF ${period}`
      },
      {
        account_code: PGC_ACCOUNTS.ORGANISMOS_SS.code,
        account_name: PGC_ACCOUNTS.ORGANISMOS_SS.name,
        debit: 0,
        credit: ss_total,
        description: `Cuotas SS ${period}`
      },
      {
        account_code: PGC_ACCOUNTS.REMUNERACIONES_PENDIENTES.code,
        account_name: PGC_ACCOUNTS.REMUNERACIONES_PENDIENTES.name,
        debit: 0,
        credit: totals.net,
        description: `Nóminas pendientes pago ${period}`
      }
    ];

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

    const entryData = {
      company_id,
      journal_id,
      entry_date,
      description: `Nóminas consolidadas ${period}`,
      reference: `NOM-BATCH-${period}`,
      status: 'draft',
      total_debit: totalDebit,
      total_credit: totalCredit,
      source_type: 'hr_payroll_batch',
      source_id: period,
      metadata: {
        period,
        payroll_count: payrolls.length,
        payroll_ids: payrolls.map(p => p.id),
        generated_by: 'erp-hr-accounting-bridge'
      }
    };

    const { data: journalEntry, error } = await supabase
      .from('erp_journal_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server error' }),
        { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const entryLines = lines.map((line, index) => ({
      entry_id: journalEntry.id,
      line_number: index + 1,
      account_code: line.account_code,
      account_name: line.account_name,
      debit_amount: line.debit,
      credit_amount: line.credit,
      description: line.description
    }));

    await supabase.from('erp_journal_entry_lines').insert(entryLines);

    const hrEntries = payrolls.map(p => ({
      company_id,
      source_type: 'payroll',
      source_id: p.id,
      journal_entry_id: journalEntry.id,
      entry_date,
      auto_generated: true,
      validation_status: 'pending'
    }));

    await supabase.from('erp_hr_journal_entries').insert(hrEntries);

    return new Response(
      JSON.stringify({
        success: true,
        journal_entry_id: journalEntry.id,
        payrolls_processed: payrolls.length,
        total_debit: totalDebit
      }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    const results = [];
    for (const payroll of payrolls) {
      const result = await generatePayrollEntry(supabase, {
        company_id,
        payroll,
        entry_date,
        journal_id
      });
      results.push(await result.json());
    }

    return new Response(
      JSON.stringify({
        success: true,
        entries_created: results.filter(r => r.success).length,
        results
      }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function reverseEntry(supabase: any, payload: {
  company_id: string;
  journal_entry_id: string;
  reversal_date: string;
  reason: string;
}) {
  const { company_id, journal_entry_id, reversal_date, reason } = payload;
  
  const { data: originalEntry, error: fetchError } = await supabase
    .from('erp_journal_entries')
    .select('*, erp_journal_entry_lines(*)')
    .eq('id', journal_entry_id)
    .single();

  if (fetchError || !originalEntry) {
    return new Response(
      JSON.stringify({ success: false, error: 'Asiento no encontrado' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const reversalData = {
    company_id,
    journal_id: originalEntry.journal_id,
    entry_date: reversal_date,
    description: `ANULACIÓN: ${originalEntry.description}`,
    reference: `REV-${originalEntry.reference}`,
    status: 'draft',
    total_debit: originalEntry.total_credit,
    total_credit: originalEntry.total_debit,
    source_type: 'reversal',
    source_id: journal_entry_id,
    metadata: {
      original_entry_id: journal_entry_id,
      reversal_reason: reason,
      generated_by: 'erp-hr-accounting-bridge'
    }
  };

  const { data: reversalEntry, error: createError } = await supabase
    .from('erp_journal_entries')
    .insert([reversalData])
    .select()
    .single();

  if (createError) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const reversalLines = originalEntry.erp_journal_entry_lines.map((line: any, index: number) => ({
    entry_id: reversalEntry.id,
    line_number: index + 1,
    account_code: line.account_code,
    account_name: line.account_name,
    debit_amount: line.credit_amount,
    credit_amount: line.debit_amount,
    description: `ANULACIÓN: ${line.description}`
  }));

  await supabase.from('erp_journal_entry_lines').insert(reversalLines);

  await supabase
    .from('erp_journal_entries')
    .update({ status: 'cancelled', metadata: { ...originalEntry.metadata, reversed_by: reversalEntry.id } })
    .eq('id', journal_entry_id);

  return new Response(
    JSON.stringify({
      success: true,
      reversal_entry_id: reversalEntry.id,
      original_entry_id: journal_entry_id
    }),
    { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function validateEntry(supabase: any, payload: {
  journal_entry_id: string;
}) {
  const { journal_entry_id } = payload;
  
  const { data: entry, error } = await supabase
    .from('erp_journal_entries')
    .select('*, erp_journal_entry_lines(*)')
    .eq('id', journal_entry_id)
    .single();

  if (error || !entry) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Asiento no encontrado' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const issues: string[] = [];
  
  const totalDebit = entry.erp_journal_entry_lines.reduce((sum: number, l: any) => sum + (l.debit_amount || 0), 0);
  const totalCredit = entry.erp_journal_entry_lines.reduce((sum: number, l: any) => sum + (l.credit_amount || 0), 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    issues.push(`Asiento descuadrado: Debe ${totalDebit.toFixed(2)} ≠ Haber ${totalCredit.toFixed(2)}`);
  }
  
  if (entry.erp_journal_entry_lines.length === 0) {
    issues.push('El asiento no tiene líneas');
  }
  
  for (const line of entry.erp_journal_entry_lines) {
    if (!line.account_code || line.account_code.length < 3) {
      issues.push(`Línea ${line.line_number}: Código de cuenta inválido`);
    }
    if ((line.debit_amount || 0) === 0 && (line.credit_amount || 0) === 0) {
      issues.push(`Línea ${line.line_number}: Sin importe`);
    }
  }

  return new Response(
    JSON.stringify({
      valid: issues.length === 0,
      issues,
      totals: { debit: totalDebit, credit: totalCredit }
    }),
    { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAccountingStatus(supabase: any, payload: {
  company_id: string;
  source_type: 'payroll' | 'settlement' | 'ss_contribution';
  source_ids: string[];
}) {
  const { company_id, source_type, source_ids } = payload;
  
  const { data: entries, error } = await supabase
    .from('erp_hr_journal_entries')
    .select('source_id, journal_entry_id, validation_status, entry_date')
    .eq('company_id', company_id)
    .eq('source_type', source_type)
    .in('source_id', source_ids);

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const statusMap: Record<string, any> = {};
  for (const entry of entries || []) {
    statusMap[entry.source_id] = {
      is_accounted: true,
      journal_entry_id: entry.journal_entry_id,
      validation_status: entry.validation_status,
      entry_date: entry.entry_date
    };
  }

  for (const id of source_ids) {
    if (!statusMap[id]) {
      statusMap[id] = { is_accounted: false };
    }
  }

  return new Response(
    JSON.stringify({ success: true, status: statusMap }),
    { headers: { ..._corsHeaders, 'Content-Type': 'application/json' } }
  );
}
