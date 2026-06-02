import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const body = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response("Invalid callback", { status: 400 });
    }

    const {
      CheckoutRequestID,
      MerchantRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Lookup pending transaction ────────────────────────
    const { data: txn, error: txnErr } = await supabase
      .from("ef_mpesa_transactions")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (txnErr || !txn) {
      console.error("Transaction not found:", CheckoutRequestID);
      // Still return 200 so Safaricom stops retrying
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }

    // ── 2. Parse callback metadata ───────────────────────────
    let mpesaReceiptNumber = null;
    let paidAmount = txn.amount;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value;
        if (item.Name === "Amount")             paidAmount = item.Value;
      }
    }

    const status = ResultCode === 0 ? "success" : "failed";

    // ── 3. Update transaction record ─────────────────────────
    await supabase
      .from("ef_mpesa_transactions")
      .update({
        status,
        result_code:          ResultCode,
        result_desc:          ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        amount:               paidAmount,
        updated_at:           new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID);

    // ── 4. If successful, update student fee record ──────────
    if (ResultCode === 0 && txn.fee_id) {
      const { data: fee } = await supabase
        .from("ef_student_fees")
        .select("paid, expected")
        .eq("id", txn.fee_id)
        .single();

      if (fee) {
        const newPaid   = (fee.paid || 0) + paidAmount;
        const newStatus = newPaid >= fee.expected ? "paid" : newPaid > 0 ? "partial" : "due";

        await supabase
          .from("ef_student_fees")
          .update({ paid: newPaid, status: newStatus })
          .eq("id", txn.fee_id);

        // Also insert into ef_payments for the payment history log
        await supabase.from("ef_payments").insert({
          fee_id:     txn.fee_id,
          amount:     paidAmount,
          method:     "mpesa",
          mpesa_code: mpesaReceiptNumber,
          note:       `Auto-confirmed via M-Pesa Daraja. Phone: ${txn.phone_number}`,
          paid_at:    new Date().toISOString(),
        });
      }
    }

    // Safaricom expects this exact response
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Confirmation received successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Callback error:", err);
    // Always return 200 to Safaricom or they'll keep retrying
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});