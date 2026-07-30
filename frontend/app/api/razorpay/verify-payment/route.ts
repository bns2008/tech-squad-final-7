import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";

const KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

// ── POST /api/razorpay/verify-payment ────────────────────────────────────────
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export async function POST(req: NextRequest) {
  if (!KEY_SECRET) {
    return NextResponse.json(
      { error: "Razorpay credentials not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment fields." },
        { status: 400 }
      );
    }

    // Compute expected HMAC-SHA256 signature
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json(
        { status: "failure", message: "Payment signature verification failed." },
        { status: 400 }
      );
    }

    // ── Signature is valid ────────────────────────────────────────────────────
    // In production: persist the subscription upgrade in your database here.
    return NextResponse.json({
      status:  "success",
      message: "Payment verified successfully.",
    });
  } catch (err: any) {
    console.error("[razorpay/verify-payment]", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to verify payment." },
      { status: 500 }
    );
  }
}
