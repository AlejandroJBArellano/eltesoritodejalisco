import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  renotify?: boolean;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface StoredPushSubscription {
  id?: string;
  tenant_id: string;
  user_id?: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  role?: string | null;
}

/**
 * Configure VAPID details if environment variables are present.
 */
function ensureVapidConfigured(): boolean {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:alerts@trykittn.com";

  if (!publicKey || !privateKey) {
    console.warn(
      "[WebPush Warning] VAPID keys not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing).",
    );
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (err) {
    console.error("[WebPush Error] Failed to configure VAPID details:", err);
    return false;
  }
}

/**
 * Sends a Web Push Notification to all active subscribed devices of a tenant,
 * optionally filtered by role (e.g. ['ADMIN', 'MANAGER', 'KITCHEN']).
 */
export async function sendTenantPushNotification(
  tenantId: string,
  payload: PushNotificationPayload,
  targetRoles?: string[],
) {
  if (!ensureVapidConfigured()) {
    return { success: false, reason: "vapid_not_configured" };
  }

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("tenant_id", tenantId);

    if (targetRoles && targetRoles.length > 0) {
      query = query.in("role", targetRoles);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("[WebPush Error] Error querying push subscriptions:", error);
      return { success: false, error };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0, reason: "no_subscribers" };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: payload.icon || "/favicon.ico",
      badge: payload.badge || "/favicon.ico",
      tag: payload.tag || "general",
      vibrate: payload.vibrate || [200, 100, 200],
      renotify: payload.renotify !== false,
    });

    const expiredEndpoints: string[] = [];
    let sentCount = 0;
    let failedCount = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sentCount++;
        } catch (err: unknown) {
          failedCount++;
          const statusCode = (err as { statusCode?: number })?.statusCode;
          // 404 Not Found or 410 Gone means the subscription is expired or revoked
          if (statusCode === 404 || statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error(`[WebPush Error] Failed to send push to ${sub.endpoint}:`, err);
          }
        }
      }),
    );

    // Clean up expired or revoked subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
      console.log(
        `[WebPush Cleanup] Removed ${expiredEndpoints.length} expired subscriptions.`,
      );
    }

    return {
      success: true,
      sentCount,
      failedCount,
      cleanedCount: expiredEndpoints.length,
    };
  } catch (error) {
    console.error("[WebPush Exception] Error dispatching push notifications:", error);
    return { success: false, error };
  }
}
