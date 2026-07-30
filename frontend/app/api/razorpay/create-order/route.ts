import { NextRequest, NextResponse } from "next/server";

// razorpay is a CommonJS module — require() is the only reliable way to load it
// in Next.js App Router (ESM environment).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay");

const KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

// ── POST /api/razorpay/create-order ──────────────────────────────────────────
// Body: { amount: number }  (amount in INR — we convert to paise here)
export async function POST(req: NextRequest) {
  if (!KEY_ID || !KEY_SECRET) {
    return NextResponse.json(
      { error: "Razorpay credentials not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const amountInr: number = Number(body.amount ?? 199);

    if (!amountInr || amountInr <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    const client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });

    const order = await client.orders.create({
      amount: amountInr * 100, // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true,
    });

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,   // paise
      currency: order.currency,
      keyId:    KEY_ID,         // public key — safe to send to client
    });
  } catch (err: any) {
    console.error("[razorpay/create-order]", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create Razorpay order." },
      { status: 500 }
    );
  }
}
