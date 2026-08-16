import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json(
        { error: "No order ID found in session metadata" },
        { status: 404 },
      );
    }

    return NextResponse.json({ orderId });
  } catch (error: any) {
    console.error("Error retrieving Stripe session:", error);
    if (error?.code === "resource_missing" || error?.statusCode === 404) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 },
    );
  }
}
