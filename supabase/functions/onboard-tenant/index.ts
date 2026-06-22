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

    const { name, slug, primaryColorLight, secondaryColorLight } = await req.json();

    if (!name || !slug) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check if slug exists
    const { data: existingTenant } = await supabaseClient
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: "Gym URL subdomain slug already taken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Insert new Tenant
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("tenants")
      .insert({
        name,
        slug,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant: ${tenantError?.message}`);
    }

    // 3. Provision Default Branding configurations
    const { error: brandingError } = await supabaseClient
      .from("tenant_branding")
      .insert({
        tenant_id: tenant.id,
        primary_color_light: primaryColorLight ?? "#f59e0b",
        secondary_color_light: secondaryColorLight ?? "#0f172a",
        primary_color_dark: primaryColorLight ?? "#fbbf24",
        secondary_color_dark: "#1e293b",
        font_family: "Inter",
        timezone: "UTC",
        locale: "en",
        measurement_system: "METRIC",
      });

    if (brandingError) {
      throw new Error(`Failed to create branding: ${brandingError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, tenantId: tenant.id, slug: tenant.slug }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
