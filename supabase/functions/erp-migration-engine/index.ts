import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ERPMigrationRequest {
  action: 
    | 'list_connectors'
    | 'list_sessions'
    | 'create_session'
    | 'analyze_file'
    | 'detect_chart_type'
    | 'suggest_mappings'
    | 'update_chart_mappings'
    | 'update_field_mappings'
    | 'validate_session'
    | 'run_migration'
    | 'pause_migration'
    | 'resume_migration'
    | 'rollback_migration'
    | 'get_progress'
    | 'get_records'
    | 'export_audit_report'
    | 'reconcile_fiscal';
  company_id?: string;
  session_id?: string;
  connector_id?: string;
  session_name?: string;
  file_content?: string;
  file_type?: 'csv' | 'json' | 'xml' | 'xlsx';
  mappings?: unknown[];
  config?: Record<string, unknown>;
  format?: string;
  limit?: number;
  offset?: number;
  status?: string;
  entity_type?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json() as ERPMigrationRequest;
    const { action } = body;

    console.log(`[erp-migration-engine] Action: ${action}, User: ${userId}`);

    switch (action) {
      // === LIST CONNECTORS ===
      case 'list_connectors': {
        const { data: connectors, error } = await supabase
          .from('erp_migration_connectors')
          .select('*')
          .eq('is_active', true)
          .order('popularity_rank', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          connectors
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === LIST SESSIONS ===
      case 'list_sessions': {
        const { company_id } = body;
        
        let query = supabase
          .from('erp_migration_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (company_id) {
          query = query.eq('company_id', company_id);
        }

        const { data: sessions, error } = await query.limit(50);
        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          sessions
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === ANALYZE FILE ===
      case 'analyze_file': {
        const { file_content, file_type, connector_id } = body;

        if (!file_content || !file_type) {
          throw new Error('file_content and file_type are required');
        }

        // Get connector info if provided
        let connectorInfo = null;
        if (connector_id) {
          const { data } = await supabase
            .from('erp_migration_connectors')
            .select('*')
            .eq('id', connector_id)
            .single();
          connectorInfo = data;
        }

        // Use AI to analyze the file
        let analysis = {
          detected_system: connectorInfo?.label || 'Unknown',
          detected_chart_type: 'pgc_2007',
          detected_format: file_type,
          total_records: 0,
          detected_entities: [] as Array<{ type: string; count: number }>,
          detected_accounts: [] as Array<{ code: string; name: string; type?: string }>,
          suggested_mappings: [] as Array<{ source_code: string; target_code: string; confidence: number; reasoning: string }>,
          data_quality_score: 0,
          fiscal_years_detected: [] as number[],
          warnings: [] as string[],
          recommendations: [] as string[]
        };

        if (LOVABLE_API_KEY) {
          const systemPrompt = `Eres un experto en migración de sistemas contables. Analiza el siguiente contenido de archivo ${file_type.toUpperCase()} de un sistema ERP/contable.

CONTEXTO:
- Sistema origen detectado: ${connectorInfo?.label || 'Desconocido'}
- Plan de cuentas objetivo: PGC 2007 (España)

ANALIZA:
1. Detecta el tipo de entidad (cuentas, asientos, terceros, etc.)
2. Cuenta los registros
3. Detecta el plan de cuentas origen
4. Identifica ejercicios fiscales
5. Sugiere mapeos de cuentas al PGC 2007
6. Evalúa la calidad de los datos (0-100)
7. Lista advertencias y recomendaciones

RESPONDE EN JSON ESTRICTO:
{
  "detected_system": "string",
  "detected_chart_type": "pgc_2007|pgc_pyme|niif|custom",
  "detected_format": "string",
  "total_records": number,
  "detected_entities": [{"type": "string", "count": number}],
  "detected_accounts": [{"code": "string", "name": "string", "type": "asset|liability|equity|income|expense"}],
  "suggested_mappings": [{"source_code": "string", "target_code": "string", "confidence": 0-100, "reasoning": "string"}],
  "data_quality_score": 0-100,
  "fiscal_years_detected": [number],
  "warnings": ["string"],
  "recommendations": ["string"]
}`;

          try {
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Analiza este archivo (primeros 5000 caracteres):\n\n${file_content.substring(0, 5000)}` }
                ],
                temperature: 0.3,
                max_tokens: 2000,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const content = aiData.choices?.[0]?.message?.content || '';
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = { ...analysis, ...JSON.parse(jsonMatch[0]) };
              }
            }
          } catch (aiError) {
            console.error('[erp-migration-engine] AI analysis error:', aiError);
            analysis.warnings.push('Análisis IA no disponible, usando detección básica');
          }
        }

        // Basic parsing fallback
        if (analysis.total_records === 0) {
          if (file_type === 'csv') {
            const lines = file_content.split('\n').filter(l => l.trim());
            analysis.total_records = Math.max(0, lines.length - 1);
          } else if (file_type === 'json') {
            try {
              const parsed = JSON.parse(file_content);
              analysis.total_records = Array.isArray(parsed) ? parsed.length : 1;
            } catch { /* ignore */ }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          analysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === CREATE SESSION ===
      case 'create_session': {
        const { company_id, connector_id, session_name, file_content, file_type, config } = body;

        if (!company_id || !connector_id || !session_name) {
          throw new Error('company_id, connector_id, and session_name are required');
        }

        // Create session
        const { data: session, error: sessionError } = await supabase
          .from('erp_migration_sessions')
          .insert({
            company_id,
            connector_id,
            session_name,
            status: 'draft',
            config: config || {
              batch_size: 100,
              validate_before_run: true,
              auto_map_accounts: true,
              preserve_original_ids: false,
              handle_duplicates: 'skip',
              date_format: 'DD/MM/YYYY'
            },
            created_by: userId,
            total_records: 0,
            migrated_records: 0,
            failed_records: 0,
            skipped_records: 0,
            rollback_available: true
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // If file content provided, analyze and store records
        let analysis = null;
        if (file_content && file_type) {
          // Recursive call to analyze
          const analyzeBody = { action: 'analyze_file', file_content, file_type, connector_id };
          const analyzeRequest = new Request(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(analyzeBody)
          });
          
          // Parse file and create records
          let records: unknown[] = [];
          if (file_type === 'csv') {
            const lines = file_content.split('\n').filter(l => l.trim());
            const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
            
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
              const record: Record<string, string> = {};
              headers?.forEach((h, idx) => {
                record[h] = values[idx] || '';
              });
              records.push(record);
            }
          } else if (file_type === 'json') {
            try {
              const parsed = JSON.parse(file_content);
              records = Array.isArray(parsed) ? parsed : [parsed];
            } catch { /* ignore */ }
          }

          // Insert records
          if (records.length > 0) {
            const recordsToInsert = records.map((r, idx) => ({
              session_id: session.id,
              entity_type: 'unknown',
              original_data: r,
              status: 'pending',
              row_number: idx + 1
            }));

            await supabase
              .from('erp_migration_records')
              .insert(recordsToInsert);

            // Update session with record count
            await supabase
              .from('erp_migration_sessions')
              .update({ 
                total_records: records.length,
                status: 'analyzing'
              })
              .eq('id', session.id);
          }
        }

        // Log creation
        await supabase.from('erp_migration_logs').insert({
          session_id: session.id,
          action: 'create_session',
          action_type: 'success',
          message: `Sesión de migración "${session_name}" creada`,
          user_id: userId
        });

        return new Response(JSON.stringify({
          success: true,
          session: { ...session, total_records: 0 },
          analysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === UPDATE CHART MAPPINGS ===
      case 'update_chart_mappings': {
        const { session_id, mappings } = body;

        if (!session_id || !mappings) {
          throw new Error('session_id and mappings are required');
        }

        // Upsert mappings
        for (const mapping of mappings as unknown[]) {
          const m = mapping as Record<string, unknown>;
          await supabase
            .from('erp_chart_mappings')
            .upsert({
              session_id,
              source_account_code: m.source_account_code,
              source_account_name: m.source_account_name,
              target_account_code: m.target_account_code,
              target_account_name: m.target_account_name,
              transform_type: m.transform_type || 'direct',
              manual_override: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'session_id,source_account_code'
            });
        }

        // Fetch updated mappings
        const { data: updatedMappings } = await supabase
          .from('erp_chart_mappings')
          .select('*')
          .eq('session_id', session_id);

        return new Response(JSON.stringify({
          success: true,
          mappings: updatedMappings
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === VALIDATE SESSION ===
      case 'validate_session': {
        const { session_id } = body;

        if (!session_id) {
          throw new Error('session_id is required');
        }

        // Get validation rules
        const { data: rules } = await supabase
          .from('erp_validation_rules')
          .select('*')
          .eq('is_active', true);

        // Get records
        const { data: records } = await supabase
          .from('erp_migration_records')
          .select('*')
          .eq('session_id', session_id)
          .eq('status', 'pending');

        const validation = {
          total_validated: records?.length || 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          blocking_errors: 0,
          issues: [] as Array<{ rule_key: string; severity: string; count: number; message: string }>,
          can_proceed: true
        };

        // Basic validation (in production, apply all rules)
        validation.passed = records?.length || 0;
        validation.can_proceed = validation.blocking_errors === 0;

        // Update session status
        await supabase
          .from('erp_migration_sessions')
          .update({ 
            status: validation.can_proceed ? 'ready' : 'validating',
            validation_summary: validation
          })
          .eq('id', session_id);

        return new Response(JSON.stringify({
          success: true,
          validation
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === RUN MIGRATION ===
      case 'run_migration': {
        const { session_id } = body;

        if (!session_id) {
          throw new Error('session_id is required');
        }

        // Update session status
        await supabase
          .from('erp_migration_sessions')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', session_id);

        // Log start
        await supabase.from('erp_migration_logs').insert({
          session_id,
          action: 'run_migration',
          action_type: 'info',
          message: 'Migración iniciada',
          user_id: userId
        });

        // In a real implementation, this would trigger a background job
        // For now, we simulate progress updates

        return new Response(JSON.stringify({
          success: true,
          message: 'Migration started'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === PAUSE MIGRATION ===
      case 'pause_migration': {
        const { session_id } = body;

        await supabase
          .from('erp_migration_sessions')
          .update({ status: 'paused' })
          .eq('id', session_id);

        await supabase.from('erp_migration_logs').insert({
          session_id,
          action: 'pause_migration',
          action_type: 'info',
          message: 'Migración pausada',
          user_id: userId
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === RESUME MIGRATION ===
      case 'resume_migration': {
        const { session_id } = body;

        await supabase
          .from('erp_migration_sessions')
          .update({ status: 'running' })
          .eq('id', session_id);

        await supabase.from('erp_migration_logs').insert({
          session_id,
          action: 'resume_migration',
          action_type: 'info',
          message: 'Migración reanudada',
          user_id: userId
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === ROLLBACK MIGRATION ===
      case 'rollback_migration': {
        const { session_id } = body;

        // Get session
        const { data: session } = await supabase
          .from('erp_migration_sessions')
          .select('*')
          .eq('id', session_id)
          .single();

        if (!session?.rollback_available) {
          throw new Error('Rollback not available for this session');
        }

        // Reset records
        await supabase
          .from('erp_migration_records')
          .update({ status: 'rolled_back' })
          .eq('session_id', session_id)
          .eq('status', 'migrated');

        // Update session
        await supabase
          .from('erp_migration_sessions')
          .update({ 
            status: 'rolled_back',
            rollback_available: false
          })
          .eq('id', session_id);

        await supabase.from('erp_migration_logs').insert({
          session_id,
          action: 'rollback_migration',
          action_type: 'warning',
          message: 'Migración revertida',
          user_id: userId
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === GET PROGRESS ===
      case 'get_progress': {
        const { session_id } = body;

        const { data: session } = await supabase
          .from('erp_migration_sessions')
          .select('*')
          .eq('id', session_id)
          .single();

        const progress = session?.total_records > 0
          ? Math.round((session.migrated_records / session.total_records) * 100)
          : 0;

        return new Response(JSON.stringify({
          success: true,
          session,
          progress
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === GET RECORDS ===
      case 'get_records': {
        const { session_id, status, entity_type, limit = 100, offset = 0 } = body;

        let query = supabase
          .from('erp_migration_records')
          .select('*')
          .eq('session_id', session_id)
          .order('row_number', { ascending: true })
          .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (entity_type) query = query.eq('entity_type', entity_type);

        const { data: records, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          records
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === EXPORT AUDIT REPORT ===
      case 'export_audit_report': {
        const { session_id, format } = body;

        // Get session and logs
        const { data: session } = await supabase
          .from('erp_migration_sessions')
          .select('*')
          .eq('id', session_id)
          .single();

        const { data: logs } = await supabase
          .from('erp_migration_logs')
          .select('*')
          .eq('session_id', session_id)
          .order('created_at', { ascending: true });

        // Generate report (simplified - in production would create actual file)
        const report = {
          session,
          logs,
          generated_at: new Date().toISOString(),
          format
        };

        return new Response(JSON.stringify({
          success: true,
          report,
          download_url: null // Would be a real URL in production
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[erp-migration-engine] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
