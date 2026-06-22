import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Crypto HMAC-SHA256 Generator Helper
async function signHmac(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secretKey);
  const msgBuf = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, msgBuf);
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { qrToken } = await req.json();

    if (!qrToken) {
      return new Response(
        JSON.stringify({ granted: false, reason: "MISSING_TOKEN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dynamic QR Token split structure: memberId:timestamp:signature
    const parts = qrToken.split(":");
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ granted: false, reason: "MALFORMED_TOKEN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [memberId, timestampStr, clientSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // 1. Time boundary check (Prevent screenshot sharing: 15 seconds threshold)
    if (Math.abs(now - timestamp) > 15000) {
      return new Response(
        JSON.stringify({ granted: false, reason: "EXPIRED_TOKEN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Resolve Member & Tenant context
    const { data: member, error: memberError } = await supabaseClient
      .from("members")
      .select("id, tenant_id, status, first_name, last_name")
      .eq("id", memberId)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ granted: false, reason: "MEMBER_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify Signature
    const globalSecret = Deno.env.get("HMAC_GLOBAL_SECRET") ?? "fallback_system_secret_key";
    const tenantSecret = `${globalSecret}_${member.tenant_id}`;
    const calculatedSignature = await signHmac(`${memberId}:${timestampStr}`, tenantSecret);

    if (calculatedSignature !== clientSignature) {
      return new Response(
        JSON.stringify({ granted: false, reason: "INVALID_SIGNATURE" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify Active Status & Waiver Checks
    if (member.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ granted: false, reason: `MEMBER_STATUS_${member.status}`, memberName: member.first_name }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Log Attendance Entry
    const { error: attendanceError } = await supabaseClient
      .from("attendance")
      .insert({
        tenant_id: member.tenant_id,
        member_id: member.id,
        method: "QR",
      });

    if (attendanceError) {
      throw new Error(`Failed to log attendance: ${attendanceError.message}`);
    }

    return new Response(
      JSON.stringify({ granted: true, memberName: `${member.first_name} ${member.last_name}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ granted: false, reason: "SERVER_ERROR", error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
