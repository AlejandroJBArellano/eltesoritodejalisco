import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});

export function getStripeClient(tenantSecretKey?: string | null) {
  const apiKey = tenantSecretKey || process.env.STRIPE_SECRET_KEY || "";
  return new Stripe(apiKey, {
    typescript: true,
  });
}
