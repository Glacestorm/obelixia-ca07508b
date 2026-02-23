import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-ACADEMIA-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    const user = userData.user;

    const { sessionId, courseId } = await req.json();
    if (!sessionId || !courseId) throw new Error("Missing sessionId or courseId");

    logStep("Verifying payment", { sessionId, courseId, userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      logStep("Payment not completed", { status: session.payment_status });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment not completed' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    logStep("Payment verified", { paymentStatus: session.payment_status });

    // Check if enrollment already exists
    const { data: existing } = await supabaseClient
      .from('academia_enrollments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existing && existing.status === 'active') {
      logStep("Enrollment already exists", { enrollmentId: existing.id });
      return new Response(JSON.stringify({ 
        success: true, 
        enrollmentId: existing.id,
        alreadyEnrolled: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create or update enrollment
    let enrollmentId: string;
    if (existing) {
      const { error } = await supabaseClient
        .from('academia_enrollments')
        .update({ 
          status: 'active', 
          enrolled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (error) throw error;
      enrollmentId = existing.id;
    } else {
      const { data: enrollment, error } = await supabaseClient
        .from('academia_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0,
        })
        .select('id')
        .single();
      if (error) throw error;
      enrollmentId = enrollment.id;
    }

    logStep("Enrollment created/activated", { enrollmentId });

    // Update course student count
    await supabaseClient.rpc('increment_course_students', { p_course_id: courseId }).catch(() => {
      // Non-critical, log and continue
      logStep("Warning: Could not increment student count");
    });

    return new Response(JSON.stringify({ 
      success: true, 
      enrollmentId,
      alreadyEnrolled: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
