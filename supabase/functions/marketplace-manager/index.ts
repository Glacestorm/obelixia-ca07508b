import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: string;
  filters?: {
    category?: string;
    target_module?: string;
    is_free?: boolean;
    search?: string;
    featured_only?: boolean;
  };
  extension_id?: string;
  installation_id?: string;
  developer_data?: Record<string, unknown>;
  extension_data?: Record<string, unknown>;
  review_data?: { rating: number; title?: string; content?: string };
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[marketplace-manager] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body: RequestBody = await req.json();
    const { action } = body;
    logStep(`Action: ${action}`);

    // Get user if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    switch (action) {
      // ==========================================
      // LIST EXTENSIONS (public)
      // ==========================================
      case 'list_extensions': {
        let query = supabaseClient
          .from('marketplace_extensions')
          .select('*')
          .eq('is_published', true)
          .order('download_count', { ascending: false });

        if (body.filters?.category) {
          query = query.eq('category', body.filters.category);
        }
        if (body.filters?.target_module) {
          query = query.eq('target_module', body.filters.target_module);
        }
        if (body.filters?.is_free !== undefined) {
          query = query.eq('is_free', body.filters.is_free);
        }
        if (body.filters?.featured_only) {
          query = query.eq('is_featured', true);
        }
        if (body.filters?.search) {
          query = query.or(`extension_name.ilike.%${body.filters.search}%,short_description.ilike.%${body.filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        logStep('Extensions listed', { count: data?.length });

        return new Response(JSON.stringify({
          success: true,
          extensions: data || [],
          categories: ['analytics', 'ai', 'workflow', 'security', 'integration', 'utility'],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // GET EXTENSION DETAIL
      // ==========================================
      case 'get_extension': {
        const { data, error } = await supabaseClient
          .from('marketplace_extensions')
          .select('*, marketplace_developers(*)')
          .eq('id', body.extension_id)
          .single();

        if (error) throw error;

        // Get reviews
        const { data: reviews } = await supabaseClient
          .from('extension_reviews')
          .select('*')
          .eq('extension_id', body.extension_id)
          .order('created_at', { ascending: false })
          .limit(20);

        // Check if user purchased
        let hasPurchased = false;
        if (userId) {
          const { data: purchase } = await supabaseClient
            .from('marketplace_purchases')
            .select('id')
            .eq('extension_id', body.extension_id)
            .eq('buyer_user_id', userId)
            .eq('status', 'active')
            .limit(1);
          hasPurchased = (purchase?.length || 0) > 0;
        }

        return new Response(JSON.stringify({
          success: true,
          extension: data,
          reviews: reviews || [],
          has_purchased: hasPurchased,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // INSTALL EXTENSION
      // ==========================================
      case 'install_extension': {
        if (!userId) throw new Error('Authentication required');

        const { data: ext } = await supabaseClient
          .from('marketplace_extensions')
          .select('*')
          .eq('id', body.extension_id)
          .single();

        if (!ext) throw new Error('Extension not found');

        // For paid extensions, check purchase
        if (!ext.is_free) {
          const { data: purchase } = await supabaseClient
            .from('marketplace_purchases')
            .select('id')
            .eq('extension_id', body.extension_id)
            .eq('buyer_user_id', userId)
            .eq('status', 'active')
            .limit(1);

          if (!purchase?.length) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Purchase required for this extension',
              requires_purchase: true,
              price: ext.price,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // For free extensions, create a free purchase record
        if (ext.is_free) {
          const { data: userData } = await supabaseClient.auth.getUser(
            req.headers.get("Authorization")!.replace("Bearer ", "")
          );

          await supabaseClient
            .from('marketplace_purchases')
            .upsert({
              extension_id: body.extension_id,
              installation_id: body.installation_id,
              buyer_user_id: userId,
              buyer_email: userData?.user?.email || 'unknown',
              amount_paid: 0,
              platform_fee: 0,
              developer_payout: 0,
              status: 'active',
            }, { onConflict: 'id' });
        }

        // Increment download count
        await supabaseClient.rpc('increment_counter', {
          row_id: body.extension_id,
          table_name: 'marketplace_extensions',
          column_name: 'download_count',
        }).then(() => {}).catch(() => {
          // Fallback: direct update
          supabaseClient
            .from('marketplace_extensions')
            .update({ download_count: (ext.download_count || 0) + 1 })
            .eq('id', body.extension_id);
        });

        logStep('Extension installed', { extensionId: body.extension_id, userId });

        return new Response(JSON.stringify({
          success: true,
          message: 'Extension installed successfully',
          installed_at: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // UNINSTALL EXTENSION
      // ==========================================
      case 'uninstall_extension': {
        if (!userId) throw new Error('Authentication required');

        await supabaseClient
          .from('marketplace_purchases')
          .update({ status: 'uninstalled' })
          .eq('extension_id', body.extension_id)
          .eq('buyer_user_id', userId);

        logStep('Extension uninstalled', { extensionId: body.extension_id });

        return new Response(JSON.stringify({
          success: true,
          message: 'Extension uninstalled',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // PUBLISH EXTENSION (developer action)
      // ==========================================
      case 'publish_extension': {
        if (!userId) throw new Error('Authentication required');

        // Verify developer status
        const { data: dev } = await supabaseClient
          .from('marketplace_developers')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!dev) throw new Error('Developer profile required');

        const extData = body.extension_data || {};
        const { data: newExt, error } = await supabaseClient
          .from('marketplace_extensions')
          .insert({
            extension_key: extData.extension_key,
            extension_name: extData.extension_name,
            short_description: extData.short_description,
            description: extData.description,
            author_name: extData.author_name,
            author_id: userId,
            developer_id: dev.id,
            category: extData.category || 'utility',
            target_module: extData.target_module,
            version: extData.version || '1.0.0',
            price: extData.price || 0,
            is_free: (extData.price || 0) === 0,
            tags: extData.tags || [],
            is_published: false, // Requires review
          })
          .select()
          .single();

        if (error) throw error;

        // Update developer extension count
        await supabaseClient
          .from('marketplace_developers')
          .update({ total_extensions: (dev as any).total_extensions + 1 })
          .eq('id', dev.id);

        logStep('Extension published', { extensionId: newExt?.id });

        return new Response(JSON.stringify({
          success: true,
          extension: newExt,
          message: 'Extension submitted for review',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // REGISTER DEVELOPER
      // ==========================================
      case 'register_developer': {
        if (!userId) throw new Error('Authentication required');

        const devData = body.developer_data || {};
        const { data, error } = await supabaseClient
          .from('marketplace_developers')
          .insert({
            user_id: userId,
            developer_name: devData.developer_name,
            company_name: devData.company_name,
            email: devData.email,
            website: devData.website,
            bio: devData.bio,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        logStep('Developer registered', { developerId: data?.id });

        return new Response(JSON.stringify({
          success: true,
          developer: data,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // GET DEVELOPER DASHBOARD
      // ==========================================
      case 'developer_dashboard': {
        if (!userId) throw new Error('Authentication required');

        const { data: dev } = await supabaseClient
          .from('marketplace_developers')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!dev) {
          return new Response(JSON.stringify({
            success: true,
            is_developer: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: extensions } = await supabaseClient
          .from('marketplace_extensions')
          .select('*')
          .eq('developer_id', dev.id)
          .order('created_at', { ascending: false });

        const { data: purchases } = await supabaseClient
          .from('marketplace_purchases')
          .select('*, marketplace_extensions(extension_name)')
          .in('extension_id', (extensions || []).map(e => e.id))
          .order('purchased_at', { ascending: false })
          .limit(50);

        return new Response(JSON.stringify({
          success: true,
          is_developer: true,
          developer: dev,
          extensions: extensions || [],
          recent_sales: purchases || [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // PROCESS PAYMENT (revenue split)
      // ==========================================
      case 'process_payment': {
        if (!userId) throw new Error('Authentication required');

        const { data: ext } = await supabaseClient
          .from('marketplace_extensions')
          .select('*, marketplace_developers(*)')
          .eq('id', body.extension_id)
          .single();

        if (!ext) throw new Error('Extension not found');

        const amount = Number(ext.price);
        const revenueShare = Number(ext.revenue_share_percent) / 100;
        const developerPayout = amount * revenueShare;
        const platformFee = amount - developerPayout;

        const { data: userData } = await supabaseClient.auth.getUser(
          req.headers.get("Authorization")!.replace("Bearer ", "")
        );

        const { data: purchase, error } = await supabaseClient
          .from('marketplace_purchases')
          .insert({
            extension_id: body.extension_id,
            installation_id: body.installation_id,
            buyer_user_id: userId,
            buyer_email: userData?.user?.email || 'unknown',
            amount_paid: amount,
            platform_fee: platformFee,
            developer_payout: developerPayout,
            status: 'active',
          })
          .select()
          .single();

        if (error) throw error;

        // Update developer revenue
        if (ext.marketplace_developers) {
          await supabaseClient
            .from('marketplace_developers')
            .update({
              total_revenue: (ext.marketplace_developers.total_revenue || 0) + developerPayout,
              total_downloads: (ext.marketplace_developers.total_downloads || 0) + 1,
            })
            .eq('id', ext.marketplace_developers.id);
        }

        logStep('Payment processed', {
          amount,
          platformFee,
          developerPayout,
          purchaseId: purchase?.id,
        });

        return new Response(JSON.stringify({
          success: true,
          purchase,
          revenue_split: {
            total: amount,
            developer: developerPayout,
            platform: platformFee,
            share_percent: ext.revenue_share_percent,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // SUBMIT REVIEW
      // ==========================================
      case 'submit_review': {
        if (!userId) throw new Error('Authentication required');
        if (!body.review_data) throw new Error('Review data required');

        const { data: userData } = await supabaseClient.auth.getUser(
          req.headers.get("Authorization")!.replace("Bearer ", "")
        );

        // Check if verified purchase
        const { data: purchase } = await supabaseClient
          .from('marketplace_purchases')
          .select('id')
          .eq('extension_id', body.extension_id)
          .eq('buyer_user_id', userId)
          .limit(1);

        const { data: review, error } = await supabaseClient
          .from('extension_reviews')
          .upsert({
            extension_id: body.extension_id,
            user_id: userId,
            user_name: userData?.user?.user_metadata?.full_name || userData?.user?.email?.split('@')[0] || 'User',
            rating: body.review_data.rating,
            title: body.review_data.title,
            content: body.review_data.content,
            is_verified_purchase: (purchase?.length || 0) > 0,
          }, { onConflict: 'extension_id,user_id' })
          .select()
          .single();

        if (error) throw error;

        // Update extension rating
        const { data: allReviews } = await supabaseClient
          .from('extension_reviews')
          .select('rating')
          .eq('extension_id', body.extension_id);

        if (allReviews?.length) {
          const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
          await supabaseClient
            .from('marketplace_extensions')
            .update({
              rating_average: Math.round(avg * 100) / 100,
              rating_count: allReviews.length,
            })
            .eq('id', body.extension_id);
        }

        return new Response(JSON.stringify({
          success: true,
          review,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // GET MARKETPLACE STATS
      // ==========================================
      case 'get_stats': {
        const { count: totalExtensions } = await supabaseClient
          .from('marketplace_extensions')
          .select('id', { count: 'exact', head: true })
          .eq('is_published', true);

        const { count: totalDevelopers } = await supabaseClient
          .from('marketplace_developers')
          .select('id', { count: 'exact', head: true });

        const { count: totalPurchases } = await supabaseClient
          .from('marketplace_purchases')
          .select('id', { count: 'exact', head: true });

        const { data: revenueData } = await supabaseClient
          .from('marketplace_purchases')
          .select('amount_paid, platform_fee');

        const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
        const totalPlatformFee = revenueData?.reduce((sum, p) => sum + Number(p.platform_fee), 0) || 0;

        return new Response(JSON.stringify({
          success: true,
          stats: {
            total_extensions: totalExtensions || 0,
            total_developers: totalDevelopers || 0,
            total_purchases: totalPurchases || 0,
            total_revenue: totalRevenue,
            platform_revenue: totalPlatformFee,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[marketplace-manager] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
