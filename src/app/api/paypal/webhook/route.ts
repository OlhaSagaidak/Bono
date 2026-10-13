import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paypalWebhookEvents } from "@/db/schema";
import { handlePayPalEvent } from "@/lib/paypal/webhook-events";
import { verifyPayPalWebhook } from "@/lib/paypal/webhooks";

// PayPal calls this when a capture completes, stays pending, is denied or is
// refunded (the events subscribed in the PayPal developer dashboard). It
// confirms what the capture actions already recorded, and catches what they
// couldn't: a capture that settles later, a lost response, a refund.
//
// Answering anything but 2xx makes PayPal retry later.

const eventSchema = z.object({ id: z.string(), event_type: z.string(), resource: z.unknown() });

export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());
  const check = await verifyPayPalWebhook(request.headers, raw);
  if (!check.ok) {
    console.warn(`Rejected PayPal webhook: ${check.reason}`);
    return new Response("Invalid signature", { status: 400 });
  }

  let event: z.infer<typeof eventSchema>;
  try {
    event = eventSchema.parse(JSON.parse(raw.toString("utf8")));
  } catch {
    return new Response("Unreadable event", { status: 400 });
  }

  const seen = await db.query.paypalWebhookEvents.findFirst({ where: eq(paypalWebhookEvents.id, event.id) });
  if (seen) return Response.json({ ok: true, duplicate: true });

  let outcome: { text: string; resourceId?: string };
  try {
    outcome = await handlePayPalEvent(event.event_type, event.resource);
  } catch (error) {
    // PayPal unreachable or our database failing: let PayPal retry.
    console.error(`PayPal webhook ${event.id} (${event.event_type}) failed:`, error);
    return new Response("Try again later", { status: 500 });
  }

  await db
    .insert(paypalWebhookEvents)
    .values({ id: event.id, eventType: event.event_type, resourceId: outcome.resourceId, outcome: outcome.text })
    .onConflictDoNothing();
  return Response.json({ ok: true });
}
