
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { action, userId, dataset } = await req.json();

    if (action === 'get_status') {
      // Verificar estado actual
      const { data, error } = await supabase
        .from('demo_mode_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      return new Response(JSON.stringify({ 
        isActive: data?.is_demo_mode_active || false,
        dataset: data?.demo_dataset || 'all'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'toggle') {
      // Activar/Desactivar
      const { data: current } = await supabase
        .from('demo_mode_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const newStatus = !current?.is_demo_mode_active;
      
      let result;
      if (current) {
        const { data, error } = await supabase
          .from('demo_mode_config')
          .update({ 
            is_demo_mode_active: newStatus,
            demo_dataset: dataset || current.demo_dataset,
            activated_at: newStatus ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', current.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('demo_mode_config')
          .insert({ 
            user_id: userId,
            is_demo_mode_active: true,
            demo_dataset: dataset || 'all',
            activated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return new Response(JSON.stringify({ 
        isActive: result.is_demo_mode_active,
        dataset: result.demo_dataset
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_demo_data') {
        // Recuperar datos según el dataset solicitado
        // Esta acción es llamada por los componentes cuando el modo demo está activo
        const { type } = await req.json(); // 'galia', 'crm', 'erp'
        
        let table = '';
        switch(type) {
            case 'galia': table = 'demo_galia_expedientes'; break;
            case 'crm_clients': table = 'demo_crm_clientes'; break;
            case 'crm_opportunities': table = 'demo_crm_oportunidades'; break;
            case 'erp_invoices': table = 'demo_erp_facturas'; break;
            case 'banking': table = 'demo_banking_operaciones'; break;
            default: throw new Error('Invalid data type');
        }

        const { data, error } = await supabase
            .from(table)
            .select('*');
            
        if (error) throw error;

        return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
