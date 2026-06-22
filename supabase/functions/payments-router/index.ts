import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { memberId, membershipPlanId, billingCountry } = await req.json();

    if (!memberId || !membershipPlanId || !billingCountry) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: memberId, membershipPlanId, billingCountry" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch member and plan price metadata
    const { data: member, error: memberError } = await supabaseClient
      .from("members")
      .select("id, tenant_id, email")
      .eq("id", memberId)
      .single();

    const { data: plan, error: planError } = await supabaseClient
      .from("membership_plans")
      .select("id, name, price, duration_days")
      .eq("id", membershipPlanId)
      .single();

    if (memberError || planError || !member || !plan) {
      return new Response(
        JSON.stringify({ error: "Failed to resolve member or membership plan details" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Multi-Gateway Dynamic Router
    if (billingCountry === "IN") {
      // Route to Razorpay (India)
      const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "rzp_test_mock";
      const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "rzp_secret_mock";

      // Call Razorpay Order API
      const rzpOrderResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
        },
        body: JSON.stringify({
          amount: Math.round(plan.price * 100), // Convert to paise
          currency: "INR",
          receipt: `rcpt_${member.id.substring(0, 8)}`,
          notes: {
            tenantId: member.tenant_id,
            memberId: member.id,
            planId: plan.id,
          },
        }),
      });

      const rzpOrder = await rzpOrderResponse.json();

      if (rzpOrder.error) {
        throw new Error(`Razorpay Order creation failed: ${rzpOrder.error.description}`);
      }

      return new Response(
        JSON.stringify({
          gateway: "RAZORPAY",
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: "INR",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Default Global Route: Stripe Checkout
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "sk_test_mock";

      // Call Stripe Checkout Session API
      const params = new URLSearchParams();
      params.append("success_url", `https://${member.tenant_id}.gymsaas.com/checkout/success`);
      params.append("cancel_url", `https://${member.tenant_id}.gymsaas.com/checkout/cancel`);
      params.append("mode", "payment");
      params.append("line_items[0][price_data][currency]", "usd");
      params.append("line_items[0][price_data][product_data][name]", plan.name);
      params.append("line_items[0][price_data][unit_amount]", Math.round(plan.price * 100).toString()); // Convert to cents
      params.append("line_items[0][quantity]", "1");
      params.append("metadata[tenantId]", member.tenant_id);
      params.append("metadata[memberId]", member.id);
      params.append("metadata[planId]", plan.id);

      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${stripeSecretKey}`,
        },
        body: params,
      });

      const stripeSession = await stripeResponse.json();

      if (stripeSession.error) {
        throw new Error(`Stripe Session creation failed: ${stripeSession.error.message}`);
      }

      return new Response(
        JSON.stringify({
          gateway: "STRIPE",
          sessionId: stripeSession.id,
          checkoutUrl: stripeSession.url,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
