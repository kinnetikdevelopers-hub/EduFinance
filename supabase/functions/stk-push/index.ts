import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { phone, amount, fee_id, account_ref, description } = await req.json();

    if (!phone || !amount || !fee_id) {
      return new Response(JSON.stringify({ error: "phone, amount and fee_id are required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    // ── 1. Get M-Pesa OAuth token ─────────────────────────────
    const consumerKey    = Deno.env.get("MPESA_CONSUMER_KEY")!;
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
    const passkey        = Deno.env.get("MPESA_PASSKEY")!;
    const shortcode      = Deno.env.get("MPESA_SHORTCODE")!;       // your paybill / till
    const callbackUrl    = Deno.env.get("MPESA_CALLBACK_URL")!;    // your supabase fn url

    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${credentials}` } }
    );
    if (!tokenRes.ok) throw new Error("Failed to get M-Pesa token");
    const { access_token } = await tokenRes.json();

    // ── 2. Build STK push payload ────────────────────────────
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password  = btoa(`${shortcode}${passkey}${timestamp}`);

    // Normalise phone: strip leading 0 or +, ensure starts with 254
    const normalised = phone.replace(/^\+/, "").replace(/^0/, "254");

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   "CustomerPayBillOnline",
      Amount:            Math.round(amount),
      PartyA:            normalised,
      PartyB:            shortcode,
      PhoneNumber:       normalised,
      CallBackURL:       callbackUrl,
      AccountReference:  account_ref || "FEES",
      TransactionDesc:   description || "School fee payment",
    };

    const stkRes = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body:    JSON.stringify(stkPayload),
      }
    );
    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.ResponseDescription || "STK push failed");
    }

    // ── 3. Store pending transaction in Supabase ─────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("ef_mpesa_transactions").insert({
      checkout_request_id: stkData.CheckoutRequestID,
      merchant_request_id: stkData.MerchantRequestID,
      phone_number:        normalised,
      amount:              Math.round(amount),
      account_reference:   account_ref || "FEES",
      transaction_desc:    description || "School fee payment",
      status:              "pending",
      fee_id,
    });

    return new Response(
      JSON.stringify({
        success:             true,
        CheckoutRequestID:   stkData.CheckoutRequestID,
        MerchantRequestID:   stkData.MerchantRequestID,
        CustomerMessage:     stkData.CustomerMessage,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("stk-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});